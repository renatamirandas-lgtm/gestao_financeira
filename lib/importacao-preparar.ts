import type { ErroImportacao, LancamentoImportRow } from './importacao-excel';
import { expandirParcelamentoLinha } from './parcelas';

export function prepararLinhasImportacao(linhas: LancamentoImportRow[]): {
  linhas: LancamentoImportRow[];
  erros: ErroImportacao[];
} {
  const expandidas: LancamentoImportRow[] = [];
  const erros: ErroImportacao[] = [];

  for (const linha of linhas) {
    const { linhas: geradas, erro } = expandirParcelamentoLinha(linha);
    if (erro) {
      erros.push({ linha: linha.linha, mensagem: erro });
      continue;
    }
    expandidas.push(...geradas);
  }

  return { linhas: expandidas, erros };
}
