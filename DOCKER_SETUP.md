# 🐳 Configurar Banco de Dados com Docker

Este guia mostra como subir o banco de dados PostgreSQL localmente usando Docker.

## 📋 Pré-requisitos

- Docker instalado
- Docker Compose instalado

## 🚀 Passos para Configurar

### 1. Criar arquivo `.env.local`

Copie o arquivo `.env.example` para `.env.local`:

```bash
# No PowerShell:
Copy-Item .env.example .env.local
```

Ou crie manualmente um arquivo `.env.local` com:

```
DATABASE_URL=postgresql://gest_financeira:gest_financeira123@localhost:5432/gest_financeira
```

### 2. Subir o banco de dados

Execute o comando:

```bash
npm run db:up
```

Ou diretamente:

```bash
docker-compose up -d
```

Isso irá:
- Baixar a imagem do PostgreSQL 16
- Criar um container chamado `gest_financeira_db`
- Expor a porta 5432
- Criar um volume para persistir os dados

### 3. Verificar se o banco está rodando

```bash
npm run db:logs
```

Você deve ver mensagens indicando que o PostgreSQL está pronto para aceitar conexões.

### 4. Criar as tabelas no banco

Você precisa executar o SQL para criar as tabelas. Como o código usa tabelas específicas que já existem no seu banco Neon, você pode:

**Opção A:** Usar o script de inicialização (se o create-tables.sql estiver atualizado):
```bash
npm run db:init
```

**Opção B:** Executar o SQL manualmente:
1. Conecte ao banco usando um cliente PostgreSQL (pgAdmin, DBeaver, etc.)
2. Use a conexão: `postgresql://gest_financeira:gest_financeira123@localhost:5432/gest_financeira`
3. Execute os scripts SQL necessários

### 5. Iniciar o servidor Next.js

```bash
npm run dev
```

O sistema deve conectar automaticamente ao banco de dados local.

## 🛠️ Comandos Úteis

- **Subir o banco:** `npm run db:up`
- **Parar o banco:** `npm run db:down`
- **Ver logs:** `npm run db:logs`
- **Inicializar tabelas:** `npm run db:init`

## 📝 Notas

- Os dados ficam persistidos em um volume Docker chamado `postgres_data`
- Para remover completamente o banco e os dados, use: `docker-compose down -v`
- A porta 5432 deve estar livre no seu sistema

## 🔄 Alternativa: Usar Neon (Banco na Nuvem)

Se preferir usar o Neon ao invés do Docker local:

1. Acesse: https://console.neon.tech
2. Crie um projeto
3. Copie a string de conexão
4. Atualize o `.env.local` com a string do Neon

