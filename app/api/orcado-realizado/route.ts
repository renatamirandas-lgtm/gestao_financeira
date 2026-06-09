import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = parseInt(searchParams.get('mes') || '0', 10);
    const ano = parseInt(searchParams.get('ano') || '0', 10);
    const categoriaId = searchParams.get('categoriaId')
      ? parseInt(searchParams.get('categoriaId')!, 10)
      : undefined;
    const conta = searchParams.get('conta') || undefined;

    if (!mes || !ano) {
      return NextResponse.json({ error: 'Parâmetros mes e ano são obrigatórios' }, { status: 400 });
    }

    const dashboard = await DataService.getOrcadoRealizado({ mes, ano, categoriaId, conta });
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Erro ao buscar orçado x realizado:', error);
    return NextResponse.json({ error: 'Erro ao buscar orçado x realizado' }, { status: 500 });
  }
}
