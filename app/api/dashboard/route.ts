import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conta = searchParams.get('conta') || undefined;
    const info = await DataService.getDashboardInfo(conta);
    return NextResponse.json(info);
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    return NextResponse.json({ error: 'Erro ao buscar dashboard' }, { status: 500 });
  }
}

