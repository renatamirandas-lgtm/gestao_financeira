'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lancamento } from '@/types';

export default function LancarPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [formulario, setFormulario] = useState<Partial<Lancamento & { valor: number; valorDisplay?: string }>>({
    conta: 'TODAS AS CONTAS',
    dataOperacao: new Date().toISOString().split('T')[0],
    clienteFornecedor: '',
    descricao: '',
    parcelas: 1,
    categoria: '',
    valor: 0,
    formaOperacao: '',
  });
  const [editando, setEditando] = useState<string | null>(null);
  const [bancos, setBancos] = useState<Array<{ id: number; nome: string }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: string; nome: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nome: string; tipoGrupo?: string }>>([]);
  const [pessoas, setPessoas] = useState<Array<{ id: number; nome: string }>>([]);
  const [sugestoesPessoas, setSugestoesPessoas] = useState<Array<{ id: number; nome: string }>>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [mostrarModalParcelas, setMostrarModalParcelas] = useState(false);
  const [diaVencimento, setDiaVencimento] = useState<number>(1);
  const [parcelasRecorrentes, setParcelasRecorrentes] = useState<number>(1);

  useEffect(() => {
    const carregarDados = async () => {
      const [bancosRes, formasRes, pessoasRes, categoriasRes] = await Promise.all([
        fetch('/api/bancos'),
        fetch('/api/formas-pagamento'),
        fetch('/api/pessoas'),
        fetch('/api/categorias')
      ]);
      const bancosList = await bancosRes.json();
      const formasList = await formasRes.json();
      const pessoasList = await pessoasRes.json();
      const categoriasList = await categoriasRes.json();
      setBancos(bancosList);
      setFormasPagamento(formasList);
      setPessoas(pessoasList);
      setCategorias(categoriasList);
      await carregarLancamentos();
    };
    carregarDados();
  }, []);

  const filtrarPessoas = (valor: string) => {
    if (!valor || valor.trim() === '') {
      setSugestoesPessoas([]);
      setMostrarSugestoes(false);
      return;
    }
    const valorLower = valor.toLowerCase();
    const filtradas = pessoas.filter(p => 
      p.nome.toLowerCase().includes(valorLower)
    );
    setSugestoesPessoas(filtradas.slice(0, 10)); // Limitar a 10 sugestões
    setMostrarSugestoes(filtradas.length > 0);
  };

  const selecionarPessoa = (pessoa: { id: number; nome: string }) => {
    setFormulario({ ...formulario, clienteFornecedor: pessoa.nome });
    setSugestoesPessoas([]);
    setMostrarSugestoes(false);
  };

  const carregarLancamentos = async () => {
    try {
      console.log('[PAGE] Carregando lançamentos...');
      const res = await fetch('/api/lancamentos');
      if (!res.ok) {
        const errorData = await res.json();
        console.error('[PAGE] Erro na resposta da API:', errorData);
        alert(`Erro ao carregar lançamentos: ${errorData.error || 'Erro desconhecido'}`);
        return;
      }
      const dados = await res.json();
      console.log(`[PAGE] Lançamentos recebidos: ${dados.length}`);
      setLancamentos(dados);
    } catch (error: any) {
      console.error('[PAGE] Erro ao carregar lançamentos:', error);
      alert(`Erro ao carregar lançamentos: ${error.message}`);
    }
  };

  const salvar = async () => {
    try {
      // Se parcelas > 1 e não estiver editando, verificar se precisa criar parcelas recorrentes
      const numParcelas = parseInt((formulario.parcelas || 1).toString());
      
      if (!editando && numParcelas > 1) {
        // Perguntar se deseja fazer lançamento recorrente
        const criarRecorrente = confirm(`Deseja criar ${numParcelas} lançamentos recorrentes?`);
        
        if (criarRecorrente) {
          // Mostrar modal para configurar parcelas
          setParcelasRecorrentes(numParcelas);
          setMostrarModalParcelas(true);
          return; // Retorna para aguardar confirmação do modal
        }
      }
      
      // Continua com o salvamento normal (sem parcelas recorrentes)
      await salvarLancamento();
      alert('Lançamento salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      const mensagemErro = error.message || 'Erro ao salvar lançamento. Tente novamente.';
      alert(mensagemErro);
    }
  };

  const salvarLancamento = async () => {
    try {
      // Validações antes de salvar
      if (!formulario.descricao || formulario.descricao.trim() === '') {
        alert('A descrição é obrigatória');
        return;
      }
      
      const valor = parseFloat(((formulario as any).valor || 0).toString());
      if (valor === 0 || isNaN(valor)) {
        alert('O valor deve ser maior que zero');
        return;
      }
      
      // Remove (E) ou (S) da categoria antes de salvar
      const formularioParaSalvar = {
        ...formulario,
        categoria: formulario.categoria ? formulario.categoria.replace(/\s*\([ES]\)$/, '') : '',
        valor: valor, // Garante que o valor é numérico
        dataOperacao: formulario.dataOperacao || new Date().toISOString().split('T')[0],
        parcelas: formulario.parcelas || 1
      };
      
      if (editando) {
        const res = await fetch(`/api/lancamentos/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formularioParaSalvar)
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Erro ao atualizar');
        }
        
        setEditando(null);
      } else {
        const res = await fetch('/api/lancamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formularioParaSalvar)
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro ao adicionar lançamento (${res.status})`);
        }
      }
      
      setFormulario({
        conta: 'TODAS AS CONTAS',
        dataOperacao: new Date().toISOString().split('T')[0],
        clienteFornecedor: '',
        descricao: '',
        parcelas: 1,
        categoria: '',
        valor: 0,
        valorDisplay: '',
        formaOperacao: '',
      });
      
      await carregarLancamentos();
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      if (error.message) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const criarParcelasRecorrentes = async () => {
    try {
      const categoriaLimpa = formulario.categoria ? formulario.categoria.replace(/\s*\([ES]\)$/, '') : '';
      const dataOperacao = formulario.dataOperacao ? new Date(formulario.dataOperacao) : new Date();
      const valorTotal = parseFloat(((formulario as any).valor || 0).toString());
      
      if (valorTotal === 0 || isNaN(valorTotal)) {
        alert('O valor deve ser maior que zero');
        return;
      }
      
      if (!formulario.descricao || formulario.descricao.trim() === '') {
        alert('A descrição é obrigatória');
        return;
      }
      
      // Criar lançamentos para cada parcela
      for (let i = 0; i < parcelasRecorrentes; i++) {
        // Calcular data de vencimento (a partir do mês seguinte)
        const dataVenc = new Date(dataOperacao);
        dataVenc.setMonth(dataVenc.getMonth() + i + 1); // +1 para começar do mês seguinte
        dataVenc.setDate(diaVencimento);
        
        // Ajustar se o dia não existe no mês (ex: 31 em fevereiro)
        if (dataVenc.getDate() !== diaVencimento) {
          // Vai para o último dia do mês
          const ultimoDia = new Date(dataVenc.getFullYear(), dataVenc.getMonth() + 1, 0).getDate();
          dataVenc.setDate(ultimoDia);
        }
        
        const lancamentoParcela = {
          conta: formulario.conta || 'TODAS AS CONTAS',
          dataOperacao: dataOperacao.toISOString().split('T')[0],
          clienteFornecedor: formulario.clienteFornecedor || '',
          descricao: `${formulario.descricao || ''} - Parcela ${i + 1}/${parcelasRecorrentes}`,
          parcelas: parcelasRecorrentes,
          categoria: categoriaLimpa,
          valor: valorTotal,
          formaOperacao: formulario.formaOperacao || '',
          dataVencimento: dataVenc.toISOString().split('T')[0],
          dataCompensacao: null
        };
        
        const res = await fetch('/api/lancamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lancamentoParcela)
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Erro ao criar parcela ${i + 1}: ${errorData.error || 'Erro desconhecido'}`);
        }
      }
      
      // Limpar formulário
      setFormulario({
        conta: 'TODAS AS CONTAS',
        dataOperacao: new Date().toISOString().split('T')[0],
        clienteFornecedor: '',
        descricao: '',
        parcelas: 1,
        categoria: '',
        valor: 0,
        valorDisplay: '',
        formaOperacao: '',
      });
      
      setMostrarModalParcelas(false);
      setDiaVencimento(1);
      setParcelasRecorrentes(1);
      
      await carregarLancamentos();
      alert(`${parcelasRecorrentes} lançamentos recorrentes criados com sucesso!`);
    } catch (error) {
      console.error('Erro ao criar parcelas recorrentes:', error);
      alert('Erro ao criar parcelas recorrentes. Tente novamente.');
    }
  };

  const editar = (lancamento: Lancamento) => {
    // Converter entradas/saídas para valor único
    const valor = Math.abs((lancamento.entradas || 0) + (lancamento.saidas || 0));
    const valorFormatado = valor > 0 ? valor.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).replace('.', ',') : '';
    
    // Encontrar a categoria com tipo para exibição
    let categoriaDisplay = lancamento.categoria || '';
    if (lancamento.categoria) {
      const catEncontrada = categorias.find(cat => cat.nome === lancamento.categoria);
      if (catEncontrada && catEncontrada.tipoGrupo) {
        const tipo = catEncontrada.tipoGrupo === 'E' ? 'E' : 'S';
        categoriaDisplay = `${lancamento.categoria} (${tipo})`;
      }
    }
    
    setFormulario({
      ...lancamento,
      dataOperacao: lancamento.dataOperacao ? new Date(lancamento.dataOperacao).toISOString().split('T')[0] : '',
      dataVencimento: lancamento.dataVencimento ? new Date(lancamento.dataVencimento).toISOString().split('T')[0] : '',
      dataCompensacao: lancamento.dataCompensacao ? new Date(lancamento.dataCompensacao).toISOString().split('T')[0] : '',
      valor: valor,
      valorDisplay: valorFormatado,
      categoria: categoriaDisplay
    } as any);
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
      valor: 0,
      valorDisplay: '',
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
                value={formulario.dataOperacao ? new Date(formulario.dataOperacao).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormulario({ ...formulario, dataOperacao: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Cliente / Fornecedor</label>
              <input
                type="text"
                value={formulario.clienteFornecedor || ''}
                onChange={(e) => {
                  const valor = e.target.value;
                  setFormulario({ ...formulario, clienteFornecedor: valor });
                  filtrarPessoas(valor);
                }}
                onFocus={(e) => {
                  if (e.target.value) {
                    filtrarPessoas(e.target.value);
                  }
                }}
                onBlur={() => {
                  // Delay para permitir clique na sugestão
                  setTimeout(() => setMostrarSugestoes(false), 200);
                }}
                placeholder="Digite para buscar ou digite um nome novo"
                style={{ width: '100%' }}
              />
              {mostrarSugestoes && sugestoesPessoas.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {sugestoesPessoas.map(pessoa => (
                    <div
                      key={pessoa.id}
                      onClick={() => selecionarPessoa(pessoa)}
                      style={{
                        padding: '10px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0f0f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                      }}
                    >
                      {pessoa.nome}
                    </div>
                  ))}
                </div>
              )}
              {formulario.clienteFornecedor && 
               !pessoas.some(p => p.nome.toLowerCase() === formulario.clienteFornecedor?.toLowerCase()) &&
               !mostrarSugestoes && (
                <div style={{ 
                  marginTop: '5px', 
                  fontSize: '12px', 
                  color: '#0066cc',
                  fontStyle: 'italic'
                }}>
                  ⓘ Pessoa não cadastrada. O nome será salvo para finalizar o cadastro depois.
                </div>
              )}
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
              <select
                value={(() => {
                  // Se a categoria já tem (E) ou (S), mantém. Senão, busca e adiciona
                  const catAtual = formulario.categoria || '';
                  if (!catAtual) return '';
                  if (catAtual.includes('(') && catAtual.includes(')')) return catAtual;
                  
                  const catEncontrada = categorias.find(cat => cat.nome === catAtual);
                  if (catEncontrada && catEncontrada.tipoGrupo) {
                    const tipo = catEncontrada.tipoGrupo === 'E' ? 'E' : 'S';
                    return `${catAtual} (${tipo})`;
                  }
                  return catAtual;
                })()}
                onChange={(e) => {
                  // Mantém o valor com (E) ou (S) no formulário para exibição
                  setFormulario({ ...formulario, categoria: e.target.value });
                }}
                style={{ width: '100%' }}
              >
                <option value="">Selecione...</option>
                {categorias.map(cat => {
                  const tipo = cat.tipoGrupo === 'E' ? 'E' : cat.tipoGrupo === 'S' ? 'S' : 'S';
                  const nomeComTipo = `${cat.nome} (${tipo})`;
                  return (
                    <option key={cat.id} value={nomeComTipo}>{nomeComTipo}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Valor (R$)</label>
              <input
                type="text"
                value={(formulario as any).valorDisplay || ''}
                onChange={(e) => {
                  let valor = e.target.value;
                  
                  // Remove tudo exceto números, vírgula e ponto
                  valor = valor.replace(/[^\d,.]/g, '');
                  
                  // Substitui ponto por vírgula (padroniza para vírgula)
                  valor = valor.replace(/\./g, ',');
                  
                  // Permite apenas uma vírgula
                  const partes = valor.split(',');
                  if (partes.length > 2) {
                    valor = partes[0] + ',' + partes.slice(1).join('');
                  }
                  
                  // Limita a 2 casas decimais após a vírgula
                  if (partes.length === 2 && partes[1].length > 2) {
                    valor = partes[0] + ',' + partes[1].substring(0, 2);
                  }
                  
                  // Salva o valor formatado para exibição
                  (formulario as any).valorDisplay = valor;
                  
                  // Converte para número (substitui vírgula por ponto internamente)
                  const valorParaCalculo = valor.replace(',', '.');
                  const numero = valorParaCalculo === '' || valorParaCalculo === ',' ? 0 : Math.abs(parseFloat(valorParaCalculo));
                  
                  setFormulario({ 
                    ...formulario, 
                    valor: isNaN(numero) ? 0 : numero,
                    valorDisplay: valor
                  } as any);
                }}
                onBlur={(e) => {
                  // Formata ao perder o foco se tiver valor
                  const valor = (formulario as any).valor || 0;
                  if (valor > 0) {
                    const valorFormatado = valor.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    }).replace('.', ',');
                    setFormulario({ 
                      ...formulario, 
                      valorDisplay: valorFormatado
                    } as any);
                  }
                }}
                onFocus={(e) => {
                  // Ao focar, mantém o valor atual formatado ou limpa
                  const valor = (formulario as any).valor || 0;
                  if (valor > 0) {
                    const valorFormatado = valor.toString().replace('.', ',');
                    setFormulario({ 
                      ...formulario, 
                      valorDisplay: valorFormatado
                    } as any);
                  }
                }}
                placeholder="0,00"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Parcelas</label>
              <input
                type="number"
                min="1"
                value={formulario.parcelas || 1}
                onChange={(e) => setFormulario({ ...formulario, parcelas: parseInt(e.target.value) || 1 })}
                style={{ width: '100%' }}
              />
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
                  <th>Conta</th>
                  <th>Data de Operação</th>
                  <th>Cliente/Fornecedor</th>
                  <th>Descrição</th>
                  <th>Parcelas</th>
                  <th>Categoria</th>
                  <th>Valor Lançamento</th>
                  <th>Forma de Operação</th>
                  <th>Data de Vencimento</th>
                  <th>Data de Compensação</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((lanc) => {
                  // Calcular valor: usar valor direto se disponível, senão calcular de entradas/saidas
                  let valorLancamento = 0;
                  if ((lanc as any).valor !== undefined && (lanc as any).valor !== null) {
                    valorLancamento = Math.abs((lanc as any).valor);
                  } else {
                    // Se não tiver valor direto, calcular pela categoria (entradas ou saidas)
                    valorLancamento = (lanc.entradas || 0) + (lanc.saidas || 0);
                  }
                  
                  // Determinar se é entrada ou saída pela categoria
                  const tipoCategoria = (lanc as any).grupoCategoriaTipo || 
                                       (lanc.entradas > 0 ? 'Entrada' : 'Saída');
                  const isEntrada = tipoCategoria === 'Entrada';
                  
                  return (
                    <tr key={lanc.id}>
                      <td>{lanc.conta || '-'}</td>
                      <td>{lanc.dataOperacao ? new Date(lanc.dataOperacao).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>{lanc.clienteFornecedor || '-'}</td>
                      <td>{lanc.descricao || '-'}</td>
                      <td>{lanc.parcelas || 1}</td>
                      <td>{lanc.categoria || '-'}</td>
                      <td style={{ 
                        color: isEntrada ? '#28a745' : '#dc3545',
                        fontWeight: '500'
                      }}>
                        {valorLancamento > 0 ? `R$ ${valorLancamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td>{lanc.formaOperacao || '-'}</td>
                      <td>{lanc.dataVencimento ? new Date(lanc.dataVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>{lanc.dataCompensacao ? new Date(lanc.dataCompensacao).toLocaleDateString('pt-BR') : '-'}</td>
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Parcelas Recorrentes */}
      {mostrarModalParcelas && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Configurar Parcelas Recorrentes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                  Quantas parcelas?
                </label>
                <input
                  type="number"
                  min="1"
                  value={parcelasRecorrentes}
                  onChange={(e) => setParcelasRecorrentes(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                  Dia de vencimento (dia do mês)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '8px' }}
                />
                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                  As parcelas serão criadas mensalmente a partir do mês seguinte
                </small>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={criarParcelasRecorrentes}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Criar Parcelas
                </button>
                <button
                  onClick={() => {
                    setMostrarModalParcelas(false);
                    // Se cancelar, salva apenas 1 lançamento normal sem parcelas recorrentes
                    salvarLancamento();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Salvar Apenas 1 Lançamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

