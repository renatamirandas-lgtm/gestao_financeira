import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    console.log('[API] Buscando lançamentos...');
    const lancamentos = await DataService.getLancamentos();
    console.log(`[API] Total de lançamentos retornados: ${lancamentos.length}`);
    return NextResponse.json(lancamentos);
  } catch (error: any) {
    console.error('[API] Erro ao buscar lançamentos:', error);
    console.error('[API] Detalhes:', error.message);
    return NextResponse.json({ 
      error: 'Erro ao buscar lançamentos',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lancamento = await DataService.addLancamento(body);
    return NextResponse.json(lancamento, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao adicionar lançamento:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao adicionar lançamento',
      details: error.stack 
    }, { status: 500 });
  }
}

