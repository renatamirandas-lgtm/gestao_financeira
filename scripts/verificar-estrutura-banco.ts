// Script para verificar a estrutura da tabela banco
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { Pool } from 'pg';

async function verificarEstruturaBanco() {
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
    console.log('🔍 Verificando estrutura da tabela banco...\n');
    
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'banco'
      ORDER BY ordinal_position
    `);

    console.log('📊 COLUNAS DA TABELA banco:');
    console.log('─'.repeat(60));
    result.rows.forEach((row: any) => {
      console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verificarEstruturaBanco();

