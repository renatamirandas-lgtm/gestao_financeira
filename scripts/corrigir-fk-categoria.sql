-- Remove FK incorreta: id_categoria NÃO deve referenciar grupo_categoria.
-- A FK correta é fk_categoria_grupo_categoria (id_grupo_categoria -> grupo_categoria).
ALTER TABLE categoria DROP CONSTRAINT IF EXISTS id_grupo_categoria_fk;
