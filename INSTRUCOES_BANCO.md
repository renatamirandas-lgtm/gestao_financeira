# 🔌 Configurar Banco de Dados Neon - Passo a Passo

## ✅ Passo 1: Criar arquivo .env.local

Na raiz do projeto, crie um arquivo chamado `.env.local` com o seguinte conteúdo:

```
DATABASE_URL=sua_string_de_conexao_do_neon_aqui
```

## ✅ Passo 2: Obter String de Conexão do Neon

1. Acesse: https://console.neon.tech
2. Entre no seu projeto
3. Clique em **"Connection Details"** ou **"Detalhes de Conexão"**
4. Copie a **Connection String** (algo como):
   ```
   postgresql://usuario:senha@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
5. Cole no arquivo `.env.local` substituindo `sua_string_de_conexao_do_neon_aqui`

## ✅ Passo 3: Criar as Tabelas no Banco

### Opção A: Via Neon Console (MAIS FÁCIL - Recomendado) ⭐

1. No console do Neon, vá em **"SQL Editor"**
2. Abra o arquivo `scripts/create-tables.sql` do projeto
3. Copie TODO o conteúdo
4. Cole no SQL Editor do Neon
5. Clique em **"Run"** ou **"Executar"**

### Opção B: Via Script (Alternativa)

```bash
npm install -D tsx
npx tsx scripts/init-db.ts
```

## ✅ Passo 4: Atualizar o código para usar banco de dados

**IMPORTANTE:** Substitua o conteúdo de `lib/data.ts` pelo conteúdo de `lib/data-db.ts`:

```bash
# No PowerShell:
Copy-Item lib/data-db.ts lib/data.ts -Force
```

Ou manualmente: copie todo o conteúdo de `lib/data-db.ts` e substitua em `lib/data.ts`

## ✅ Passo 5: Atualizar páginas para usar async/await

As páginas precisam ser atualizadas para usar `await` nas chamadas do DataService. Vou ajudar com isso após você configurar o banco.

## ✅ Passo 6: Reiniciar o servidor

```bash
npm run dev
```

## 🎉 Pronto!

Agora o sistema está usando o banco de dados Neon PostgreSQL!

---

**Dúvidas?** Me avise se precisar de ajuda em qualquer passo!

