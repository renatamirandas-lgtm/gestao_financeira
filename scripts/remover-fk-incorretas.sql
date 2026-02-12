-- Remover constraints FK incorretas que apontam para id_lancamento (PK)

DO $$
BEGIN
    -- Remover id_pessoa_fk se estiver apontando para id_lancamento
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_name = 'id_pessoa_fk' 
          AND tc.table_name = 'lancamento'
          AND kcu.column_name = 'id_lancamento'
    ) THEN
        ALTER TABLE lancamento DROP CONSTRAINT IF EXISTS id_pessoa_fk;
        RAISE NOTICE '✅ Constraint id_pessoa_fk (incorreta) removida';
    END IF;

    -- Remover id_categoria_fk se estiver apontando para id_lancamento
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_name = 'id_categoria_fk' 
          AND tc.table_name = 'lancamento'
          AND kcu.column_name = 'id_lancamento'
    ) THEN
        ALTER TABLE lancamento DROP CONSTRAINT IF EXISTS id_categoria_fk;
        RAISE NOTICE '✅ Constraint id_categoria_fk (incorreta) removida';
    END IF;

    -- Remover tp_operacao_fk se estiver apontando para id_lancamento
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_name = 'tp_operacao_fk' 
          AND tc.table_name = 'lancamento'
          AND kcu.column_name = 'id_lancamento'
    ) THEN
        ALTER TABLE lancamento DROP CONSTRAINT IF EXISTS tp_operacao_fk;
        RAISE NOTICE '✅ Constraint tp_operacao_fk (incorreta) removida';
    END IF;

END $$;

