-- Script para corrigir a constraint de foreign key da tabela agencia
-- O problema: existe uma constraint id_banco que mapeia id_agencia -> banco.id_banco (ERRADO)
-- Solução: remover a constraint incorreta

-- Remover a constraint incorreta se existir
ALTER TABLE agencia 
DROP CONSTRAINT IF EXISTS id_banco;

-- Se a coluna id_banco não existir, adicionar
ALTER TABLE agencia 
ADD COLUMN IF NOT EXISTS id_banco INTEGER;

-- Adicionar a constraint correta (id_banco -> banco.id_banco)
ALTER TABLE agencia 
ADD CONSTRAINT fk_agencia_banco 
FOREIGN KEY (id_banco) REFERENCES banco(id_banco);

