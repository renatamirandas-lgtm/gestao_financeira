const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_q6owLyQaVS5P@ep-empty-thunder-aedkmcd5-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkColumns() {
  try {
    console.log('=== Verificando estrutura da tabela lancamento ===\n');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lancamento'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela lancamento:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Verificar especificamente as colunas de data
    const hasVencimento = result.rows.some(row => 
      row.column_name === 'dt_vencimento' || row.column_name === 'data_vencimento'
    );
    const hasCompensacao = result.rows.some(row => 
      row.column_name === 'dt_compensacao' || row.column_name === 'data_compensacao'
    );

    console.log('\n=== Verificação de colunas de data ===');
    console.log(`dt_vencimento: ${hasVencimento ? '✓ Existe' : '✗ Não existe'}`);
    console.log(`dt_compensacao: ${hasCompensacao ? '✓ Existe' : '✗ Não existe'}`);

    await pool.end();
  } catch (error) {
    console.error('Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

checkColumns();
