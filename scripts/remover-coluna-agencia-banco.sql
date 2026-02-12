-- Script para remover colunas relacionadas a agencia da tabela banco
-- Execute este script no SQL Editor do Neon

-- Remover coluna id_agencia se existir
ALTER TABLE banco 
DROP COLUMN IF EXISTS id_agencia;

-- Remover coluna agencia se existir (caso tenha nome genérico)
ALTER TABLE banco 
DROP COLUMN IF EXISTS agencia;

-- Remover outras possíveis variações
ALTER TABLE banco 
DROP COLUMN IF EXISTS no_agencia;

ALTER TABLE banco 
DROP COLUMN IF EXISTS nr_agencia;

