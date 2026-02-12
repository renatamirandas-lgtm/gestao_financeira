import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    if (!search) {
      return NextResponse.json([]);
    }
    const pessoas = await DataService.searchPessoas(search);
    return NextResponse.json(pessoas);
  } catch (error) {
    console.error('Erro ao buscar clientes/fornecedores:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes/fornecedores' }, { status: 500 });
  }
}
