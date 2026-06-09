import { NextRequest, NextResponse } from 'next/server';
import { parseExcelBuffer } from '@/lib/importacao-excel';
import { importarLancamentosPlanilha } from '@/lib/importacao-lancamentos';
import { prepararLinhasImportacao } from '@/lib/importacao-preparar';

export const runtime = 'nodejs';

const EXTENSOES = ['.xlsx', '.xls'];

export async function GET() {
  const { gerarModeloExcelBuffer } = await import('@/lib/importacao-excel');
  const buffer = gerarModeloExcelBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao-lancamentos.xlsx"'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const arquivo = formData.get('arquivo');
    const modo = String(formData.get('modo') || 'preview');

    if (!arquivo || !(arquivo instanceof Blob)) {
      return NextResponse.json({ error: 'Envie um arquivo Excel (.xlsx)' }, { status: 400 });
    }

    const nome = (arquivo as File).name?.toLowerCase() || '';
    if (!EXTENSOES.some(ext => nome.endsWith(ext))) {
      return NextResponse.json({ error: 'Formato inválido. Use .xlsx ou .xls' }, { status: 400 });
    }

    const buffer = await arquivo.arrayBuffer();
    const parseado = parseExcelBuffer(buffer);
    const preparado = prepararLinhasImportacao(parseado.lancamentos);
    const errosTotais = [...parseado.erros, ...preparado.erros];

    if (modo === 'preview') {
      return NextResponse.json({
        lancamentos: preparado.linhas,
        erros: errosTotais,
        totalLinhasPlanilha: parseado.totalLinhasPlanilha,
        validos: preparado.linhas.length,
        linhasPlanilha: parseado.lancamentos.length
      });
    }

    if (modo === 'importar') {
      if (preparado.linhas.length === 0) {
        return NextResponse.json(
          { error: 'Nenhum lançamento válido para importar', erros: errosTotais },
          { status: 400 }
        );
      }

      const resultado = await importarLancamentosPlanilha(preparado.linhas);
      return NextResponse.json({
        importados: resultado.importados,
        erros: [...errosTotais, ...resultado.erros],
        totalLinhasPlanilha: parseado.totalLinhasPlanilha
      });
    }

    return NextResponse.json({ error: 'Modo inválido (preview ou importar)' }, { status: 400 });
  } catch (error: any) {
    console.error('[IMPORT] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar planilha' },
      { status: 500 }
    );
  }
}
