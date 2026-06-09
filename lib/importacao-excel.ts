import * as XLSX from 'xlsx';
import { normalizarParcelasCampos } from './parcelas';

export const COLUNAS_MODELO = [
  'Data Operacao',
  'Conta',
  'Cliente Fornecedor',
  'Categoria',
  'Forma Pagamento',
  'Descricao',
  'Valor',
  'Parcelas',
  'Data Vencimento',
  'Data Compensacao'
] as const;

export type LancamentoImportRow = {
  linha: number;
  conta: string;
  dataOperacao: string;
  clienteFornecedor: string;
  descricao: string;
  categoria: string;
  formaOperacao: string;
  valor: number;
  entradas: number;
  saidas: number;
  numeroParcela: number;
  totalParcelas: number;
  parcelasTexto: string;
  dataVencimento: string | null;
  dataCompensacao: string | null;
};

export type ErroImportacao = { linha: number; mensagem: string };

export type ResultadoParseExcel = {
  lancamentos: LancamentoImportRow[];
  erros: ErroImportacao[];
  totalLinhasPlanilha: number;
};

const ALIASES: Record<string, string> = {
  'data operacao': 'dataOperacao',
  'data de operacao': 'dataOperacao',
  'conta': 'conta',
  'cliente fornecedor': 'clienteFornecedor',
  'cliente/fornecedor': 'clienteFornecedor',
  'categoria': 'categoria',
  'forma pagamento': 'formaOperacao',
  'forma de pagamento': 'formaOperacao',
  'descricao': 'descricao',
  'valor': 'valor',
  'entradas': 'entradas',
  'saidas': 'saidas',
  'parcelas': 'parcelas',
  'data vencimento': 'dataVencimento',
  'data de vencimento': 'dataVencimento',
  'data compensacao': 'dataCompensacao',
  'data de compensacao': 'dataCompensacao'
};

function normalizarCabecalho(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function parseData(val: unknown): string | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number' && val > 0) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function parseNumero(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  let s = String(val).trim().replace(/R\$\s?/gi, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function linhaVazia(row: Record<string, unknown>): boolean {
  return Object.values(row).every(v => v == null || String(v).trim() === '');
}

export function parseExcelBuffer(buffer: ArrayBuffer): ResultadoParseExcel {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { lancamentos: [], erros: [{ linha: 0, mensagem: 'Planilha vazia' }], totalLinhasPlanilha: 0 };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const erros: ErroImportacao[] = [];
  const lancamentos: LancamentoImportRow[] = [];

  if (rows.length === 0) {
    return { lancamentos: [], erros: [{ linha: 0, mensagem: 'Nenhuma linha de dados' }], totalLinhasPlanilha: 0 };
  }

  const primeira = rows[0];
  const mapaColunas: Record<string, string> = {};
  for (const key of Object.keys(primeira)) {
    const norm = normalizarCabecalho(key);
    const campo = ALIASES[norm];
    if (campo) mapaColunas[key] = campo;
  }

  const temDataOp = Object.values(mapaColunas).includes('dataOperacao');
  const temDescricao = Object.values(mapaColunas).includes('descricao');
  if (!temDataOp || !temDescricao) {
    erros.push({
      linha: 1,
      mensagem: 'Cabeçalho inválido. Use o modelo com colunas: Data Operacao, Conta, Descrição, Valor, etc.'
    });
    return { lancamentos: [], erros, totalLinhasPlanilha: rows.length };
  }

  rows.forEach((raw, idx) => {
    const linhaPlanilha = idx + 2;
    if (linhaVazia(raw)) return;

    const dados: Record<string, unknown> = {};
    for (const [colExcel, campo] of Object.entries(mapaColunas)) {
      dados[campo] = raw[colExcel];
    }

    const dataOperacao = parseData(dados.dataOperacao);
    if (!dataOperacao) {
      erros.push({ linha: linhaPlanilha, mensagem: 'Data de operação inválida ou vazia' });
      return;
    }

    const descricao = String(dados.descricao ?? '').trim();
    if (!descricao) {
      erros.push({ linha: linhaPlanilha, mensagem: 'Descrição obrigatória' });
      return;
    }

    let entradas = parseNumero(dados.entradas);
    let saidas = parseNumero(dados.saidas);
    const valorCol = parseNumero(dados.valor);
    if (valorCol !== 0) {
      if (valorCol > 0) {
        entradas = Math.abs(valorCol);
        saidas = 0;
      } else {
        saidas = Math.abs(valorCol);
        entradas = 0;
      }
    } else if (entradas === 0 && saidas === 0) {
      erros.push({ linha: linhaPlanilha, mensagem: 'Valor, Entradas ou Saídas deve ser informado' });
      return;
    }

    const parcelasTexto = dados.parcelas != null ? String(dados.parcelas).trim() : '1';
    const parcelasNorm = normalizarParcelasCampos({ parcelas: parcelasTexto });

    lancamentos.push({
      linha: linhaPlanilha,
      conta: String(dados.conta ?? 'TODAS AS CONTAS').trim() || 'TODAS AS CONTAS',
      dataOperacao,
      clienteFornecedor: String(dados.clienteFornecedor ?? '').trim(),
      descricao,
      categoria: String(dados.categoria ?? '').trim(),
      formaOperacao: String(dados.formaOperacao ?? '').trim(),
      valor: entradas > 0 ? entradas : -saidas,
      entradas,
      saidas,
      numeroParcela: parcelasNorm.numeroParcela,
      totalParcelas: parcelasNorm.totalParcelas,
      parcelasTexto,
      dataVencimento: parseData(dados.dataVencimento),
      dataCompensacao: parseData(dados.dataCompensacao)
    });
  });

  return { lancamentos, erros, totalLinhasPlanilha: rows.length };
}

export function gerarModeloExcelBuffer(): ArrayBuffer {
  const exemplo = [
    '02/06/2026',
    'Santander',
    'Fornecedor Exemplo',
    'Aluguel',
    'Boleto',
    'Descrição do lançamento',
    -200,
    '1',
    '02/06/2026',
    ''
  ];
  const ws = XLSX.utils.aoa_to_sheet([COLUNAS_MODELO as unknown as string[], exemplo]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lancamentos');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
