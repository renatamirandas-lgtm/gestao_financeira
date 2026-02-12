const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_q6owLyQaVS5P@ep-empty-thunder-aedkmcd5-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function insertContasCorrentes() {
  try {
    console.log('=== Buscando bancos cadastrados ===');
    const bancosResult = await pool.query('SELECT id_banco, no_banco FROM banco');
    
    if (bancosResult.rows.length === 0) {
      console.log('Nenhum banco cadastrado. Cadastrando bancos padrão...');
      
      await pool.query(`
        INSERT INTO banco (no_banco, nr_banco) VALUES 
        ('{Itaú}', '{341}'),
        ('{Santander}', '{033}')
      `);
      
      console.log('Bancos cadastrados!');
      const bancosResult2 = await pool.query('SELECT id_banco, no_banco FROM banco');
      bancosResult = bancosResult2;
    }

    console.log(`\nBancos encontrados: ${bancosResult.rows.length}`);
    bancosResult.rows.forEach(row => {
      const nome = Array.isArray(row.no_banco) ? row.no_banco[0] : row.no_banco;
      console.log(`  - ID: ${row.id_banco}, Nome: ${nome}`);
    });

    console.log('\n=== Verificando contas correntes existentes ===');
    const contasExistentes = await pool.query('SELECT * FROM conta_corrente');
    console.log(`Contas existentes: ${contasExistentes.rows.length}`);

    if (contasExistentes.rows.length === 0) {
      console.log('\n=== Inserindo contas correntes ===');
      
      for (const banco of bancosResult.rows) {
        const nomeBanco = Array.isArray(banco.no_banco) ? banco.no_banco[0] : banco.no_banco;
        const nomeBancoStr = String(nomeBanco).replace(/[{}]/g, '');
        
        await pool.query(`
          INSERT INTO conta_corrente (no_conta_corrente, nr_conta_corrente, dg_conta_corrente) 
          VALUES ($1, '{0000}', '{0}')
        `, [`{${nomeBancoStr}}`]);
        
        console.log(`  ✓ Conta criada para ${nomeBancoStr}`);
      }

      console.log('\n=== Contas correntes criadas com sucesso! ===');
      const contasResult = await pool.query('SELECT id_conta_corrente, no_conta_corrente FROM conta_corrente');
      console.log(`\nTotal de contas: ${contasResult.rows.length}`);
      contasResult.rows.forEach(row => {
        const nome = Array.isArray(row.no_conta_corrente) ? row.no_conta_corrente[0] : row.no_conta_corrente;
        console.log(`  - ID: ${row.id_conta_corrente}, Nome: ${nome}`);
      });
    } else {
      console.log('Contas correntes já existem. Nenhuma ação necessária.');
    }

    await pool.end();
    console.log('\n✓ Script concluído!');
  } catch (error) {
    console.error('Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

insertContasCorrentes();
