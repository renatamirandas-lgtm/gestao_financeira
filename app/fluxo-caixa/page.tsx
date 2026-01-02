'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FluxoCaixa } from '@/types';

export default function FluxoCaixaPage() {
  const [fluxo, setFluxo] = useState<FluxoCaixa[]>([]);
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    carregarFluxo();
  }, [dataInicio, dataFim]);

  const carregarFluxo = async () => {
    const res = await fetch(`/api/fluxo-caixa?dataInicio=${dataInicio}&dataFim=${dataFim}`);
    const dados = await res.json();
    setFluxo(dados);
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h1 style={{ fontSize: '28px' }}>Fluxo de Caixa</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              ← Voltar
            </Link>
            <Link href="/configuracoes" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              Configurações
            </Link>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>De:</strong>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={{ padding: '6px 12px' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Até:</strong>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={{ padding: '6px 12px' }}
            />
          </label>
        </div>
      </header>

      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        {fluxo.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            Nenhum dado de fluxo de caixa encontrado para o período selecionado.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Dia</th>
                <th colSpan={3} style={{ textAlign: 'center', background: '#e3f2fd' }}>REALIZADO</th>
                <th colSpan={3} style={{ textAlign: 'center', background: '#fff3e0' }}>PLANEJADO</th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th style={{ background: '#e3f2fd' }}>Entradas</th>
                <th style={{ background: '#e3f2fd' }}>Saídas</th>
                <th style={{ background: '#e3f2fd' }}>Saldo Atual</th>
                <th style={{ background: '#fff3e0' }}>Entradas</th>
                <th style={{ background: '#fff3e0' }}>Saídas</th>
                <th style={{ background: '#fff3e0' }}>Saldo Futuro</th>
              </tr>
            </thead>
            <tbody>
              {fluxo.map((item, index) => (
                <tr key={index}>
                  <td>{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                  <td>{item.dia}</td>
                  <td style={{ color: '#28a745', textAlign: 'right' }}>
                    {item.entradasRealizado > 0 ? `R$ ${item.entradasRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ color: '#dc3545', textAlign: 'right' }}>
                    {item.saidasRealizado > 0 ? `R$ ${item.saidasRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: item.saldoAtual >= 0 ? '#28a745' : '#dc3545'
                  }}>
                    R$ {item.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ color: '#28a745', textAlign: 'right' }}>
                    {item.entradasPlanejado > 0 ? `R$ ${item.entradasPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ color: '#dc3545', textAlign: 'right' }}>
                    {item.saidasPlanejado > 0 ? `R$ ${item.saidasPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: item.saldoFuturo >= 0 ? '#28a745' : '#dc3545'
                  }}>
                    R$ {item.saldoFuturo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

