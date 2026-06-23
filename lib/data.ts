// Versão com banco de dados PostgreSQL (Neon) - Usando tabelas existentes

import pool from './db';
import { Lancamento, Banco, FormaPagamento, FluxoCaixa, ResultadoMensal, GrupoCategoria, Categoria, Pessoa, Agencia, CategoriaOrcamento, OrcadoRealizadoDashboard, OrcadoRealizadoItem } from '@/types';
import { formatParcelaExibicao, normalizarParcelasCampos } from './parcelas';
import { somenteDigitos } from './texto';

export { formatParcelaExibicao, normalizarParcelasCampos } from './parcelas';

// Funções auxiliares para cálculos (mantidas iguais)

export function calcularStatus(lancamento: Lancamento): 'Realizado' | 'Planejado' | '-' {
  if (!lancamento.dataVencimento) {
    return '-';
  }
  
  const dataVenc = new Date(lancamento.dataVencimento);
  if (!isNaN(dataVenc.getTime())) {
    if (lancamento.dataCompensacao) {
      return 'Realizado';
    }
    return 'Planejado';
  }
  
  return '-';
}

export function calcularSaldo(lancamentos: Lancamento[], conta?: string): number {
  let saldo = 0;
  
  for (const lanc of lancamentos) {
    if (!conta || lanc.conta === conta || conta === 'TODAS AS CONTAS') {
      saldo += (lanc.entradas || 0) - (lanc.saidas || 0);
    }
  }
  
  return saldo;
}

export function calcularTotalEntradas(lancamentos: Lancamento[], filtros?: {
  conta?: string;
  dataInicio?: Date;
  dataFim?: Date;
  status?: string;
}): number {
  return lancamentos
    .filter(lanc => {
      if (filtros?.conta && lanc.conta !== filtros.conta && filtros.conta !== 'TODAS AS CONTAS') {
        return false;
      }
      if (filtros?.status && calcularStatus(lanc) !== filtros.status) {
        return false;
      }
      if (filtros?.dataInicio || filtros?.dataFim) {
        const dataOp = new Date(lanc.dataOperacao);
        if (filtros.dataInicio && dataOp < filtros.dataInicio) return false;
        if (filtros.dataFim && dataOp > filtros.dataFim) return false;
      }
      return true;
    })
    .reduce((total, lanc) => total + (lanc.entradas || 0), 0);
}

export function calcularTotalSaidas(lancamentos: Lancamento[], filtros?: {
  conta?: string;
  dataInicio?: Date;
  dataFim?: Date;
  status?: string;
}): number {
  return lancamentos
    .filter(lanc => {
      if (filtros?.conta && lanc.conta !== filtros.conta && filtros.conta !== 'TODAS AS CONTAS') {
        return false;
      }
      if (filtros?.status && calcularStatus(lanc) !== filtros.status) {
        return false;
      }
      if (filtros?.dataInicio || filtros?.dataFim) {
        const dataOp = new Date(lanc.dataOperacao);
        if (filtros.dataInicio && dataOp < filtros.dataInicio) return false;
        if (filtros.dataFim && dataOp > filtros.dataFim) return false;
      }
      return true;
    })
    .reduce((total, lanc) => total + (lanc.saidas || 0), 0);
}

// Função auxiliar para extrair valor de array PostgreSQL
function getArrayValue(value: any): any {
  // Se for null ou undefined, retornar como está
  if (value === null || value === undefined) {
    return value;
  }
  
  // Se for array, pegar o primeiro elemento
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    let result = value[0];
    // Se o resultado ainda for array (array aninhado), pegar o primeiro recursivamente
    while (Array.isArray(result) && result.length > 0) {
      result = result[0];
    }
    // Remove aspas se o valor for uma string entre aspas
    if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
      return result.slice(1, -1);
    }
    return result;
  }
  
  // Se for string no formato PostgreSQL array {value1,value2} ou {"value1","value2"}
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const parsed = value.slice(1, -1).split(',');
    let result = parsed[0] || null;
    // Remove aspas se o valor for uma string entre aspas
    if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
      result = result.slice(1, -1);
    }
    return result;
  }
  
  // Se for uma string normal mas estiver entre aspas, remover
  if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  
  return value;
}

function salvarMaiusculo(valor?: string | null): string {
  if (valor == null) return '';
  return String(valor).trim().toLocaleUpperCase('pt-BR');
}

function salvarMaiusculoOpcional(valor?: string | null): string | null {
  const texto = salvarMaiusculo(valor);
  return texto === '' ? null : texto;
}

function compararTextoSalvo(a?: string | null, b?: string | null): boolean {
  return salvarMaiusculo(a) === salvarMaiusculo(b);
}

async function proximoId(tabela: 'banco' | 'agencia' | 'categoria' | 'grupo_categoria' | 'pessoa' | 'tipo_operacao'): Promise<number> {
  const colunas: Record<typeof tabela, string> = {
    banco: 'id_banco',
    agencia: 'id_agencia',
    categoria: 'id_categoria',
    grupo_categoria: 'id_grupo_categoria',
    pessoa: 'id_pessoa',
    tipo_operacao: 'id_tp_operacao'
  };
  const coluna = colunas[tabela];
  const result = await pool.query(
    `SELECT COALESCE(MAX(${coluna}), 0) + 1 AS next_id FROM ${tabela}`
  );
  return Number(result.rows[0].next_id);
}

function precisaIdManual(error: any): boolean {
  const msg = String(error?.message || '');
  return error?.code === '23502' || msg.includes('null value in column');
}

async function executarInsertCompativel<T>(
  insertAuto: () => Promise<T>,
  insertManual: () => Promise<T>
): Promise<T> {
  try {
    return await insertAuto();
  } catch (errorAuto: any) {
    if (precisaIdManual(errorAuto)) {
      return await insertManual();
    }
    throw errorAuto;
  }
}

let parcelaColunasProntas = false;
let categoriaOrcamentoTabelaPronta = false;
let categoriaFkCorrigida = false;

async function ensureParcelaColunas() {
  if (parcelaColunasProntas) return;
  await pool.query(`
    ALTER TABLE lancamento ADD COLUMN IF NOT EXISTS nr_parcela INTEGER DEFAULT 1;
    ALTER TABLE lancamento ADD COLUMN IF NOT EXISTS qt_total_parcelas INTEGER DEFAULT 1;
  `);
  parcelaColunasProntas = true;
}

