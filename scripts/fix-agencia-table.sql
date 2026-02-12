-- Script para corrigir a estrutura da tabela agencia
-- Adiciona a coluna id_banco que está faltando

-- Verificar se a coluna id_banco não existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agencia' 
        AND column_name = 'id_banco'
    ) THEN
        ALTER TABLE agencia ADD COLUMN id_banco INTEGER;
        
        -- Adicionar comentário explicativo
        COMMENT ON COLUMN agencia.id_banco IS 'Foreign key para a tabela banco';
        
        RAISE NOTICE 'Coluna id_banco adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna id_banco já existe na tabela agencia';
    END IF;
END $$;

-- Verificar e renomear no_agencia para no_agencia_agencia se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agencia' 
        AND column_name = 'no_agencia'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agencia' 
        AND column_name = 'no_agencia_agencia'
    ) THEN
        ALTER TABLE agencia RENAME COLUMN no_agencia TO no_agencia_agencia;
        RAISE NOTICE 'Coluna no_agencia renomeada para no_agencia_agencia';
    ELSE
        RAISE NOTICE 'Coluna no_agencia_agencia já existe ou no_agencia não existe';
    END IF;
END $$;

