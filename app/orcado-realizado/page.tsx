'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { OrcadoRealizadoDashboard } from '@/types';

function corPercentualOrcamento(percentual: number): string {
  if (percentual >= 100) return '#dc3545';
  if (percentual >= 80) return '#ffc107';
  return '#28a745';
}

interface CategoriaDespesa {
  id: number;
  nome: string;
}

const MESES = [
  { valor: 1, label: 'Janeiro' },
  { valor: 2, label: 'Fevereiro' },
  { valor: 3, label: 'Março' },
  { valor: 4, label: 'Abril' },
  { valor: 5, label: 'Maio' },
  { valor: 6, label: 'Junho' },
  { valor: 7, label: 'Julho' },
  { valor: 8, label: 'Agosto' },
  { valor: 9, label: 'Setembro' },
  { valor: 10, label: 'Outubro' },
  { valor: 11, label: 'Novembro' },
  { valor: 12, label: 'Dezembro' }
];

function formatarMoeda(valor: number) {
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function BarraProgresso({ percentual }: { percentual: number }) {
  const cor = corPercentualOrcamento(percentual);
  const largura = Math.min(Math.max(percentual, 0), 100);
  return (
    <div style={{
      width: '100%',
      height: '14px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '6px'
    }}>
      <div style={{
        width: `${largura}%`,
        height: '100%',
        backgroundColor: cor,
        transition: 'width 0.3s ease'
      }} />
    </div>
  );
}

export default function OrcadoRealizadoPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [categoriaId, setCategoriaId] = useState('');
  const [dashboard, setDashboard] = useState<OrcadoRealizadoDashboard | null>(null);
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarOrcamento, setMostrarOrcamento] = useState(false);
  const [valoresOrcamento, setValoresOrcamento] = useState<Record<number, string>>({});
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  const anosDisponiveis = useMemo(() => {
    const lista = [];
    for (let a = hoje.getFullYear() - 2; a <= hoje.getFullYear() + 2; a++) lista.push(a);
    return lista;
  }, [hoje]);

  const carregarCategorias = useCallback(async () => {
    const res = await fetch('/api/categorias');
    const data = await res.json();
    const despesa = (data || [])
      .filter((c: { tipoGrupo?: string }) => c.tipoGrupo === 'S')
      .map((c: { id: number; nome: string }) => ({ id: c.id, nome: c.nome }));
    setCategorias(despesa);
  }, []);

  const carregarDashboard = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        mes: String(mes),
        ano: String(ano)
      });
      if (categoriaId) params.set('categoriaId', categoriaId);

      const res = await fetch(`/api/orcado-realizado?${params}`);
      const data = await res.json();
      if (res.ok) setDashboard(data);

      const resOrc = await fetch(`/api/categoria-orcamento?mes=${mes}&ano=${ano}`);
      const orcamentos = await resOrc.json();
      if (resOrc.ok && Array.isArray(orcamentos)) {
        const mapa: Record<number, string> = {};
        for (const o of orcamentos) {
          mapa[o.categoriaId] = String(o.valorPrevisto ?? 0);
        }
        setValoresOrcamento(mapa);
      }
    } finally {
      setCarregando(false);
    }
  }, [mes, ano, categoriaId]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const salvarOrcamento = async (catId: number) => {
    const valor = parseFloat((valoresOrcamento[catId] || '0').replace(',', '.')) || 0;
    setSalvandoId(catId);
    try {
      await fetch('/api/categoria-orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoriaId: catId, mes, ano, valorPrevisto: valor })
      });
      await carregarDashboard();
    } finally {
      setSalvandoId(null);
    }
  };

  const cardStyle = {
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  } as const;

  return (
    <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Orçado x Realizado</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <strong>Mês:</strong>
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value, 10))} style={{ marginLeft: '8px', padding: '6px 12px' }}>
              {MESES.map(m => (
                <option key={m.valor} value={m.valor}>{m.label}</option>
              ))}
            </select>
          </label>
          <label>
            <strong>Ano:</strong>
            <select value={ano} onChange={(e) => setAno(parseInt(e.target.value, 10))} style={{ marginLeft: '8px', padding: '6px 12px' }}>
              {anosDisponiveis.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            <strong>Categoria:</strong>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={{ marginLeft: '8px', padding: '6px 12px', minWidth: '160px' }}>
              <option value="">Todas</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <nav style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <Link href="/" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>Início</Link>
            <Link href="/lancamentos-grid" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>Lançar</Link>
            <Link href="/orcado-realizado" style={{ padding: '8px 16px', background: '#0066cc', color: 'white', borderRadius: '4px' }}>Orçado x Realizado</Link>
          </nav>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Orçado</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0066cc', margin: 0 }}>
            {formatarMoeda(dashboard?.totalOrcado ?? 0)}
          </p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Gasto</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc3545', margin: 0 }}>
            {formatarMoeda(dashboard?.totalGasto ?? 0)}
          </p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Saldo Disponível</h3>
          <p style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: (dashboard?.saldoDisponivel ?? 0) >= 0 ? '#28a745' : '#dc3545',
            margin: 0
          }}>
            {formatarMoeda(dashboard?.saldoDisponivel ?? 0)}
          </p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>% Geral Consumido</h3>
          <p style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: corPercentualOrcamento(dashboard?.percentualGeralConsumido ?? 0),
            margin: 0
          }}>
            {formatarPercentual(dashboard?.percentualGeralConsumido ?? 0)}
          </p>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Orçado x Realizado por Categoria</h2>
          <button
            type="button"
            onClick={() => setMostrarOrcamento(v => !v)}
            style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {mostrarOrcamento ? 'Ocultar Orçamentos' : 'Definir Orçamentos'}
          </button>
        </div>

        {mostrarOrcamento && (
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '6px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>Valores previstos — {MESES.find(m => m.valor === mes)?.label}/{ano}</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {categorias.map(cat => (
                <div key={cat.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ minWidth: '180px', fontWeight: '500' }}>{cat.nome}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valoresOrcamento[cat.id] ?? ''}
                    onChange={(e) => setValoresOrcamento(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    placeholder="0,00"
                    style={{ padding: '6px 10px', width: '140px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <button
                    type="button"
                    onClick={() => salvarOrcamento(cat.id)}
                    disabled={salvandoId === cat.id}
                    style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {salvandoId === cat.id ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {carregando && <p style={{ color: '#666' }}>Carregando...</p>}

        {!carregando && (!dashboard?.itens || dashboard.itens.length === 0) && (
          <p style={{ color: '#666' }}>
            Nenhum orçamento ou gasto encontrado para o período. Use &quot;Definir Orçamentos&quot; para cadastrar valores previstos.
          </p>
        )}

        {!carregando && dashboard?.itens && dashboard.itens.length > 0 && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {dashboard.itens.map(item => {
              const cor = corPercentualOrcamento(item.percentualAtingido);
              return (
                <div key={item.categoriaId} style={{ padding: '16px', border: '1px solid #e9ecef', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{item.categoriaNome}</h3>
                    <span style={{ fontWeight: '700', color: cor, fontSize: '16px' }}>
                      {formatarPercentual(item.percentualAtingido)}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '12px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#666' }}>Previsto: </span>
                      <strong>{formatarMoeda(item.valorPrevisto)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Gasto: </span>
                      <strong style={{ color: '#dc3545' }}>{formatarMoeda(item.totalGasto)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Restante: </span>
                      <strong style={{ color: item.valorRestante >= 0 ? '#28a745' : '#dc3545' }}>
                        {formatarMoeda(item.valorRestante)}
                      </strong>
                    </div>
                  </div>
                  <BarraProgresso percentual={item.percentualAtingido} />
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#999', marginTop: '16px', marginBottom: 0 }}>
          Gastos consideram lançamentos realizados (com data de compensação) no período.
        </p>
      </div>
    </main>
  );
}
