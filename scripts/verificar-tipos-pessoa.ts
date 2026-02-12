// Script para verificar tipos exatos das colunas da tabela pessoa
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { Pool } from 'pg';

async function verificarTipos() {
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
    console.log('🔍 Verificando tipos exatos das colunas da tabela pessoa...\n');
    
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'pessoa'
      ORDER BY ordinal_position
    `);

    console.log('📊 COLUNAS COM TIPOS EXATOS:');
    console.log('─'.repeat(80));
    result.rows.forEach((row: any) => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}${length} (${row.udt_name})`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verificarTipos();

