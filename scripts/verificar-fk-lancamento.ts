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
    // Verificar todas as colunas da tabela lancamento
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lancamento'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 TODAS AS COLUNAS DA TABELA lancamento:');
    cols.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(15)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });
    
    // Verificar chaves estrangeiras corretamente
    const fk = await pool.query(`
      SELECT 
        kcu.column_name as local_column,
        ccu.table_name AS foreign_table, 
        ccu.column_name AS foreign_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'lancamento'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('\n🔗 CHAVES ESTRANGEIRAS:');
    if (fk.rows.length === 0) {
      console.log('  Nenhuma encontrada.');
    } else {
      fk.rows.forEach(r => {
        console.log(`  ${r.local_column} -> ${r.foreign_table}.${r.foreign_column} (${r.constraint_name})`);
      });
    }
    
    // Verificar se existe conta_corrente
    const contas = await pool.query(`SELECT COUNT(*) as total FROM conta_corrente`);
    console.log(`\n💳 Contas correntes cadastradas: ${contas.rows[0].total}`);
    
    await pool.end();
  } catch (e: any) {
    console.error('❌ Erro:', e.message);
    await pool.end();
    process.exit(1);
  }
})();

