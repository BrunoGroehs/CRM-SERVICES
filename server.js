const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// Importar módulos do projeto
const { initializeDatabase } = require('./database/init');
const { router: clientesRouter, initializePool: initClientesPool } = require('./routes/clientes');
const { router: servicosRouter, initializePool: initServicosPool } = require('./routes/servicos');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsing JSON
app.use(express.json());

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
      health: {
        'GET /db-test': 'Testa conexão com banco',
        'GET /health': 'Status do servidor'
      }
    }
  });
});

// Rotas da API
app.use('/clientes', clientesRouter);
app.use('/servicos', servicosRouter);

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
