'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lancamento } from '@/types';

export default function ResultadosPage() {
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);

  useEffect(() => {
    carregarLancamentos();
  }, [ano]);

  useEffect(() => {
    calcularResultados();
  }, [lancamentos, ano]);

  const carregarLancamentos = async () => {
    const res = await fetch('/api/lancamentos');
    const dados = await res.json();
    setLancamentos(dados);
  };

  const calcularResultados = () => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const resultadosMensais = meses.map((mesNome, index) => {
      const mes = index + 1;
      const dataInicio = new Date(ano, index, 1);
      const dataFim = new Date(ano, index + 1, 0);

      // Filtrar lançamentos do mês
      const lancamentosMes = lancamentos.filter(lanc => {
        const dataOp = new Date(lanc.dataOperacao);
        return dataOp >= dataInicio && dataOp <= dataFim;
      });

      // Separar realizado e planejado
      const realizado = lancamentosMes.filter(l => l.status === 'Realizado');
      const planejado = lancamentosMes.filter(l => l.status === 'Planejado');

      const entradasRealizado = realizado.reduce((sum, l) => sum + (l.entradas || 0), 0);
      const saidasRealizado = realizado.reduce((sum, l) => sum + (l.saidas || 0), 0);
      const saldoRealizado = entradasRealizado - saidasRealizado;

      const entradasPlanejado = planejado.reduce((sum, l) => sum + (l.entradas || 0), 0);
      const saidasPlanejado = planejado.reduce((sum, l) => sum + (l.saidas || 0), 0);
      const saldoPlanejado = entradasPlanejado - saidasPlanejado;

      return {
        mes,
        mesNome,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
        entradasRealizado,
        saidasRealizado,
        saldoRealizado,
        entradasPlanejado,
        saidasPlanejado,
        saldoPlanejado,
      };
    });

    setResultados(resultadosMensais);
  };

  const totalRealizado = resultados.reduce((sum, r) => sum + r.saldoRealizado, 0);
  const totalPlanejado = resultados.reduce((sum, r) => sum + r.saldoPlanejado, 0);

  return (
    <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h1 style={{ fontSize: '28px' }}>Resultados</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              ← Voltar
            </Link>
            <Link href="/configuracoes" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              Configurações
            </Link>
          </div>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Ano:</strong>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value) || new Date().getFullYear())}
              min="2020"
              max="2100"
              style={{ padding: '6px 12px', width: '120px' }}
            />
          </label>
        </div>
      </header>

      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th colSpan={3} style={{ textAlign: 'center', background: '#e3f2fd' }}>REALIZADO</th>
              <th colSpan={3} style={{ textAlign: 'center', background: '#fff3e0' }}>PLANEJADO</th>
            </tr>
            <tr>
              <th></th>
              <th style={{ background: '#e3f2fd' }}>Entradas</th>
              <th style={{ background: '#e3f2fd' }}>Saídas</th>
              <th style={{ background: '#e3f2fd' }}>Saldo</th>
              <th style={{ background: '#fff3e0' }}>Entradas</th>
              <th style={{ background: '#fff3e0' }}>Saídas</th>
              <th style={{ background: '#fff3e0' }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((resultado) => (
              <tr key={resultado.mes}>
                <td><strong>{resultado.mesNome}</strong></td>
                <td style={{ color: '#28a745', textAlign: 'right' }}>
                  R$ {resultado.entradasRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ color: '#dc3545', textAlign: 'right' }}>
                  R$ {resultado.saidasRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ 
                  textAlign: 'right', 
                  fontWeight: 'bold',
                  color: resultado.saldoRealizado >= 0 ? '#28a745' : '#dc3545'
                }}>
                  R$ {resultado.saldoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ color: '#28a745', textAlign: 'right' }}>
                  R$ {resultado.entradasPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ color: '#dc3545', textAlign: 'right' }}>
                  R$ {resultado.saidasPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ 
                  textAlign: 'right', 
                  fontWeight: 'bold',
                  color: resultado.saldoPlanejado >= 0 ? '#28a745' : '#dc3545'
                }}>
                  R$ {resultado.saldoPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold', background: '#f8f9fa' }}>
              <td><strong>TOTAL {ano}</strong></td>
              <td colSpan={2}></td>
              <td style={{ 
                textAlign: 'right',
                color: totalRealizado >= 0 ? '#28a745' : '#dc3545'
              }}>
                R$ {totalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td colSpan={2}></td>
              <td style={{ 
                textAlign: 'right',
                color: totalPlanejado >= 0 ? '#28a745' : '#dc3545'
              }}>
                R$ {totalPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}