async function ensureCategoriaOrcamentoTable() {
  if (categoriaOrcamentoTabelaPronta) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categoria_orcamento (
      id SERIAL PRIMARY KEY,
      categoria_id INTEGER NOT NULL REFERENCES categoria(id_categoria) ON DELETE CASCADE,
      mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
      ano INTEGER NOT NULL CHECK (ano >= 2000 AND ano <= 2100),
      valor_previsto NUMERIC(15, 2) NOT NULL DEFAULT 0,
      UNIQUE (categoria_id, mes, ano)
    );
    CREATE INDEX IF NOT EXISTS idx_categoria_orcamento_periodo ON categoria_orcamento (ano, mes);
  `);
  categoriaOrcamentoTabelaPronta = true;
}

async function ensureCategoriaFkCorrigida() {
  if (categoriaFkCorrigida) return;
  await pool.query(`
    ALTER TABLE categoria DROP CONSTRAINT IF EXISTS id_grupo_categoria_fk;
  `);
  categoriaFkCorrigida = true;
}

function dataNoPeriodo(data: Date | string | undefined, mes: number, ano: number): boolean {
  if (!data) return false;
  const d = new Date(data);
  if (isNaN(d.getTime())) return false;
  return d.getMonth() + 1 === mes && d.getFullYear() === ano;
}

export function corPercentualOrcamento(percentual: number): string {
  if (percentual >= 100) return '#dc3545';
  if (percentual >= 80) return '#ffc107';
  return '#28a745';
}

function lerParcelasDoRegistro(row: any): { numeroParcela: number; totalParcelas: number } {
  const nr =
    row.numeroParcela ?? row.nr_parcela;
  const qt =
    row.totalParcelas ?? row.qt_total_parcelas;
  if (nr != null && qt != null) {
    return {
      numeroParcela: Math.max(1, Number(nr) || 1),
      totalParcelas: Math.max(1, Number(qt) || 1)
    };
  }
  const parcelasRaw = getArrayValue(row.parcelas);
  if (parcelasRaw != null && parcelasRaw !== '') {
    const s = String(parcelasRaw).trim();
    if (s.includes('/')) {
      const [a, b] = s.split('/').map((x) => parseInt(x.trim(), 10));
      return { numeroParcela: Math.max(1, a || 1), totalParcelas: Math.max(1, b || 1) };
    }
    const n = parseInt(s, 10);
    if (!isNaN(n) && n > 0) {
      return { numeroParcela: 1, totalParcelas: n };
    }
  }
  return { numeroParcela: 1, totalParcelas: 1 };
}

function formatQtParcelasLegacy(numero: number, total: number): string {
  const n = Math.max(1, numero);
  const t = Math.max(1, total);
  if (t <= 1) return `{1}`;
  return `{"${n}/${t}"}`;
}

// API de dados usando PostgreSQL com tabelas existentes

export const DataService = {
  // Lançamentos
  getLancamentos: async (): Promise<(Lancamento & { categoriaNome?: string; grupoCategoriaTipo?: string })[]> => {
    try {
      await ensureParcelaColunas();
      // Primeiro vamos buscar apenas os lançamentos com JOINs para dados relacionados
      const lancamentosResult = await pool.query(`
        SELECT 
          l.id_lancamento as id,
          l.id_conta_corr as "contaId",
          l.dt_operacao as "dataOperacao",
          l.id_pessoa as "clienteFornecedorId",
          l.ds_lancamento as descricao,
          l.qt_parcelas as parcelas,
          l.nr_parcela as "numeroParcela",
          l.qt_total_parcelas as "totalParcelas",
          l.ds_categoria as categoria,
          l.vl_lancamento as "vlLancamento",
          l.dt_vencimento as "dataVencimento",
          l.dt_compensacao as "dataCompensacao",
          cc.no_conta_corrente as "contaNome",
          p.no_pessoa as "pessoaNome",
          to_op.no_tp_operacao as "formaOperacaoNome"
        FROM lancamento l
        LEFT JOIN pessoa p ON l.id_pessoa = p.id_pessoa
        LEFT JOIN conta_corrente cc ON l.id_conta_corr = cc.id_conta_corrente
        LEFT JOIN tipo_operacao to_op ON l.id_tp_operacao = to_op.id_tp_operacao
        ORDER BY l.dt_operacao DESC
      `);
      
      console.log(`[DEBUG] Total de lançamentos encontrados na query: ${lancamentosResult.rows.length}`);
      if (lancamentosResult.rows.length > 0) {
        console.log(`[DEBUG] Primeiro lançamento raw:`, JSON.stringify(lancamentosResult.rows[0], null, 2));
      }
      
      // Buscar todas as categorias com seus grupos
      const categoriasResult = await pool.query(`
        SELECT 
          c.id_categoria,
          c.no_categoria as nome,
          c.id_grupo_categoria,
          gc.tp_categoria as "tipoGrupo"
        FROM categoria c
        LEFT JOIN grupo_categoria gc ON c.id_grupo_categoria = gc.id_grupo_categoria
      `);

      // Criar mapa de categorias
      const mapaCategorias = new Map();
      categoriasResult.rows.forEach(row => {
        const nomeCategoria = getArrayValue(row.nome);
        const tipoGrupo = getArrayValue(row.tipoGrupo);
        if (nomeCategoria) {
          mapaCategorias.set(nomeCategoria, tipoGrupo === 'E' ? 'Entrada' : 'Saída');
        }
      });
      
      const lancamentosProcessados = lancamentosResult.rows.map((row, index) => {
        try {
          console.log(`[DEBUG] Processando lançamento ${index + 1}:`, {
            id: row.id,
            vlLancamento: row.vlLancamento,
            vlEntrada: row.vlEntrada,
            vlSaida: row.vlSaida,
            categoria: row.categoria
          });
          
          // Obter valor de vl_lancamento
          let valorLancamento = 0;
          const vlLancamentoRaw = getArrayValue(row.vlLancamento);
          
          console.log(`[DEBUG] Valores extraídos:`, {
            vlLancamentoRaw,
            tipo: typeof vlLancamentoRaw
          });
          
          // Converter para número, tratando strings e arrays
          const vlLancamento = vlLancamentoRaw ? parseFloat(String(vlLancamentoRaw)) : 0;
          
          console.log(`[DEBUG] Valores convertidos:`, {
            vlLancamento,
            isNaN_vlLancamento: isNaN(vlLancamento)
          });
          
          // Aceitar qualquer valor válido (positivo ou negativo)
          if (!isNaN(vlLancamento)) {
            valorLancamento = vlLancamento;
          }
          
          console.log(`[DEBUG] Valor final calculado:`, valorLancamento);
          
          const categoriaNome = String(getArrayValue(row.categoria) || '').trim();
          const tipoGrupo = mapaCategorias.get(categoriaNome) || 'Saída'; // Default para Saída
          
          const { numeroParcela, totalParcelas } = lerParcelasDoRegistro(row);
          
          const lanc: any = {
            id: String(row.id || ''),
            conta: String(getArrayValue(row.contaNome) || 'TODAS AS CONTAS').trim(),
            dataOperacao: row.dataOperacao,
            clienteFornecedorId: row.clienteFornecedorId || null,
            clienteFornecedor: String(getArrayValue(row.pessoaNome) || '').trim(),
            descricao: String(getArrayValue(row.descricao) || '').trim(),
            numeroParcela,
            totalParcelas,
            parcelas: formatParcelaExibicao(numeroParcela, totalParcelas),
            categoria: categoriaNome,
            valor: valorLancamento,
            entradas: valorLancamento > 0 ? valorLancamento : 0,
            saidas: valorLancamento < 0 ? Math.abs(valorLancamento) : 0,
            formaOperacao: String(getArrayValue(row.formaOperacaoNome) || '').trim(),
            dataVencimento: row.dataVencimento || null,
            dataCompensacao: row.dataCompensacao || null,
            categoriaNome: categoriaNome,
            grupoCategoriaTipo: tipoGrupo
          };
          lanc.status = calcularStatus(lanc);
          console.log(`[DEBUG] Lançamento processado com sucesso:`, {
            id: lanc.id,
            descricao: lanc.descricao,
            valor: lanc.valor,
            entradas: lanc.entradas,
            saidas: lanc.saidas
          });
          return lanc;
        } catch (error: any) {
          console.error(`[DEBUG] Erro ao processar lançamento ${row.id} (índice ${index}):`, error);
          console.error(`[DEBUG] Dados da linha:`, JSON.stringify(row, null, 2));
          console.error(`[DEBUG] Stack:`, error.stack);
          return null;
        }
      }).filter(lanc => {
        const isValid = lanc !== null;
        if (!isValid) {
          console.log(`[DEBUG] Lançamento filtrado (null)`);
        }
        return isValid;
      });
      
      console.log(`[DEBUG] Total de lançamentos processados: ${lancamentosProcessados.length}`);
      if (lancamentosProcessados.length > 0) {
        console.log(`[DEBUG] Primeiro lançamento processado:`, JSON.stringify(lancamentosProcessados[0], null, 2));
      }
      return lancamentosProcessados;
    } catch (error: any) {
      console.error('Erro ao buscar lançamentos:', error);
      console.error('Detalhes do erro:', error.message);
      console.error('Stack:', error.stack);
      return [];
    }
  },
  
  addLancamento: async (lancamento: Lancamento): Promise<Lancamento> => {
    try {
      await ensureParcelaColunas();
      const descricaoSalvar = salvarMaiusculo(lancamento.descricao);
      const categoriaSalvar = salvarMaiusculoOpcional(lancamento.categoria);
      const clienteSalvar = salvarMaiusculoOpcional(lancamento.clienteFornecedor);
      const contaSalvar = lancamento.conta ? salvarMaiusculo(lancamento.conta) : '';
      const formaOperacaoSalvar = salvarMaiusculoOpcional(lancamento.formaOperacao);

      const { numeroParcela, totalParcelas } = normalizarParcelasCampos(lancamento);
      // Resolver/garantir pessoa (cliente/fornecedor)
      let pessoaId: number | null = (lancamento as any).clienteFornecedorId || null;
      if (!pessoaId && clienteSalvar) {
        try {
          const nome = clienteSalvar;
          console.log('[ADD] Buscando pessoa:', nome);
          
          const pessoaExistente = await pool.query(
            `SELECT id_pessoa, no_pessoa FROM pessoa`
          );
          console.log('[ADD] Pessoas encontradas:', pessoaExistente.rows.length);

          // Procurar pessoa comparando com getArrayValue
          for (const row of pessoaExistente.rows) {
            const nomePessoa = getArrayValue(row.no_pessoa);
            if (nomePessoa && compararTextoSalvo(nomePessoa, nome)) {
              pessoaId = row.id_pessoa;
              console.log('[ADD] Pessoa encontrada! ID:', pessoaId);
              break;
            }
          }

          if (!pessoaId) {
            console.log('[ADD] Pessoa não encontrada. Criando nova pessoa:', nome);
            const novaPessoa = await pool.query(
              `
              INSERT INTO pessoa (no_pessoa, tp_pessoa, no_situacao_pessoa)
              VALUES ($1, $2, $3)
              RETURNING id_pessoa
              `,
              [`{${nome}}`, ['F'], null]
            );
            pessoaId = novaPessoa.rows[0].id_pessoa;
            console.log('[ADD] Nova pessoa criada com ID:', pessoaId);
          }
        } catch (error: any) {
          console.log('[ADD] Erro ao processar pessoa:', error.message);
        }
      }

      // Valor (positivo para entrada, negativo para saída)
      let valorLancamento = 0;
      if ((lancamento as any).valor !== undefined && (lancamento as any).valor !== null) {
        valorLancamento = parseFloat((lancamento as any).valor.toString()) || 0;
      } else {
        valorLancamento = (lancamento.entradas || 0) - (lancamento.saidas || 0);
      }
      
      // Validações
      if (!descricaoSalvar) {
        throw new Error('Descrição é obrigatória');
      }
      
      if (valorLancamento === 0) {
        throw new Error('O valor deve ser maior que zero');
      }
      
      if (!lancamento.dataOperacao) {
        throw new Error('Data de operação é obrigatória');
      }

      let contaId: number | null = null;
      if (contaSalvar && contaSalvar !== 'TODAS AS CONTAS') {
        console.log('[ADD] Buscando conta:', contaSalvar);
        const contaResult = await pool.query(
          `SELECT id_conta_corrente, no_conta_corrente 
           FROM conta_corrente`
        );
        console.log('[ADD] Contas encontradas:', contaResult.rows.length);
        
        // Procurar conta comparando com getArrayValue
        for (const row of contaResult.rows) {
          const nomeConta = getArrayValue(row.no_conta_corrente);
          console.log('[ADD] Comparando:', nomeConta, 'com', contaSalvar);
          if (nomeConta && compararTextoSalvo(nomeConta, contaSalvar)) {
            contaId = row.id_conta_corrente;
            console.log('[ADD] Conta encontrada! ID:', contaId);
            break;
          }
        }
        
        if (!contaId) {
          console.log('[ADD] Conta não encontrada para:', contaSalvar);
        }
      }

      // Buscar id_tp_operacao pela formaOperacao
      let tipoOperacaoId: number | null = null;
      if (formaOperacaoSalvar) {
        console.log('[ADD] Buscando tipo operação:', formaOperacaoSalvar);
        const tipoResult = await pool.query(
          `SELECT id_tp_operacao, no_tp_operacao 
           FROM tipo_operacao`
        );
        console.log('[ADD] Tipos de operação encontrados:', tipoResult.rows.length);
        
        for (const row of tipoResult.rows) {
          const nomeTipo = getArrayValue(row.no_tp_operacao);
          console.log('[ADD] Comparando tipo:', nomeTipo, 'com', formaOperacaoSalvar);
          if (nomeTipo && compararTextoSalvo(nomeTipo, formaOperacaoSalvar)) {
            tipoOperacaoId = row.id_tp_operacao;
            console.log('[ADD] Tipo operação encontrado! ID:', tipoOperacaoId);
            break;
          }
        }
        
        if (!tipoOperacaoId) {
          console.log('[ADD] Tipo operação não encontrado para:', formaOperacaoSalvar);
        }
      }

      // Inserir campos (FKs podem ser NULL por enquanto até ter dados cadastrados)
      const result = await pool.query(`
        INSERT INTO lancamento (
          dt_operacao, ds_lancamento, qt_parcelas, nr_parcela, qt_total_parcelas,
          vl_lancamento, ds_categoria, dt_vencimento, dt_compensacao,
          id_conta_corr, id_pessoa, id_categoria, id_tp_operacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id_lancamento
      `, [
        lancamento.dataOperacao,
        `{${descricaoSalvar}}`,
        formatQtParcelasLegacy(numeroParcela, totalParcelas),
        numeroParcela,
        totalParcelas,
        `{${valorLancamento}}`,
        categoriaSalvar ? `{${categoriaSalvar}}` : null,
        lancamento.dataVencimento || null,
        lancamento.dataCompensacao || null,
        contaId, // id_conta_corr
        pessoaId, // id_pessoa
        null, // id_categoria - será preenchido se necessário
        tipoOperacaoId  // id_tp_operacao
      ]);
      
      const id = result.rows[0].id_lancamento.toString();
      const status = calcularStatus(lancamento);
      
      return {
        ...lancamento,
        id,
        descricao: descricaoSalvar,
        categoria: categoriaSalvar || '',
        clienteFornecedor: clienteSalvar || '',
        conta: contaSalvar || lancamento.conta,
        formaOperacao: formaOperacaoSalvar || '',
        status,
        numeroParcela,
        totalParcelas,
        parcelas: formatParcelaExibicao(numeroParcela, totalParcelas)
      };
    } catch (error: any) {
      console.error('Erro ao adicionar lançamento:', error);
      if (error.message) {
        throw new Error(error.message);
      }
      throw error;
    }
  },
  
  updateLancamento: async (id: string, lancamento: Partial<Lancamento>): Promise<Lancamento | null> => {
    try {
      await ensureParcelaColunas();
      const descricaoSalvar = lancamento.descricao != null ? salvarMaiusculo(lancamento.descricao) : null;
      const categoriaSalvar = lancamento.categoria != null ? salvarMaiusculoOpcional(lancamento.categoria) : null;
      const contaSalvar = lancamento.conta != null ? salvarMaiusculo(lancamento.conta) : null;
      const formaOperacaoSalvar = lancamento.formaOperacao != null ? salvarMaiusculoOpcional(lancamento.formaOperacao) : null;

      const parcelasAtualizadas =
        lancamento.numeroParcela != null ||
        lancamento.totalParcelas != null ||
        lancamento.parcelas != null
          ? normalizarParcelasCampos(lancamento)
          : null;
      // Buscar lançamento existente
      const existing = await pool.query(
        'SELECT * FROM lancamento WHERE id_lancamento = $1',
        [parseInt(id)]
      );
      
      if (existing.rows.length === 0) return null;
      
      const existingRow = existing.rows[0];
      
      // Calcular valor (positivo para entrada, negativo para saída)
      let valorLancamento = parseFloat(getArrayValue(existingRow.vl_lancamento)) || 0;
      if ((lancamento as any).valor !== undefined) {
        valorLancamento = parseFloat((lancamento as any).valor) || 0;
      } else if (lancamento.entradas !== undefined || lancamento.saidas !== undefined) {
        const entradas = lancamento.entradas !== undefined ? lancamento.entradas : 0;
        const saidas = lancamento.saidas !== undefined ? lancamento.saidas : 0;
        valorLancamento = entradas - saidas;
      }
      
      let pessoaId: number | null = (lancamento as any).clienteFornecedorId ?? null;
      const nomeInformado =
        lancamento.clienteFornecedor != null
          ? (salvarMaiusculoOpcional(lancamento.clienteFornecedor) || '')
          : '';

      if (pessoaId && nomeInformado) {
        try {
          const check = await pool.query('SELECT no_pessoa FROM pessoa WHERE id_pessoa = $1', [pessoaId]);
          if (check.rows.length) {
            const nomeDb = getArrayValue(check.rows[0].no_pessoa);
            const db = salvarMaiusculo(nomeDb);
            const inf = salvarMaiusculo(nomeInformado);
            const mesmoNome =
              db === inf || (db.length > 0 && inf.length > 0 && db.startsWith(inf));
            if (!mesmoNome) {
              console.log('[UPDATE] Nome diferente do id_pessoa; recalculando pessoa. id=', pessoaId, 'db=', nomeDb, 'informado=', nomeInformado);
              pessoaId = null;
            }
          }
        } catch (e: any) {
          console.log('[UPDATE] Erro ao validar pessoa pelo id:', e?.message);
        }
      }

      if (!pessoaId && nomeInformado) {
        try {
          const nome = nomeInformado;
          console.log('[UPDATE] Buscando pessoa:', nome);
          
          const pessoaExistente = await pool.query(
            `SELECT id_pessoa, no_pessoa FROM pessoa`
          );
          console.log('[UPDATE] Pessoas encontradas:', pessoaExistente.rows.length);

          // Procurar pessoa comparando com getArrayValue
          for (const row of pessoaExistente.rows) {
            const nomePessoa = getArrayValue(row.no_pessoa);
            if (nomePessoa && compararTextoSalvo(nomePessoa, nome)) {
              pessoaId = row.id_pessoa;
              console.log('[UPDATE] Pessoa encontrada! ID:', pessoaId);
              break;
            }
          }

          if (!pessoaId) {
            console.log('[UPDATE] Pessoa não encontrada. Criando nova pessoa:', nome);
            const novaPessoa = await pool.query(
              `
              INSERT INTO pessoa (no_pessoa, tp_pessoa, no_situacao_pessoa)
              VALUES ($1, $2, $3)
              RETURNING id_pessoa
              `,
              [`{${nome}}`, ['F'], null]
            );
            pessoaId = novaPessoa.rows[0].id_pessoa;
            console.log('[UPDATE] Nova pessoa criada com ID:', pessoaId);
          }
        } catch (error: any) {
          console.log('[UPDATE] Erro ao processar pessoa:', error.message);
        }
      }

      let contaId: number | null = null;
      if (contaSalvar && contaSalvar !== 'TODAS AS CONTAS') {
        console.log('[UPDATE] Buscando conta:', contaSalvar);
        const contaResult = await pool.query(
          `SELECT id_conta_corrente, no_conta_corrente 
           FROM conta_corrente`
        );
        console.log('[UPDATE] Contas encontradas:', contaResult.rows.length);
        
        // Procurar conta comparando com getArrayValue
        for (const row of contaResult.rows) {
          const nomeConta = getArrayValue(row.no_conta_corrente);
          console.log('[UPDATE] Comparando:', nomeConta, 'com', contaSalvar);
          if (nomeConta && compararTextoSalvo(nomeConta, contaSalvar)) {
            contaId = row.id_conta_corrente;
            console.log('[UPDATE] Conta encontrada! ID:', contaId);
            break;
          }
        }
        
        if (!contaId) {
          console.log('[UPDATE] Conta não encontrada para:', contaSalvar);
        }
      }

      // Buscar id_tp_operacao pela formaOperacao
      let tipoOperacaoId: number | null = null;
      if (formaOperacaoSalvar) {
        console.log('[UPDATE] Buscando tipo operação:', formaOperacaoSalvar);
        const tipoResult = await pool.query(
          `SELECT id_tp_operacao, no_tp_operacao 
           FROM tipo_operacao`
        );
        console.log('[UPDATE] Tipos de operação encontrados:', tipoResult.rows.length);
        
        for (const row of tipoResult.rows) {
          const nomeTipo = getArrayValue(row.no_tp_operacao);
          console.log('[UPDATE] Comparando tipo:', nomeTipo, 'com', formaOperacaoSalvar);
          if (nomeTipo && compararTextoSalvo(nomeTipo, formaOperacaoSalvar)) {
            tipoOperacaoId = row.id_tp_operacao;
            console.log('[UPDATE] Tipo operação encontrado! ID:', tipoOperacaoId);
            break;
          }
        }
        
        if (!tipoOperacaoId) {
          console.log('[UPDATE] Tipo operação não encontrado para:', formaOperacaoSalvar);
        }
      }

      await pool.query(`
        UPDATE lancamento SET
          dt_operacao = COALESCE($2, dt_operacao),
          ds_lancamento = COALESCE($3, ds_lancamento),
          qt_parcelas = COALESCE($4, qt_parcelas),
          nr_parcela = COALESCE($5, nr_parcela),
          qt_total_parcelas = COALESCE($6, qt_total_parcelas),
          vl_lancamento = COALESCE($7, vl_lancamento),
          ds_categoria = COALESCE($8, ds_categoria),
          dt_vencimento = $9,
          dt_compensacao = $10,
          id_pessoa = COALESCE($11, id_pessoa),
          id_conta_corr = COALESCE($12, id_conta_corr),
          id_tp_operacao = COALESCE($13, id_tp_operacao)
        WHERE id_lancamento = $1
      `, [
        parseInt(id),
        lancamento.dataOperacao || existingRow.dt_operacao,
        descricaoSalvar ? `{${descricaoSalvar}}` : existingRow.ds_lancamento,
        parcelasAtualizadas
          ? formatQtParcelasLegacy(
              parcelasAtualizadas.numeroParcela,
              parcelasAtualizadas.totalParcelas
            )
          : existingRow.qt_parcelas,
        parcelasAtualizadas?.numeroParcela ?? existingRow.nr_parcela,
        parcelasAtualizadas?.totalParcelas ?? existingRow.qt_total_parcelas,
        valorLancamento !== undefined ? `{${valorLancamento}}` : existingRow.vl_lancamento,
        categoriaSalvar ? `{${categoriaSalvar}}` : existingRow.ds_categoria,
        lancamento.dataVencimento || existingRow.dt_vencimento,
        lancamento.dataCompensacao || existingRow.dt_compensacao,
        pessoaId,
        contaId,
        tipoOperacaoId
      ]);
      
      const updated = await DataService.getLancamentos();
      return updated.find(l => l.id === id) || null;
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      return null;
    }
  },
  
  deleteLancamento: async (id: string): Promise<boolean> => {
    const idNum = parseInt(id, 10);
    if (!Number.isFinite(idNum)) {
      throw new Error('ID do lançamento inválido');
    }
    const result = await pool.query(
      'DELETE FROM lancamento WHERE id_lancamento = $1',
      [idNum]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  },
  
  // Bancos
  getBancos: async (): Promise<Banco[]> => {
    try {
      const result = await pool.query(`
        SELECT id_banco as id, nr_banco::text as numero, no_banco::text as nome
        FROM banco
        ORDER BY id_banco
      `);
      
      const bancos = result.rows.map(row => ({
        id: row.id,
        numero: getArrayValue(row.numero) || undefined,
        nome: getArrayValue(row.nome) || `Banco ${row.id}`
      }));
      
      // Adicionar "TODAS AS CONTAS" no início
      return [{ id: 0, nome: 'TODAS AS CONTAS' }, ...bancos];
    } catch (error) {
      console.error('Erro ao buscar bancos:', error);
      return [{ id: 0, nome: 'TODAS AS CONTAS' }];
    }
  },
  
  addBanco: async (banco: Omit<Banco, 'id'>): Promise<Banco> => {
    try {
      if (!banco.nome || banco.nome.trim() === '') {
        throw new Error('O nome do banco é obrigatório');
      }

      const nomeFmt = `{${salvarMaiusculo(banco.nome)}}`;
      const numeroFmt = banco.numero ? `{${salvarMaiusculo(banco.numero)}}` : null;

      const row = await executarInsertCompativel(
        async () => {
          const result = await pool.query(
            'INSERT INTO banco (nr_banco, no_banco) VALUES ($1, $2) RETURNING id_banco, nr_banco, no_banco',
            [numeroFmt, nomeFmt]
          );
          return result.rows[0];
        },
        async () => {
          const nextId = await proximoId('banco');
          const result = await pool.query(
            'INSERT INTO banco (id_banco, nr_banco, no_banco) VALUES ($1, $2, $3) RETURNING id_banco, nr_banco, no_banco',
            [nextId, numeroFmt, nomeFmt]
          );
          return result.rows[0];
        }
      );

      return {
        id: row.id_banco,
        numero: getArrayValue(row.nr_banco) || undefined,
        nome: getArrayValue(row.no_banco) || banco.nome
      };
    } catch (error) {
      console.error('Erro ao adicionar banco:', error);
      throw error;
    }
  },
  
  // Formas de Pagamento
  getFormasPagamento: async (): Promise<FormaPagamento[]> => {
    try {
      const result = await pool.query(`
        SELECT id_tp_operacao as id, no_tp_operacao as nome
        FROM tipo_operacao
        ORDER BY no_tp_operacao
      `);
      
      return result.rows.map(row => {
        const nome = getArrayValue(row.nome);
        // Garantir que não há aspas no nome
        const nomeLimpo = typeof nome === 'string' ? nome.replace(/^"+|"+$/g, '') : nome;
        return {
        id: row.id.toString(),
          nome: nomeLimpo || `Tipo ${row.id}`
        };
      });
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      return [];
    }
  },
  
  // Dashboard
  getDashboardInfo: async (conta?: string): Promise<{
    saldoAtual: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoSelecao: number;
  }> => {
    try {
      const lancamentos = await DataService.getLancamentos();
      const totalEntradas = calcularTotalEntradas(lancamentos, { conta });
      const totalSaidas = calcularTotalSaidas(lancamentos, { conta });
      const saldoAtual = calcularSaldo(lancamentos, conta);
      
      return {
        saldoAtual,
        totalEntradas,
        totalSaidas,
        saldoSelecao: totalEntradas - totalSaidas
      };
    } catch (error) {
      console.error('Erro ao buscar informações do dashboard:', error);
      return { saldoAtual: 0, totalEntradas: 0, totalSaidas: 0, saldoSelecao: 0 };
    }
  },
  
  // Fluxo de Caixa
  getFluxoCaixa: async (dataInicio?: Date, dataFim?: Date): Promise<FluxoCaixa[]> => {
    try {
      const lancamentos = await DataService.getLancamentos();
      
      // Agrupar por data
      const fluxoMap = new Map<string, FluxoCaixa>();
      
      lancamentos.forEach(lanc => {
        const dataOp = new Date(lanc.dataOperacao);
        const dataKey = dataOp.toISOString().split('T')[0];
        
        if (!fluxoMap.has(dataKey)) {
          const diaSemana = dataOp.toLocaleDateString('pt-BR', { weekday: 'short' });
          fluxoMap.set(dataKey, {
            data: dataKey,
            dia: diaSemana,
            entradasRealizado: 0,
            saidasRealizado: 0,
            saldoAtual: 0,
            entradasPlanejado: 0,
            saidasPlanejado: 0,
            saldoFuturo: 0
          });
        }
        
        const fluxo = fluxoMap.get(dataKey)!;
        const status = calcularStatus(lanc);
        
        if (status === 'Realizado') {
          fluxo.entradasRealizado += lanc.entradas || 0;
          fluxo.saidasRealizado += lanc.saidas || 0;
        } else if (status === 'Planejado') {
          fluxo.entradasPlanejado += lanc.entradas || 0;
          fluxo.saidasPlanejado += lanc.saidas || 0;
        }
      });
      
      // Calcular saldos acumulados
      let saldoAcumulado = 0;
      const fluxoArray = Array.from(fluxoMap.values())
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      
      fluxoArray.forEach(fluxo => {
        saldoAcumulado += (fluxo.entradasRealizado - fluxo.saidasRealizado);
        fluxo.saldoAtual = saldoAcumulado;
        
        saldoAcumulado += (fluxo.entradasPlanejado - fluxo.saidasPlanejado);
        fluxo.saldoFuturo = saldoAcumulado;
      });
      
      return fluxoArray;
    } catch (error) {
      console.error('Erro ao buscar fluxo de caixa:', error);
      return [];
    }
  },
  
  // Grupo de Categorias
  getGruposCategoria: async (): Promise<GrupoCategoria[]> => {
    try {
      const result = await pool.query(`
        SELECT id_grupo_categoria as id, tp_categoria as "tipoCategoria", no_grupo_categoria as nome
        FROM grupo_categoria
        ORDER BY tp_categoria, no_grupo_categoria
      `);
      
      return result.rows.map(row => {
        const tipoCategoriaCode = getArrayValue(row.tipoCategoria);
        const tipoCategoria = tipoCategoriaCode === 'E' ? 'Entrada' : tipoCategoriaCode === 'S' ? 'Saída' : 'Saída';
        
        return {
          id: row.id,
          tipoCategoria: tipoCategoria as 'Entrada' | 'Saída',
          nome: getArrayValue(row.nome) || ''
        };
      });
    } catch (error) {
      console.error('Erro ao buscar grupos de categoria:', error);
      return [];
    }
  },
  
  addGrupoCategoria: async (grupo: Omit<GrupoCategoria, 'id'>): Promise<GrupoCategoria> => {
    try {
      if (!grupo.nome || grupo.nome.trim() === '') {
        throw new Error('O nome do grupo de categoria é obrigatório');
      }

      const tipoCategoria = grupo.tipoCategoria || 'Saída';
      // Converter "Entrada" → "E" e "Saída" → "S"
      const tipoCategoriaCode = tipoCategoria === 'Entrada' ? 'E' : 'S';
      
      const tipoFmt = `{${tipoCategoriaCode}}`;
      const nomeFmt = `{${salvarMaiusculo(grupo.nome)}}`;

      const row = await executarInsertCompativel(
        async () => {
          const result = await pool.query(
            'INSERT INTO grupo_categoria (tp_categoria, no_grupo_categoria) VALUES ($1, $2) RETURNING id_grupo_categoria, tp_categoria, no_grupo_categoria',
            [tipoFmt, nomeFmt]
          );
          return result.rows[0];
        },
        async () => {
          const nextId = await proximoId('grupo_categoria');
          const result = await pool.query(
            'INSERT INTO grupo_categoria (id_grupo_categoria, tp_categoria, no_grupo_categoria) VALUES ($1, $2, $3) RETURNING id_grupo_categoria, tp_categoria, no_grupo_categoria',
            [nextId, tipoFmt, nomeFmt]
          );
          return result.rows[0];
        }
      );
      
      const tipoCategoriaRetrieved = getArrayValue(row.tp_categoria);
      const tipoCategoriaFinal = tipoCategoriaRetrieved === 'E' ? 'Entrada' : tipoCategoriaRetrieved === 'S' ? 'Saída' : tipoCategoria;
      
      return {
        id: row.id_grupo_categoria,
        tipoCategoria: tipoCategoriaFinal as 'Entrada' | 'Saída',
        nome: getArrayValue(row.no_grupo_categoria) || grupo.nome
      };
    } catch (error: any) {
      console.error('Erro ao adicionar grupo de categoria:', error);
      if (error.message) {
        throw new Error(error.message);
      }
      throw error;
    }
  },
  
  deleteGrupoCategoria: async (id: number): Promise<boolean> => {
    try {
      const result = await pool.query(
        'DELETE FROM grupo_categoria WHERE id_grupo_categoria = $1',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir grupo de categoria:', error);
      return false;
    }
  },
  
  // Categorias
  getCategorias: async (): Promise<(Categoria & { tipoGrupo?: string })[]> => {
    try {
      await ensureCategoriaFkCorrigida();
      const result = await pool.query(`
        SELECT 
          c.id_categoria as id, 
          c.id_grupo_categoria as "grupoCategoriaId", 
          c.no_categoria as nome,
          gc.tp_categoria as "tipoGrupo"
        FROM categoria c
        LEFT JOIN grupo_categoria gc ON c.id_grupo_categoria = gc.id_grupo_categoria
        ORDER BY c.no_categoria
      `);
      
      return result.rows.map(row => {
        const tipoGrupo = getArrayValue(row.tipoGrupo);
        return {
          id: row.id,
          grupoCategoriaId: row.grupoCategoriaId,
          nome: row.nome || '', // no_categoria é TEXT, não ARRAY
          tipoGrupo: tipoGrupo === 'E' ? 'E' : tipoGrupo === 'S' ? 'S' : 'S' // Default para Saída
        };
      });
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
  },
  
  addCategoria: async (categoria: Omit<Categoria, 'id'>): Promise<Categoria> => {
    try {
      await ensureCategoriaFkCorrigida();

      if (!categoria.nome || categoria.nome.trim() === '') {
        throw new Error('O nome da categoria é obrigatório');
      }

      if (!categoria.grupoCategoriaId || categoria.grupoCategoriaId === 0) {
        throw new Error('O grupo de categoria é obrigatório');
      }

      const grupoCheck = await pool.query(
        'SELECT id_grupo_categoria FROM grupo_categoria WHERE id_grupo_categoria = $1',
        [categoria.grupoCategoriaId]
      );
      if (grupoCheck.rows.length === 0) {
        throw new Error('Grupo de categoria selecionado não existe');
      }

      const nomeCat = salvarMaiusculo(categoria.nome);
      const row = await executarInsertCompativel(
        async () => {
          const result = await pool.query(
            'INSERT INTO categoria (id_grupo_categoria, no_categoria) VALUES ($1, $2) RETURNING id_categoria, id_grupo_categoria, no_categoria',
            [categoria.grupoCategoriaId, nomeCat]
          );
          return result.rows[0];
        },
        async () => {
          const nextId = await proximoId('categoria');
          const result = await pool.query(
            'INSERT INTO categoria (id_categoria, id_grupo_categoria, no_categoria) VALUES ($1, $2, $3) RETURNING id_categoria, id_grupo_categoria, no_categoria',
            [nextId, categoria.grupoCategoriaId, nomeCat]
          );
          return result.rows[0];
        }
      );
      return {
        id: row.id_categoria,
        grupoCategoriaId: row.id_grupo_categoria,
        nome: row.no_categoria || categoria.nome
      };
    } catch (error: any) {
      console.error('Erro ao adicionar categoria:', error);
      if (error.message) {
        throw new Error(error.message);
      }
      throw error;
    }
  },
  
  deleteCategoria: async (id: number): Promise<boolean> => {
    try {
      const result = await pool.query(
        'DELETE FROM categoria WHERE id_categoria = $1',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      return false;
    }
  },
  
  // Pessoas
  searchPessoas: async (termo: string): Promise<Pessoa[]> => {
    try {
      const search = termo?.trim();
      if (!search) return [];
      const result = await pool.query(
        `
        SELECT 
          id_pessoa as id,
          no_pessoa as nome
        FROM pessoa
        WHERE no_pessoa::text ILIKE $1
        ORDER BY no_pessoa ASC
        LIMIT 10
        `,
        [`%${search}%`]
      );

      return result.rows
        .map(row => ({
          id: row.id,
          nome: getArrayValue(row.nome) || '',
          tipoPessoa: 'Física' as const
        }))
        .filter(p => p.nome);
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
      return [];
    }
  },

  getPessoas: async (incluirIncompletas: boolean = true): Promise<Pessoa[]> => {
    try {
      const result = await pool.query(`
        SELECT 
          id_pessoa as id,
          no_pessoa as nome,
          no_fantasia as "nomeFantasia",
          tp_pessoa as "tipoPessoa",
          nr_documento as documento,
          no_logradouro as logradouro,
          nr_logradouro as "numeroLogradouro",
          ds_complemento as complemento,
          nr_inscricaoestadual as "inscricaoEstadual",
          no_situacao_pessoa as "situacaoPessoa",
          tp_parte_interessada as "tipoParteInteressada"
        FROM pessoa
        ${incluirIncompletas ? '' : "WHERE no_situacao_pessoa IS NULL OR no_situacao_pessoa::text NOT LIKE '%Incompleto%'"}
        ORDER BY 
          CASE WHEN no_situacao_pessoa::text LIKE '%Incompleto%' THEN 0 ELSE 1 END,
          no_pessoa
      `);
      
      return result.rows.map(row => {
        const situacaoPessoa = getArrayValue(row.situacaoPessoa);
        const isIncompleta = situacaoPessoa === 'Incompleto';
        
        return {
          id: row.id,
          nome: getArrayValue(row.nome) || '',
          nomeFantasia: getArrayValue(row.nomeFantasia) || undefined,
          tipoPessoa: (getArrayValue(row.tipoPessoa) === 'J' || getArrayValue(row.tipoPessoa) === 'Jurídica') ? 'Jurídica' : 'Física',
          documento: getArrayValue(row.documento) || undefined,
          logradouro: getArrayValue(row.logradouro) || undefined,
          numeroLogradouro: getArrayValue(row.numeroLogradouro) || undefined,
          complemento: getArrayValue(row.complemento) || undefined,
          inscricaoEstadual: getArrayValue(row.inscricaoEstadual) || undefined,
          situacaoPessoa: situacaoPessoa || undefined,
          tipoParteInteressada: row.tipoParteInteressada === 1 ? 'C' : row.tipoParteInteressada === 2 ? 'F' : undefined,
          _isIncompleta: isIncompleta
        } as Pessoa & { _isIncompleta?: boolean };
      });
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
      return [];
    }
  },
  
  addPessoa: async (pessoa: Omit<Pessoa, 'id'>): Promise<Pessoa> => {
    try {
      if (!pessoa.nome || pessoa.nome.trim() === '') {
        throw new Error('O nome da pessoa é obrigatório');
      }
      
      const pessoaParams = [
        `{${salvarMaiusculo(pessoa.nome)}}`,
        pessoa.nomeFantasia ? `{${salvarMaiusculo(pessoa.nomeFantasia)}}` : null,
        pessoa.tipoPessoa === 'Jurídica' ? ['J'] : ['F'],
        pessoa.documento ? `{${somenteDigitos(pessoa.documento)}}` : null,
        pessoa.logradouro ? `{${salvarMaiusculo(pessoa.logradouro)}}` : null,
        pessoa.numeroLogradouro ? `{${salvarMaiusculo(pessoa.numeroLogradouro)}}` : null,
        pessoa.complemento ? `{${salvarMaiusculo(pessoa.complemento)}}` : null,
        pessoa.inscricaoEstadual ? `{${salvarMaiusculo(pessoa.inscricaoEstadual)}}` : null,
        pessoa.situacaoPessoa && pessoa.situacaoPessoa.trim().length === 1
          ? `{${salvarMaiusculo(pessoa.situacaoPessoa)}}`
          : null,
        pessoa.tipoParteInteressada === 'C' ? 1 : pessoa.tipoParteInteressada === 'F' ? 2 : null
      ];

      const row = await executarInsertCompativel(
        async () => {
          const result = await pool.query(`
            INSERT INTO pessoa (
              no_pessoa, no_fantasia, tp_pessoa, nr_documento,
              no_logradouro, nr_logradouro, ds_complemento,
              nr_inscricaoestadual, no_situacao_pessoa, tp_parte_interessada
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id_pessoa, no_pessoa, no_fantasia, tp_pessoa, nr_documento,
              no_logradouro, nr_logradouro, ds_complemento,
              nr_inscricaoestadual, no_situacao_pessoa, tp_parte_interessada
          `, pessoaParams);
          return result.rows[0];
        },
        async () => {
          const nextId = await proximoId('pessoa');
          const result = await pool.query(`
            INSERT INTO pessoa (
              id_pessoa, no_pessoa, no_fantasia, tp_pessoa, nr_documento,
              no_logradouro, nr_logradouro, ds_complemento,
              nr_inscricaoestadual, no_situacao_pessoa, tp_parte_interessada
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id_pessoa, no_pessoa, no_fantasia, tp_pessoa, nr_documento,
              no_logradouro, nr_logradouro, ds_complemento,
              nr_inscricaoestadual, no_situacao_pessoa, tp_parte_interessada
          `, [nextId, ...pessoaParams]);
          return result.rows[0];
        }
      );
      
      return {
        id: row.id_pessoa,
        nome: getArrayValue(row.no_pessoa) || pessoa.nome,
        nomeFantasia: getArrayValue(row.no_fantasia) || undefined,
        tipoPessoa: (getArrayValue(row.tp_pessoa) === 'J' || getArrayValue(row.tp_pessoa) === 'Jurídica') ? 'Jurídica' : 'Física',
        documento: getArrayValue(row.nr_documento) || undefined,
        logradouro: getArrayValue(row.no_logradouro) || undefined,
        numeroLogradouro: getArrayValue(row.nr_logradouro) || undefined,
        complemento: getArrayValue(row.ds_complemento) || undefined,
        inscricaoEstadual: getArrayValue(row.nr_inscricaoestadual) || undefined,
        situacaoPessoa: getArrayValue(row.no_situacao_pessoa) || undefined,
        tipoParteInteressada: row.tp_parte_interessada === 1 ? 'C' : row.tp_parte_interessada === 2 ? 'F' : undefined
      };
    } catch (error: any) {
      console.error('Erro ao adicionar pessoa:', error);
      // Melhorar mensagem de erro
      if (error.message) {
        throw new Error(error.message);
      }
      throw error;
    }
  },
  
  deletePessoa: async (id: number): Promise<boolean> => {
    try {
      const result = await pool.query(
        'DELETE FROM pessoa WHERE id_pessoa = $1',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      return false;
    }
  },
  
  // Formas de Operação (Tipo Operação)
  addFormaOperacao: async (forma: Omit<FormaPagamento, 'id'>): Promise<FormaPagamento> => {
    try {
      if (!forma.nome || forma.nome.trim() === '') {
        throw new Error('O nome da forma de operação é obrigatório');
      }

      const nomeFmt = `{${salvarMaiusculo(forma.nome)}}`;
      const row = await executarInsertCompativel(
        async () => {
          const result = await pool.query(
            'INSERT INTO tipo_operacao (no_tp_operacao) VALUES ($1) RETURNING id_tp_operacao, no_tp_operacao',
            [nomeFmt]
          );
          return result.rows[0];
        },
        async () => {
          const nextId = await proximoId('tipo_operacao');
          const result = await pool.query(
            'INSERT INTO tipo_operacao (id_tp_operacao, no_tp_operacao) VALUES ($1, $2) RETURNING id_tp_operacao, no_tp_operacao',
            [nextId, nomeFmt]
          );
          return result.rows[0];
        }
      );
      return {
        id: row.id_tp_operacao.toString(),
        nome: getArrayValue(row.no_tp_operacao) || forma.nome
      };
    } catch (error: any) {
      console.error('Erro ao adicionar forma de operação:', error);
      if (error.message) {
        throw new Error(error.message);
      }
      throw error;
    }
  },
  
  deleteFormaOperacao: async (id: string): Promise<boolean> => {
    try {
      const result = await pool.query(
        'DELETE FROM tipo_operacao WHERE id_tp_operacao = $1',
        [parseInt(id)]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir forma de operação:', error);
      return false;
    }
  },
  
  deleteBanco: async (id: number): Promise<boolean> => {
    try {
      const result = await pool.query(
        'DELETE FROM banco WHERE id_banco = $1 AND id_banco != 0',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir banco:', error);
      return false;
    }
  },
  
  // Agências
  getAgencias: async (): Promise<Agencia[]> => {
    try {
      const result = await pool.query(`
        SELECT 
          id_agencia as id,
          id_banco as "bancoId",
          nr_agencia as numero,
          no_agencia as nome
        FROM agencia
        ORDER BY id_banco, no_agencia
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        bancoId: row.bancoId || 0,
        numero: getArrayValue(row.numero) || undefined,
        nome: getArrayValue(row.nome) || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar agências:', error);
      return [];
    }
  },
  
  addAgencia: async (agencia: Omit<Agencia, 'id'>): Promise<Agencia> => {
    try {
      if (!agencia.nome || agencia.nome.trim() === '') {
        throw new Error('O nome da agência é obrigatório');
      }
      
      if (!agencia.bancoId || agencia.bancoId === 0) {
        throw new Error('Selecione um banco');
      }
      
      // Verificar se o banco existe
      const bancoCheck = await pool.query(
        'SELECT id_banco FROM banco WHERE id_banco = $1',
        [agencia.bancoId]
      );
      
      if (bancoCheck.rows.length === 0) {
        throw new Error('Banco selecionado não existe');
      }
      
      const numeroFmt = agencia.numero ? `{${salvarMaiusculo(agencia.numero)}}` : null;
      const nomeFmt = `{${salvarMaiusculo(agencia.nome)}}`;

      const row = await executarInsertCompativel(
        async () => {
          const result = await pool.query(
            'INSERT INTO agencia (id_banco, nr_agencia, no_agencia) VALUES ($1, $2, $3) RETURNING id_agencia, id_banco, nr_agencia, no_agencia',
            [agencia.bancoId, numeroFmt, nomeFmt]
          );
          return result.rows[0];
        },
        async () => {
          const nextId = await proximoId('agencia');
          const result = await pool.query(
            'INSERT INTO agencia (id_agencia, id_banco, nr_agencia, no_agencia) VALUES ($1, $2, $3, $4) RETURNING id_agencia, id_banco, nr_agencia, no_agencia',
            [nextId, agencia.bancoId, numeroFmt, nomeFmt]
          );
          return result.rows[0];
        }
      );
      return {
        id: row.id_agencia,
        bancoId: row.id_banco || agencia.bancoId,
        numero: getArrayValue(row.nr_agencia) || undefined,
        nome: getArrayValue(row.no_agencia) || agencia.nome
      };
    } catch (error) {
      console.error('Erro ao adicionar agência:', error);
      throw error;
    }
  },
  
  deleteAgencia: async (id: number): Promise<boolean> => {
    try {
      const result = await pool.query(
        'DELETE FROM agencia WHERE id_agencia = $1',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir agência:', error);
      return false;
    }
  },

  // Orçamento por categoria
  getCategoriaOrcamentos: async (mes: number, ano: number, categoriaId?: number): Promise<CategoriaOrcamento[]> => {
    try {
      await ensureCategoriaOrcamentoTable();
      const params: (number | string)[] = [mes, ano];
      let filtroCategoria = '';
      if (categoriaId) {
        filtroCategoria = ' AND co.categoria_id = $3';
        params.push(categoriaId);
      }
      const result = await pool.query(
        `
        SELECT
          co.id,
          co.categoria_id as "categoriaId",
          c.no_categoria as "categoriaNome",
          co.mes,
          co.ano,
          co.valor_previsto as "valorPrevisto"
        FROM categoria_orcamento co
        JOIN categoria c ON c.id_categoria = co.categoria_id
        WHERE co.mes = $1 AND co.ano = $2
        ${filtroCategoria}
        ORDER BY c.no_categoria
        `,
        params
      );
      return result.rows.map(row => ({
        id: row.id,
        categoriaId: row.categoriaId,
        categoriaNome: row.categoriaNome || '',
        mes: row.mes,
        ano: row.ano,
        valorPrevisto: parseFloat(row.valorPrevisto) || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      return [];
    }
  },

  upsertCategoriaOrcamento: async (orcamento: Omit<CategoriaOrcamento, 'id' | 'categoriaNome'>): Promise<CategoriaOrcamento> => {
    try {
      await ensureCategoriaOrcamentoTable();
      const valor = parseFloat(String(orcamento.valorPrevisto)) || 0;
      const result = await pool.query(
        `
        INSERT INTO categoria_orcamento (categoria_id, mes, ano, valor_previsto)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (categoria_id, mes, ano)
        DO UPDATE SET valor_previsto = EXCLUDED.valor_previsto
        RETURNING id, categoria_id, mes, ano, valor_previsto
        `,
        [orcamento.categoriaId, orcamento.mes, orcamento.ano, valor]
      );
      const row = result.rows[0];
      const catResult = await pool.query(
        'SELECT no_categoria FROM categoria WHERE id_categoria = $1',
        [row.categoria_id]
      );
      return {
        id: row.id,
        categoriaId: row.categoria_id,
        categoriaNome: catResult.rows[0]?.no_categoria || '',
        mes: row.mes,
        ano: row.ano,
        valorPrevisto: parseFloat(row.valor_previsto) || 0
      };
    } catch (error: any) {
      console.error('Erro ao salvar orçamento:', error);
      throw new Error(error.message || 'Erro ao salvar orçamento');
    }
  },

  deleteCategoriaOrcamento: async (id: number): Promise<boolean> => {
    try {
      await ensureCategoriaOrcamentoTable();
      const result = await pool.query(
        'DELETE FROM categoria_orcamento WHERE id = $1',
        [id]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      return false;
    }
  },

  getOrcadoRealizado: async (filtros: {
    mes: number;
    ano: number;
    categoriaId?: number;
    conta?: string;
  }): Promise<OrcadoRealizadoDashboard> => {
    const { mes, ano, categoriaId, conta } = filtros;
    await ensureCategoriaOrcamentoTable();

    const categorias = await DataService.getCategorias();
    const categoriasDespesa = categorias.filter(c => c.tipoGrupo === 'S');
    const mapaNomeParaId = new Map(categoriasDespesa.map(c => [c.nome.trim().toLowerCase(), c.id!]));

    const orcamentos = await DataService.getCategoriaOrcamentos(mes, ano, categoriaId);
    const orcamentoPorCategoriaId = new Map(orcamentos.map(o => [o.categoriaId, o]));

    const lancamentos = await DataService.getLancamentos();
    const gastoPorCategoriaId = new Map<number, number>();

    for (const lanc of lancamentos) {
      if (conta && conta !== 'TODAS AS CONTAS' && lanc.conta !== conta) continue;
      if (calcularStatus(lanc) !== 'Realizado') continue;

      const dataRef = lanc.dataCompensacao || lanc.dataOperacao;
      if (!dataNoPeriodo(dataRef, mes, ano)) continue;

      const nomeCat = (lanc.categoria || '').trim().toLowerCase();
      if (!nomeCat) continue;

      const catId = mapaNomeParaId.get(nomeCat);
      if (!catId) continue;
      if (categoriaId && catId !== categoriaId) continue;

      const gasto = lanc.saidas || 0;
      if (gasto <= 0) continue;

      gastoPorCategoriaId.set(catId, (gastoPorCategoriaId.get(catId) || 0) + gasto);
    }

    const idsExibir = new Set<number>();
    for (const o of orcamentos) idsExibir.add(o.categoriaId);
    for (const id of gastoPorCategoriaId.keys()) idsExibir.add(id);

    if (categoriaId) {
      idsExibir.clear();
      idsExibir.add(categoriaId);
    }

    const itens: OrcadoRealizadoItem[] = Array.from(idsExibir)
      .map(id => {
        const cat = categoriasDespesa.find(c => c.id === id);
        const orc = orcamentoPorCategoriaId.get(id);
        const valorPrevisto = orc?.valorPrevisto ?? 0;
        const totalGasto = gastoPorCategoriaId.get(id) || 0;
        const valorRestante = valorPrevisto - totalGasto;
        const percentualAtingido = valorPrevisto > 0
          ? (totalGasto / valorPrevisto) * 100
          : (totalGasto > 0 ? 100 : 0);

        return {
          categoriaId: id,
          categoriaNome: cat?.nome || orc?.categoriaNome || `Categoria ${id}`,
          valorPrevisto,
          totalGasto,
          valorRestante,
          percentualAtingido
        };
      })
      .sort((a, b) => a.categoriaNome.localeCompare(b.categoriaNome, 'pt-BR'));

    const totalOrcado = itens.reduce((s, i) => s + i.valorPrevisto, 0);
    const totalGasto = itens.reduce((s, i) => s + i.totalGasto, 0);
    const saldoDisponivel = totalOrcado - totalGasto;
    const percentualGeralConsumido = totalOrcado > 0
      ? (totalGasto / totalOrcado) * 100
      : (totalGasto > 0 ? 100 : 0);

    return {
      mes,
      ano,
      itens,
      totalOrcado,
      totalGasto,
      saldoDisponivel,
      percentualGeralConsumido
    };
  }
};
