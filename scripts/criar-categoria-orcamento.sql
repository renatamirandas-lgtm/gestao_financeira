-- Orçamento previsto por categoria e mês
CREATE TABLE IF NOT EXISTS categoria_orcamento (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id_categoria) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2000 AND ano <= 2100),
  valor_previsto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  UNIQUE (categoria_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_categoria_orcamento_periodo ON categoria_orcamento (ano, mes);
