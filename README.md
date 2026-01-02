# Sistema de Gestão Financeira

Sistema web completo de gestão financeira pessoal, convertido de planilha Excel para aplicação Next.js.

## 🚀 Funcionalidades

- **Dashboard**: Visão geral com saldo atual, entradas, saídas e saldo da seleção
- **Lançamentos**: Cadastro, edição e exclusão de transações financeiras
- **Fluxo de Caixa**: Visualização diária de entradas/saídas (realizado vs planejado)
- **Resultados**: Relatórios mensais e anuais com comparação realizado vs planejado
- **Múltiplas Contas**: Suporte para várias contas bancárias
- **Status Automático**: Cálculo automático de status (Realizado/Planejado) baseado em datas

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

## 🛠️ Instalação

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse no navegador:
```
http://localhost:3000
```

## 📁 Estrutura do Projeto

```
├── app/                    # Páginas Next.js
│   ├── page.tsx           # Dashboard (Página Inicial)
│   ├── lancar/            # Página de Lançamentos
│   ├── fluxo-caixa/       # Página de Fluxo de Caixa
│   └── resultados/        # Página de Resultados
├── lib/
│   └── data.ts            # Lógica de negócio e armazenamento
├── types/
│   └── index.ts           # Definições TypeScript
└── package.json
```

## 💾 Armazenamento de Dados

Atualmente, o sistema utiliza armazenamento em memória (simulação de banco de dados).

**Para produção**, recomenda-se:
- SQLite (para aplicação desktop/local)
- PostgreSQL (para aplicação web hospedada)
- MongoDB (alternativa NoSQL)

O código está preparado para fácil migração para banco de dados real.

## 🔧 Funcionalidades Principais

### Cálculo de Status
O status é calculado automaticamente:
- **Realizado**: Quando há data de vencimento E data de compensação preenchidas
- **Planejado**: Quando há data de vencimento mas NÃO há data de compensação
- **-** : Quando não há data de vencimento

### Filtros
- Por conta bancária (no dashboard)
- Por período (no fluxo de caixa)
- Por ano (nos resultados)

## 📝 Como Usar

1. **Dashboard**: Visualize resumo financeiro e selecione a conta desejada
2. **Lançar**: Adicione novas transações financeiras (entradas ou saídas)
3. **Fluxo de Caixa**: Veja o fluxo diário de caixa com previsões
4. **Resultados**: Analise resultados mensais e anuais

## 🎨 Personalização

Os estilos podem ser modificados em `app/globals.css`. O sistema utiliza CSS inline para facilitar ajustes rápidos.

## 📦 Build para Produção

```bash
npm run build
npm start
```

## 🔄 Próximos Passos (Sugestões)

- [ ] Implementar banco de dados persistente
- [ ] Adicionar autenticação de usuário
- [ ] Exportar relatórios em PDF/Excel
- [ ] Gráficos e visualizações
- [ ] Backup automático
- [ ] App mobile (React Native)

## 📄 Licença

Este projeto foi desenvolvido como conversão de planilha Excel para sistema web.

