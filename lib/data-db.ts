// Versão com banco de dados PostgreSQL (Neon)

import pool from './db';
import { Lancamento, Banco, FormaPagamento, FluxoCaixa, ResultadoMensal } from '@/types';

// Funções auxiliares para cálculos (mantidas iguais)

export function calcularStatus(lancamento: Lancamento): 'Realizado' | 'Planejado' | '-' {
  if (!lancamento.dataVencimento) {
    return '-';
  }
  
  const dataVenc = new Date(lancamento.dataVencimento);
  if (!isNaN(dataVenc.getTime())) {
    if (lancamento.dataCompensacao) {
      return 'Realizado';
    }
    return 'Planejado';
  }
  
  return '-';
}

export function calcularSaldo(lancamentos: Lancamento[], conta?: string): number {
  let saldo = 0;
  
  for (const lanc of lancamentos) {
    if (!conta || lanc.conta === conta || conta === 'TODAS AS CONTAS') {
      saldo += (lanc.entradas || 0) - (lanc.saidas || 0);
    }
  }
  
  return saldo;
}

export function calcularTotalEntradas(lancamentos: Lancamento[], filtros?: {
  conta?: string;
  dataInicio?: Date;
  dataFim?: Date;
  status?: string;
}): number {
  return lancamentos
    .filter(lanc => {
      if (filtros?.conta && lanc.conta !== filtros.conta && filtros.conta !== 'TODAS AS CONTAS') {
        return false;
      }
      if (filtros?.status && calcularStatus(lanc) !== filtros.status) {
        return false;
      }
      if (filtros?.dataInicio || filtros?.dataFim) {
        const dataOp = new Date(lanc.dataOperacao);
        if (filtros.dataInicio && dataOp < filtros.dataInicio) return false;
        if (filtros.dataFim && dataOp > filtros.dataFim) return false;
      }
      return true;
    })
    .reduce((total, lanc) => total + (lanc.entradas || 0), 0);
}

export function calcularTotalSaidas(lancamentos: Lancamento[], filtros?: {
  conta?: string;
  dataInicio?: Date;
  dataFim?: Date;
  status?: string;
}): number {
  return lancamentos
    .filter(lanc => {
      if (filtros?.conta && lanc.conta !== filtros.conta && filtros.conta !== 'TODAS AS CONTAS') {
        return false;
      }
      if (filtros?.status && calcularStatus(lanc) !== filtros.status) {
        return false;
      }
      if (filtros?.dataInicio || filtros?.dataFim) {
        const dataOp = new Date(lanc.dataOperacao);
        if (filtros.dataInicio && dataOp < filtros.dataInicio) return false;
        if (filtros.dataFim && dataOp > filtros.dataFim) return false;
      }
      return true;
    })
    .reduce((total, lanc) => total + (lanc.saidas || 0), 0);
}

// API de dados usando PostgreSQL

