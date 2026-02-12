import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

(async () => {
  try {
    console.log('🔍 Verificando todas as colunas da tabela categoria...\n');
    
    const res = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'categoria'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 TODAS AS COLUNAS DA TABELA categoria:');
    console.log('────────────────────────────────────────────────────────────');
    res.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    await pool.end();
  } catch (e: any) {
    console.error('❌ Erro:', e.message);
    await pool.end();
    process.exit(1);
  }
})();

