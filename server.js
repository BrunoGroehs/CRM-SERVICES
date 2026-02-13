const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// Importar sistema de logging
const { logger, authLogger, googleLogger, dbLogger } = require('./config/logger');

// Importar módulos do projeto
const { initializeDatabase } = require('./database/init');
const { router: clientesRouter, initializePool: initClientesPool } = require('./routes/clientes');
const { router: servicosRouter, initializePool: initServicosPool } = require('./routes/servicos');
const { router: financasRouter, initializePool: initFinancasPool } = require('./routes/financas');
const recontatosRouter = require('./routes/recontatos');
const { router: authRouter, initializePool: initAuthPool } = require('./routes/auth');
const { router: usuariosRouter, initializePool: initUsuariosPool } = require('./routes/usuarios');
const { router: adminRouter, initializePool: initAdminPool } = require('./routes/admin');

// Importar configurações de autenticação
const { configureGoogleStrategy } = require('./auth/passport');
const { apiLimiter } = require('./middleware/rateLimiter');
const { authenticateToken } = require('./middleware/auth');

logger.info('🚀 Iniciando CRM Services...', {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT || 3000,
  timestamp: new Date().toISOString()
});

const app = express();
const port = process.env.PORT || 3000;

// Behind Render (and most PaaS) there's a reverse proxy; trust it so req.ip/req.secure work
// This also satisfies express-rate-limit validations about X-Forwarded-For
app.set('trust proxy', 1);
logger.info('🛡️ trust proxy habilitado', { trustProxy: app.get('trust proxy') });

// Configurações de segurança
logger.info('🔒 Configurando segurança com Helmet...');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "*.googleusercontent.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Para React em produção
      connectSrc: ["'self'", "accounts.google.com", "*.googleapis.com"],
      frameSrc: ["'self'", "accounts.google.com"]
    }
  },
  crossOriginEmbedderPolicy: false // Para OAuth
}));

// Configurar CORS
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = isProd 
  ? [
      process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'https://crm-services.onrender.com',
      'https://accounts.google.com'
    ]
  : [
      'http://localhost:3001', 
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];

logger.info('🌐 Configurando CORS', {
  environment: isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO',
  allowedOrigins
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Middleware para cookies
logger.debug('🍪 Configurando cookies...');
app.use(cookieParser());

// Configurar sessões
logger.info('📝 Configurando sessões', {
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  proxy: true, // honor X-Forwarded-* when setting secure cookies
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS em produção
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Para CORS em produção
  }
}));

// Inicializar Passport
authLogger.info('🔐 Inicializando Passport...');
app.use(passport.initialize());
app.use(passport.session());

// Middleware para parsing JSON
logger.debug('📄 Configurando middleware de parsing...');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting geral
logger.debug('⏱️ Configurando rate limiting...');
app.use('/api/', apiLimiter);

// Middleware para servir arquivos estáticos
logger.debug('📁 Configurando arquivos estáticos...');
app.use(express.static('public'));

// Servir frontend React em produção
let buildPath = null;
if (process.env.NODE_ENV === 'production') {
  buildPath = path.join(__dirname, 'frontend/crm-frontend/build');
  logger.info('📦 Modo produção: servindo frontend React', { buildPath });
  app.use(express.static(buildPath));

  // Importante: antes das rotas de API, servir index.html para navegações do navegador
  // Isso garante que GET /financas (rota do SPA) não bata no router de API /financas com 401 JSON
  const spaRoutes = ['/', '/clientes', '/servicos', '/recontatos', '/calendario', '/financas', '/admin'];
  const indexFile = path.join(buildPath, 'index.html');
  spaRoutes.forEach((route) => {
    app.get(route, (req, res, next) => {
      const accept = req.get('accept') || '';
      if (req.method === 'GET' && accept.includes('text/html')) {
        return res.sendFile(indexFile);
      }
      return next();
    });
  });
}

// Middleware para logging de requests
app.use((req, res, next) => {
  logger.debug('🔄 Request recebido', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    ips: req.ips,
    xForwardedFor: req.get('x-forwarded-for') || null,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Configuração da conexão com PostgreSQL
dbLogger.info('🗄️ Configurando conexão com PostgreSQL...', {
  hasConnectionString: !!process.env.DATABASE_URL,
  ssl: true
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Inicializar o pool nas rotas
dbLogger.info('🔗 Inicializando pool de conexões nas rotas...');
initClientesPool(pool);
initServicosPool(pool);
initAuthPool(pool);
initUsuariosPool(pool);
initAdminPool(pool);
initFinancasPool(pool);

// Configurar estratégias de autenticação
googleLogger.info('🔧 Configurando estratégias de autenticação...');
configureGoogleStrategy(pool);

// Disponibilizar o pool para as rotas de recontatos
app.locals.pool = pool;

// Função para testar a conexão com o banco de dados
async function testDatabaseConnection() {
  try {
    dbLogger.info('🔄 Testando conexão com banco de dados...');
    const client = await pool.connect();
    
    dbLogger.info('✅ Conexão com PostgreSQL estabelecida', {
      host: client.host,
      port: client.port,
      database: client.database,
      user: client.user
    });
    
    console.log('✅ Conexão com o banco de dados PostgreSQL estabelecida com sucesso!');
    console.log('📊 Informações da conexão:');
    console.log(`   - Host: ${client.host}`);
    console.log(`   - Porta: ${client.port}`);
    console.log(`   - Banco: ${client.database}`);
    console.log(`   - Usuário: ${client.user}`);
    client.release();
    
    dbLogger.debug('🔌 Conexão de teste liberada');
  } catch (error) {
    dbLogger.error('❌ Erro ao conectar com banco', {
      error: error.message,
      stack: error.stack
    });
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
app.use('/auth', authRouter);
app.use('/usuarios', usuariosRouter);
app.use('/admin', adminRouter);

// Rota para guia de configuração OAuth
app.get('/oauth-setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'oauth-setup.html'));
});

// Rotas protegidas (requerem autenticação)
app.use('/clientes', authenticateToken, clientesRouter);
app.use('/servicos', authenticateToken, servicosRouter);
app.use('/recontatos', authenticateToken, recontatosRouter);
app.use('/financas', authenticateToken, financasRouter);
logger.info('📈 Rotas de Finanças montadas em /financas');

// Endpoint Dashboard - Métricas do Sistema (protegido)
app.get('/dashboard', authenticateToken, async (req, res) => {
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

// Catch-all handler: serve React app para qualquer rota não encontrada (DEVE ser a última rota)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Se não é uma rota da API, serve o React
    if (!req.path.startsWith('/api') && 
        !req.path.startsWith('/auth') && 
        !req.path.startsWith('/clientes') && 
        !req.path.startsWith('/servicos') && 
        !req.path.startsWith('/recontatos') && 
        !req.path.startsWith('/usuarios') && 
        !req.path.startsWith('/admin') && 
        !req.path.startsWith('/dashboard') && 
        !req.path.startsWith('/health') && 
        !req.path.startsWith('/db-') && 
        !req.path.startsWith('/oauth-setup')) {
      logger.info('🔄 Servindo React app para rota:', { path: req.path });
      res.sendFile(path.join(__dirname, 'frontend/crm-frontend/build', 'index.html'));
    } else {
      next();
    }
  });
}

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
