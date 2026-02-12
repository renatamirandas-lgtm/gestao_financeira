const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_q6owLyQaVS5P@ep-empty-thunder-aedkmcd5-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Replicar a função getArrayValue do data.ts
function getArrayValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    let result = value[0] || null;
    while (Array.isArray(result) && result.length > 0) {
      result = result[0];
    }
    if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
      return result.slice(1, -1);
    }
    return result;
  }
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const parsed = value.slice(1, -1).split(',');
    let result = parsed[0] || null;
    if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
      result = result.slice(1, -1);
    }
    return result;
  }
  if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

async function testUpdate() {
  try {
    // Pegar o lançamento ID 12
    const lancamento = await pool.query('SELECT * FROM lancamento WHERE id_lancamento = 12');
    console.log('Lançamento atual (ID 12):');
    console.log('  id_pessoa:', lancamento.rows[0].id_pessoa);
    console.log('  id_conta_corr:', lancamento.rows[0].id_conta_corr);
    console.log('  id_tp_operacao:', lancamento.rows[0].id_tp_operacao);
    
    // Buscar pessoa "Renata Miranda Rodrigues"
    const pessoas = await pool.query('SELECT id_pessoa, no_pessoa FROM pessoa');
    console.log('\n=== Buscando pessoa "Renata Miranda" ===');
    console.log('Total de pessoas:', pessoas.rows.length);
    
    let pessoaId = null;
    const nomeBusca = 'Renata Miranda';
    for (const row of pessoas.rows) {
      const nomePessoa = getArrayValue(row.no_pessoa);
      console.log(`  Comparando: "${nomePessoa}" com "${nomeBusca}"`);
      if (nomePessoa && nomePessoa.toLowerCase().includes(nomeBusca.toLowerCase())) {
        pessoaId = row.id_pessoa;
        console.log(`  ✓ Pessoa encontrada! ID: ${pessoaId}`);
        break;
      }
    }

    if (!pessoaId) {
      console.log('  ✗ Pessoa não encontrada');
      await pool.end();
      return;
    }

    // Buscar tipo operação "Boleto"
    const tipos = await pool.query('SELECT id_tp_operacao, no_tp_operacao FROM tipo_operacao');
    console.log('\n=== Buscando tipo operação "Boleto" ===');
    console.log('Total de tipos:', tipos.rows.length);
    
    let tipoId = null;
    for (const row of tipos.rows) {
      const nomeTipo = getArrayValue(row.no_tp_operacao);
      console.log(`  Comparando: "${nomeTipo}" com "Boleto"`);
      if (nomeTipo && nomeTipo.toLowerCase() === 'boleto'.toLowerCase()) {
        tipoId = row.id_tp_operacao;
        console.log(`  ✓ Tipo encontrado! ID: ${tipoId}`);
        break;
      }
    }

    if (!tipoId) {
      console.log('  ✗ Tipo não encontrado');
    }

    // Atualizar o lançamento
    console.log('\n=== Atualizando lançamento 12 ===');
    console.log(`  Definindo id_pessoa = ${pessoaId}`);
    console.log(`  Definindo id_tp_operacao = ${tipoId}`);
    
    await pool.query(`
      UPDATE lancamento 
      SET id_pessoa = $1, id_tp_operacao = $2
      WHERE id_lancamento = 12
    `, [pessoaId, tipoId]);

    console.log('  ✓ Atualização concluída!');

    // Verificar resultado
    const updated = await pool.query(`
      SELECT 
        l.id_lancamento,
        l.id_pessoa,
        l.id_tp_operacao,
        p.no_pessoa,
        tp.no_tp_operacao
      FROM lancamento l
      LEFT JOIN pessoa p ON l.id_pessoa = p.id_pessoa
      LEFT JOIN tipo_operacao tp ON l.id_tp_operacao = tp.id_tp_operacao
      WHERE l.id_lancamento = 12
    `);

    console.log('\n=== Lançamento após atualização ===');
    console.log(JSON.stringify(updated.rows[0], null, 2));

    await pool.end();
    console.log('\n✓ Teste concluído!');
  } catch (error) {
    console.error('Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

testUpdate();
