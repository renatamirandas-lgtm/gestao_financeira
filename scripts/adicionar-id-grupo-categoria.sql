-- Adicionar coluna id_grupo_categoria na tabela categoria
-- Se a coluna já existir, o comando será ignorado

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'categoria' 
        AND column_name = 'id_grupo_categoria'
    ) THEN
        ALTER TABLE categoria 
        ADD COLUMN id_grupo_categoria INTEGER;
        
        -- Adicionar constraint de foreign key
        ALTER TABLE categoria
        ADD CONSTRAINT fk_categoria_grupo_categoria
        FOREIGN KEY (id_grupo_categoria)
        REFERENCES grupo_categoria(id_grupo_categoria);
        
        RAISE NOTICE 'Coluna id_grupo_categoria adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna id_grupo_categoria já existe!';
    END IF;
END $$;

