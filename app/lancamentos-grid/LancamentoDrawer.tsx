'use client';

import { useState, useEffect } from 'react';
import { Lancamento } from '@/types';

interface LancamentoDrawerProps {
  open: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
}

export default function LancamentoDrawer({ open, onClose, lancamento }: LancamentoDrawerProps) {
  const [formulario, setFormulario] = useState<Partial<Lancamento & { valor: number }>>({
    conta: 'TODAS AS CONTAS',
    dataOperacao: new Date().toISOString().split('T')[0],
    clienteFornecedor: '',
    descricao: '',
    parcelas: 1,
    categoria: '',
    valor: 0,
    formaOperacao: '',
  });
  const [bancos, setBancos] = useState<Array<{ id: number; nome: string }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: string; nome: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nome: string; tipoGrupo?: string }>>([]);
  const [pessoas, setPessoas] = useState<Array<{ id: number; nome: string }>>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      carregarDados();
      if (lancamento) {
        setFormulario({
          ...lancamento,
          valor: (lancamento as any).valor || lancamento.entradas || lancamento.saidas || 0
        });
      } else {
        setFormulario({
          conta: 'TODAS AS CONTAS',
          dataOperacao: new Date().toISOString().split('T')[0],
          clienteFornecedor: '',
          descricao: '',
          parcelas: 1,
          categoria: '',
          valor: 0,
          formaOperacao: '',
        });
      }
    }
  }, [open, lancamento]);

  const carregarDados = async () => {
    try {
      const [bancosRes, formasRes, pessoasRes, categoriasRes] = await Promise.all([
        fetch('/api/bancos'),
        fetch('/api/formas-pagamento'),
        fetch('/api/pessoas'),
        fetch('/api/categorias')
      ]);
      setBancos(await bancosRes.json());
      setFormasPagamento(await formasRes.json());
      setPessoas(await pessoasRes.json());
      setCategorias(await categoriasRes.json());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSalvar = async () => {
    if (!formulario.descricao || !formulario.dataOperacao) {
      alert('Preencha descrição e data de operação');
      return;
    }

    setSalvando(true);
    try {
      const lancamentoData: any = {
        ...formulario,
        entradas: 0,
        saidas: 0
      };

      // Determinar se é entrada ou saída pela categoria
      const categoriaSelecionada = categorias.find(c => c.nome === formulario.categoria);
      const isEntrada = categoriaSelecionada?.tipoGrupo === 'E' || categoriaSelecionada?.tipoGrupo === 'Entrada';
      
      if (isEntrada) {
        lancamentoData.entradas = Math.abs(formulario.valor || 0);
      } else {
        lancamentoData.saidas = Math.abs(formulario.valor || 0);
      }

      const url = lancamento?.id ? `/api/lancamentos/${lancamento.id}` : '/api/lancamentos';
      const method = lancamento?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lancamentoData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar');
      }

      onClose();
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!lancamento?.id) return;
    if (!confirm('Deseja realmente excluir este lançamento?')) return;

    try {
      const response = await fetch(`/api/lancamentos/${lancamento.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir');
      }

      onClose();
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000
        }}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2c3e50',
          color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {lancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px'
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Conta *
              </label>
              <select
                value={formulario.conta || ''}
                onChange={(e) => setFormulario({ ...formulario, conta: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                {bancos.map(b => (
                  <option key={b.id} value={b.nome}>{b.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Data de Operação *
              </label>
              <input
                type="date"
                value={formulario.dataOperacao?.toString().split('T')[0] || ''}
                onChange={(e) => setFormulario({ ...formulario, dataOperacao: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Cliente/Fornecedor
              </label>
              <input
                type="text"
                value={formulario.clienteFornecedor || ''}
                onChange={(e) => setFormulario({ ...formulario, clienteFornecedor: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Descrição *
              </label>
              <input
                type="text"
                value={formulario.descricao || ''}
                onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Categoria
              </label>
              <select
                value={formulario.categoria || ''}
                onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <option value="">Selecione...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                value={formulario.valor || 0}
                onChange={(e) => setFormulario({ ...formulario, valor: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Forma de Operação
              </label>
              <select
                value={formulario.formaOperacao || ''}
                onChange={(e) => setFormulario({ ...formulario, formaOperacao: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <option value="">Selecione...</option>
                {formasPagamento.map(f => (
                  <option key={f.id} value={f.nome}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Parcelas
              </label>
              <input
                type="number"
                value={formulario.parcelas || 1}
                onChange={(e) => setFormulario({ ...formulario, parcelas: parseInt(e.target.value) || 1 })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Data de Vencimento
              </label>
              <input
                type="date"
                value={formulario.dataVencimento?.toString().split('T')[0] || ''}
                onChange={(e) => setFormulario({ ...formulario, dataVencimento: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Data de Compensação
              </label>
              <input
                type="date"
                value={formulario.dataCompensacao?.toString().split('T')[0] || ''}
                onChange={(e) => setFormulario({ ...formulario, dataCompensacao: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #ddd',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          {lancamento?.id && (
            <button
              onClick={handleExcluir}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Excluir
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: salvando ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: salvando ? 0.6 : 1
            }}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
}

