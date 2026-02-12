const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_q6owLyQaVS5P@ep-empty-thunder-aedkmcd5-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkData() {
  try {
    console.log('=== Verificando últimos lançamentos salvos ===\n');
    
    const result = await pool.query(`
      SELECT 
        l.id_lancamento,
        l.id_conta_corr,
        l.id_pessoa,
        l.id_tp_operacao,
        l.ds_lancamento,
        l.ds_categoria,
        l.vl_lancamento,
        l.dt_operacao,
        cc.no_conta_corrente as conta_nome,
        p.no_pessoa as pessoa_nome,
        tp.no_tp_operacao as tipo_operacao_nome
      FROM lancamento l
      LEFT JOIN conta_corrente cc ON l.id_conta_corr = cc.id_conta_corrente
      LEFT JOIN pessoa p ON l.id_pessoa = p.id_pessoa
      LEFT JOIN tipo_operacao tp ON l.id_tp_operacao = tp.id_tp_operacao
      ORDER BY l.id_lancamento DESC
      LIMIT 5
    `);

    console.log(`Total de lançamentos encontrados: ${result.rows.length}\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`--- Lançamento ${index + 1} (ID: ${row.id_lancamento}) ---`);
      console.log(`  id_conta_corr: ${row.id_conta_corr}`);
      console.log(`  conta_nome (JOIN): ${JSON.stringify(row.conta_nome)}`);
      console.log(`  id_pessoa: ${row.id_pessoa}`);
      console.log(`  pessoa_nome (JOIN): ${JSON.stringify(row.pessoa_nome)}`);
      console.log(`  id_tp_operacao: ${row.id_tp_operacao}`);
      console.log(`  tipo_operacao_nome (JOIN): ${JSON.stringify(row.tipo_operacao_nome)}`);
      console.log(`  ds_lancamento: ${JSON.stringify(row.ds_lancamento)}`);
      console.log(`  ds_categoria: ${JSON.stringify(row.ds_categoria)}`);
      console.log(`  vl_lancamento: ${JSON.stringify(row.vl_lancamento)}`);
      console.log(`  dt_operacao: ${row.dt_operacao}`);
      console.log('');
    });

    console.log('\n=== Verificando tabela conta_corrente ===\n');
    const contasResult = await pool.query('SELECT * FROM conta_corrente');
    console.log(`Total de contas: ${contasResult.rows.length}`);
    contasResult.rows.forEach(row => {
      console.log(`  ID: ${row.id_conta_corrente}, Nome: ${JSON.stringify(row.no_conta_corrente)}`);
    });

    console.log('\n=== Verificando tabela pessoa (últimas 5) ===\n');
    const pessoasResult = await pool.query('SELECT * FROM pessoa ORDER BY id_pessoa DESC LIMIT 5');
    console.log(`Total de pessoas: ${pessoasResult.rows.length}`);
    pessoasResult.rows.forEach(row => {
      console.log(`  ID: ${row.id_pessoa}, Nome: ${JSON.stringify(row.no_pessoa)}`);
    });

    console.log('\n=== Verificando tabela tipo_operacao ===\n');
    const tiposResult = await pool.query('SELECT * FROM tipo_operacao');
    console.log(`Total de tipos: ${tiposResult.rows.length}`);
    tiposResult.rows.forEach(row => {
      console.log(`  ID: ${row.id_tp_operacao}, Nome: ${JSON.stringify(row.no_tp_operacao)}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

checkData();
