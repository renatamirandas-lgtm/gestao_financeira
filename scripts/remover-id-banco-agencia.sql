-- Script para remover a coluna id_banco da tabela agencia
-- Execute este script no SQL Editor do Neon

-- Remover a coluna id_banco se existir
ALTER TABLE agencia 
DROP COLUMN IF EXISTS id_banco;

