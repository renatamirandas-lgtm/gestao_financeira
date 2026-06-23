'use client';

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent, ModuleRegistry, ClientSideRowModelModule, TextEditorModule, NumberEditorModule, DateEditorModule, SelectEditorModule, RowSelectionModule } from 'ag-grid-community';
import { Lancamento } from '@/types';
import { formatParcelaExibicao, normalizarParcelasCampos, totalParcelasParaGerar } from '@/lib/parcelas';
import { digitarMaiusculo } from '@/lib/texto';
import LancamentoDrawer from './LancamentoDrawer';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextEditorModule,
  NumberEditorModule,
  DateEditorModule,
  SelectEditorModule,
  RowSelectionModule
]);

function linhaGridDifereDoServidor(row: any, srv: Lancamento): boolean {
  const ts = (v: any) => (v == null ? '' : String(v)).trim();
  const tn = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const dIso = (v: any) => {
    if (v == null || v === '') return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };
  const normOp = (raw: any) => {
    const s = ts(raw);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return dIso(raw);
  };
  if (ts(row.descricao) !== ts(srv.descricao)) return true;
  if (ts(row.conta) !== ts(srv.conta)) return true;
  if (ts(row.categoria) !== ts(srv.categoria)) return true;
  if (tn(row.entradas) !== tn(srv.entradas)) return true;
  if (tn(row.saidas) !== tn(srv.saidas)) return true;
  if (ts(row.formaOperacao) !== ts(srv.formaOperacao)) return true;
  if (tn((row as any).numeroParcela) !== tn((srv as any).numeroParcela)) return true;
  if (tn((row as any).totalParcelas) !== tn((srv as any).totalParcelas)) return true;
  if (ts(row.observacao) !== ts((srv as any).observacao)) return true;
  if (ts(row.clienteFornecedor) !== ts(srv.clienteFornecedor)) return true;
  if (String((row as any).clienteFornecedorId ?? '') !== String((srv as any).clienteFornecedorId ?? '')) return true;
  if (dIso(row.dataVencimento) !== dIso(srv.dataVencimento)) return true;
  if (dIso(row.dataCompensacao) !== dIso(srv.dataCompensacao)) return true;
  if (normOp(row.dataOperacao) !== normOp(srv.dataOperacao)) return true;
  return false;
}

function calcularStatusGrid(l: { dataVencimento?: any; dataCompensacao?: any; status?: string }): 'Realizado' | 'Planejado' | '-' {
  if (l.status === 'Realizado' || l.status === 'Planejado') return l.status;
  if (!l.dataVencimento) return '-';
  const dataVenc = new Date(l.dataVencimento);
  if (isNaN(dataVenc.getTime())) return '-';
  if (l.dataCompensacao) return 'Realizado';
  return 'Planejado';
}

function tsData(val: any): number {
  if (val == null || val === '') return Number.MAX_SAFE_INTEGER;
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)).getTime();
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [yyyy, mm, dd] = s.slice(0, 10).split('-');
    return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)).getTime();
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
}

