import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get('dataInicio') ? new Date(searchParams.get('dataInicio')!) : undefined;
    const dataFim = searchParams.get('dataFim') ? new Date(searchParams.get('dataFim')!) : undefined;
    const fluxo = await DataService.getFluxoCaixa(dataInicio, dataFim);
    return NextResponse.json(fluxo);
  } catch (error) {
    console.error('Erro ao buscar fluxo de caixa:', error);
    return NextResponse.json({ error: 'Erro ao buscar fluxo de caixa' }, { status: 500 });
  }
}

