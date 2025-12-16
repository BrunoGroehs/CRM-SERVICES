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
const { router: dashboardRouter, initializePool: initDashboardPool } = require('./routes/dashboard');

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
initDashboardPool(pool);

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
    
    client.release();
    dbLogger.debug('🔌 Conexão de teste liberada');
  } catch (error) {
    dbLogger.error('❌ Erro ao conectar com banco', {
      error: error.message,
      stack: error.stack
    });
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
        'GET /health': 'Status do servidor'
      }
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
app.use('/dashboard', authenticateToken, dashboardRouter);
logger.info('📈 Rotas de Finanças e Dashboard montadas');

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
    // Verifica se o request aceita HTML (navegador) e não é API
    const accept = req.get('accept') || '';
    if (!req.path.startsWith('/api') && accept.includes('text/html')) {
      logger.info('🔄 Servindo React app para rota:', { path: req.path });
      res.sendFile(path.join(__dirname, 'frontend/crm-frontend/build', 'index.html'));
    } else {
      next();
    }
  });
}

// Inicialização do servidor
app.listen(port, async () => {
  logger.info(`🚀 Servidor CRM Services iniciado na porta ${port}`);
  
  // Testar conexão com o banco de dados na inicialização
  await testDatabaseConnection();
  
  // Inicializar estrutura do banco de dados
  try {
    await initializeDatabase(pool);
  } catch (error) {
    logger.error('❌ Erro ao inicializar banco de dados:', { error: error.message });
  }
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;
