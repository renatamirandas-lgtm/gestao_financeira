-- Script para adicionar a coluna id_banco na tabela agencia
-- Execute este script no SQL Editor do Neon

-- Adicionar coluna id_banco se não existir
ALTER TABLE agencia 
ADD COLUMN IF NOT EXISTS id_banco INTEGER;

-- Adicionar comentário explicativo
COMMENT ON COLUMN agencia.id_banco IS 'Foreign key para a tabela banco (id_banco)';

-- Opcional: Adicionar constraint de foreign key (descomente se quiser)
-- ALTER TABLE agencia 
-- ADD CONSTRAINT fk_agencia_banco 
-- FOREIGN KEY (id_banco) REFERENCES banco(id_banco);

