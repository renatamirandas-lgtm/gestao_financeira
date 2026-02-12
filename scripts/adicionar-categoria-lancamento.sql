-- Adicionar coluna para armazenar o nome da categoria na tabela lancamento
-- Vamos adicionar como ARRAY para manter consistência com outras colunas

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lancamento' 
        AND column_name = 'ds_categoria'
    ) THEN
        ALTER TABLE lancamento 
        ADD COLUMN ds_categoria TEXT[];
        
        RAISE NOTICE 'Coluna ds_categoria adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna ds_categoria já existe!';
    END IF;
END $$;

