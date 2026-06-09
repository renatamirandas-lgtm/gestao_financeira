export function formatParcelaExibicao(numero?: number, total?: number): string {
  const n = Math.max(1, Number(numero) || 1);
  const t = Math.max(1, Number(total) || 1);
  if (t <= 1) return '1';
  return `${n}/${t}`;
}

export function normalizarParcelasCampos(input: {
  parcelas?: number | string | null;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
}): { numeroParcela: number; totalParcelas: number } {
  if (input.numeroParcela != null && input.totalParcelas != null) {
    return {
      numeroParcela: Math.max(1, Number(input.numeroParcela) || 1),
      totalParcelas: Math.max(1, Number(input.totalParcelas) || 1)
    };
  }
  const raw = input.parcelas;
  if (raw != null && raw !== '') {
    const s = String(raw).trim();
    if (s.includes('/')) {
      const [a, b] = s.split('/').map((x) => parseInt(x.trim(), 10));
      return {
        numeroParcela: Math.max(1, a || 1),
        totalParcelas: Math.max(1, b || 1)
      };
    }
    const n = parseInt(s, 10);
    if (!isNaN(n) && n > 0) {
      return { numeroParcela: 1, totalParcelas: n };
    }
  }
  return { numeroParcela: 1, totalParcelas: 1 };
}

/** Quantidade para gerar parcelas ao salvar na grade (rascunho). */
export function totalParcelasParaGerar(linha: {
  parcelas?: number | string | null;
  totalParcelas?: number | null;
}): number {
  if (linha.totalParcelas != null && Number(linha.totalParcelas) > 1) {
    return Number(linha.totalParcelas);
  }
  const { totalParcelas, numeroParcela } = normalizarParcelasCampos(linha);
  if (totalParcelas > 1 && numeroParcela <= 1 && !String(linha.parcelas ?? '').includes('/')) {
    return totalParcelas;
  }
  return 1;
}

/** Importação: só expande quando a planilha traz número simples (ex.: 3), não "1/3" ou "2/3". */
export function totalParcelasParaGerarImport(linha: {
  parcelasTexto?: string | null;
  totalParcelas?: number | null;
}): number {
  const raw = String(linha.parcelasTexto ?? '').trim();
  if (!raw || raw.includes('/')) return 1;
  const { totalParcelas, numeroParcela } = normalizarParcelasCampos({ parcelas: raw });
  if (totalParcelas > 1 && numeroParcela <= 1) return totalParcelas;
  return 1;
}

function parseIsoParaDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [yyyy, mm, dd] = iso.slice(0, 10).split('-');
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  return isNaN(d.getTime()) ? null : d;
}

function dataParaIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function vencimentoComMesesAdicionados(dataBase: Date, mesesAdicionar: number): string {
  const diaPreferido = dataBase.getDate();
  const alvo = new Date(dataBase.getFullYear(), dataBase.getMonth() + mesesAdicionar, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(diaPreferido, ultimoDia));
  return dataParaIso(alvo);
}

/** Mesma regra da grade: Parcelas = 3 gera 1/3, 2/3, 3/3 com vencimento mensal. */
export function expandirParcelamentoLinha<T extends {
  linha: number;
  numeroParcela: number;
  totalParcelas: number;
  parcelasTexto?: string | null;
  dataVencimento: string | null;
  dataCompensacao: string | null;
}>(linha: T): { linhas: T[]; erro?: string } {
  const total = totalParcelasParaGerarImport({
    parcelasTexto: linha.parcelasTexto,
    totalParcelas: linha.totalParcelas
  });
  if (total <= 1) return { linhas: [linha] };

  if (!linha.dataVencimento) {
    return {
      linhas: [linha],
      erro: 'Informe Data Vencimento da 1ª parcela para gerar parcelamento (coluna Parcelas > 1)'
    };
  }
  const dataVencBase = parseIsoParaDate(linha.dataVencimento);
  if (!dataVencBase) {
    return { linhas: [linha], erro: 'Data de vencimento inválida para parcelamento' };
  }

  const expandidas: T[] = [];
  for (let i = 0; i < total; i++) {
    expandidas.push({
      ...linha,
      numeroParcela: i + 1,
      totalParcelas: total,
      dataVencimento: i === 0 ? dataParaIso(dataVencBase) : vencimentoComMesesAdicionados(dataVencBase, i),
      dataCompensacao: i === 0 ? linha.dataCompensacao : null
    });
  }
  return { linhas: expandidas };
}
