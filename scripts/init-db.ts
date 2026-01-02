// Script para inicializar o banco de dados
// Execute com: npx tsx scripts/init-db.ts

import pool from '../lib/db';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  try {
    console.log('🔄 Inicializando banco de dados...');
    
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'create-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    
    // Dividir o SQL em comandos separados (por ';')
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
    
    // Executar cada comando
    for (const command of commands) {
      const trimmed = command.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('--')) {
        await pool.query(trimmed);
      }
    }
    
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('✅ Tabelas criadas: bancos, formas_pagamento, lancamentos');
    console.log('✅ Dados padrão inseridos');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();

