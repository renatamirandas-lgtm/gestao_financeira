// Script para testar se os lançamentos estão sendo retornados corretamente
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import pool from '../lib/db';
import { DataService } from '../lib/data';

async function testLancamentos() {
  try {
    console.log('🔍 Testando busca de lançamentos...\n');
    
    // Teste 1: Verificar se há lançamentos na tabela
    console.log('1️⃣ Verificando lançamentos diretamente na tabela:');
    const directQuery = await pool.query('SELECT COUNT(*) as total FROM lancamento');
    console.log(`   Total de lançamentos na tabela: ${directQuery.rows[0].total}\n`);
    
    if (parseInt(directQuery.rows[0].total) === 0) {
      console.log('⚠️  Não há lançamentos na tabela lancamento');
      return;
    }
    
    // Teste 2: Buscar alguns lançamentos diretamente
    console.log('2️⃣ Buscando primeiros 5 lançamentos diretamente:');
    const sampleQuery = await pool.query(`
      SELECT 
        l.id_lancamento,
        l.dt_operacao,
        l.ds_lancamento,
        l.vl_lancamento,
        l.ds_categoria
      FROM lancamento l
      ORDER BY l.dt_operacao DESC
      LIMIT 5
    `);
    
    sampleQuery.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id_lancamento}, Data: ${row.dt_operacao}, Descrição: ${row.ds_lancamento}, Valor: ${row.vl_lancamento}, Categoria: ${row.ds_categoria}`);
    });
    console.log('');
    
    // Teste 3: Usar DataService.getLancamentos()
    console.log('3️⃣ Testando DataService.getLancamentos():');
    const lancamentos = await DataService.getLancamentos();
    console.log(`   Total retornado: ${lancamentos.length}`);
    
    if (lancamentos.length > 0) {
      console.log('\n   Primeiros 3 lançamentos retornados:');
      lancamentos.slice(0, 3).forEach((lanc, index) => {
        console.log(`   ${index + 1}. ID: ${lanc.id}, Descrição: ${lanc.descricao}, Valor: ${(lanc as any).valor || lanc.entradas || lanc.saidas}`);
      });
    } else {
      console.log('   ⚠️  Nenhum lançamento retornado pelo DataService!');
      
      // Verificar se há problema na query
      console.log('\n4️⃣ Verificando query completa:');
      const fullQuery = await pool.query(`
        SELECT 
          l.id_lancamento as id,
          COALESCE(cc.no_conta_corr::text, 'TODAS AS CONTAS') as conta,
          l.dt_operacao as "dataOperacao",
          COALESCE(p.no_pessoa::text, '') as "clienteFornecedor",
          l.ds_lancamento as descricao,
          l.qt_parcelas as parcelas,
          l.ds_categoria as categoria,
          l.vl_lancamento as "vlLancamento",
          COALESCE(to_op.no_tp_operacao::text, '') as "formaOperacao",
          l.dt_vencimento as "dataVencimento",
          l.dt_compensacao as "dataCompensacao"
        FROM lancamento l
        LEFT JOIN conta_corrente cc ON l.id_conta_corr = cc.id_conta_corrente
        LEFT JOIN pessoa p ON l.id_pessoa = p.id_pessoa
        LEFT JOIN tipo_operacao to_op ON l.id_tp_operacao = to_op.id_tp_operacao
        ORDER BY l.dt_operacao DESC
        LIMIT 5
      `);
      
      console.log(`   Resultado da query completa: ${fullQuery.rows.length} linhas`);
      if (fullQuery.rows.length > 0) {
        console.log('   Primeira linha retornada:');
        console.log(JSON.stringify(fullQuery.rows[0], null, 2));
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao testar lançamentos:', error);
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testLancamentos();

