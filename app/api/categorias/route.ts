import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    const categorias = await DataService.getCategorias();
    return NextResponse.json(categorias);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const categoria = await DataService.addCategoria(body);
    return NextResponse.json(categoria, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao adicionar categoria:', error);
    return NextResponse.json({ error: error.message || 'Erro ao adicionar categoria' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    const sucesso = await DataService.deleteCategoria(id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}

