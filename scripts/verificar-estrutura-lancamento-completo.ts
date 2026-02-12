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
    console.log('🔍 Verificando estrutura da tabela lancamento...\n');
    
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lancamento'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 COLUNAS DA TABELA lancamento:');
    console.log('────────────────────────────────────────────────────────────');
    res.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    const fkResult = await pool.query(`
      SELECT 
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name, 
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'lancamento'
    `);
    
    console.log('\n🔗 CHAVES ESTRANGEIRAS:');
    console.log('────────────────────────────────────────────────────────────');
    if (fkResult.rows.length === 0) {
      console.log('  Nenhuma chave estrangeira encontrada.');
    } else {
      fkResult.rows.forEach(row => {
        console.log(`  ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        console.log(`    Constraint: ${row.constraint_name}`);
      });
    }
    
    await pool.end();
  } catch (e: any) {
    console.error('❌ Erro:', e.message);
    await pool.end();
    process.exit(1);
  }
})();

