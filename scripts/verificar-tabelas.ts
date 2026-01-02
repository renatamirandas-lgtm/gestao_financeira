// Script para verificar a estrutura das tabelas existentes no banco
// Execute com: npx tsx scripts/verificar-tabelas.ts

import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente do .env.local
config({ path: resolve(__dirname, '../.env.local') });

import pool from '../lib/db';

async function verificarTabelas() {
  try {
    console.log('🔍 Verificando tabelas existentes no banco...\n');
    
    // Listar todas as tabelas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 TABELAS ENCONTRADAS:');
    console.log('=' .repeat(50));
    tablesResult.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');
    
    // Para cada tabela, mostrar a estrutura
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      console.log(`\n📋 ESTRUTURA DA TABELA: ${tableName}`);
      console.log('-'.repeat(50));
      
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      columnsResult.rows.forEach((col: any) => {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verificarTabelas();

