import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Teste 1: Contar lançamentos
    const countResult = await pool.query('SELECT COUNT(*) as total FROM lancamento');
    const total = parseInt(countResult.rows[0].total);
    
    // Teste 2: Buscar alguns lançamentos diretamente
    const directQuery = await pool.query(`
      SELECT 
        id_lancamento,
        dt_operacao,
        ds_lancamento,
        vl_lancamento,
        ds_categoria
      FROM lancamento
      ORDER BY dt_operacao DESC
      LIMIT 5
    `);
    
    // Teste 3: Verificar estrutura da tabela conta_corrente
    let colunasContaCorrente: any[] = [];
    try {
      const colsResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'conta_corrente'
        ORDER BY ordinal_position
      `);
      colunasContaCorrente = colsResult.rows.map(r => r.column_name);
    } catch (e) {
      // Tabela pode não existir
    }
    
    // Teste 4: Query completa usada no código (sem JOIN de conta_corrente primeiro)
    const fullQuery = await pool.query(`
      SELECT 
        l.id_lancamento as id,
        'TODAS AS CONTAS' as conta,
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
      LEFT JOIN pessoa p ON l.id_pessoa = p.id_pessoa
      LEFT JOIN tipo_operacao to_op ON l.id_tp_operacao = to_op.id_tp_operacao
      ORDER BY l.dt_operacao DESC
      LIMIT 5
    `);
    
    return NextResponse.json({
      totalNaTabela: total,
      colunasContaCorrente: colunasContaCorrente,
      querySimples: {
        encontrados: directQuery.rows.length,
        dados: directQuery.rows
      },
      queryCompleta: {
        encontrados: fullQuery.rows.length,
        dados: fullQuery.rows
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      erro: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

