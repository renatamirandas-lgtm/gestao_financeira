// Script para verificar todas as colunas da tabela banco
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { Pool } from 'pg';

async function verificarColunasBanco() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.log('❌ DATABASE_URL não encontrada');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('neon.tech') 
      ? { rejectUnauthorized: false } 
      : process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
  });

  try {
    console.log('🔍 Verificando TODAS as colunas da tabela banco...\n');
    
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'banco'
      ORDER BY ordinal_position
    `);

    console.log('📊 TODAS AS COLUNAS DA TABELA banco:');
    console.log('─'.repeat(80));
    result.rows.forEach((row: any) => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`  ${row.column_name.padEnd(30)} ${(row.data_type + length).padEnd(25)} ${nullable}${defaultVal}`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verificarColunasBanco();

