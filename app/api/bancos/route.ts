import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    const bancos = await DataService.getBancos();
    return NextResponse.json(bancos);
  } catch (error) {
    console.error('Erro ao buscar bancos:', error);
    return NextResponse.json({ error: 'Erro ao buscar bancos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const banco = await DataService.addBanco(body);
    return NextResponse.json(banco, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar banco:', error);
    return NextResponse.json({ error: 'Erro ao adicionar banco' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    const sucesso = await DataService.deleteBanco(id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Banco não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir banco:', error);
    return NextResponse.json({ error: 'Erro ao excluir banco' }, { status: 500 });
  }
}

