import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    const agencias = await DataService.getAgencias();
    return NextResponse.json(agencias);
  } catch (error) {
    console.error('Erro ao buscar agências:', error);
    return NextResponse.json({ error: 'Erro ao buscar agências' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agencia = await DataService.addAgencia(body);
    return NextResponse.json(agencia, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar agência:', error);
    return NextResponse.json({ error: 'Erro ao adicionar agência' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    const sucesso = await DataService.deleteAgencia(id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir agência:', error);
    return NextResponse.json({ error: 'Erro ao excluir agência' }, { status: 500 });
  }
}

