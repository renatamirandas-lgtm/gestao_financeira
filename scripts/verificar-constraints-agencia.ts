// Script para verificar constraints da tabela agencia
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { Pool } from 'pg';

async function verificarConstraints() {
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
    console.log('🔍 Verificando constraints da tabela agencia...\n');
    
    // Verificar colunas
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agencia'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 COLUNAS:');
    columns.rows.forEach((row: any) => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    // Verificar constraints
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'agencia'
    `);
    
    console.log('\n🔗 CONSTRAINTS:');
    constraints.rows.forEach((row: any) => {
      if (row.constraint_type === 'FOREIGN KEY') {
        console.log(`  ${row.constraint_name}: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      } else {
        console.log(`  ${row.constraint_name}: ${row.constraint_type}`);
      }
    });

    await pool.end();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verificarConstraints();