export const DataService = {
  // Lançamentos
  getLancamentos: async (): Promise<Lancamento[]> => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          conta,
          data_operacao,
          cliente_fornecedor as "clienteFornecedor",
          descricao,
          parcelas,
          categoria,
          entradas,
          saidas,
          forma_operacao as "formaOperacao",
          data_vencimento as "dataVencimento",
          data_compensacao as "dataCompensacao",
          status
        FROM lancamentos
        ORDER BY data_operacao DESC
      `);
      
      return result.rows.map(row => ({
        ...row,
        status: calcularStatus(row)
      }));
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      return [];
    }
  },
  
  addLancamento: async (lancamento: Lancamento): Promise<Lancamento> => {
    const id = `lanc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const status = calcularStatus(lancamento);
    
    try {
      await pool.query(`
        INSERT INTO lancamentos (
          id, conta, data_operacao, cliente_fornecedor, descricao,
          parcelas, categoria, entradas, saidas, forma_operacao,
          data_vencimento, data_compensacao, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        id,
        lancamento.conta,
        lancamento.dataOperacao,
        lancamento.clienteFornecedor || null,
        lancamento.descricao,
        lancamento.parcelas || 1,
        lancamento.categoria || null,
        lancamento.entradas || 0,
        lancamento.saidas || 0,
        lancamento.formaOperacao || null,
        lancamento.dataVencimento || null,
        lancamento.dataCompensacao || null,
        status
      ]);
      
      return { ...lancamento, id, status };
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error);
      throw error;
    }
  },
  
  updateLancamento: async (id: string, lancamento: Partial<Lancamento>): Promise<Lancamento | null> => {
    try {
      // Buscar lançamento existente
      const existing = await pool.query('SELECT * FROM lancamentos WHERE id = $1', [id]);
      if (existing.rows.length === 0) return null;
      
      const existingRow = existing.rows[0];
      const updated: Lancamento = {
        id,
        conta: lancamento.conta ?? existingRow.conta,
        dataOperacao: lancamento.dataOperacao ?? existingRow.data_operacao,
        clienteFornecedor: lancamento.clienteFornecedor ?? existingRow.cliente_fornecedor,
        descricao: lancamento.descricao ?? existingRow.descricao,
        parcelas: lancamento.parcelas ?? existingRow.parcelas,
        categoria: lancamento.categoria ?? existingRow.categoria,
        entradas: lancamento.entradas ?? parseFloat(existingRow.entradas),
        saidas: lancamento.saidas ?? parseFloat(existingRow.saidas),
        formaOperacao: lancamento.formaOperacao ?? existingRow.forma_operacao,
        dataVencimento: lancamento.dataVencimento ?? existingRow.data_vencimento,
        dataCompensacao: lancamento.dataCompensacao ?? existingRow.data_compensacao,
      };
      const status = calcularStatus(updated);
      
      await pool.query(`
        UPDATE lancamentos SET
          conta = $2,
          data_operacao = $3,
          cliente_fornecedor = $4,
          descricao = $5,
          parcelas = $6,
          categoria = $7,
          entradas = $8,
          saidas = $9,
          forma_operacao = $10,
          data_vencimento = $11,
          data_compensacao = $12,
          status = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [
        id,
        updated.conta,
        updated.dataOperacao,
        updated.clienteFornecedor || null,
        updated.descricao,
        updated.parcelas || 1,
        updated.categoria || null,
        updated.entradas || 0,
        updated.saidas || 0,
        updated.formaOperacao || null,
        updated.dataVencimento || null,
        updated.dataCompensacao || null,
        status
      ]);
      
      return { ...updated, status };
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      return null;
    }
  },
  
  deleteLancamento: async (id: string): Promise<boolean> => {
    try {
      const result = await pool.query('DELETE FROM lancamentos WHERE id = $1', [id]);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      return false;
    }
  },
  
  // Bancos
  getBancos: async (): Promise<Banco[]> => {
    try {
      const result = await pool.query('SELECT id, nome FROM bancos ORDER BY id');
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar bancos:', error);
      return [];
    }
  },
  
  addBanco: async (banco: Omit<Banco, 'id'>): Promise<Banco> => {
    try {
      const result = await pool.query(
        'INSERT INTO bancos (nome) VALUES ($1) RETURNING id, nome',
        [banco.nome]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao adicionar banco:', error);
      throw error;
    }
  },
  
  // Formas de Pagamento
  getFormasPagamento: async (): Promise<FormaPagamento[]> => {
    try {
      const result = await pool.query('SELECT id, nome FROM formas_pagamento ORDER BY nome');
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      return [];
    }
  },
  
  // Dashboard
  getDashboardInfo: async (conta?: string): Promise<{
    saldoAtual: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoSelecao: number;
  }> => {
    try {
      const lancamentos = await DataService.getLancamentos();
      const totalEntradas = calcularTotalEntradas(lancamentos, { conta });
      const totalSaidas = calcularTotalSaidas(lancamentos, { conta });
      const saldoAtual = calcularSaldo(lancamentos, conta);
      
      return {
        saldoAtual,
        totalEntradas,
        totalSaidas,
        saldoSelecao: totalEntradas - totalSaidas
      };
    } catch (error) {
      console.error('Erro ao buscar informações do dashboard:', error);
      return { saldoAtual: 0, totalEntradas: 0, totalSaidas: 0, saldoSelecao: 0 };
    }
  },
  
  // Fluxo de Caixa
  getFluxoCaixa: async (dataInicio?: Date, dataFim?: Date): Promise<FluxoCaixa[]> => {
    try {
      const lancamentos = await DataService.getLancamentos();
      
      // Agrupar por data
      const fluxoMap = new Map<string, FluxoCaixa>();
      
      lancamentos.forEach(lanc => {
        const dataOp = new Date(lanc.dataOperacao);
        const dataKey = dataOp.toISOString().split('T')[0];
        
        if (!fluxoMap.has(dataKey)) {
          const diaSemana = dataOp.toLocaleDateString('pt-BR', { weekday: 'short' });
          fluxoMap.set(dataKey, {
            data: dataKey,
            dia: diaSemana,
            entradasRealizado: 0,
            saidasRealizado: 0,
            saldoAtual: 0,
            entradasPlanejado: 0,
            saidasPlanejado: 0,
            saldoFuturo: 0
          });
        }
        
        const fluxo = fluxoMap.get(dataKey)!;
        const status = calcularStatus(lanc);
        
        if (status === 'Realizado') {
          fluxo.entradasRealizado += lanc.entradas || 0;
          fluxo.saidasRealizado += lanc.saidas || 0;
        } else if (status === 'Planejado') {
          fluxo.entradasPlanejado += lanc.entradas || 0;
          fluxo.saidasPlanejado += lanc.saidas || 0;
        }
      });
      
      // Calcular saldos acumulados
      let saldoAcumulado = 0;
      const fluxoArray = Array.from(fluxoMap.values())
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      
      fluxoArray.forEach(fluxo => {
        saldoAcumulado += (fluxo.entradasRealizado - fluxo.saidasRealizado);
        fluxo.saldoAtual = saldoAcumulado;
        
        saldoAcumulado += (fluxo.entradasPlanejado - fluxo.saidasPlanejado);
        fluxo.saldoFuturo = saldoAcumulado;
      });
      
      return fluxoArray;
    } catch (error) {
      console.error('Erro ao buscar fluxo de caixa:', error);
      return [];
    }
  }
};

