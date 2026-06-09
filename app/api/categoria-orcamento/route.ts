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

    if (!mes || !ano) {
      return NextResponse.json({ error: 'Parâmetros mes e ano são obrigatórios' }, { status: 400 });
    }

    const orcamentos = await DataService.getCategoriaOrcamentos(mes, ano, categoriaId);
    return NextResponse.json(orcamentos);
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mes = parseInt(String(body.mes), 10);
    const ano = parseInt(String(body.ano), 10);
    const categoriaId = parseInt(String(body.categoriaId), 10);
    const valorPrevisto = parseFloat(String(body.valorPrevisto ?? 0));

    if (!mes || !ano || !categoriaId) {
      return NextResponse.json({ error: 'categoriaId, mes e ano são obrigatórios' }, { status: 400 });
    }

    const orcamento = await DataService.upsertCategoriaOrcamento({
      categoriaId,
      mes,
      ano,
      valorPrevisto
    });
    return NextResponse.json(orcamento, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao salvar orçamento:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar orçamento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);
    const sucesso = await DataService.deleteCategoriaOrcamento(id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    return NextResponse.json({ error: 'Erro ao excluir orçamento' }, { status: 500 });
  }
}
