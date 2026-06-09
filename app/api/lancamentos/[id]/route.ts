import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const lancamento = await DataService.updateLancamento(params.id, body);
    if (!lancamento) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }
    return NextResponse.json(lancamento);
  } catch (error) {
    console.error('Erro ao atualizar lançamento:', error);
    return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sucesso = await DataService.deleteLancamento(params.id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir lançamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir lançamento' },
      { status: 500 }
    );
  }
}

