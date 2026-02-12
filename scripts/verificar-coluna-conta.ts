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
    // Listar TODAS as colunas da tabela
    const cols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lancamento'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela lancamento:');
    cols.rows.forEach((r, i) => console.log(`${i + 1}. ${r.column_name}`));
    
    // Verificar especificamente por id_conta_corr
    const temIdConta = cols.rows.some(r => 
      r.column_name.toLowerCase().includes('conta') || 
      r.column_name.toLowerCase() === 'id_conta_corr'
    );
    
    console.log(`\nTem coluna relacionada a conta? ${temIdConta ? 'SIM' : 'NÃO'}`);
    
    // Verificar estrutura da constraint
    const constraint = await pool.query(`
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'lancamento'
        AND tc.constraint_name = 'id_conta_corr_fk'
    `);
    
    if (constraint.rows.length > 0) {
      console.log('\nDetalhes da constraint id_conta_corr_fk:');
      constraint.rows.forEach(r => {
        console.log(`  Coluna local: ${r.column_name}`);
        console.log(`  Referencia: ${r.foreign_table}.${r.foreign_column}`);
      });
    } else {
      console.log('\nConstraint id_conta_corr_fk não encontrada');
    }
    
    await pool.end();
  } catch (e: any) {
    console.error('Erro:', e.message);
    await pool.end();
    process.exit(1);
  }
})();

