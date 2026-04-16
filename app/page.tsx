'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardInfo } from '@/types';

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardInfo>({});
  const [contaSelecionada, setContaSelecionada] = useState<string>('TODAS AS CONTAS');
  const [bancos, setBancos] = useState<Array<{ id: number; nome: string }>>([]);

  useEffect(() => {
    const carregarDados = async () => {
      const res = await fetch('/api/bancos');
      const bancosList = await res.json();
      setBancos(bancosList);
      await atualizarDashboard();
    };
    carregarDados();
  }, [contaSelecionada]);

  const atualizarDashboard = async () => {
    const res = await fetch(`/api/dashboard?conta=${encodeURIComponent(contaSelecionada)}`);
    const info = await res.json();
    setDashboard(info);
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Gestão Financeira</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <strong>Conta:</strong>
            <select 
              value={contaSelecionada} 
              onChange={(e) => setContaSelecionada(e.target.value)}
              style={{ marginLeft: '8px', padding: '6px 12px' }}
            >
              {bancos.map(banco => (
                <option key={banco.id} value={banco.nome}>{banco.nome}</option>
              ))}
            </select>
          </label>
          <nav style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <Link href="/" style={{ padding: '8px 16px', background: '#0066cc', color: 'white', borderRadius: '4px' }}>
              Início
            </Link>
            <Link href="/lancamentos-grid" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              Lançar
            </Link>
            <Link href="/fluxo-caixa" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              Fluxo de Caixa
            </Link>
            <Link href="/resultados" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              Resultados
            </Link>
            <Link href="/configuracoes" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              Configurações
            </Link>
          </nav>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Saldo Atual</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: dashboard.saldoAtual && dashboard.saldoAtual >= 0 ? '#28a745' : '#dc3545' }}>
            R$ {dashboard.saldoAtual?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Entradas</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
            R$ {dashboard.totalEntradas?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Saídas</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
            R$ {dashboard.totalSaidas?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Saldo da Seleção</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: dashboard.saldoSelecao && dashboard.saldoSelecao >= 0 ? '#28a745' : '#dc3545' }}>
            R$ {dashboard.saldoSelecao?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>
      </div>

      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '15px' }}>Ações Rápidas</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/lancamentos-grid" style={{ padding: '12px 24px', background: '#0066cc', color: 'white', borderRadius: '4px', display: 'inline-block' }}>
            ➕ Novo Lançamento
          </Link>
          <Link href="/fluxo-caixa" style={{ padding: '12px 24px', background: '#6c757d', color: 'white', borderRadius: '4px', display: 'inline-block' }}>
            📊 Ver Fluxo de Caixa
          </Link>
          <Link href="/resultados" style={{ padding: '12px 24px', background: '#6c757d', color: 'white', borderRadius: '4px', display: 'inline-block' }}>
            📈 Ver Resultados
          </Link>
        </div>
      </div>
    </main>
  );
}

