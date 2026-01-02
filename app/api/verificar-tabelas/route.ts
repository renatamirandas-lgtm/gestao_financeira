import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Listar todas as tabelas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tabelas = tablesResult.rows.map((row: any) => row.table_name);
    
    // Para cada tabela, obter a estrutura
    const estruturas: any = {};
    
    for (const tableName of tabelas) {
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      estruturas[tableName] = columnsResult.rows.map((col: any) => ({
        nome: col.column_name,
        tipo: col.data_type,
        tamanho: col.character_maximum_length,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      }));
    }
    
    return NextResponse.json({
      sucesso: true,
      tabelas,
      estruturas
    });
    
  } catch (error: any) {
    console.error('Erro ao verificar tabelas:', error);
    return NextResponse.json({
      sucesso: false,
      erro: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

