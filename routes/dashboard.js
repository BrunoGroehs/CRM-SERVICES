const express = require('express');
const router = express.Router();

let pool;

const initializePool = (dbPool) => {
  pool = dbPool;
};

// GET /dashboard - Métricas e estatísticas do sistema
router.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // 1. Número total de clientes
    const totalClientesQuery = await client.query('SELECT COUNT(*) as total FROM clientes');
    const totalClientes = parseInt(totalClientesQuery.rows[0].total);
    
    // 2. Total de serviços realizados (assumindo que serviços com data passada foram realizados)
    const servicosRealizadosQuery = await client.query(`
      SELECT COUNT(*) as total 
      FROM servicos 
      WHERE data <= CURRENT_DATE
    `);
    const servicosRealizados = parseInt(servicosRealizadosQuery.rows[0].total);
    
    // 3. Soma do valor de serviços concluídos (receita total)
    const receitaTotalQuery = await client.query(`
      SELECT COALESCE(SUM(valor), 0) as receita_total 
      FROM servicos
      WHERE status = 'concluido'
    `);
    const receitaTotal = parseFloat(receitaTotalQuery.rows[0].receita_total) || 0;
    
    // 4. Número de recontatos com status próximo ou atrasado
    // Considerando:
    // - "atrasado": data_agendada < hoje e status = 'agendado'
    // - "próximo": data_agendada <= próximos 7 dias e status = 'agendado'
    const recontatosUrgentesQuery = await client.query(`
      SELECT 
        COUNT(CASE WHEN data_agendada < CURRENT_DATE AND status = 'agendado' THEN 1 END) as atrasados,
        COUNT(CASE WHEN data_agendada <= CURRENT_DATE + INTERVAL '7 days' AND data_agendada >= CURRENT_DATE AND status = 'agendado' THEN 1 END) as proximos
      FROM recontatos
    `);
    
    const recontatos = recontatosUrgentesQuery.rows[0];
    const recontatosAtrasados = parseInt(recontatos.atrasados) || 0;
    const recontatosProximos = parseInt(recontatos.proximos) || 0;
    
    // 5. Métricas adicionais úteis
    const servicosHojeQuery = await client.query(`
      SELECT COUNT(*) as total 
      FROM servicos 
      WHERE data = CURRENT_DATE
    `);
    const servicosHoje = parseInt(servicosHojeQuery.rows[0].total);
    
    const totalRecontatosQuery = await client.query('SELECT COUNT(*) as total FROM recontatos');
    const totalRecontatos = parseInt(totalRecontatosQuery.rows[0].total);
    
    const recontatosRealizadosQuery = await client.query(`
      SELECT COUNT(*) as total 
      FROM recontatos 
      WHERE status = 'realizado'
    `);
    const recontatosRealizados = parseInt(recontatosRealizadosQuery.rows[0].total);
    
    client.release();
    
    // Retornar métricas organizadas
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metricas: {
        clientes: {
          total: totalClientes,
          descricao: "Número total de clientes cadastrados"
        },
        servicos: {
          realizados: servicosRealizados,
          hoje: servicosHoje,
          receita_total: receitaTotal,
          descricao: "Serviços realizados e receita total"
        },
        recontatos: {
          total: totalRecontatos,
          realizados: recontatosRealizados,
          atrasados: recontatosAtrasados,
          proximos: recontatosProximos,
          descricao: "Status dos recontatos no sistema"
        }
      },
      resumo: {
        total_clientes: totalClientes,
        servicos_realizados: servicosRealizados,
        receita_total: receitaTotal,
        recontatos_urgentes: recontatosAtrasados + recontatosProximos,
        recontatos_atrasados: recontatosAtrasados,
        recontatos_proximos: recontatosProximos
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar métricas',
      error: error.message
    });
  }
});

module.exports = { router, initializePool };
