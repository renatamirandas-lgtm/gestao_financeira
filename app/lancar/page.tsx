'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lancamento } from '@/types';

export default function LancarPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [formulario, setFormulario] = useState<Partial<Lancamento>>({
    conta: 'TODAS AS CONTAS',
    dataOperacao: new Date().toISOString().split('T')[0],
    clienteFornecedor: '',
    descricao: '',
    parcelas: 1,
    categoria: '',
    entradas: 0,
    saidas: 0,
    formaOperacao: '',
  });
  const [editando, setEditando] = useState<string | null>(null);
  const [bancos, setBancos] = useState<Array<{ id: number; nome: string }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: string; nome: string }>>([]);

  useEffect(() => {
    const carregarDados = async () => {
      const [bancosRes, formasRes] = await Promise.all([
        fetch('/api/bancos'),
        fetch('/api/formas-pagamento')
      ]);
      const bancosList = await bancosRes.json();
      const formasList = await formasRes.json();
      setBancos(bancosList);
      setFormasPagamento(formasList);
      await carregarLancamentos();
    };
    carregarDados();
  }, []);

  const carregarLancamentos = async () => {
    const res = await fetch('/api/lancamentos');
    const dados = await res.json();
    setLancamentos(dados);
  };

  const salvar = async () => {
    try {
      if (editando) {
        const res = await fetch(`/api/lancamentos/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formulario)
        });
        if (!res.ok) throw new Error('Erro ao atualizar');
        setEditando(null);
      } else {
        const res = await fetch('/api/lancamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formulario)
        });
        if (!res.ok) throw new Error('Erro ao adicionar');
      }
      
      setFormulario({
        conta: 'TODAS AS CONTAS',
        dataOperacao: new Date().toISOString().split('T')[0],
        clienteFornecedor: '',
        descricao: '',
        parcelas: 1,
        categoria: '',
        entradas: 0,
        saidas: 0,
        formaOperacao: '',
      });
      
      await carregarLancamentos();
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      alert('Erro ao salvar lançamento. Tente novamente.');
    }
  };

  const editar = (lancamento: Lancamento) => {
    setFormulario({
      ...lancamento,
      dataOperacao: lancamento.dataOperacao ? new Date(lancamento.dataOperacao).toISOString().split('T')[0] : '',
      dataVencimento: lancamento.dataVencimento ? new Date(lancamento.dataVencimento).toISOString().split('T')[0] : '',
      dataCompensacao: lancamento.dataCompensacao ? new Date(lancamento.dataCompensacao).toISOString().split('T')[0] : '',
    });
    setEditando(lancamento.id!);
  };

  const excluir = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      const res = await fetch(`/api/lancamentos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await carregarLancamentos();
      } else {
        alert('Erro ao excluir lançamento');
      }
    }
  };

  const cancelar = () => {
    setEditando(null);
    setFormulario({
      conta: 'TODAS AS CONTAS',
      dataOperacao: new Date().toISOString().split('T')[0],
      clienteFornecedor: '',
      descricao: '',
      parcelas: 1,
      categoria: '',
      entradas: 0,
      saidas: 0,
      formaOperacao: '',
    });
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px' }}>Lançamentos</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              ← Voltar
            </Link>
            <Link href="/configuracoes" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
              Configurações
            </Link>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
        {/* Formulário */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '20px' }}>{editando ? 'Editar' : 'Novo'} Lançamento</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); salvar(); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Conta *</label>
              <select
                value={formulario.conta || ''}
                onChange={(e) => setFormulario({ ...formulario, conta: e.target.value })}
                required
                style={{ width: '100%' }}
              >
                {bancos.map(banco => (
                  <option key={banco.id} value={banco.nome}>{banco.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Data Operação *</label>
              <input
                type="date"
                value={formulario.dataOperacao || ''}
                onChange={(e) => setFormulario({ ...formulario, dataOperacao: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Cliente / Fornecedor</label>
              <input
                type="text"
                value={formulario.clienteFornecedor || ''}
                onChange={(e) => setFormulario({ ...formulario, clienteFornecedor: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Descrição *</label>
              <input
                type="text"
                value={formulario.descricao || ''}
                onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Categoria</label>
              <input
                type="text"
                value={formulario.categoria || ''}
                onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Entradas (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formulario.entradas || 0}
                  onChange={(e) => setFormulario({ ...formulario, entradas: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Saídas (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formulario.saidas || 0}
                  onChange={(e) => setFormulario({ ...formulario, saidas: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Forma de Operação</label>
              <select
                value={formulario.formaOperacao || ''}
                onChange={(e) => setFormulario({ ...formulario, formaOperacao: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="">Selecione...</option>
                {formasPagamento.map(fp => (
                  <option key={fp.id} value={fp.nome}>{fp.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Data Vencimento</label>
              <input
                type="date"
                value={formulario.dataVencimento ? new Date(formulario.dataVencimento).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormulario({ ...formulario, dataVencimento: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Data Compensação</label>
              <input
                type="date"
                value={formulario.dataCompensacao ? new Date(formulario.dataCompensacao).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormulario({ ...formulario, dataCompensacao: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                {editando ? 'Atualizar' : 'Salvar'}
              </button>
              {editando && (
                <button type="button" onClick={cancelar} className="btn-secondary">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Lançamentos */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <h2 style={{ marginBottom: '20px' }}>Lançamentos ({lancamentos.length})</h2>
          
          {lancamentos.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              Nenhum lançamento cadastrado. Adicione um novo lançamento usando o formulário ao lado.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Conta</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((lanc) => (
                  <tr key={lanc.id}>
                    <td>{new Date(lanc.dataOperacao).toLocaleDateString('pt-BR')}</td>
                    <td>{lanc.descricao}</td>
                    <td>{lanc.conta}</td>
                    <td style={{ color: '#28a745' }}>
                      {lanc.entradas > 0 ? `R$ ${lanc.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td style={{ color: '#dc3545' }}>
                      {lanc.saidas > 0 ? `R$ ${lanc.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: lanc.status === 'Realizado' ? '#d4edda' : lanc.status === 'Planejado' ? '#fff3cd' : '#e2e3e5',
                        color: lanc.status === 'Realizado' ? '#155724' : lanc.status === 'Planejado' ? '#856404' : '#666'
                      }}>
                        {lanc.status || '-'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => editar(lanc)} style={{ padding: '4px 8px', fontSize: '12px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Editar
                        </button>
                        <button onClick={() => excluir(lanc.id!)} style={{ padding: '4px 8px', fontSize: '12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

