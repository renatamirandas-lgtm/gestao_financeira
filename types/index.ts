// Tipos principais do sistema de gestão financeira

export interface Lancamento {
  id?: string;
  conta: string;
  dataOperacao: Date | string;
  clienteFornecedor: string;
  descricao: string;
  /** @deprecated Use numeroParcela e totalParcelas; mantido para compatibilidade na API */
  parcelas?: number | string;
  numeroParcela?: number;
  totalParcelas?: number;
  categoria: string;
  entradas: number;
  saidas: number;
  formaOperacao: string;
  dataVencimento?: Date | string;
  dataCompensacao?: Date | string;
  status?: 'Realizado' | 'Planejado' | '-';
}

export interface Banco {
  id: number;
  numero?: string;
  nome: string;
}

export interface FormaPagamento {
  id: string;
  nome: string;
}

export interface FluxoCaixa {
  data: Date | string;
  dia: string;
  entradasRealizado: number;
  saidasRealizado: number;
  saldoAtual: number;
  entradasPlanejado: number;
  saidasPlanejado: number;
  saldoFuturo: number;
}

export interface DashboardInfo {
  nomeUsuario?: string;
  saldoAtual?: number;
  totalEntradas?: number;
  totalSaidas?: number;
  saldoSelecao?: number;
}

export interface ResultadoMensal {
  mes: number;
  mesNome: string;
  dataInicio: Date | string;
  dataFim: Date | string;
  entradasRealizado: number;
  saidasRealizado: number;
  saldoRealizado: number;
  entradasPlanejado: number;
  saidasPlanejado: number;
  saldoPlanejado: number;
}

export interface GrupoCategoria {
  id?: number;
  tipoCategoria: 'Entrada' | 'Saída';
  nome: string;
}

export interface Categoria {
  id?: number;
  grupoCategoriaId: number;
  nome: string;
}

export interface Pessoa {
  id?: number;
  nome: string;
  nomeFantasia?: string;
  tipoPessoa: 'Física' | 'Jurídica';
  documento?: string;
  logradouro?: string;
  numeroLogradouro?: string;
  complemento?: string;
  inscricaoEstadual?: string;
  situacaoPessoa?: string;
  tipoParteInteressada?: string;
}

export interface Agencia {
  id?: number;
  bancoId: number;
  numero?: string;
  nome: string;
}

export interface CategoriaOrcamento {
  id?: number;
  categoriaId: number;
  categoriaNome?: string;
  mes: number;
  ano: number;
  valorPrevisto: number;
}

export interface OrcadoRealizadoItem {
  categoriaId: number;
  categoriaNome: string;
  valorPrevisto: number;
  totalGasto: number;
  valorRestante: number;
  percentualAtingido: number;
}

export interface OrcadoRealizadoDashboard {
  mes: number;
  ano: number;
  itens: OrcadoRealizadoItem[];
  totalOrcado: number;
  totalGasto: number;
  saldoDisponivel: number;
  percentualGeralConsumido: number;
}

