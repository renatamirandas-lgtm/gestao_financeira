import { DataService } from './data';
import { Lancamento } from '@/types';
import type { LancamentoImportRow } from './importacao-excel';

export type ResultadoImportacao = {
  importados: number;
  erros: Array<{ linha: number; mensagem: string }>;
};

export async function importarLancamentosPlanilha(
  linhas: LancamentoImportRow[]
): Promise<ResultadoImportacao> {
  const erros: Array<{ linha: number; mensagem: string }> = [];
  let importados = 0;

  for (const row of linhas) {
    try {
      const lancamento: Lancamento & { valor?: number } = {
        conta: row.conta,
        dataOperacao: row.dataOperacao,
        clienteFornecedor: row.clienteFornecedor,
        descricao: row.descricao,
        categoria: row.categoria,
        formaOperacao: row.formaOperacao,
        valor: row.valor,
        entradas: row.entradas,
        saidas: row.saidas,
        numeroParcela: row.numeroParcela,
        totalParcelas: row.totalParcelas,
        dataVencimento: row.dataVencimento ?? undefined,
        dataCompensacao: row.dataCompensacao ?? undefined
      };
      await DataService.addLancamento(lancamento);
      importados++;
    } catch (e: any) {
      erros.push({
        linha: row.linha,
        mensagem: e?.message || 'Erro ao gravar lançamento'
      });
    }
  }

  return { importados, erros };
}
