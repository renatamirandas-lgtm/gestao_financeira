'use client';

import { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent, RowDoubleClickedEvent, ModuleRegistry, ClientSideRowModelModule } from 'ag-grid-community';
import { Lancamento } from '@/types';
import LancamentoDrawer from './LancamentoDrawer';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

export default function LancamentosGridPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [rowData, setRowData] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null);
  
  // Filtros
  const [filtroConta, setFiltroConta] = useState<string>('');
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState<string>('');
  
  // Dados para filtros
  const [bancos, setBancos] = useState<Array<{ id: number; nome: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nome: string; tipoGrupo?: string }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: string; nome: string }>>([]);
  
  // Resumo
  const [resumo, setResumo] = useState({
    saldo: 0,
    entradas: 0,
    saidas: 0
  });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [lancamentos, filtroConta, filtroMes, filtroCategoria, filtroBusca]);

  const carregarDados = async () => {
    try {
      console.log('[GRID] Carregando dados...');
      const [lancamentosRes, bancosRes, categoriasRes, formasRes] = await Promise.all([
        fetch('/api/lancamentos'),
        fetch('/api/bancos'),
        fetch('/api/categorias'),
        fetch('/api/formas-pagamento')
      ]);
      
      const lancamentosData = await lancamentosRes.json();
      const bancosData = await bancosRes.json();
      const categoriasData = await categoriasRes.json();
      const formasData = await formasRes.json();
      
      console.log('[GRID] Dados carregados:', {
        lancamentos: lancamentosData.length,
        bancos: bancosData.length,
        categorias: categoriasData.length,
        formas: formasData.length
      });
      
      setLancamentos(lancamentosData);
      setBancos(bancosData);
      setCategorias(categoriasData);
      setFormasPagamento(formasData);
    } catch (error) {
      console.error('[GRID] Erro ao carregar dados:', error);
    }
  };

  const aplicarFiltros = () => {
    let filtrados = [...lancamentos];
    
    if (filtroConta) {
      filtrados = filtrados.filter(l => l.conta === filtroConta);
    }
    
    if (filtroMes) {
      const [ano, mes] = filtroMes.split('-');
      filtrados = filtrados.filter(l => {
        if (!l.dataOperacao) return false;
        const data = new Date(l.dataOperacao);
        return data.getFullYear() === parseInt(ano) && 
               (data.getMonth() + 1) === parseInt(mes);
      });
    }
    
    if (filtroCategoria) {
      filtrados = filtrados.filter(l => l.categoria === filtroCategoria);
    }
    
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      filtrados = filtrados.filter(l => 
        (l.descricao?.toLowerCase().includes(busca) || false) ||
        (l.clienteFornecedor?.toLowerCase().includes(busca) || false)
      );
    }
    
    // Preparar dados para o grid
    let saldoParcial = 0;
    const dadosGrid = filtrados.map((l, index) => {
      const entradas = l.entradas || 0;
      const saidas = l.saidas || 0;
      const valor = entradas > 0 ? entradas : saidas > 0 ? -saidas : (l as any).valor || 0;
      saldoParcial += valor;
      const dataCompetencia = l.dataOperacao ? new Date(l.dataOperacao) : null;
      const competencia = dataCompetencia
        ? `${String(dataCompetencia.getMonth() + 1).padStart(2, '0')}/${dataCompetencia.getFullYear()}`
        : '';
      return {
        id: l.id || `temp-${index}`,
        conta: l.conta || '',
        dataOperacao: l.dataOperacao || '',
        dataOperacaoFormatada: l.dataOperacao ? new Date(l.dataOperacao).toLocaleDateString('pt-BR') : '',
        clienteFornecedor: l.clienteFornecedor || '',
        descricao: l.descricao || '',
        categoria: l.categoria || '',
        competencia,
        valor,
        entradas,
        saidas,
        formaOperacao: l.formaOperacao || '',
        parcelas: l.parcelas || 1,
        dataVencimento: l.dataVencimento || null,
        dataVencimentoFormatada: l.dataVencimento ? new Date(l.dataVencimento).toLocaleDateString('pt-BR') : '',
        dataCompensacao: l.dataCompensacao || null,
        dataCompensacaoFormatada: l.dataCompensacao ? new Date(l.dataCompensacao).toLocaleDateString('pt-BR') : '',
        status: l.status || '-',
        observacao: (l as any).observacao || '',
        saldoParcial
      };
    });
    
    console.log('[GRID] Dados preparados para grid:', dadosGrid.length, 'lançamentos');
    if (dadosGrid.length > 0) {
      console.log('[GRID] Primeiro lançamento:', dadosGrid[0]);
    }
    setRowData(dadosGrid);
    
    // Calcular resumo
    const totalEntradas = filtrados.reduce((sum, l) => sum + (l.entradas || 0), 0);
    const totalSaidas = filtrados.reduce((sum, l) => sum + (l.saidas || 0), 0);
    setResumo({
      saldo: totalEntradas - totalSaidas,
      entradas: totalEntradas,
      saidas: totalSaidas
    });
  };

  const compactCellStyle: any = { padding: '4px', fontSize: '12px' };
  const compactRightCellStyle: any = { padding: '4px', fontSize: '12px', textAlign: 'right' };
  const compactRightBoldCellStyle: any = { padding: '4px', fontSize: '12px', textAlign: 'right', fontWeight: '500' };

  const colDefs: ColDef[] = useMemo(() => [
    { 
      field: 'dataOperacao', 
      headerName: 'Data',
      width: 100,
      pinned: 'left',
      editable: true,
      cellEditor: 'agDateCellEditor',
      cellEditorParams: {
        format: 'dd/mm/yyyy'
      },
      cellStyle: compactCellStyle,
      valueGetter: (params) => {
        if (!params.data?.dataOperacao) return null;
        try {
          return new Date(params.data.dataOperacao);
        } catch {
          return null;
        }
      },
      valueSetter: (params) => {
        if (params.newValue) {
          const date = params.newValue instanceof Date ? params.newValue : new Date(params.newValue);
          params.data.dataOperacao = date.toISOString().split('T')[0];
          params.data.dataOperacaoFormatada = date.toLocaleDateString('pt-BR');
        }
        return true;
      },
      valueFormatter: (params) => {
        if (!params.value) return '';
        try {
          const date = params.value instanceof Date ? params.value : new Date(params.value);
          return date.toLocaleDateString('pt-BR');
        } catch {
          return params.data?.dataOperacaoFormatada || '';
        }
      }
    },
    { 
      field: 'conta', 
      headerName: 'Conta',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: bancos.map(b => b.nome)
      }),
      cellStyle: compactCellStyle
    },
    { 
      field: 'clienteFornecedor', 
      headerName: 'Cliente/Fornecedor',
      width: 180,
      editable: true,
      cellStyle: compactCellStyle
    },
    { 
      field: 'categoria', 
      headerName: 'Categoria',
      width: 150,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: categorias.map(c => c.nome)
      }),
      cellStyle: compactCellStyle
    },
    { 
      field: 'formaOperacao', 
      headerName: 'Forma de Pagamento',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: () => ({
        values: formasPagamento.map(f => f.nome)
      }),
      cellStyle: compactCellStyle
    },
    { 
      field: 'competencia', 
      headerName: 'Competência',
      width: 110,
      editable: false,
      cellStyle: compactCellStyle
    },
    { 
      field: 'descricao', 
      headerName: 'Descrição',
      width: 220,
      editable: true,
      cellStyle: compactCellStyle
    },
    { 
      field: 'valor', 
      headerName: 'Valor',
      width: 120,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        precision: 2
      },
      cellStyle: compactRightBoldCellStyle,
      valueFormatter: (params) => {
        const valor = params.value || 0;
        const sinal = valor < 0 ? '-' : '';
        return `${sinal}R$ ${Math.abs(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
      cellRenderer: (params: any) => {
        const valor = params.value || 0;
        const color = valor >= 0 ? '#28a745' : '#dc3545';
        const sinal = valor < 0 ? '-' : '';
        return `<span style="color: ${color}">${sinal}R$ ${Math.abs(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
      },
      valueSetter: (params) => {
        const novoValor = parseFloat(params.newValue) || 0;
        params.data.valor = novoValor;
        // Determinar se é entrada ou saída pela categoria
        const categoriaSelecionada = categorias.find(c => c.nome === params.data.categoria);
        const isEntrada = categoriaSelecionada?.tipoGrupo === 'E' || categoriaSelecionada?.tipoGrupo === 'Entrada';
        if (isEntrada) {
          params.data.entradas = Math.abs(novoValor);
          params.data.saidas = 0;
          params.data.valor = Math.abs(novoValor);
        } else {
          params.data.saidas = Math.abs(novoValor);
          params.data.entradas = 0;
          params.data.valor = -Math.abs(novoValor);
        }
        return true;
      }
    },
    { 
      field: 'parcelas', 
      headerName: 'Parcelas',
      width: 80,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellStyle: compactRightCellStyle
    },
    { 
      field: 'status', 
      headerName: 'Situação',
      width: 100,
      editable: false,
      cellStyle: compactCellStyle,
      cellRenderer: (params: any) => {
        const status = params.value || '-';
        const colors: any = {
          'Realizado': '#28a745',
          'Planejado': '#ffc107',
          '-': '#6c757d'
        };
        return `<span style="color: ${colors[status] || '#6c757d'}">${status}</span>`;
      }
    },
    { 
      field: 'observacao', 
      headerName: 'Observação',
      width: 200,
      editable: true,
      cellStyle: compactCellStyle
    },
    { 
      field: 'saldoParcial', 
      headerName: 'Saldo parcial',
      width: 130,
      editable: false,
      cellStyle: compactRightBoldCellStyle,
      valueFormatter: (params) => {
        const valor = params.value || 0;
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
  ], [bancos, categorias, formasPagamento]);

  const defaultColDef: ColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    editable: true,
    cellStyle: { padding: '4px', fontSize: '12px' }
  }), []);

  const [gridApi, setGridApi] = useState<any>(null);
  const [columnApi, setColumnApi] = useState<any>(null);

  const onGridReady = (params: GridReadyEvent) => {
    console.log('[GRID] Grid pronto - RowData atual:', rowData.length, 'linhas');
    setGridApi(params.api);
    setColumnApi((params as any).columnApi);
    if (rowData.length > 0) {
      setTimeout(() => {
        (params as any).columnApi?.autoSizeAllColumns();
      }, 100);
    }
  };

  useEffect(() => {
    if (gridApi) {
      console.log('[GRID] useEffect - Atualizando grid com', rowData.length, 'linhas');
      if (rowData.length > 0 && columnApi) {
        setTimeout(() => {
          (columnApi as any).autoSizeAllColumns();
        }, 100);
      } else {
        // Forçar renderização mesmo sem dados
        gridApi.refreshCells();
      }
    }
  }, [rowData, gridApi, columnApi]);

  const handleNovo = () => {
    console.log('[GRID] Botão Novo clicado');
    console.log('[GRID] RowData atual:', rowData.length, 'linhas');
    setLancamentoSelecionado(null);
    setDrawerOpen(true);
  };

  const handleCellValueChanged = async (params: CellValueChangedEvent) => {
    console.log('[GRID] Célula alterada:', params.colDef.field, params.newValue);
    
    // Recalcular status se necessário
    if (params.data.dataVencimento && params.data.dataCompensacao) {
      params.data.status = 'Realizado';
    } else if (params.data.dataVencimento) {
      params.data.status = 'Planejado';
    } else {
      params.data.status = '-';
    }
    
    // Se for uma linha nova (id começa com "new-"), salvar automaticamente
    if (params.data.id?.toString().startsWith('new-')) {
      // Aguardar um pouco para o usuário terminar de editar
      clearTimeout((window as any).saveTimeout);
      (window as any).saveTimeout = setTimeout(() => {
        salvarLancamento(params.data);
      }, 2000);
    } else {
      // Atualizar lançamento existente
      clearTimeout((window as any).updateTimeout);
      (window as any).updateTimeout = setTimeout(() => {
        atualizarLancamento(params.data);
      }, 2000);
    }
    
    // Atualizar resumo
    aplicarFiltros();
  };

  const handleRowDoubleClicked = (params: RowDoubleClickedEvent) => {
    if (!params.data) return;
    setLancamentoSelecionado(params.data as Lancamento);
    setDrawerOpen(true);
  };

  const salvarLancamento = async (dados: any) => {
    try {
      const lancamentoData: any = {
        conta: dados.conta || 'TODAS AS CONTAS',
        dataOperacao: dados.dataOperacao,
        clienteFornecedor: dados.clienteFornecedor || '',
        descricao: dados.descricao || '',
        categoria: dados.categoria || '',
        valor: dados.valor || 0,
        entradas: dados.entradas || 0,
        saidas: dados.saidas || 0,
        formaOperacao: dados.formaOperacao || '',
        parcelas: dados.parcelas || 1,
        dataVencimento: dados.dataVencimento || null,
        dataCompensacao: dados.dataCompensacao || null,
        observacao: dados.observacao || ''
      };

      const response = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lancamentoData)
      });

      if (response.ok) {
        const novoLancamento = await response.json();
        // Atualizar o ID da linha
        dados.id = novoLancamento.id;
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
    }
  };

  const atualizarLancamento = async (dados: any) => {
    if (!dados.id || dados.id.toString().startsWith('new-')) return;
    
    try {
      const lancamentoData: any = {
        conta: dados.conta || 'TODAS AS CONTAS',
        dataOperacao: dados.dataOperacao,
        clienteFornecedor: dados.clienteFornecedor || '',
        descricao: dados.descricao || '',
        categoria: dados.categoria || '',
        valor: dados.valor || 0,
        entradas: dados.entradas || 0,
        saidas: dados.saidas || 0,
        formaOperacao: dados.formaOperacao || '',
        parcelas: dados.parcelas || 1,
        dataVencimento: dados.dataVencimento || null,
        dataCompensacao: dados.dataCompensacao || null,
        observacao: dados.observacao || ''
      };

      await fetch(`/api/lancamentos/${dados.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lancamentoData)
      });
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
    }
  };

  // Gerar opções de meses
  const meses = useMemo(() => {
    const opcoes = [];
    const hoje = new Date();
    for (let i = -6; i <= 6; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const valor = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      const label = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      opcoes.push({ valor, label });
    }
    return opcoes;
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Lançamentos Financeiros</h1>
        <button
          onClick={handleNovo}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + Novo
        </button>
      </div>

      {/* Filtros e Resumo */}
      <div style={{
        backgroundColor: 'white',
        padding: '12px 16px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <select
            value={filtroConta}
            onChange={(e) => setFiltroConta(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '150px'
            }}
          >
            <option value="">Todas as Contas</option>
            {bancos.map(b => (
              <option key={b.id} value={b.nome}>{b.nome}</option>
            ))}
          </select>

          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '150px'
            }}
          >
            <option value="">Todos os Meses</option>
            {meses.map(m => (
              <option key={m.valor} value={m.valor}>{m.label}</option>
            ))}
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '150px'
            }}
          >
            <option value="">Todas as Categorias</option>
            {categorias.map(c => (
              <option key={c.id} value={c.nome}>{c.nome}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Buscar..."
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '200px'
            }}
          />
        </div>

        {/* Resumo */}
        <div style={{ display: 'flex', gap: '24px', marginLeft: 'auto' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Entradas</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#28a745' }}>
              R$ {resumo.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Saídas</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc3545' }}>
              R$ {resumo.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Saldo</div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: resumo.saldo >= 0 ? '#28a745' : '#dc3545' 
            }}>
              R$ {resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, padding: '8px', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: '400px' }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            rowHeight={28}
            headerHeight={28}
            suppressRowClickSelection={false}
            rowSelection="single"
            onCellValueChanged={handleCellValueChanged}
            onRowDoubleClicked={handleRowDoubleClicked}
            enterNavigatesVertically={true}
            enterNavigatesVerticallyAfterEdit={true}
            suppressClickEdit={false}
            animateRows={false}
            enableRangeSelection={true}
            undoRedoCellEditing={true}
            undoRedoCellEditingLimit={20}
            enableCharts={false}
            suppressMenuHide={true}
            getRowId={(params) => params.data?.id?.toString()}
            domLayout="normal"
            suppressNoRowsOverlay={false}
          />
        </div>
        {rowData.length === 0 && lancamentos.length > 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            color: '#666',
            fontSize: '13px',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            Nenhum lançamento corresponde aos filtros aplicados
          </div>
        )}
        {lancamentos.length === 0 && rowData.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            fontSize: '14px'
          }}>
            Carregando lançamentos...
          </div>
        )}
      </div>
      <LancamentoDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setLancamentoSelecionado(null);
          carregarDados();
        }}
        lancamento={lancamentoSelecionado}
      />

      {/* Totais */}
      <div style={{
        backgroundColor: 'white',
        padding: '8px 16px',
        borderTop: '2px solid #2c3e50',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '32px',
        fontSize: '13px',
        fontWeight: '600'
      }}>
        <div>
          <span style={{ color: '#666', marginRight: '8px' }}>Total Entradas:</span>
          <span style={{ color: '#28a745' }}>
            R$ {resumo.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span style={{ color: '#666', marginRight: '8px' }}>Total Saídas:</span>
          <span style={{ color: '#dc3545' }}>
            R$ {resumo.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span style={{ color: '#666', marginRight: '8px' }}>Saldo Final:</span>
          <span style={{ color: resumo.saldo >= 0 ? '#28a745' : '#dc3545' }}>
            R$ {resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

    </div>
  );
}

