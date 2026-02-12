// Script para verificar se há lançamentos no banco e testar a query
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import pool from '../lib/db';

async function verificarLancamentos() {
  try {
    console.log('🔍 Verificando lançamentos no banco de dados...\n');
    
    // 1. Contar total de lançamentos
    const countResult = await pool.query('SELECT COUNT(*) as total FROM lancamento');
    const total = parseInt(countResult.rows[0].total);
    console.log(`📊 Total de lançamentos na tabela: ${total}\n`);
    
    if (total === 0) {
      console.log('⚠️  Não há lançamentos na tabela lancamento');
      console.log('   Verifique se os dados foram importados corretamente.\n');
      return;
    }
    
    // 2. Buscar alguns lançamentos diretamente (sem JOINs)
    console.log('📋 Primeiros 3 lançamentos (query simples):');
    const simpleQuery = await pool.query(`
      SELECT 
        id_lancamento,
        dt_operacao,
        ds_lancamento,
        vl_lancamento,
        ds_categoria,
        qt_parcelas
      FROM lancamento
      ORDER BY dt_operacao DESC
      LIMIT 3
    `);
    
    simpleQuery.rows.forEach((row, index) => {
      console.log(`\n   ${index + 1}. ID: ${row.id_lancamento}`);
      console.log(`      Data: ${row.dt_operacao}`);
      console.log(`      Descrição: ${row.ds_lancamento}`);
      console.log(`      Valor: ${row.vl_lancamento}`);
      console.log(`      Categoria: ${row.ds_categoria}`);
      console.log(`      Parcelas: ${row.qt_parcelas}`);
    });
    
    // 3. Testar a query completa usada no código
    console.log('\n\n🔍 Testando query completa (com JOINs):');
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
      LIMIT 3
    `);
    
    console.log(`   Resultados da query completa: ${fullQuery.rows.length}`);
    if (fullQuery.rows.length > 0) {
      fullQuery.rows.forEach((row, index) => {
        console.log(`\n   ${index + 1}. ID: ${row.id}`);
        console.log(`      Conta: ${row.conta}`);
        console.log(`      Data: ${row.dataOperacao}`);
        console.log(`      Descrição: ${row.descricao}`);
        console.log(`      Valor: ${row.vlLancamento}`);
        console.log(`      Categoria: ${row.categoria}`);
      });
    } else {
      console.log('   ⚠️  Query completa não retornou resultados!');
      console.log('   Isso pode indicar um problema com os JOINs ou tipos de dados.');
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar lançamentos:', error);
    console.error('   Mensagem:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
  } finally {
    await pool.end();
  }
}

verificarLancamentos();

