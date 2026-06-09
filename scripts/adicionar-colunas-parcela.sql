-- Colunas para parcelamento (solução 1: número + total)
ALTER TABLE lancamento ADD COLUMN IF NOT EXISTS nr_parcela INTEGER DEFAULT 1;
ALTER TABLE lancamento ADD COLUMN IF NOT EXISTS qt_total_parcelas INTEGER DEFAULT 1;

COMMENT ON COLUMN lancamento.nr_parcela IS 'Número da parcela atual (ex.: 2)';
COMMENT ON COLUMN lancamento.qt_total_parcelas IS 'Quantidade total de parcelas (ex.: 3)';
