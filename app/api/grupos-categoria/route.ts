import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET() {
  try {
    const grupos = await DataService.getGruposCategoria();
    return NextResponse.json(grupos);
  } catch (error) {
    console.error('Erro ao buscar grupos de categoria:', error);
    return NextResponse.json({ error: 'Erro ao buscar grupos de categoria' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const grupo = await DataService.addGrupoCategoria(body);
    return NextResponse.json(grupo, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao adicionar grupo de categoria:', error);
    return NextResponse.json({ error: error.message || 'Erro ao adicionar grupo de categoria' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    const sucesso = await DataService.deleteGrupoCategoria(id);
    if (!sucesso) {
      return NextResponse.json({ error: 'Grupo de categoria não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir grupo de categoria:', error);
    return NextResponse.json({ error: 'Erro ao excluir grupo de categoria' }, { status: 500 });
  }
}

