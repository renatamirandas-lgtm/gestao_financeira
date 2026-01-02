-- Script de criação das tabelas do sistema de gestão financeira

-- Tabela de Bancos/Contas
CREATE TABLE IF NOT EXISTS bancos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Formas de Pagamento
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Lançamentos
CREATE TABLE IF NOT EXISTS lancamentos (
    id VARCHAR(100) PRIMARY KEY,
    conta VARCHAR(255) NOT NULL,
    data_operacao DATE NOT NULL,
    cliente_fornecedor VARCHAR(255),
    descricao TEXT NOT NULL,
    parcelas INTEGER DEFAULT 1,
    categoria VARCHAR(255),
    entradas DECIMAL(15, 2) DEFAULT 0,
    saidas DECIMAL(15, 2) DEFAULT 0,
    forma_operacao VARCHAR(255),
    data_vencimento DATE,
    data_compensacao DATE,
    status VARCHAR(20) DEFAULT '-',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_conta ON lancamentos(conta);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_operacao ON lancamentos(data_operacao);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_vencimento ON lancamentos(data_vencimento);

-- Inserir bancos padrão
INSERT INTO bancos (id, nome) VALUES
    (0, 'TODAS AS CONTAS'),
    (1, 'Conta 01'),
    (2, 'Conta 02'),
    (3, 'Conta 03'),
    (4, 'Conta 04'),
    (5, 'Conta 05'),
    (6, 'Conta 06'),
    (7, 'Conta 07'),
    (8, 'Conta 08'),
    (9, 'Conta 09'),
    (10, 'Conta 10')
ON CONFLICT (id) DO NOTHING;

-- Inserir formas de pagamento padrão
INSERT INTO formas_pagamento (id, nome) VALUES
    ('fp-0', 'Acerto'),
    ('fp-1', 'Banco 24'),
    ('fp-2', 'Boleto'),
    ('fp-3', 'Caixa Eletrônico'),
    ('fp-4', 'Cartão Crédito'),
    ('fp-5', 'Cartão alimentação'),
    ('fp-6', 'Cartão de débito'),
    ('fp-7', 'Cheque'),
    ('fp-8', 'Crédito automático'),
    ('fp-9', 'Depósito'),
    ('fp-10', 'Débito automático'),
    ('fp-11', 'Desconto em Folha'),
    ('fp-12', 'Dinheiro'),
    ('fp-13', 'DOC'),
    ('fp-14', 'Internet Bank'),
    ('fp-15', 'Maquininha'),
    ('fp-16', 'Pix'),
    ('fp-17', 'Saldo inicial'),
    ('fp-18', 'Tag'),
    ('fp-19', 'TED'),
    ('fp-20', 'TEV'),
    ('fp-21', 'Transferência'),
    ('fp-22', 'Crediário')
ON CONFLICT (id) DO NOTHING;

