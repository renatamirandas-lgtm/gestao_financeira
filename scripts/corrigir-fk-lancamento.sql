-- Script para corrigir a constraint de foreign key id_conta_corr_fk
-- A constraint atual está apontando para id_lancamento (PK) ao invés de id_conta_corr

DO $$
BEGIN
    -- 1. Remover a constraint incorreta se existir
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'id_conta_corr_fk' 
        AND table_name = 'lancamento'
    ) THEN
        ALTER TABLE lancamento DROP CONSTRAINT IF EXISTS id_conta_corr_fk;
        RAISE NOTICE '✅ Constraint id_conta_corr_fk removida';
    ELSE
        RAISE NOTICE 'Constraint id_conta_corr_fk não encontrada';
    END IF;

    -- 2. Adicionar coluna id_conta_corr se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lancamento' 
        AND column_name = 'id_conta_corr'
    ) THEN
        ALTER TABLE lancamento ADD COLUMN id_conta_corr INTEGER;
        RAISE NOTICE '✅ Coluna id_conta_corr adicionada';
    ELSE
        RAISE NOTICE 'Coluna id_conta_corr já existe';
    END IF;

    -- 3. Adicionar coluna id_pessoa se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lancamento' 
        AND column_name = 'id_pessoa'
    ) THEN
        ALTER TABLE lancamento ADD COLUMN id_pessoa INTEGER;
        RAISE NOTICE '✅ Coluna id_pessoa adicionada';
    ELSE
        RAISE NOTICE 'Coluna id_pessoa já existe';
    END IF;

    -- 4. Adicionar coluna id_categoria se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lancamento' 
        AND column_name = 'id_categoria'
    ) THEN
        ALTER TABLE lancamento ADD COLUMN id_categoria INTEGER;
        RAISE NOTICE '✅ Coluna id_categoria adicionada';
    ELSE
        RAISE NOTICE 'Coluna id_categoria já existe';
    END IF;

    -- 5. Adicionar coluna id_tp_operacao se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lancamento' 
        AND column_name = 'id_tp_operacao'
    ) THEN
        ALTER TABLE lancamento ADD COLUMN id_tp_operacao INTEGER;
        RAISE NOTICE '✅ Coluna id_tp_operacao adicionada';
    ELSE
        RAISE NOTICE 'Coluna id_tp_operacao já existe';
    END IF;

    -- 6. Recriar constraint id_conta_corr_fk corretamente (apenas se conta_corrente existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conta_corrente') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'id_conta_corr_fk' 
            AND table_name = 'lancamento'
        ) THEN
            ALTER TABLE lancamento 
            ADD CONSTRAINT id_conta_corr_fk 
            FOREIGN KEY (id_conta_corr) REFERENCES conta_corrente(id_conta_corrente);
            RAISE NOTICE '✅ Constraint id_conta_corr_fk criada corretamente';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela conta_corrente não existe, pulando criação da constraint';
    END IF;

    -- 7. Recriar constraint id_pessoa_fk corretamente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pessoa') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'id_pessoa_fk' 
            AND table_name = 'lancamento'
        ) THEN
            ALTER TABLE lancamento 
            ADD CONSTRAINT id_pessoa_fk 
            FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa);
            RAISE NOTICE '✅ Constraint id_pessoa_fk criada corretamente';
        END IF;
    END IF;

    -- 8. Recriar constraint id_categoria_fk corretamente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categoria') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'id_categoria_fk' 
            AND table_name = 'lancamento'
        ) THEN
            ALTER TABLE lancamento 
            ADD CONSTRAINT id_categoria_fk 
            FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria);
            RAISE NOTICE '✅ Constraint id_categoria_fk criada corretamente';
        END IF;
    END IF;

    -- 9. Recriar constraint tp_operacao_fk corretamente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tipo_operacao') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'tp_operacao_fk' 
            AND table_name = 'lancamento'
        ) THEN
            ALTER TABLE lancamento 
            ADD CONSTRAINT tp_operacao_fk 
            FOREIGN KEY (id_tp_operacao) REFERENCES tipo_operacao(id_tp_operacao);
            RAISE NOTICE '✅ Constraint tp_operacao_fk criada corretamente';
        END IF;
    END IF;

END $$;

