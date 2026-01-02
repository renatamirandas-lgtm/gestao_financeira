// Versão com banco de dados PostgreSQL (Neon) - Usando tabelas existentes

import pool from './db';
import { Lancamento, Banco, FormaPagamento, FluxoCaixa, ResultadoMensal, GrupoCategoria, Categoria, Pessoa, Agencia } from '@/types';

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
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    // PostgreSQL array format {value1,value2}
    const parsed = value.slice(1, -1).split(',');
    return parsed[0] || null;
  }
  return value;
}

// API de dados usando PostgreSQL com tabelas existentes

export const DataService = {
  // Lançamentos
  getLancamentos: async (): Promise<Lancamento[]> => {
    try {
      // Query simples usando apenas campos que sabemos que existem
      const result = await pool.query(`
        SELECT 
          id_lancamento as id,
          'TODAS AS CONTAS' as conta,
          dt_operacao as "dataOperacao",
          '' as "clienteFornecedor",
          ds_lancamento as descricao,
          qt_parcelas as parcelas,
          '' as categoria,
          vl_entrada as entradas,
          vl_saida as saidas,
          '' as "formaOperacao",
          dt_vencimento as "dataVencimento",
          dt_compensacao as "dataCompensacao"
        FROM lancamento
        ORDER BY dt_operacao DESC
      `);
      
      return result.rows.map(row => {
        const lanc: any = {
          id: row.id?.toString(),
          conta: getArrayValue(row.conta) || 'TODAS AS CONTAS',
          dataOperacao: row.dataOperacao,
          clienteFornecedor: getArrayValue(row.clienteFornecedor) || '',
          descricao: getArrayValue(row.descricao) || '',
          parcelas: parseInt(getArrayValue(row.parcelas)) || 1,
          categoria: getArrayValue(row.categoria) || '',
          entradas: parseFloat(getArrayValue(row.entradas)) || 0,
          saidas: parseFloat(getArrayValue(row.saidas)) || 0,
          formaOperacao: getArrayValue(row.formaOperacao) || '',
          dataVencimento: row.dataVencimento || null,
          dataCompensacao: row.dataCompensacao || null,
        };
        lanc.status = calcularStatus(lanc);
        return lanc;
      });
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      return [];
    }
  },
  
  addLancamento: async (lancamento: Lancamento): Promise<Lancamento> => {
    try {
      // Inserir apenas campos que sabemos que existem (sem FKs por enquanto)
      const result = await pool.query(`
        INSERT INTO lancamento (
          dt_operacao, ds_lancamento, qt_parcelas,
          vl_entrada, vl_saida, dt_vencimento, dt_compensacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id_lancamento
      `, [
        lancamento.dataOperacao,
        `{${lancamento.descricao}}`,
        `{${lancamento.parcelas || 1}}`,
        `{${lancamento.entradas || 0}}`,
        `{${lancamento.saidas || 0}}`,
        lancamento.dataVencimento || null,
        lancamento.dataCompensacao || null
      ]);
      
      const id = result.rows[0].id_lancamento.toString();
      const status = calcularStatus(lancamento);
      
      return { ...lancamento, id, status };
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error);
      throw error;
    }
  },
  
  updateLancamento: async (id: string, lancamento: Partial<Lancamento>): Promise<Lancamento | null> => {
    try {
      // Buscar lançamento existente
      const existing = await pool.query(
        'SELECT * FROM lancamento WHERE id_lancamento = $1',
        [parseInt(id)]
      );
      
      if (existing.rows.length === 0) return null;
      
      const existingRow = existing.rows[0];
      
      await pool.query(`
        UPDATE lancamento SET
          dt_operacao = COALESCE($2, dt_operacao),
          ds_lancamento = COALESCE($3, ds_lancamento),
          qt_parcelas = COALESCE($4, qt_parcelas),
          vl_entrada = COALESCE($5, vl_entrada),
          vl_saida = COALESCE($6, vl_saida),
          dt_vencimento = $7,
          dt_compensacao = $8
        WHERE id_lancamento = $1
      `, [
        parseInt(id),
        lancamento.dataOperacao || existingRow.dt_operacao,
        lancamento.descricao ? `{${lancamento.descricao}}` : existingRow.ds_lancamento,
        lancamento.parcelas ? `{${lancamento.parcelas}}` : existingRow.qt_parcelas,
        lancamento.entradas !== undefined ? `{${lancamento.entradas}}` : existingRow.vl_entrada,
        lancamento.saidas !== undefined ? `{${lancamento.saidas}}` : existingRow.vl_saida,
        lancamento.dataVencimento || existingRow.dt_vencimento,
        lancamento.dataCompensacao || existingRow.dt_compensacao
      ]);
      
      const updated = await DataService.getLancamentos();
      return updated.find(l => l.id === id) || null;
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      return null;
    }
  },
  
  deleteLancamento: async (id: string): Promise<boolean> => {
    try {
      const result = await pool.query(
        'DELETE FROM lancamento WHERE id_lancamento = $1',
        [parseInt(id)]
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      return false;
    }
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
      const result = await pool.query(
        'INSERT INTO banco (nr_banco, no_banco) VALUES ($1, $2) RETURNING id_banco, nr_banco, no_banco',
        [
          banco.numero ? `{${banco.numero}}` : null,
          `{${banco.nome}}`
        ]
      );
      return {
        id: result.rows[0].id_banco,
        numero: getArrayValue(result.rows[0].nr_banco) || undefined,
        nome: getArrayValue(result.rows[0].no_banco) || banco.nome
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
        SELECT id_tp_operacao as id, no_tp_operacao::text as nome
        FROM tipo_operacao
        ORDER BY no_tp_operacao
      `);
      
      return result.rows.map(row => ({
        id: row.id.toString(),
        nome: getArrayValue(row.nome) || `Tipo ${row.id}`
      }));
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
      
      return result.rows.map(row => ({
        id: row.id,
        tipoCategoria: row.tipoCategoria || 'Saída',
        nome: getArrayValue(row.nome) || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar grupos de categoria:', error);
      return [];
    }
  },
  
  addGrupoCategoria: async (grupo: Omit<GrupoCategoria, 'id'>): Promise<GrupoCategoria> => {
    try {
      const result = await pool.query(
        'INSERT INTO grupo_categoria (tp_categoria, no_grupo_categoria) VALUES ($1, $2) RETURNING id_grupo_categoria, tp_categoria, no_grupo_categoria',
        [grupo.tipoCategoria, `{${grupo.nome}}`]
      );
      return {
        id: result.rows[0].id_grupo_categoria,
        tipoCategoria: result.rows[0].tp_categoria,
        nome: getArrayValue(result.rows[0].no_grupo_categoria) || grupo.nome
      };
    } catch (error) {
      console.error('Erro ao adicionar grupo de categoria:', error);
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
  getCategorias: async (): Promise<Categoria[]> => {
    try {
      const result = await pool.query(`
        SELECT id_categoria as id, id_grupo_categoria as "grupoCategoriaId", no_categoria as nome
        FROM categoria
        ORDER BY no_categoria
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        grupoCategoriaId: row.grupoCategoriaId,
        nome: getArrayValue(row.nome) || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
  },
  
  addCategoria: async (categoria: Omit<Categoria, 'id'>): Promise<Categoria> => {
    try {
      const result = await pool.query(
        'INSERT INTO categoria (id_grupo_categoria, no_categoria) VALUES ($1, $2) RETURNING id_categoria, id_grupo_categoria, no_categoria',
        [categoria.grupoCategoriaId, `{${categoria.nome}}`]
      );
      return {
        id: result.rows[0].id_categoria,
        grupoCategoriaId: result.rows[0].id_grupo_categoria,
        nome: getArrayValue(result.rows[0].no_categoria) || categoria.nome
      };
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
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
  getPessoas: async (): Promise<Pessoa[]> => {
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
        ORDER BY no_pessoa
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        nome: getArrayValue(row.nome) || '',
        nomeFantasia: getArrayValue(row.nomeFantasia) || undefined,
        tipoPessoa: row.tipoPessoa || 'Física',
        documento: getArrayValue(row.documento) || undefined,
        logradouro: getArrayValue(row.logradouro) || undefined,
        numeroLogradouro: getArrayValue(row.numeroLogradouro) || undefined,
        complemento: getArrayValue(row.complemento) || undefined,
        inscricaoEstadual: getArrayValue(row.inscricaoEstadual) || undefined,
        situacaoPessoa: getArrayValue(row.situacaoPessoa) || undefined,
        tipoParteInteressada: getArrayValue(row.tipoParteInteressada) || undefined
      }));
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
      return [];
    }
  },
  
  addPessoa: async (pessoa: Omit<Pessoa, 'id'>): Promise<Pessoa> => {
    try {
      const result = await pool.query(`
        INSERT INTO pessoa (
          no_pessoa, no_fantasia, tp_pessoa, nr_documento,
          no_logradouro, nr_logradouro, ds_complemento,
          nr_inscricaoestadual, no_situacao_pessoa, tp_parte_interessada
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id_pessoa, no_pessoa, no_fantasia, tp_pessoa, nr_documento,
          no_logradouro, nr_logradouro, ds_complemento,
          nr_inscricaoestadual, no_situacao_pessoa, tp_parte_interessada
      `, [
        `{${pessoa.nome}}`,
        pessoa.nomeFantasia ? `{${pessoa.nomeFantasia}}` : null,
        pessoa.tipoPessoa || 'Física',
        pessoa.documento ? `{${pessoa.documento}}` : null,
        pessoa.logradouro ? `{${pessoa.logradouro}}` : null,
        pessoa.numeroLogradouro ? `{${pessoa.numeroLogradouro}}` : null,
        pessoa.complemento ? `{${pessoa.complemento}}` : null,
        pessoa.inscricaoEstadual ? `{${pessoa.inscricaoEstadual}}` : null,
        pessoa.situacaoPessoa ? `{${pessoa.situacaoPessoa}}` : null,
        pessoa.tipoParteInteressada ? `{${pessoa.tipoParteInteressada}}` : null
      ]);
      
      const row = result.rows[0];
      return {
        id: row.id_pessoa,
        nome: getArrayValue(row.no_pessoa) || pessoa.nome,
        nomeFantasia: getArrayValue(row.no_fantasia) || undefined,
        tipoPessoa: row.tp_pessoa || 'Física',
        documento: getArrayValue(row.nr_documento) || undefined,
        logradouro: getArrayValue(row.no_logradouro) || undefined,
        numeroLogradouro: getArrayValue(row.nr_logradouro) || undefined,
        complemento: getArrayValue(row.ds_complemento) || undefined,
        inscricaoEstadual: getArrayValue(row.nr_inscricaoestadual) || undefined,
        situacaoPessoa: getArrayValue(row.no_situacao_pessoa) || undefined,
        tipoParteInteressada: getArrayValue(row.tp_parte_interessada) || undefined
      };
    } catch (error) {
      console.error('Erro ao adicionar pessoa:', error);
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
      const result = await pool.query(
        'INSERT INTO tipo_operacao (ds_tp_operacao) VALUES ($1) RETURNING id_tp_operacao, ds_tp_operacao',
        [`{${forma.nome}}`]
      );
      return {
        id: result.rows[0].id_tp_operacao.toString(),
        nome: getArrayValue(result.rows[0].ds_tp_operacao) || forma.nome
      };
    } catch (error) {
      console.error('Erro ao adicionar forma de operação:', error);
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
          no_agencia_agencia as nome
        FROM agencia
        ORDER BY id_banco, no_agencia_agencia
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        bancoId: row.bancoId,
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
      const result = await pool.query(
        'INSERT INTO agencia (id_banco, nr_agencia, no_agencia_agencia) VALUES ($1, $2, $3) RETURNING id_agencia, id_banco, nr_agencia, no_agencia_agencia',
        [
          agencia.bancoId,
          agencia.numero ? `{${agencia.numero}}` : null,
          `{${agencia.nome}}`
        ]
      );
      return {
        id: result.rows[0].id_agencia,
        bancoId: result.rows[0].id_banco,
        numero: getArrayValue(result.rows[0].nr_agencia) || undefined,
        nome: getArrayValue(result.rows[0].no_agencia_agencia) || agencia.nome
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
  }
};
