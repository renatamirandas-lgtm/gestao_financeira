'use client';

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent, ModuleRegistry, ClientSideRowModelModule, TextEditorModule, NumberEditorModule, DateEditorModule, SelectEditorModule } from 'ag-grid-community';
import { Lancamento } from '@/types';
import LancamentoDrawer from './LancamentoDrawer';

ModuleRegistry.registerModules([ClientSideRowModelModule, TextEditorModule, NumberEditorModule, DateEditorModule, SelectEditorModule]);

export default function LancamentosGridPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [rowData, setRowData] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null);
  const [linhasModificadas, setLinhasModificadas] = useState<Set<string>>(new Set());
  
  // Filtros
  const [filtroConta, setFiltroConta] = useState<string>('');
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState<string>('');
  
  // Dados para filtros
  const [bancos, setBancos] = useState<Array<{ id: number; nome: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nome: string; tipoGrupo?: string }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: string; nome: string }>>([]);
  const [pessoas, setPessoas] = useState<Array<{ id: number; nome: string }>>([]);
  
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
      const [lancamentosRes, bancosRes, categoriasRes, formasRes, pessoasRes] = await Promise.all([
        fetch('/api/lancamentos'),
        fetch('/api/bancos'),
        fetch('/api/categorias'),
        fetch('/api/formas-pagamento'),
        fetch('/api/pessoas')
      ]);
      
      const lancamentosData = await lancamentosRes.json();
      const bancosData = await bancosRes.json();
      const categoriasData = await categoriasRes.json();
      const formasData = await formasRes.json();
      const pessoasData = await pessoasRes.json();
      
      console.log('[GRID] Dados carregados:', {
        lancamentos: lancamentosData.length,
        bancos: bancosData.length,
        categorias: categoriasData.length,
        formas: formasData.length,
        pessoas: pessoasData.length
      });
      
      setLancamentos(lancamentosData);
      setBancos(bancosData);
      setCategorias(categoriasData);
      setFormasPagamento(formasData);
      setPessoas(pessoasData);
    } catch (error) {
      console.error('[GRID] Erro ao carregar dados:', error);
    }
  };

  const aplicarFiltros = (dadosBase: Lancamento[] = lancamentos) => {
    let filtrados = [...dadosBase];
    
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
      const dataOperacaoTexto = (() => {
        const raw = (l.dataOperacao || '').toString();
        if (!raw) return '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          const [yyyy, mm, dd] = raw.slice(0, 10).split('-');
          return `${dd}/${mm}/${yyyy}`;
        }
        return raw;
      })();
      return {
        id: l.id || `temp-${index}`,
        conta: l.conta || '',
        dataOperacao: dataOperacaoTexto,
        dataOperacaoFormatada: dataOperacaoTexto,
        clienteFornecedor: l.clienteFornecedor || '',
        clienteFornecedorId: (l as any).clienteFornecedorId || null,
        descricao: l.descricao || '',
        categoria: l.categoria || '',
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
  const normalizarTexto = (valor: string) => valor.trim().toLowerCase();

  const ClienteFornecedorEditor = useMemo(() => {
    return forwardRef((props: any, ref) => {
      const [valor, setValor] = useState<string>(props.value || '');
      const [sugestoes, setSugestoes] = useState<Array<{ id: number; nome: string }>>([]);
      const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
      const inputRef = useRef<HTMLInputElement | null>(null);
      const debounceRef = useRef<any>(null);
      const requestIdRef = useRef<number>(0);

      const buscarPessoas = (texto: string) => {
        const termo = texto.trim();
        if (!termo) {
          setSugestoes([]);
          setMostrarSugestoes(false);
          return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          const requestId = ++requestIdRef.current;
          try {
            const response = await fetch(`/api/clientes-fornecedores?search=${encodeURIComponent(termo)}`);
            if (!response.ok) return;
            const data = await response.json();
            if (requestId !== requestIdRef.current) return;
            setSugestoes(Array.isArray(data) ? data : []);
            setMostrarSugestoes(Array.isArray(data) && data.length > 0);
          } catch {
            setSugestoes([]);
            setMostrarSugestoes(false);
          }
        }, 300);
      };

      const selecionarPessoa = (pessoa: { id: number; nome: string }) => {
        setValor(pessoa.nome);
        setSugestoes([]);
        setMostrarSugestoes(false);
        if (props.node && props.column) {
          props.node.setDataValue(props.column.getColId(), pessoa.nome);
          props.node.data.clienteFornecedorId = pessoa.id;
        }
        props.stopEditing();
      };

      useImperativeHandle(ref, () => ({
        getValue() {
          return valor;
        },
        isPopup() {
          return true;
        },
        afterGuiAttached() {
          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.select();
            }
          });
        }
      }));

      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            ref={inputRef}
            value={valor}
            onChange={(e) => {
              const novoValor = e.target.value;
              setValor(novoValor);
              buscarPessoas(novoValor);
              if (props.node?.data) {
                props.node.data.clienteFornecedorId = null;
              }
            }}
            onFocus={(e) => {
              if (e.target.value) {
                buscarPessoas(e.target.value);
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setMostrarSugestoes(false);
                if (props.node && props.column) {
                  props.node.setDataValue(props.column.getColId(), valor);
                }
              }, 200);
            }}
            placeholder="Digite para buscar ou digite um nome novo"
            style={{ width: '100%', padding: '4px 6px', fontSize: '12px' }}
          />
          {mostrarSugestoes && sugestoes.length > 0 && (
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
              {sugestoes.map(pessoa => (
                <div
                  key={pessoa.id}
                  onClick={() => selecionarPessoa(pessoa)}
                  style={{
                    padding: '8px',
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
          {valor && 
           !pessoas.some(p => p.nome.toLowerCase() === valor.toLowerCase()) &&
           !mostrarSugestoes && (
            <div style={{ 
              marginTop: '4px', 
              fontSize: '11px', 
              color: '#0066cc',
              fontStyle: 'italic'
            }}>
              ⓘ Pessoa não cadastrada. O nome será salvo para finalizar o cadastro depois.
            </div>
          )}
        </div>
      );
    });
  }, [pessoas]);

  const DataOperacaoEditor = useMemo(() => {
    return forwardRef((props: any, ref) => {
      const valorRaw = props.value ? props.value.toString().trim() : '';
      const valorBr = /^\d{4}-\d{2}-\d{2}/.test(valorRaw)
        ? `${valorRaw.slice(8, 10)}/${valorRaw.slice(5, 7)}/${valorRaw.slice(0, 4)}`
        : valorRaw;
      const valorIso = /^\d{2}\/\d{2}\/\d{4}$/.test(valorBr)
        ? `${valorBr.slice(6, 10)}-${valorBr.slice(3, 5)}-${valorBr.slice(0, 2)}`
        : '';
      const [valorTexto, setValorTexto] = useState<string>(valorBr);
      const [valorDate, setValorDate] = useState<string>(valorIso);
      const containerRef = useRef<HTMLDivElement | null>(null);
      const inputRef = useRef<HTMLInputElement | null>(null);
      const dateRef = useRef<HTMLInputElement | null>(null);
      const textoRef = useRef<string>(valorBr);
      const isoRef = useRef<string>(valorIso);
      const pickingRef = useRef<boolean>(false);

      useImperativeHandle(ref, () => ({
        getValue() {
          return textoRef.current || props.value || '';
        },
        isPopup() {
          return true;
        },
        afterGuiAttached() {
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.select();
            }
          }, 0);
        }
      }));

      const abrirCalendario = () => {
        if (dateRef.current) {
          pickingRef.current = true;
          dateRef.current.showPicker?.();
          dateRef.current.click();
        }
      };

      return (
        <div
          ref={containerRef}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            ref={inputRef}
            value={valorTexto}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d/]/g, '').slice(0, 10);
              setValorTexto(v);
              textoRef.current = v;
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={() => {
              if (props.stopEditing) {
                setTimeout(() => {
                  if (pickingRef.current) return;
                  if (containerRef.current?.contains(document.activeElement)) return;
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(textoRef.current)) {
                    if (props.node && props.column) {
                      props.node.setDataValue(props.column.getColId(), textoRef.current);
                    }
                  }
                  props.stopEditing();
                }, 0);
              }
            }}
            placeholder="dd/mm/aaaa"
            style={{ width: '100%', padding: '4px 6px', fontSize: '12px' }}
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              abrirCalendario();
            }}
            style={{
              border: '1px solid #ddd',
              background: '#fff',
              padding: '2px 6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            📅
          </button>
          <input
            type="date"
            ref={dateRef}
            value={valorDate}
            onChange={(e) => {
              const iso = e.target.value;
              pickingRef.current = false;
              setValorDate(iso);
              if (iso) {
                const texto = `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
                setValorTexto(texto);
                textoRef.current = texto;
                if (props.node && props.column) {
                  props.node.setDataValue(props.column.getColId(), texto);
                }
              }
              if (props.stopEditing) {
                setTimeout(() => props.stopEditing(), 0);
              }
            }}
            onBlur={() => {
              pickingRef.current = false;
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </div>
      );
    });
  }, []);

  const colDefs: ColDef[] = useMemo(() => [
    { 
      field: 'dataOperacao', 
      headerName: 'Data',
      width: 100,
      pinned: 'left',
      editable: true,
      cellEditor: 'DataOperacaoEditor',
      cellStyle: compactCellStyle,
      suppressKeyboardEvent: (params: any) => params.editing === true,
      valueGetter: (params) => {
        return params.data?.dataOperacao || null;
      },
      valueSetter: (params) => {
        if (!params.newValue) return false;
        const raw = params.newValue.toString().trim();
        let novaData = '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
          novaData = raw;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          novaData = `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`;
        }
        if (!novaData) return false;
        if (params.data.dataOperacao === novaData) return false;
        params.data.dataOperacao = novaData;
        params.data.dataOperacaoFormatada = novaData;
        return true;
      },
      valueFormatter: (params) => {
        if (!params.value) return '';
        const raw = params.value.toString().trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          return `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`;
        }
        return params.data?.dataOperacaoFormatada || raw;
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
      cellStyle: compactCellStyle,
      cellEditor: 'ClienteFornecedorEditor',
      cellEditorPopup: true,
      cellEditorPopupPosition: 'under'
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
      cellStyle: (params: any) => {
        const valor = params.value || 0;
        return {
          padding: '4px',
          fontSize: '12px',
          textAlign: 'right',
          fontWeight: '500',
          color: valor >= 0 ? '#28a745' : '#dc3545'
        };
      },
      valueFormatter: (params) => {
        const valor = params.value || 0;
        const sinal = valor < 0 ? '-' : '';
        return `${sinal}R$ ${Math.abs(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      cellStyle: (params: any) => {
        const status = params.value || '-';
        const colors: any = {
          'Realizado': '#28a745',
          'Planejado': '#ffc107',
          '-': '#6c757d'
        };
        return {
          padding: '4px',
          fontSize: '12px',
          color: colors[status] || '#6c757d'
        };
      }
    },
    { 
      field: 'observacao', 
      headerName: 'Observação',
      width: 200,
      editable: true,
      cellStyle: compactCellStyle
    }
  ], [bancos, categorias, formasPagamento]);

  const defaultColDef: ColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    editable: true,
    cellStyle: { padding: '4px', fontSize: '12px' }
  }), []);
  const components = useMemo(() => ({
    ClienteFornecedorEditor,
    DataOperacaoEditor
  }), [ClienteFornecedorEditor, DataOperacaoEditor]);

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
    
    const id = params.data?.id?.toString();
    if (id && !id.startsWith('new-') && params.newValue !== params.oldValue) {
      setLinhasModificadas(prev => new Set(prev).add(id));
    }
  };

  const handleSalvar = async () => {
    if (linhasModificadas.size === 0) {
      alert('Nenhuma alteração para salvar');
      return;
    }

    try {
      const idsModificados = Array.from(linhasModificadas);
      const promessas = idsModificados.map(async (id) => {
        const linha = rowData.find(r => r.id?.toString() === id);
        if (!linha) return;

        const payload: any = {
          conta: linha.conta,
          descricao: linha.descricao,
          categoria: linha.categoria,
          valor: linha.valor || 0,
          entradas: linha.entradas || 0,
          saidas: linha.saidas || 0,
          formaOperacao: linha.formaOperacao,
          parcelas: linha.parcelas,
          observacao: linha.observacao
        };

        if (linha.dataOperacao) {
          const raw = linha.dataOperacao.toString().trim();
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
            const [dd, mm, yyyy] = raw.split('/');
            payload.dataOperacao = `${yyyy}-${mm}-${dd}`;
          } else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            payload.dataOperacao = raw.slice(0, 10);
          }
        }

        if (linha.clienteFornecedor) {
          const nome = linha.clienteFornecedor.toString().trim();
          payload.clienteFornecedor = nome;
          let pessoaId = linha.clienteFornecedorId || null;
          if (nome && !pessoaId) {
            try {
              const response = await fetch(`/api/clientes-fornecedores?search=${encodeURIComponent(nome)}`);
              if (response.ok) {
                const data = await response.json();
                const encontrada = Array.isArray(data)
                  ? data.find((p: any) => normalizarTexto(p.nome) === normalizarTexto(nome))
                  : null;
                if (encontrada?.id) {
                  pessoaId = encontrada.id;
                }
              }
              if (!pessoaId) {
                const createRes = await fetch('/api/pessoas', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nome,
                    tipoPessoa: 'Física',
                    situacaoPessoa: 'Incompleto'
                  })
                });
                if (createRes.ok) {
                  const novaPessoa = await createRes.json();
                  pessoaId = novaPessoa.id;
                }
              }
            } catch (error) {
              console.error('Erro ao garantir pessoa:', error);
            }
          }
          if (pessoaId) {
            payload.clienteFornecedorId = pessoaId;
          }
        }

        const response = await fetch(`/api/lancamentos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Erro na linha ${id}: ${errorData.error || 'Erro ao atualizar'}`);
        }
      });

      await Promise.all(promessas);
      setLinhasModificadas(new Set());
      alert(`${idsModificados.length} lançamento(s) salvo(s) com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(error.message || 'Erro ao salvar alterações');
    }
  };

  const handleCellClicked = (params: any) => {
    if (!params.colDef?.editable) return;
    if (params.colDef.field === 'conta') return;
    if (params.colDef.field === 'categoria') return;
    if (params.colDef.field === 'formaOperacao') return;
    const target = params.event?.target as HTMLElement | undefined;
    if (target && (target.tagName === 'SELECT' || target.tagName === 'OPTION')) return;
    params.api.startEditingCell({
      rowIndex: params.rowIndex,
      colKey: params.colDef.field
    });
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSalvar}
            disabled={linhasModificadas.size === 0}
            style={{
              backgroundColor: linhasModificadas.size > 0 ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: linhasModificadas.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              opacity: linhasModificadas.size > 0 ? 1 : 0.6
            }}
          >
            💾 Salvar {linhasModificadas.size > 0 ? `(${linhasModificadas.size})` : ''}
          </button>
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
        <style jsx global>{`
          .ag-cell-inline-editing {
            box-shadow: inset 0 0 0 1px #0066cc;
            background: #f7fbff;
          }
        `}</style>
        <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: '400px' }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            components={components}
            onGridReady={onGridReady}
            rowHeight={28}
            headerHeight={28}
            suppressRowClickSelection={false}
            rowSelection="single"
            onCellValueChanged={handleCellValueChanged}
            onCellClicked={handleCellClicked}
            enterNavigatesVertically={true}
            enterNavigatesVerticallyAfterEdit={true}
            suppressClickEdit={false}
            singleClickEdit={true}
            stopEditingWhenCellsLoseFocus={false}
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

