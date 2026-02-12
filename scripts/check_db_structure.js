const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_q6owLyQaVS5P@ep-empty-thunder-aedkmcd5-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkStructure() {
  try {
    console.log('=== Verificando estrutura da tabela conta_corrente ===');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conta_corrente'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas da tabela conta_corrente:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    console.log('\n=== Verificando dados da tabela conta_corrente ===');
    const dataResult = await pool.query('SELECT * FROM conta_corrente LIMIT 3');
    console.log('\nDados (primeiras 3 linhas):');
    console.log(JSON.stringify(dataResult.rows, null, 2));

    console.log('\n=== Verificando estrutura da tabela lancamento ===');
    const lancResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lancamento' AND column_name LIKE '%conta%'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas relacionadas a conta na tabela lancamento:');
    lancResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    await pool.end();
  } catch (error) {
    console.error('Erro completo:', error);
    await pool.end();
    process.exit(1);
  }
}

checkStructure();
