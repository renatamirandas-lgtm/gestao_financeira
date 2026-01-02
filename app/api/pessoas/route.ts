import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    const pessoas = await DataService.getPessoas();
    return NextResponse.json(pessoas);
  } catch (error) {
    console.error('Erro ao buscar pessoas:', error);
    return NextResponse.json({ error: 'Erro ao buscar pessoas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pessoa = await DataService.addPessoa(body);
    return NextResponse.json(pessoa, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar pessoa:', error);
    return NextResponse.json({ error: 'Erro ao adicionar pessoa' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    const sucesso = await DataService.deletePessoa(id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir pessoa:', error);
    return NextResponse.json({ error: 'Erro ao excluir pessoa' }, { status: 500 });
  }
}

