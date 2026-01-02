# 🔌 Configurar Conexão com Banco de Dados Neon

## Passo 1: Criar arquivo .env.local

Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```
DATABASE_URL=sua_string_de_conexao_aqui
```

## Passo 2: Obter String de Conexão do Neon

1. Acesse o dashboard do Neon: https://console.neon.tech
2. Selecione seu projeto
3. Vá em "Connection Details" ou "Detalhes de Conexão"
4. Copie a string de conexão (Connection String)
5. Ela deve ser algo como:
   ```
   postgresql://usuario:senha@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
6. Cole no arquivo `.env.local` substituindo `sua_string_de_conexao_aqui`

## Passo 3: Criar as Tabelas no Banco

Execute o script SQL para criar as tabelas:

### Opção 1: Via Neon Console (Recomendado)
1. Acesse o console do Neon
2. Vá em "SQL Editor"
3. Copie o conteúdo do arquivo `scripts/create-tables.sql`
4. Cole e execute no SQL Editor

### Opção 2: Via Script Node.js (Alternativa)
```bash
# Instalar tsx para executar TypeScript
npm install -D tsx

# Executar script de inicialização
npx tsx scripts/init-db.ts
```

## Passo 4: Verificar Conexão

Após configurar, reinicie o servidor:
```bash
npm run dev
```

O sistema deve conectar automaticamente ao banco de dados.

## ✅ Pronto!

Agora o sistema está usando o banco de dados Neon PostgreSQL ao invés de memória.

