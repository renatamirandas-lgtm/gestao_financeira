'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Banco {
  id: number;
  numero?: string;
  nome: string;
}

interface FormaOperacao {
  id: string;
  nome: string;
}

interface GrupoCategoria {
  id?: number;
  tipoCategoria: 'Entrada' | 'Saída';
  nome: string;
}

interface Categoria {
  id?: number;
  grupoCategoriaId: number;
  nome: string;
}

interface Pessoa {
  id?: number;
  nome: string;
  nomeFantasia?: string;
  tipoPessoa: 'Física' | 'Jurídica';
  documento?: string;
  logradouro?: string;
  numeroLogradouro?: string;
  complemento?: string;
  inscricaoEstadual?: string;
  situacaoPessoa?: string;
  tipoParteInteressada?: string;
}

interface Agencia {
  id?: number;
  bancoId: number;
  numero?: string;
  nome: string;
}

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState('banco');
  
  // Estados para cada entidade
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [formasOperacao, setFormasOperacao] = useState<FormaOperacao[]>([]);
  const [gruposCategoria, setGruposCategoria] = useState<GrupoCategoria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  
  // Formulários
  const [formBanco, setFormBanco] = useState({ numero: '', nome: '' });
  const [formFormaOperacao, setFormFormaOperacao] = useState({ nome: '' });
  const [formGrupoCategoria, setFormGrupoCategoria] = useState<Omit<GrupoCategoria, 'id'>>({ tipoCategoria: 'Saída', nome: '' });
  const [formCategoria, setFormCategoria] = useState<Omit<Categoria, 'id'>>({ grupoCategoriaId: 0, nome: '' });
  const [formPessoa, setFormPessoa] = useState<Omit<Pessoa, 'id'>>({
    nome: '',
    tipoPessoa: 'Física',
    nomeFantasia: '',
    documento: '',
    logradouro: '',
    numeroLogradouro: '',
    complemento: '',
    inscricaoEstadual: '',
    situacaoPessoa: '',
    tipoParteInteressada: ''
  });
  const [formAgencia, setFormAgencia] = useState<Omit<Agencia, 'id'>>({ bancoId: 0, numero: '', nome: '' });

  useEffect(() => {
    carregarDados();
  }, [abaAtiva]);

  const carregarDados = async () => {
    try {
      const [bancosRes, formasRes, gruposRes, categoriasRes, pessoasRes, agenciasRes] = await Promise.all([
        fetch('/api/bancos'),
        fetch('/api/formas-pagamento'),
        fetch('/api/grupos-categoria'),
        fetch('/api/categorias'),
        fetch('/api/pessoas'),
        fetch('/api/agencias')
      ]);
      
      setBancos(await bancosRes.json());
      setFormasOperacao(await formasRes.json());
      setGruposCategoria(await gruposRes.json());
      setCategorias(await categoriasRes.json());
      setPessoas(await pessoasRes.json());
      setAgencias(await agenciasRes.json());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const salvarBanco = async () => {
    try {
      const res = await fetch('/api/bancos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formBanco)
      });
      if (res.ok) {
        setFormBanco({ numero: '', nome: '' });
        carregarDados();
      } else {
        alert('Erro ao salvar banco');
      }
    } catch (error) {
      alert('Erro ao salvar banco');
    }
  };

  const excluirBanco = async (id: number) => {
    if (id === 0 || !confirm('Tem certeza que deseja excluir?')) return;
    try {
      const res = await fetch(`/api/bancos?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarDados();
    } catch (error) {
      alert('Erro ao excluir banco');
    }
  };

  const salvarFormaOperacao = async () => {
    try {
      if (!formFormaOperacao.nome || formFormaOperacao.nome.trim() === '') {
        alert('O nome da forma de operação é obrigatório');
        return;
      }

      const res = await fetch('/api/formas-pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formFormaOperacao)
      });
      if (res.ok) {
        setFormFormaOperacao({ nome: '' });
        carregarDados();
      } else {
        const errorData = await res.json();
        alert(`Erro ao salvar forma de operação: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      alert('Erro ao salvar forma de operação');
    }
  };

  const excluirFormaOperacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const res = await fetch(`/api/formas-pagamento?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarDados();
    } catch (error) {
      alert('Erro ao excluir forma de operação');
    }
  };

  const salvarGrupoCategoria = async () => {
    try {
      if (!formGrupoCategoria.nome || formGrupoCategoria.nome.trim() === '') {
        alert('O nome do grupo de categoria é obrigatório');
        return;
      }

      const res = await fetch('/api/grupos-categoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formGrupoCategoria)
      });
      if (res.ok) {
        setFormGrupoCategoria({ tipoCategoria: 'Saída', nome: '' });
        carregarDados();
      } else {
        const errorData = await res.json();
        alert(`Erro ao salvar grupo de categoria: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      alert('Erro ao salvar grupo de categoria');
    }
  };

  const excluirGrupoCategoria = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const res = await fetch(`/api/grupos-categoria?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarDados();
    } catch (error) {
      alert('Erro ao excluir grupo de categoria');
    }
  };

  const salvarCategoria = async () => {
    if (!formCategoria.grupoCategoriaId || formCategoria.grupoCategoriaId === 0) {
      alert('Selecione um grupo de categoria');
      return;
    }
    if (!formCategoria.nome || formCategoria.nome.trim() === '') {
      alert('O nome da categoria é obrigatório');
      return;
    }
    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCategoria)
      });
      if (res.ok) {
        setFormCategoria({ grupoCategoriaId: 0, nome: '' });
        carregarDados();
      } else {
        const errorData = await res.json();
        alert(`Erro ao salvar categoria: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      alert('Erro ao salvar categoria');
    }
  };

  const excluirCategoria = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const res = await fetch(`/api/categorias?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarDados();
    } catch (error) {
      alert('Erro ao excluir categoria');
    }
  };

  const salvarPessoa = async () => {
    if (!formPessoa.nome || formPessoa.nome.trim() === '') {
      alert('O nome da pessoa é obrigatório');
      return;
    }
    try {
      const res = await fetch('/api/pessoas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formPessoa)
      });
      if (res.ok) {
        setFormPessoa({
          nome: '',
          tipoPessoa: 'Física',
          nomeFantasia: '',
          documento: '',
          logradouro: '',
          numeroLogradouro: '',
          complemento: '',
          inscricaoEstadual: '',
          situacaoPessoa: '',
          tipoParteInteressada: ''
        });
        carregarDados();
      } else {
        const errorData = await res.json();
        alert(`Erro ao salvar pessoa: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      alert('Erro ao salvar pessoa');
    }
  };

  const excluirPessoa = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const res = await fetch(`/api/pessoas?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarDados();
    } catch (error) {
      alert('Erro ao excluir pessoa');
    }
  };

  const salvarAgencia = async () => {
    if (!formAgencia.bancoId) {
      alert('Selecione um banco');
      return;
    }
    if (!formAgencia.nome || formAgencia.nome.trim() === '') {
      alert('O nome da agência é obrigatório');
      return;
    }
    try {
      const res = await fetch('/api/agencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formAgencia)
      });
      if (res.ok) {
        setFormAgencia({ bancoId: 0, numero: '', nome: '' });
        carregarDados();
      } else {
        const errorData = await res.json();
        alert(`Erro ao salvar agência: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      alert('Erro ao salvar agência');
    }
  };

  const excluirAgencia = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const res = await fetch(`/api/agencias?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarDados();
    } catch (error) {
      alert('Erro ao excluir agência');
    }
  };

  const tabs = [
    { id: 'banco', label: 'Banco' },
    { id: 'forma-operacao', label: 'Forma de Operação' },
    { id: 'grupo-categoria', label: 'Grupo de Categoria' },
    { id: 'categoria', label: 'Categoria' },
    { id: 'pessoa', label: 'Pessoa' },
    { id: 'agencia', label: 'Agência' }
  ];

  return (
    <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px' }}>Configurações</h1>
          <Link href="/" style={{ padding: '8px 16px', background: '#6c757d', color: 'white', borderRadius: '4px' }}>
            ← Voltar
          </Link>
        </div>
      </header>

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              style={{
                padding: '15px 25px',
                border: 'none',
                background: abaAtiva === tab.id ? 'white' : '#f5f5f5',
                borderBottom: abaAtiva === tab.id ? '3px solid #0066cc' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: abaAtiva === tab.id ? 'bold' : 'normal',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {/* Aba Banco */}
          {abaAtiva === 'banco' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Cadastro de Bancos</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h3>Novo Banco</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Número do banco"
                      value={formBanco.numero}
                      onChange={(e) => setFormBanco({ ...formBanco, numero: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Nome do banco"
                      value={formBanco.nome}
                      onChange={(e) => setFormBanco({ ...formBanco, nome: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <button onClick={salvarBanco} style={{ padding: '10px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Salvar
                    </button>
                  </div>
                </div>
                <div>
                  <h3>Bancos Cadastrados</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Número</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                          <th style={{ padding: '10px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bancos.map(banco => (
                          <tr key={banco.id}>
                            <td style={{ padding: '8px' }}>{banco.numero || '-'}</td>
                            <td style={{ padding: '8px' }}>{banco.nome}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {banco.id !== 0 && (
                                <button onClick={() => excluirBanco(banco.id)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  Excluir
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Forma de Operação */}
          {abaAtiva === 'forma-operacao' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Cadastro de Formas de Operação</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h3>Nova Forma de Operação</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Nome da forma de operação"
                      value={formFormaOperacao.nome}
                      onChange={(e) => setFormFormaOperacao({ nome: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <button onClick={salvarFormaOperacao} style={{ padding: '10px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Salvar
                    </button>
                  </div>
                </div>
                <div>
                  <h3>Formas de Operação Cadastradas</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                          <th style={{ padding: '10px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formasOperacao.map(forma => (
                          <tr key={forma.id}>
                            <td style={{ padding: '8px' }}>{forma.nome}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button onClick={() => excluirFormaOperacao(forma.id)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Excluir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Grupo de Categoria */}
          {abaAtiva === 'grupo-categoria' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Cadastro de Grupos de Categoria</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h3>Novo Grupo de Categoria</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select
                      value={formGrupoCategoria.tipoCategoria}
                      onChange={(e) => setFormGrupoCategoria({ ...formGrupoCategoria, tipoCategoria: e.target.value as 'Entrada' | 'Saída' })}
                      style={{ padding: '8px' }}
                    >
                      <option value="Entrada">Entrada</option>
                      <option value="Saída">Saída</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Nome do grupo"
                      value={formGrupoCategoria.nome}
                      onChange={(e) => setFormGrupoCategoria({ ...formGrupoCategoria, nome: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <button onClick={salvarGrupoCategoria} style={{ padding: '10px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Salvar
                    </button>
                  </div>
                </div>
                <div>
                  <h3>Grupos de Categoria Cadastrados</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                          <th style={{ padding: '10px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gruposCategoria.map(grupo => (
                          <tr key={grupo.id}>
                            <td style={{ padding: '8px' }}>{grupo.tipoCategoria}</td>
                            <td style={{ padding: '8px' }}>{grupo.nome}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button onClick={() => grupo.id && excluirGrupoCategoria(grupo.id)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Excluir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Categoria */}
          {abaAtiva === 'categoria' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Cadastro de Categorias</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h3>Nova Categoria</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select
                      value={formCategoria.grupoCategoriaId}
                      onChange={(e) => setFormCategoria({ ...formCategoria, grupoCategoriaId: parseInt(e.target.value) })}
                      style={{ padding: '8px' }}
                    >
                      <option value="0">Selecione o grupo</option>
                      {gruposCategoria.map(grupo => (
                        <option key={grupo.id} value={grupo.id}>{grupo.nome} ({grupo.tipoCategoria})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Nome da categoria"
                      value={formCategoria.nome}
                      onChange={(e) => setFormCategoria({ ...formCategoria, nome: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <button onClick={salvarCategoria} style={{ padding: '10px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Salvar
                    </button>
                  </div>
                </div>
                <div>
                  <h3>Categorias Cadastradas</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Grupo</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                          <th style={{ padding: '10px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorias.map(cat => {
                          const grupo = gruposCategoria.find(g => g.id === cat.grupoCategoriaId);
                          return (
                            <tr key={cat.id}>
                              <td style={{ padding: '8px' }}>{grupo?.nome || cat.grupoCategoriaId}</td>
                              <td style={{ padding: '8px' }}>{cat.nome}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button onClick={() => cat.id && excluirCategoria(cat.id)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Pessoa */}
          {abaAtiva === 'pessoa' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Cadastro de Pessoas</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h3>Nova Pessoa</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Nome *"
                      value={formPessoa.nome}
                      onChange={(e) => setFormPessoa({ ...formPessoa, nome: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Nome Fantasia"
                      value={formPessoa.nomeFantasia || ''}
                      onChange={(e) => setFormPessoa({ ...formPessoa, nomeFantasia: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <select
                      value={formPessoa.tipoPessoa}
                      onChange={(e) => setFormPessoa({ ...formPessoa, tipoPessoa: e.target.value as 'Física' | 'Jurídica' })}
                      style={{ padding: '8px' }}
                    >
                      <option value="Física">Pessoa Física</option>
                      <option value="Jurídica">Pessoa Jurídica</option>
                    </select>
                    <input
                      type="text"
                      placeholder="CPF/CNPJ"
                      value={formPessoa.documento || ''}
                      onChange={(e) => setFormPessoa({ ...formPessoa, documento: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Logradouro"
                      value={formPessoa.logradouro || ''}
                      onChange={(e) => setFormPessoa({ ...formPessoa, logradouro: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Número"
                      value={formPessoa.numeroLogradouro || ''}
                      onChange={(e) => setFormPessoa({ ...formPessoa, numeroLogradouro: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Complemento"
                      value={formPessoa.complemento || ''}
                      onChange={(e) => setFormPessoa({ ...formPessoa, complemento: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Inscrição Estadual"
                      value={formPessoa.inscricaoEstadual || ''}
                      onChange={(e) => setFormPessoa({ ...formPessoa, inscricaoEstadual: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <select
                      value={formPessoa.tipoParteInteressada || ''}
                      onChange={(e) => setFormPessoa({ ...formPessoa, tipoParteInteressada: e.target.value })}
                      style={{ padding: '8px' }}
                    >
                      <option value="">Selecione...</option>
                      <option value="C">Cliente</option>
                      <option value="F">Fornecedor</option>
                    </select>
                    <button onClick={salvarPessoa} style={{ padding: '10px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Salvar
                    </button>
                  </div>
                </div>
                <div>
                  <h3>Pessoas Cadastradas</h3>
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Documento</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Tipo Parte Interessada</th>
                          <th style={{ padding: '10px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pessoas.map(pessoa => {
                          const isIncompleta = pessoa.situacaoPessoa === 'Incompleto' || (pessoa as any)._isIncompleta;
                          return (
                            <tr 
                              key={pessoa.id}
                              style={{
                                backgroundColor: isIncompleta ? '#fff3cd' : 'transparent',
                                borderLeft: isIncompleta ? '3px solid #ffc107' : 'none'
                              }}
                            >
                              <td style={{ padding: '8px' }}>
                                {pessoa.nome}
                                {isIncompleta && (
                                  <span style={{ 
                                    marginLeft: '8px', 
                                    fontSize: '11px', 
                                    color: '#856404',
                                    fontStyle: 'italic'
                                  }}>
                                    (Cadastro incompleto - Finalize o cadastro)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px' }}>{pessoa.tipoPessoa}</td>
                              <td style={{ padding: '8px' }}>{pessoa.documento || '-'}</td>
                              <td style={{ padding: '8px' }}>{pessoa.tipoParteInteressada === 'C' ? 'Cliente' : pessoa.tipoParteInteressada === 'F' ? 'Fornecedor' : '-'}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button onClick={() => pessoa.id && excluirPessoa(pessoa.id)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Agência */}
          {abaAtiva === 'agencia' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Cadastro de Agências</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h3>Nova Agência</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select
                      value={formAgencia.bancoId}
                      onChange={(e) => setFormAgencia({ ...formAgencia, bancoId: parseInt(e.target.value) })}
                      style={{ padding: '8px' }}
                    >
                      <option value="0">Selecione o banco</option>
                      {bancos.filter(b => b.id !== 0).map(banco => (
                        <option key={banco.id} value={banco.id}>{banco.nome}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Número da agência"
                      value={formAgencia.numero || ''}
                      onChange={(e) => setFormAgencia({ ...formAgencia, numero: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <input
                      type="text"
                      placeholder="Nome da agência *"
                      value={formAgencia.nome}
                      onChange={(e) => setFormAgencia({ ...formAgencia, nome: e.target.value })}
                      style={{ padding: '8px' }}
                    />
                    <button onClick={salvarAgencia} style={{ padding: '10px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Salvar
                    </button>
                  </div>
                </div>
                <div>
                  <h3>Agências Cadastradas</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Banco</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Número</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                          <th style={{ padding: '10px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agencias.map(agencia => {
                          const banco = bancos.find(b => b.id === agencia.bancoId);
                          return (
                            <tr key={agencia.id}>
                              <td style={{ padding: '8px' }}>{banco?.nome || agencia.bancoId}</td>
                              <td style={{ padding: '8px' }}>{agencia.numero || '-'}</td>
                              <td style={{ padding: '8px' }}>{agencia.nome}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button onClick={() => agencia.id && excluirAgencia(agencia.id)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

