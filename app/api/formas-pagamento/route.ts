import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    const formas = await DataService.getFormasPagamento();
    return NextResponse.json(formas);
  } catch (error) {
    console.error('Erro ao buscar formas de pagamento:', error);
    return NextResponse.json({ error: 'Erro ao buscar formas de pagamento' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const forma = await DataService.addFormaOperacao(body);
    return NextResponse.json(forma, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar forma de operação:', error);
    return NextResponse.json({ error: 'Erro ao adicionar forma de operação' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    const sucesso = await DataService.deleteFormaOperacao(id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Forma de operação não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir forma de operação:', error);
    return NextResponse.json({ error: 'Erro ao excluir forma de operação' }, { status: 500 });
  }
}

