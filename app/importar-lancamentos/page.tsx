'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LancamentoImportRow, ErroImportacao } from '@/lib/importacao-excel';

export default function ImportarLancamentosPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<LancamentoImportRow[]>([]);
  const [erros, setErros] = useState<ErroImportacao[]>([]);
  const [totalLinhas, setTotalLinhas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const enviar = async (modo: 'preview' | 'importar') => {
    if (!arquivo) {
      alert('Selecione um arquivo Excel');
      return;
    }
    setCarregando(true);
    setMensagem('');
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('modo', modo);
      const res = await fetch('/api/lancamentos/importar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro na importação');
      }
      if (modo === 'preview') {
        setPreview(data.lancamentos || []);
        setErros(data.erros || []);
        setTotalLinhas(data.totalLinhasPlanilha || 0);
        setMensagem(`${data.validos || 0} lançamento(s) válido(s) de ${data.totalLinhasPlanilha || 0} linha(s)`);
      } else {
        setMensagem(
          `Importação concluída: ${data.importados || 0} lançamento(s) gravado(s).` +
            (data.erros?.length ? ` ${data.erros.length} aviso(s)/erro(s).` : '')
        );
        setErros(data.erros || []);
        if (data.importados > 0) {
          setPreview([]);
          setArquivo(null);
        }
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao processar arquivo');
    } finally {
      setCarregando(false);
    }
  };

  const formatarData = (iso: string | null) => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatarValor = (row: LancamentoImportRow) => {
    const v = row.entradas > 0 ? row.entradas : -row.saidas;
    const sinal = v < 0 ? '-' : '';
    return `${sinal}R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ marginBottom: '24px', padding: '16px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>Importar lançamentos (Excel)</h1>
        <p style={{ color: '#555', fontSize: '14px', marginBottom: '12px' }}>
          Exporte o extrato do banco, ajuste as colunas conforme o modelo do sistema e envie o arquivo .xlsx.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '8px 14px', background: '#0066cc', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
            ← Início
          </Link>
          <Link href="/lancamentos-grid" style={{ padding: '8px 14px', background: '#6c757d', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
            Lançamentos
          </Link>
          <a
            href="/api/lancamentos/importar"
            style={{ padding: '8px 14px', background: '#17a2b8', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}
          >
            Baixar modelo Excel
          </a>
        </div>
      </header>

      <section style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Colunas esperadas (1ª linha da planilha)</h2>
        <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
          Data Operacao, Conta, Cliente Fornecedor, Categoria, Forma Pagamento, Descricao, Valor, Parcelas, Data Vencimento, Data Compensacao.
          <br />
          <strong>Valor:</strong> positivo = entrada, negativo = saída.{' '}
          <strong>Parcelas:</strong> informe só o número (ex.: <strong>3</strong>) para gerar 1/3, 2/3 e 3/3 com vencimento mensal a partir da Data Vencimento;
          ou informe <strong>2/3</strong> em cada linha se a planilha já tiver uma linha por parcela.
        </p>

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setArquivo(e.target.files?.[0] || null);
              setPreview([]);
              setErros([]);
              setMensagem('');
            }}
          />
          <button
            type="button"
            onClick={() => enviar('preview')}
            disabled={!arquivo || carregando}
            style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Visualizar
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm('Importar lançamentos válidos da planilha para o sistema?')) return;
              enviar('importar');
            }}
            disabled={!arquivo || carregando}
            style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Importar
          </button>
        </div>
        {mensagem && (
          <p style={{ marginTop: '12px', fontSize: '14px', color: '#333' }}>{mensagem}</p>
        )}
      </section>

      {erros.length > 0 && (
        <section style={{ background: '#fff8e6', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffe08a' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Avisos / erros ({erros.length})</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            {erros.slice(0, 30).map((e, i) => (
              <li key={i}>Linha {e.linha}: {e.mensagem}</li>
            ))}
            {erros.length > 30 && <li>… e mais {erros.length - 30}</li>}
          </ul>
        </section>
      )}

      {preview.length > 0 && (
        <section style={{ background: 'white', padding: '16px', borderRadius: '8px', overflow: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>
            Pré-visualização ({preview.length} de {totalLinhas} linhas na planilha)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Linha</th>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Data Op.</th>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Conta</th>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Cliente/Forn.</th>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Descrição</th>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Valor</th>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Parc.</th>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Venc.</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.linha}>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.linha}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatarData(row.dataOperacao)}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.conta}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.clienteFornecedor || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.descricao}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatarValor(row)}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.numeroParcela}/{row.totalParcelas}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatarData(row.dataVencimento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