function parseDataParaDate(val: any): Date | null {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [yyyy, mm, dd] = s.slice(0, 10).split('-');
    const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function dataParaIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function vencimentoComMesesAdicionados(dataBase: Date, mesesAdicionar: number): string {
  const diaPreferido = dataBase.getDate();
  const alvo = new Date(dataBase.getFullYear(), dataBase.getMonth() + mesesAdicionar, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(diaPreferido, ultimoDia));
  return dataParaIso(alvo);
}

export default function LancamentosGridPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [rowData, setRowData] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null);
  const [linhasModificadas, setLinhasModificadas] = useState<Set<string>>(new Set());
  const lancamentosRef = useRef<Lancamento[]>([]);
  useEffect(() => {
    lancamentosRef.current = lancamentos;
  }, [lancamentos]);

  /** Linhas novas ainda não salvas no servidor (id `new-...`); sempre no final da grid */
  const [linhasRascunho, setLinhasRascunho] = useState<any[]>([]);

  // Filtros
  const [filtroConta, setFiltroConta] = useState<string>('');
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState<string>('');
  const [filtroSituacao, setFiltroSituacao] = useState<'Planejado' | 'Realizado' | ''>('');
  const scrollGridParaRef = useRef<'fim' | null>(null);
  const scrollParaLinhaRef = useRef<string | null>(null);
  
  // Dados para filtros
  const [bancos, setBancos] = useState<Array<{ id: number; nome: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nome: string; tipoGrupo?: string }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: string; nome: string }>>([]);
  const [pessoas, setPessoas] = useState<Array<{ id: number; nome: string }>>([]);
  
  // Resumo
  const [resumo, setResumo] = useState({
    saldo: 0,
    entradas: 0,
    saidas: 0,
    saldoRealizado: 0,
    saldoFuturo: 0
  });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [lancamentos, filtroConta, filtroMes, filtroCategoria, filtroBusca, filtroSituacao, linhasRascunho]);

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

  const passaFiltrosLinha = (l: any, opts?: { ignorarSituacao?: boolean }) => {
    if (filtroConta && l.conta !== filtroConta) return false;
    if (filtroCategoria && l.categoria !== filtroCategoria) return false;
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      const desc = (l.descricao || '').toLowerCase();
      const cliente = (l.clienteFornecedor || '').toLowerCase();
      if (!desc.includes(busca) && !cliente.includes(busca)) return false;
    }
    if (filtroMes) {
      const [ano, mes] = filtroMes.split('-');
      const raw = (l.dataOperacao || '').toString();
      let data: Date | null = null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split('/');
        data = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
      } else if (raw) {
        data = new Date(raw);
      }
      if (!data || isNaN(data.getTime())) return false;
      if (data.getFullYear() !== parseInt(ano, 10) || data.getMonth() + 1 !== parseInt(mes, 10)) return false;
    }
    if (!opts?.ignorarSituacao && filtroSituacao) {
      const status = calcularStatusGrid(l);
      if (status !== filtroSituacao) return false;
    }
    return true;
  };

  const aplicarFiltros = (dadosBase: Lancamento[] = lancamentos) => {
    let filtrados = [...dadosBase].filter(l => passaFiltrosLinha(l));

    if (filtroSituacao === 'Planejado') {
      filtrados.sort((a, b) => tsData(a.dataVencimento) - tsData(b.dataVencimento));
    } else if (filtroSituacao === 'Realizado') {
      filtrados.sort((a, b) => tsData(a.dataCompensacao) - tsData(b.dataCompensacao));
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
        numeroParcela: (l as any).numeroParcela ?? 1,
        totalParcelas: (l as any).totalParcelas ?? 1,
        parcelas: formatParcelaExibicao((l as any).numeroParcela, (l as any).totalParcelas),
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
    const rascunhosVisiveis = linhasRascunho.filter(r => passaFiltrosLinha(r, { ignorarSituacao: true }));
    const merged = [...dadosGrid, ...rascunhosVisiveis];
    setRowData(merged);
    
    const totalEntradas = merged.reduce((sum, l) => sum + (Number(l.entradas) || 0), 0);
    const totalSaidas = merged.reduce((sum, l) => sum + (Number(l.saidas) || 0), 0);
    const saldoFiltro = totalEntradas - totalSaidas;

    const saldoLinha = (l: Lancamento) => (Number(l.entradas) || 0) - (Number(l.saidas) || 0);
    const saldoRealizado = dadosBase
      .filter(l => passaFiltrosLinha(l, { ignorarSituacao: true }) && calcularStatusGrid(l) === 'Realizado')
      .reduce((sum, l) => sum + saldoLinha(l), 0);
    const saldoPlanejadoTotal = dadosBase
      .filter(l => passaFiltrosLinha(l, { ignorarSituacao: true }) && calcularStatusGrid(l) === 'Planejado')
      .reduce((sum, l) => sum + saldoLinha(l), 0);

    const saldoFuturo =
      filtroSituacao === 'Planejado'
        ? saldoRealizado + saldoFiltro
        : filtroSituacao === 'Realizado'
          ? saldoRealizado
          : saldoRealizado + saldoPlanejadoTotal;

    setResumo({
      saldo: saldoFiltro,
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldoRealizado,
      saldoFuturo
    });
  };

  const compactCellStyle: any = { padding: '4px', fontSize: '12px' };
  const compactRightCellStyle: any = { padding: '4px', fontSize: '12px', textAlign: 'right' };
  const compactRightBoldCellStyle: any = { padding: '4px', fontSize: '12px', textAlign: 'right', fontWeight: '500' };
  const normalizarTexto = (valor: string) => valor.trim().toLowerCase();

  const MaiusculoTextEditor = useMemo(() => {
    return forwardRef((props: any, ref) => {
      const [value, setValue] = useState<string>(props.value != null ? String(props.value) : '');
      const inputRef = useRef<HTMLInputElement | null>(null);

      useImperativeHandle(ref, () => ({
        getValue: () => value,
        isCancelBeforeStart: () => false,
        isCancelAfterEnd: () => false,
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
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={props.maxLength}
          onChange={(e) => setValue(digitarMaiusculo(e.target.value))}
          style={{ width: '100%', padding: '4px 6px', fontSize: '12px' }}
        />
      );
    });
  }, []);

  const ClienteFornecedorEditor = useMemo(() => {
    return forwardRef((props: any, ref) => {
      const [valor, setValor] = useState<string>(props.value || '');
      const [sugestoes, setSugestoes] = useState<Array<{ id: number; nome: string }>>([]);
      const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
      const [posDropdown, setPosDropdown] = useState<{ top: number; left: number; width: number } | null>(null);
      const inputRef = useRef<HTMLInputElement | null>(null);
      const debounceRef = useRef<any>(null);
      const requestIdRef = useRef<number>(0);
      const valorCommitRef = useRef<string>(props.value || '');
      const sugestoesRef = useRef<Array<{ id: number; nome: string }>>([]);
      const selecionandoRef = useRef(false);

      const aplicarPessoaNaLinha = (pessoa: { id: number; nome: string }) => {
        valorCommitRef.current = pessoa.nome;
        setValor(pessoa.nome);
        if (props.node?.data) {
          props.node.data.clienteFornecedorId = pessoa.id;
        }
        if (props.node && props.column) {
          props.node.setDataValue(props.column.getColId(), pessoa.nome);
        }
        const idLinha = props.node?.data?.id?.toString();
        if (idLinha && !idLinha.startsWith('new-')) {
          setLinhasModificadas(prev => new Set(prev).add(idLinha));
        }
      };

      const resolverPessoaExistente = (
        texto: string,
        lista: Array<{ id: number; nome: string }>
      ): { id: number; nome: string } | null => {
        const termo = texto.trim().toLowerCase();
        if (!termo) return null;
        const exata = lista.find(p => p.nome.trim().toLowerCase() === termo);
        if (exata) return exata;
        const exataCache = pessoas.find(p => p.nome.trim().toLowerCase() === termo);
        if (exataCache) return exataCache;
        const porPrefixo = lista.filter(p => p.nome.trim().toLowerCase().startsWith(termo));
        if (porPrefixo.length === 1) return porPrefixo[0];
        return null;
      };

      const buscarPessoas = (texto: string) => {
        const termo = texto.trim();
        if (!termo) {
          setSugestoes([]);
          sugestoesRef.current = [];
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
            const lista = Array.isArray(data) ? data : [];
            setSugestoes(lista);
            sugestoesRef.current = lista;
            setMostrarSugestoes(lista.length > 0);
          } catch {
            setSugestoes([]);
            sugestoesRef.current = [];
            setMostrarSugestoes(false);
          }
        }, 300);
      };

      const confirmarValorDigitado = async () => {
        if (selecionandoRef.current) return;
        const texto = digitarMaiusculo(valor.trim());
        if (!texto) {
          valorCommitRef.current = '';
          if (props.node?.data) props.node.data.clienteFornecedorId = null;
          if (props.node && props.column) {
            props.node.setDataValue(props.column.getColId(), '');
          }
          return;
        }

        let lista = sugestoesRef.current;
        if (lista.length === 0) {
          try {
            const response = await fetch(`/api/clientes-fornecedores?search=${encodeURIComponent(texto)}`);
            if (response.ok) {
              const data = await response.json();
              lista = Array.isArray(data) ? data : [];
              sugestoesRef.current = lista;
            }
          } catch {
            /* mantém lista vazia */
          }
        }

        const existente = resolverPessoaExistente(texto, lista);
        if (existente) {
          aplicarPessoaNaLinha(existente);
          return;
        }

        valorCommitRef.current = texto;
        if (props.node?.data) props.node.data.clienteFornecedorId = null;
        if (props.node && props.column) {
          props.node.setDataValue(props.column.getColId(), texto);
        }
      };

      const selecionarPessoa = (pessoa: { id: number; nome: string }) => {
        selecionandoRef.current = true;
        aplicarPessoaNaLinha(pessoa);
        setSugestoes([]);
        sugestoesRef.current = [];
        setMostrarSugestoes(false);
        setPosDropdown(null);
        props.stopEditing();
        setTimeout(() => {
          selecionandoRef.current = false;
        }, 250);
      };

      const atualizarPosDropdown = useCallback(() => {
        if (!inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        const alturaItem = 33;
        const alturaLista = Math.min(200, Math.max(sugestoesRef.current.length, 1) * alturaItem + 4);
        const espacoAbaixo = window.innerHeight - rect.bottom;
        const espacoAcima = rect.top;
        const abrirAcima = espacoAbaixo < alturaLista && espacoAcima > espacoAbaixo;
        const top = abrirAcima
          ? Math.max(4, rect.top - alturaLista - 2)
          : rect.bottom + 2;
        setPosDropdown({
          top,
          left: rect.left,
          width: Math.max(rect.width, 180)
        });
      }, []);

      useEffect(() => {
        if (!mostrarSugestoes || sugestoes.length === 0) {
          setPosDropdown(null);
          return;
        }
        atualizarPosDropdown();
        const onReposicionar = () => atualizarPosDropdown();
        window.addEventListener('scroll', onReposicionar, true);
        window.addEventListener('resize', onReposicionar);
        return () => {
          window.removeEventListener('scroll', onReposicionar, true);
          window.removeEventListener('resize', onReposicionar);
        };
      }, [mostrarSugestoes, sugestoes, atualizarPosDropdown]);

      useImperativeHandle(ref, () => ({
        getValue() {
          const texto = valorCommitRef.current.trim();
          if (!texto) return '';
          const existente = resolverPessoaExistente(texto, sugestoesRef.current);
          if (existente) {
            valorCommitRef.current = existente.nome;
            if (props.node?.data) {
              props.node.data.clienteFornecedorId = existente.id;
            }
            return existente.nome;
          }
          return texto;
        },
        isPopup() {
          return true;
        },
        afterGuiAttached() {
          valorCommitRef.current = props.value || '';
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
              const novoValor = digitarMaiusculo(e.target.value);
              valorCommitRef.current = novoValor;
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && sugestoesRef.current.length > 0) {
                e.preventDefault();
                const exata = resolverPessoaExistente(valor, sugestoesRef.current);
                selecionarPessoa(exata || sugestoesRef.current[0]);
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setMostrarSugestoes(false);
                if (!selecionandoRef.current) {
                  void confirmarValorDigitado();
                }
              }, 200);
            }}
            placeholder="Digite para buscar ou digite um nome novo"
            style={{ width: '100%', padding: '4px 6px', fontSize: '12px' }}
          />
          {mostrarSugestoes && sugestoes.length > 0 && posDropdown && typeof document !== 'undefined' && createPortal(
            <div style={{
              position: 'fixed',
              top: posDropdown.top,
              left: posDropdown.left,
              width: posDropdown.width,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 99999,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {sugestoes.map(pessoa => (
                <div
                  key={pessoa.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionarPessoa(pessoa)}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    fontSize: '12px'
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
            </div>,
            document.body
          )}
          {valor &&
           !pessoas.some(p => p.nome.toLowerCase() === valor.toLowerCase()) &&
           !sugestoes.some(p => p.nome.toLowerCase() === valor.toLowerCase()) &&
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
      headerName: 'Data de Operação',
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
      cellEditorPopupPosition: 'over'
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
      cellStyle: compactCellStyle,
      valueSetter: (params) => {
        const novaCategoria = params.newValue;
        params.data.categoria = novaCategoria;
        
        // Recalcular o sinal do valor baseado na nova categoria
        const categoriaSelecionada = categorias.find(c => c.nome === novaCategoria);
        const isEntrada = categoriaSelecionada?.tipoGrupo === 'E' || categoriaSelecionada?.tipoGrupo === 'Entrada';
        const valorAtual = Math.abs(params.data.valor || 0);
        
        console.log('[CATEGORIA] Nova categoria:', novaCategoria);
        console.log('[CATEGORIA] Tipo grupo:', categoriaSelecionada?.tipoGrupo);
        console.log('[CATEGORIA] É entrada?', isEntrada);
        console.log('[CATEGORIA] Valor atual (abs):', valorAtual);
        
        if (valorAtual > 0) {
          if (isEntrada) {
            params.data.valor = valorAtual;
            params.data.entradas = valorAtual;
            params.data.saidas = 0;
            console.log('[CATEGORIA] Ajustando para ENTRADA (positivo):', valorAtual);
          } else {
            params.data.valor = -valorAtual;
            params.data.saidas = valorAtual;
            params.data.entradas = 0;
            console.log('[CATEGORIA] Ajustando para SAÍDA (negativo):', -valorAtual);
          }
          
          // Forçar atualização da célula de valor para refletir a cor
          setTimeout(() => {
            if (params.node) {
              params.api.refreshCells({
                rowNodes: [params.node],
                columns: ['valor'],
                force: true
              });
            }
          }, 0);
        }
        
        return true;
      }
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
      cellEditor: 'MaiusculoTextEditor',
      cellEditorParams: {
        maxLength: 500
      },
      valueSetter: (params) => {
        const v = params.newValue != null ? digitarMaiusculo(String(params.newValue)) : '';
        if (String(params.data.descricao ?? '') === v) return false;
        params.data.descricao = v;
        return true;
      },
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
          color: valor >= 0 ? '#007bff' : '#dc3545'  // Azul para positivo, vermelho para negativo
        };
      },
      valueFormatter: (params) => {
        const valor = params.value || 0;
        const sinal = valor < 0 ? '-' : '';
        return `${sinal}R$ ${Math.abs(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
      valueSetter: (params) => {
        const novoValor = parseFloat(params.newValue) || 0;
        
        // Determinar se é entrada ou saída pela categoria
        const categoriaSelecionada = categorias.find(c => c.nome === params.data.categoria);
        const isEntrada = categoriaSelecionada?.tipoGrupo === 'E' || categoriaSelecionada?.tipoGrupo === 'Entrada';
        
        console.log('[VALOR] Novo valor digitado:', novoValor);
        console.log('[VALOR] Categoria:', params.data.categoria);
        console.log('[VALOR] Tipo grupo:', categoriaSelecionada?.tipoGrupo);
        console.log('[VALOR] É entrada?', isEntrada);
        
        if (isEntrada) {
          params.data.entradas = Math.abs(novoValor);
          params.data.saidas = 0;
          params.data.valor = Math.abs(novoValor);
          console.log('[VALOR] Definindo como ENTRADA (positivo):', Math.abs(novoValor));
        } else {
          params.data.saidas = Math.abs(novoValor);
          params.data.entradas = 0;
          params.data.valor = -Math.abs(novoValor);
          console.log('[VALOR] Definindo como SAÍDA (negativo):', -Math.abs(novoValor));
        }
        
        // Forçar atualização da célula para refletir a cor
        setTimeout(() => {
          if (params.node) {
            params.api.refreshCells({
              rowNodes: [params.node],
              columns: ['valor'],
              force: true
            });
          }
        }, 0);
        
        return true;
      }
    },
    { 
      field: 'parcelas', 
      headerName: 'Parcelas',
      width: 80,
      editable: true,
      cellEditor: 'agTextCellEditor',
      cellStyle: compactRightCellStyle,
      valueGetter: (params) =>
        formatParcelaExibicao(params.data?.numeroParcela, params.data?.totalParcelas),
      valueSetter: (params) => {
        const { numeroParcela, totalParcelas } = normalizarParcelasCampos({
          parcelas: params.newValue
        });
        params.data.numeroParcela = numeroParcela;
        params.data.totalParcelas = totalParcelas;
        params.data.parcelas = formatParcelaExibicao(numeroParcela, totalParcelas);
        return true;
      }
    },
    { 
      field: 'dataVencimento', 
      headerName: 'Data Vencimento',
      width: 130,
      editable: true,
      cellEditor: 'DataOperacaoEditor',
      cellEditorPopup: true,
      cellEditorPopupPosition: 'under',
      suppressKeyboardEvent: (params) => {
        const isEditing = params.editing;
        const key = params.event.key;
        if (isEditing && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'Tab')) {
          return false;
        }
        return isEditing;
      },
      cellStyle: compactCellStyle,
      valueGetter: (params) => {
        if (!params.data?.dataVencimento) return '';
        const date = new Date(params.data.dataVencimento);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      },
      valueSetter: (params) => {
        const newValue = params.newValue;
        if (!newValue || newValue === params.oldValue) return false;
        
        let isoDate = null;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(newValue)) {
          const [dd, mm, yyyy] = newValue.split('/');
          isoDate = `${yyyy}-${mm}-${dd}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(newValue)) {
          isoDate = newValue.slice(0, 10);
        }
        
        if (isoDate) {
          params.data.dataVencimento = isoDate;
          return true;
        }
        return false;
      }
    },
    { 
      field: 'dataCompensacao', 
      headerName: 'Data Compensação',
      width: 140,
      editable: true,
      cellEditor: 'DataOperacaoEditor',
      cellEditorPopup: true,
      cellEditorPopupPosition: 'under',
      suppressKeyboardEvent: (params) => {
        const isEditing = params.editing;
        const key = params.event.key;
        if (isEditing && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'Tab')) {
          return false;
        }
        return isEditing;
      },
      cellStyle: compactCellStyle,
      valueGetter: (params) => {
        if (!params.data?.dataCompensacao) return '';
        const date = new Date(params.data.dataCompensacao);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      },
      valueSetter: (params) => {
        const newValue = params.newValue;
        if (!newValue || newValue === params.oldValue) return false;
        
        let isoDate = null;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(newValue)) {
          const [dd, mm, yyyy] = newValue.split('/');
          isoDate = `${yyyy}-${mm}-${dd}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(newValue)) {
          isoDate = newValue.slice(0, 10);
        }
        
        if (isoDate) {
          params.data.dataCompensacao = isoDate;
          return true;
        }
        return false;
      }
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
      cellEditor: 'MaiusculoTextEditor',
      valueSetter: (params) => {
        const v = params.newValue != null ? digitarMaiusculo(String(params.newValue)) : '';
        if (String(params.data.observacao ?? '') === v) return false;
        params.data.observacao = v;
        return true;
      },
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
    DataOperacaoEditor,
    MaiusculoTextEditor
  }), [ClienteFornecedorEditor, DataOperacaoEditor, MaiusculoTextEditor]);

  const [gridApi, setGridApi] = useState<any>(null);
  const [columnApi, setColumnApi] = useState<any>(null);
  const linhaSelecionadaIdRef = useRef<string | null>(null);

  const rowSelection = useMemo(
    () => ({
      mode: 'singleRow' as const,
      enableClickSelection: true,
      checkboxes: false
    }),
    []
  );

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

  useEffect(() => {
    if (!gridApi || rowData.length === 0) return;
    if (!scrollParaLinhaRef.current && scrollGridParaRef.current !== 'fim') return;

    const rolarParaFim = () => {
      const idAlvo = scrollParaLinhaRef.current;
      if (idAlvo) {
        scrollParaLinhaRef.current = null;
        const node = gridApi.getRowNode(idAlvo);
        if (node) {
          gridApi.ensureNodeVisible(node, 'middle');
          return;
        }
      }
      if (scrollGridParaRef.current === 'fim') {
        scrollGridParaRef.current = null;
        gridApi.ensureIndexVisible(rowData.length - 1, 'bottom');
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(rolarParaFim);
    });
  }, [rowData, gridApi, filtroSituacao]);

  useEffect(() => {
    if (!gridApi) return;
    const onEditingStopped = (e: any) => {
      const node = e.node;
      if (!node?.data?.id) return;
      const id = String(node.data.id);
      const data = { ...node.data };
      if (data.dataVencimento && data.dataCompensacao) {
        data.status = 'Realizado';
      } else if (data.dataVencimento) {
        data.status = 'Planejado';
      } else {
        data.status = '-';
      }

      if (id.startsWith('new-')) {
        setLinhasRascunho(prev => prev.map(r => (String(r.id) === id ? { ...data } : r)));
        setRowData(prev => prev.map(r => (String(r.id) === id ? { ...data } : r)));
        setLinhasModificadas(prev => new Set(prev).add(id));
        return;
      }

      setRowData(prev => prev.map(r => (String(r.id) === id ? { ...data } : r)));

      const orig = lancamentosRef.current.find(l => String(l.id) === id);
      if (!orig) {
        setLinhasModificadas(prev => new Set(prev).add(id));
        return;
      }
      if (linhaGridDifereDoServidor(data, orig)) {
        setLinhasModificadas(prev => new Set(prev).add(id));
      }
    };
    gridApi.addEventListener('cellEditingStopped', onEditingStopped);
    return () => gridApi.removeEventListener('cellEditingStopped', onEditingStopped);
  }, [gridApi]);

  const handleNovo = () => {
    const id = `new-${Date.now()}`;
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    const dataStr = `${dd}/${mm}/${yyyy}`;
    const novaLinha: any = {
      id,
      conta: '',
      dataOperacao: dataStr,
      dataOperacaoFormatada: dataStr,
      clienteFornecedor: '',
      clienteFornecedorId: null,
      descricao: '',
      categoria: '',
      valor: null,
      entradas: null,
      saidas: null,
      formaOperacao: '',
      numeroParcela: 1,
      totalParcelas: 1,
      parcelas: '1',
      dataVencimento: null,
      dataVencimentoFormatada: '',
      dataCompensacao: null,
      dataCompensacaoFormatada: '',
      status: '-',
      observacao: '',
      saldoParcial: 0
    };
    scrollParaLinhaRef.current = id;
    setLinhasRascunho(prev => [...prev, novaLinha]);
    setLinhasModificadas(prev => new Set(prev).add(id));
  };

  const estiloBotaoSituacao = (ativo: boolean) => ({
    backgroundColor: ativo ? '#f0c000' : '#f5e8b0',
    color: '#000',
    border: ativo ? '3px solid #1a1a1a' : '2px solid #d4c870',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: ativo ? '800' : '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    height: '28px',
    lineHeight: '16px',
    boxSizing: 'border-box' as const
  });

  const estiloFiltroCampo = {
    padding: '4px 6px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '11px',
    height: '28px',
    boxSizing: 'border-box' as const,
    flexShrink: 0
  };

  const handleFiltroPlanejado = () => {
    scrollGridParaRef.current = null;
    setFiltroSituacao(prev => (prev === 'Planejado' ? '' : 'Planejado'));
  };

  const handleFiltroRealizado = () => {
    setFiltroSituacao(prev => {
      const proximo = prev === 'Realizado' ? '' : 'Realizado';
      if (proximo === 'Realizado') scrollGridParaRef.current = 'fim';
      return proximo;
    });
  };

  const handleLimparFiltros = () => {
    scrollGridParaRef.current = null;
    setFiltroConta('');
    setFiltroMes('');
    setFiltroCategoria('');
    setFiltroBusca('');
    setFiltroSituacao('');
  };

  const handleCellValueChanged = async (params: CellValueChangedEvent) => {
    console.log('[GRID] Célula alterada:', params.colDef.field, params.newValue);
    // Recalcular status se necessário (antes de sincronizar rowData)
    if (params.data.dataVencimento && params.data.dataCompensacao) {
      params.data.status = 'Realizado';
    } else if (params.data.dataVencimento) {
      params.data.status = 'Planejado';
    } else {
      params.data.status = '-';
    }

    const rowId = params.data?.id;
    setRowData(prev =>
      prev.map(r => (String(r.id) === String(rowId) ? { ...params.data } : r))
    );
    if (rowId != null && String(rowId).startsWith('new-')) {
      setLinhasRascunho(prev =>
        prev.map(r => (String(r.id) === String(rowId) ? { ...params.data } : r))
      );
    }

    const id = rowId?.toString();
    const changed =
      String(params.newValue ?? '') !== String(params.oldValue ?? '');
    if (id && changed) {
      setLinhasModificadas(prev => new Set(prev).add(id));
    }
  };

  const obterLinhaParaExcluir = () => {
    if (!gridApi) return null;
    const selecionadas = gridApi.getSelectedRows?.() || [];
    if (selecionadas[0]?.id != null) return selecionadas[0];

    const nodes = gridApi.getSelectedNodes?.() || [];
    if (nodes[0]?.data?.id != null) return nodes[0].data;

    if (linhaSelecionadaIdRef.current) {
      const node = gridApi.getRowNode?.(linhaSelecionadaIdRef.current);
      if (node?.data) return node.data;
    }

    const focused = gridApi.getFocusedCell?.();
    if (focused?.rowIndex != null) {
      const node = gridApi.getDisplayedRowAtIndex?.(focused.rowIndex);
      if (node?.data?.id != null) return node.data;
    }

    return null;
  };

  const handleExcluir = async () => {
    const linha = obterLinhaParaExcluir();
    if (!linha?.id) {
      alert('Selecione um lançamento para excluir (clique na linha).');
      return;
    }

    const id = String(linha.id);

    if (!confirm('Deseja excluir o lançamento selecionado?')) {
      return;
    }

    if (id.startsWith('new-')) {
      setLinhasRascunho(prev => prev.filter(r => String(r.id) !== id));
      setLinhasModificadas(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      linhaSelecionadaIdRef.current = null;
      return;
    }

    try {
      const response = await fetch(`/api/lancamentos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Erro ao excluir lançamento');
      }

      setLinhasModificadas(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      linhaSelecionadaIdRef.current = null;
      await carregarDados();
      alert('Lançamento excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir lançamento:', error);
      alert(error.message || 'Erro ao excluir lançamento');
    }
  };

  const postLancamentoApi = async (body: any) => {
    const response = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao criar lançamento');
    }
  };

  const criarLancamentosParcelados = async (bodyBase: any, linha: any, totalParcelas: number) => {
    const dataVencBase = parseDataParaDate(linha.dataVencimento ?? bodyBase.dataVencimento);
    if (!dataVencBase) {
      throw new Error('Informe a data de vencimento da 1ª parcela para gerar as demais.');
    }
    for (let i = 0; i < totalParcelas; i++) {
      const dataVencimento =
        i === 0 ? dataParaIso(dataVencBase) : vencimentoComMesesAdicionados(dataVencBase, i);
      const bodyParcela = {
        ...bodyBase,
        numeroParcela: i + 1,
        totalParcelas,
        dataVencimento,
        dataCompensacao: i === 0 ? bodyBase.dataCompensacao ?? null : null
      };
      await postLancamentoApi(bodyParcela);
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
        const linhaGrid = gridApi?.getRowNode?.(id)?.data;
        const linha = linhaGrid || rowData.find(r => r.id?.toString() === id);
        if (!linha) return;

        const parcelasLinha = normalizarParcelasCampos(linha);
        const payload: any = {
          conta: linha.conta,
          descricao: linha.descricao,
          categoria: linha.categoria,
          valor: linha.valor || 0,
          entradas: linha.entradas || 0,
          saidas: linha.saidas || 0,
          formaOperacao: linha.formaOperacao,
          numeroParcela: parcelasLinha.numeroParcela,
          totalParcelas: parcelasLinha.totalParcelas,
          observacao: linha.observacao,
          dataVencimento: linha.dataVencimento || null,
          dataCompensacao: linha.dataCompensacao || null
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
                  payload.clienteFornecedor = encontrada.nome;
                } else if (Array.isArray(data) && data.length > 0) {
                  const porPrefixo = data.filter((p: any) =>
                    normalizarTexto(p.nome).startsWith(normalizarTexto(nome))
                  );
                  if (porPrefixo.length === 1) {
                    pessoaId = porPrefixo[0].id;
                    payload.clienteFornecedor = porPrefixo[0].nome;
                  }
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

        if (String(id).startsWith('new-')) {
          const body: any = {
            conta: linha.conta || 'TODAS AS CONTAS',
            dataOperacao: payload.dataOperacao,
            clienteFornecedor: payload.clienteFornecedor ?? linha.clienteFornecedor ?? '',
            descricao: linha.descricao || '',
            categoria: linha.categoria || '',
            valor: linha.valor || 0,
            entradas: linha.entradas || 0,
            saidas: linha.saidas || 0,
            formaOperacao: linha.formaOperacao || '',
            numeroParcela: linha.numeroParcela ?? 1,
            totalParcelas: linha.totalParcelas ?? 1,
            dataVencimento: linha.dataVencimento || null,
            dataCompensacao: linha.dataCompensacao || null,
            observacao: linha.observacao || ''
          };
          if (payload.clienteFornecedorId) {
            body.clienteFornecedorId = payload.clienteFornecedorId;
          }
          if (!body.dataOperacao) {
            throw new Error('Preencha a data de operação no lançamento novo.');
          }
          if (!body.descricao || !String(body.descricao).trim()) {
            throw new Error('Preencha a descrição no lançamento novo.');
          }
          const valorAbs =
            Math.abs(Number(linha.valor) || 0) ||
            Math.abs(Number(linha.entradas) || 0) ||
            Math.abs(Number(linha.saidas) || 0);
          if (!valorAbs) {
            throw new Error('Informe um valor maior que zero no lançamento novo.');
          }

          const sugestaoParcelas = totalParcelasParaGerar(linha);
          if (sugestaoParcelas > 1) {
            const resposta = window.prompt(
              `Quantas parcelas deseja gerar? (informado no campo: ${sugestaoParcelas})`,
              String(sugestaoParcelas)
            );
            if (resposta === null) {
              throw new Error('Salvamento cancelado.');
            }
            const totalParcelas = parseInt(resposta, 10);
            if (!Number.isFinite(totalParcelas) || totalParcelas < 2) {
              throw new Error('Informe um número válido de parcelas (2 ou mais).');
            }
            await criarLancamentosParcelados(body, linha, totalParcelas);
            return;
          }

          const parcelasNorm = normalizarParcelasCampos(linha);
          body.numeroParcela = parcelasNorm.numeroParcela;
          body.totalParcelas = parcelasNorm.totalParcelas;
          await postLancamentoApi(body);
          return;
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
      setLinhasRascunho(prev =>
        prev.filter(
          r => !idsModificados.some(mid => String(mid) === String(r.id) && String(mid).startsWith('new-'))
        )
      );
      await carregarDados();
      setLinhasModificadas(new Set());
      alert(`${idsModificados.length} lançamento(s) salvo(s) com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(error.message || 'Erro ao salvar alterações');
    }
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
        ...normalizarParcelasCampos(dados),
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
        ...normalizarParcelasCampos(dados),
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

  const labelSaldoResumo = filtroSituacao === 'Realizado' ? 'Saldo atual' : 'Saldo futuro';

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
            onClick={() => window.location.href = '/'}
            style={{ backgroundColor: '#0066cc', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
          >
            ← Gestão Financeira
          </button>
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
          <button
            onClick={handleExcluir}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Filtros e Resumo */}
      <div style={{
        backgroundColor: 'white',
        padding: '8px 12px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        gap: '8px',
        flexWrap: 'nowrap',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleFiltroPlanejado}
            style={estiloBotaoSituacao(filtroSituacao === 'Planejado')}
          >
            Planejado
          </button>
          <button
            type="button"
            onClick={handleFiltroRealizado}
            style={estiloBotaoSituacao(filtroSituacao === 'Realizado')}
          >
            Realizado
          </button>
        </div>

        {/* Resumo */}
        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '1px' }}>Entradas</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#28a745' }}>
              R$ {resumo.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '1px' }}>Saídas</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#dc3545' }}>
              R$ {resumo.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '1px' }}>Diferença</div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: resumo.saldo >= 0 ? '#28a745' : '#dc3545' 
            }}>
              R$ {resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '1px' }}>{labelSaldoResumo}</div>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: resumo.saldoFuturo >= 0 ? '#28a745' : '#dc3545'
            }}>
              R$ {resumo.saldoFuturo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '8px' }} />

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
          <select
            value={filtroConta}
            onChange={(e) => setFiltroConta(e.target.value)}
            style={{
              ...estiloFiltroCampo,
              width: '115px',
              ...(filtroConta ? {
                backgroundColor: '#e9ecef',
                border: '3px solid #1a1a1a',
                fontWeight: '700'
              } : {})
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
            style={{ ...estiloFiltroCampo, width: '125px' }}
          >
            <option value="">Todos os Meses</option>
            {meses.map(m => (
              <option key={m.valor} value={m.valor}>{m.label}</option>
            ))}
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{ ...estiloFiltroCampo, width: '125px' }}
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
            onChange={(e) => setFiltroBusca(digitarMaiusculo(e.target.value))}
            style={{ ...estiloFiltroCampo, width: '90px', minWidth: '70px', flexShrink: 1 }}
          />

          <button
            type="button"
            onClick={handleLimparFiltros}
            style={{
              ...estiloFiltroCampo,
              padding: '4px 8px',
              border: '1px solid #6c757d',
              fontWeight: '500',
              backgroundColor: '#f8f9fa',
              color: '#333',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, padding: '8px', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <style jsx global>{`
          .ag-cell-inline-editing {
            box-shadow: inset 0 0 0 1px #0066cc;
            background: #f7fbff;
          }
          .ag-theme-alpine .ag-body-viewport {
            overflow-y: auto !important;
          }
        `}</style>
        <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: 0, height: '100%' }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            components={components}
            onGridReady={onGridReady}
            rowSelection={rowSelection}
            onCellClicked={(params) => {
              params.node.setSelected(true);
              if (params.data?.id != null) {
                linhaSelecionadaIdRef.current = String(params.data.id);
              }
            }}
            onSelectionChanged={(e) => {
              const rows = e.api.getSelectedRows?.() || [];
              if (rows[0]?.id != null) {
                linhaSelecionadaIdRef.current = String(rows[0].id);
              }
            }}
            rowHeight={28}
            headerHeight={28}
            suppressRowClickSelection={false}
            onCellValueChanged={handleCellValueChanged}
            enterNavigatesVertically={true}
            enterNavigatesVerticallyAfterEdit={true}
            suppressClickEdit={false}
            singleClickEdit={true}
            stopEditingWhenCellsLoseFocus={true}
            animateRows={false}
            enableRangeSelection={false}
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
          <span style={{ color: '#666', marginRight: '8px' }}>Diferença:</span>
          <span style={{ color: resumo.saldo >= 0 ? '#28a745' : '#dc3545' }}>
            R$ {resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span style={{ color: '#666', marginRight: '8px' }}>{labelSaldoResumo}:</span>
          <span style={{ color: resumo.saldoFuturo >= 0 ? '#28a745' : '#dc3545' }}>
            R$ {resumo.saldoFuturo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

    </div>
  );
}

