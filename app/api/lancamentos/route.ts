import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    const lancamentos = await DataService.getLancamentos();
    return NextResponse.json(lancamentos);
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar lançamentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lancamento = await DataService.addLancamento(body);
    return NextResponse.json(lancamento, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar lançamento:', error);
    return NextResponse.json({ error: 'Erro ao adicionar lançamento' }, { status: 500 });
  }
}

