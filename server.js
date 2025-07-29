const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// Importar módulos do projeto
const { initializeDatabase } = require('./database/init');
const { router: clientesRouter, initializePool: initClientesPool } = require('./routes/clientes');
const { router: servicosRouter, initializePool: initServicosPool } = require('./routes/servicos');
const recontatosRouter = require('./routes/recontatos');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsing JSON
app.use(express.json());

// Middleware para servir arquivos estáticos
app.use(express.static('public'));

// Middleware para logging de requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Configuração da conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Inicializar o pool nas rotas
initClientesPool(pool);
initServicosPool(pool);

// Disponibilizar o pool para as rotas de recontatos
app.locals.pool = pool;

// Função para testar a conexão com o banco de dados
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexão com o banco de dados PostgreSQL estabelecida com sucesso!');
    console.log('📊 Informações da conexão:');
    console.log(`   - Host: ${client.host}`);
    console.log(`   - Porta: ${client.port}`);
    console.log(`   - Banco: ${client.database}`);
    console.log(`   - Usuário: ${client.user}`);
    client.release();
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error.message);
  }
}

// Endpoint de teste principal
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor rodando',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      clientes: {
        'GET /clientes': 'Lista todos os clientes',
        'GET /clientes/:id': 'Busca cliente por ID',
        'POST /clientes': 'Cria novo cliente',
        'PUT /clientes/:id': 'Atualiza cliente',
        'DELETE /clientes/:id': 'Remove cliente'
      },
      servicos: {
        'GET /servicos': 'Lista todos os serviços',
        'GET /servicos/:id': 'Busca serviço por ID',
        'POST /servicos': 'Cria novo serviço',
        'PUT /servicos/:id': 'Atualiza serviço',
        'DELETE /servicos/:id': 'Remove serviço'
      },
      recontatos: {
        'GET /recontatos': 'Lista todos os recontatos',
        'GET /recontatos/:id': 'Busca recontato por ID',
        'POST /recontatos': 'Cria novo recontato',
        'PUT /recontatos/:id': 'Atualiza recontato',
        'DELETE /recontatos/:id': 'Remove recontato'
      },
      dashboard: {
        'GET /dashboard': 'Métricas e estatísticas do sistema'
      },
      health: {
        'GET /db-test': 'Testa conexão com banco',
        'GET /health': 'Status do servidor'
      }
    },
    pages: {
      'dashboard.html': 'Interface visual do dashboard com métricas',
      'teste-recontatos.html': 'Interface de teste para recontatos',
      'teste-completo-recontatos.html': 'Interface completa de gerenciamento de recontatos'
    }
  });
});

// Rotas da API
app.use('/clientes', clientesRouter);
app.use('/servicos', servicosRouter);
app.use('/recontatos', recontatosRouter);

// Endpoint Dashboard - Métricas do Sistema
app.get('/dashboard', async (req, res) => {
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
    
    // 3. Soma do valor de todos os serviços (receita total)
    const receitaTotalQuery = await client.query(`
      SELECT COALESCE(SUM(valor), 0) as receita_total 
      FROM servicos
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
    
    // Calcular taxa de conversão de recontatos
    const taxaConversaoRecontatos = totalRecontatos > 0 ? 
      ((recontatosRealizados / totalRecontatos) * 100).toFixed(2) : 0;
    
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
          taxa_conversao: `${taxaConversaoRecontatos}%`,
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

// Endpoint para testar a conexão com o banco
app.get('/db-test', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
    res.json({
      message: 'Conexão com banco de dados OK',
      current_time: result.rows[0].current_time,
      status: 'SUCCESS'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Erro na conexão com o banco de dados',
      error: error.message,
      status: 'ERROR'
    });
  }
});

// Endpoint para verificar estrutura das tabelas
app.get('/db-structure', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Verificar se tabela servicos existe e sua estrutura
    const servicosStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'servicos' 
      ORDER BY ordinal_position;
    `);
    
    // Verificar se tabela clientes existe
    const clientesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clientes' 
      ORDER BY ordinal_position;
    `);
    
    client.release();
    
    res.json({
      message: 'Estrutura das tabelas',
      tables: {
        clientes: clientesStructure.rows,
        servicos: servicosStructure.rows
      },
      status: 'SUCCESS'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Erro ao verificar estrutura das tabelas',
      error: error.message,
      status: 'ERROR'
    });
  }
});

// Endpoint para informações do servidor
app.get('/health', (req, res) => {
  res.json({
    server: 'CRM Services API',
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Inicialização do servidor
app.listen(port, async () => {
  console.log('🚀 Servidor CRM Services iniciado!');
  console.log(`📡 Servidor rodando na porta ${port}`);
  console.log(`🌐 Acesse: http://localhost:${port}`);
  console.log('📋 Endpoints disponíveis:');
  console.log('   - GET /           - Endpoint principal');
  console.log('   - GET /clientes   - Lista todos os clientes');
  console.log('   - POST /clientes  - Cria novo cliente');
  console.log('   - PUT /clientes/:id - Atualiza cliente');
  console.log('   - DELETE /clientes/:id - Remove cliente');
  console.log('   - GET /servicos   - Lista todos os serviços');
  console.log('   - POST /servicos  - Cria novo serviço');
  console.log('   - PUT /servicos/:id - Atualiza serviço');
  console.log('   - DELETE /servicos/:id - Remove serviço');
  console.log('   - GET /recontatos - Lista todos os recontatos');
  console.log('   - POST /recontatos - Cria novo recontato');
  console.log('   - PUT /recontatos/:id - Atualiza recontato');
  console.log('   - DELETE /recontatos/:id - Remove recontato');
  console.log('   - GET /dashboard  - Métricas e estatísticas do sistema');
  console.log('   - GET /db-test    - Teste de conexão com banco');
  console.log('   - GET /health     - Status do servidor');
  console.log('');
  
  // Testar conexão com o banco de dados na inicialização
  await testDatabaseConnection();
  
  // Inicializar estrutura do banco de dados
  try {
    await initializeDatabase(pool);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  }
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
