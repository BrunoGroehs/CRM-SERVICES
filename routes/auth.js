const express = require('express');
const passport = require('passport');
const { verifyRefreshToken, generateToken, generateRefreshToken } = require('../auth/jwt');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { authLogger, googleLogger } = require('../config/logger');

const router = express.Router();

// Inicializar pool (será definido pelo server.js)
let pool;
const initializePool = (poolInstance) => {
  pool = poolInstance;
  authLogger.info('🔗 Pool de conexões inicializado nas rotas de auth');
};

// Aplicar rate limiting às rotas de auth
router.use(authLimiter);

// Rota de diagnóstico OAuth
router.get('/oauth-info', (req, res) => {
  authLogger.info('📋 Solicitação de informações OAuth', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: 'Informações de configuração OAuth',
    config: {
      client_id: process.env.GOOGLE_CLIENT_ID ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      environment: process.env.NODE_ENV || 'development',
      current_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      frontend_url: process.env.FRONTEND_URL
    },
    instructions: {
      step1: 'Acesse: https://console.cloud.google.com/apis/credentials',
      step2: `Encontre o Client ID: ${process.env.GOOGLE_CLIENT_ID}`,
      step3: 'Clique em editar (ícone do lápis)',
      step4: `Adicione esta URI nas URIs de redirecionamento: ${process.env.GOOGLE_REDIRECT_URI}`,
      step5: 'Salve as alterações e tente novamente'
    }
  });
});

// Endpoint para reset de rate limiting (apenas desenvolvimento)
router.get('/reset-limits', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Endpoint não disponível em produção'
    });
  }
  
  // Em desenvolvimento, simular reset
  res.json({
    success: true,
    message: 'Rate limits resetados para desenvolvimento',
    note: 'Configurações mais permissivas aplicadas',
    limits: {
      auth: '50 tentativas por 2 minutos',
      api: '100 requests por 15 minutos'
    }
  });
});

// Rota para iniciar autenticação Google
router.get('/google', (req, res, next) => {
  googleLogger.info('🚀 Iniciando fluxo de autenticação Google', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res, next);
});

// Callback do Google OAuth
router.get('/google/callback',
  (req, res, next) => {
    googleLogger.info('📥 Recebido callback do Google', {
      query: req.query,
      ip: req.ip,
      hasCode: !!req.query.code,
      hasError: !!req.query.error
    });
    
    if (req.query.error) {
      googleLogger.error('❌ Erro no callback do Google', {
        error: req.query.error,
        errorDescription: req.query.error_description
      });
    }
    
    next();
  },
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      googleLogger.info('🔄 Processando callback bem-sucedido do Google');
      
      // req.user contém os dados do usuário e possível status especial
      const user = req.user;
      
      googleLogger.info('👤 Dados do usuário recebidos do callback', {
        hasUser: !!user,
        email: user?.email,
        status_auth: user?.status_auth,
        ativo: user?.ativo,
        hasToken: !!user?.token
      });
      
      // Verificar se usuário tem status especial
      if (user.status_auth === 'inativo') {
        googleLogger.warn('🚫 Usuário inativo detectado, redirecionando', {
          email: user.email,
          userId: user.id
        });
        console.log(`⚠️ Redirecionando usuário inativo: ${user.email}`);
        return res.redirect('/usuario-inativo.html');
      }
      
      if (user.status_auth === 'nao_cadastrado') {
        googleLogger.warn('🚫 Usuário não cadastrado detectado, redirecionando', {
          email: user.email,
          googleId: user.google_id
        });
        console.log(`⚠️ Redirecionando usuário não cadastrado: ${user.email}`);
        return res.redirect('/usuario-nao-cadastrado.html');
      }
      
      // Usuário válido - continuar com autenticação normal
      googleLogger.info('✅ Usuário válido, gerando cookies de autenticação', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      if (!user.token || !user.refreshToken) {
        googleLogger.error('❌ Tokens não gerados para usuário válido', {
          email: user.email,
          userId: user.id,
          hasToken: !!user.token,
          hasRefreshToken: !!user.refreshToken
        });
        
        console.error('❌ Tokens não gerados para usuário válido');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=token_failed`);
      }
      
      googleLogger.debug('🍪 Configurando cookies de autenticação', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Definir cookies seguros com os tokens
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      };
      
      // Token principal (15 minutos)
      res.cookie('token', user.token, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutos
      });
      
      // Refresh token (7 dias)
      res.cookie('refreshToken', user.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      });
      
      googleLogger.info('✅ Autenticação Google concluída com sucesso', {
        userId: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?auth=success`
      });
      
      // Redirecionar para o frontend com sucesso
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/?auth=success&user=${encodeURIComponent(user.nome)}`);
      
    } catch (error) {
      googleLogger.error('❌ Erro crítico no callback do Google', {
        error: error.message,
        stack: error.stack,
        hasUser: !!req.user,
        userEmail: req.user?.email
      });
      
      console.error('❌ Erro no callback do Google:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=callback_failed`);
    }
  }
);

// Rota para refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token não fornecido'
      });
    }
    
    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Buscar usuário atualizado no banco
    const client = await pool.connect();
    const userQuery = await client.query(
      'SELECT * FROM usuarios WHERE id = $1 AND ativo = true',
      [decoded.id]
    );
    client.release();
    
    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
    }
    
    const user = userQuery.rows[0];
    
    // Gerar novos tokens
    const tokenPayload = {
      id: user.id,
      google_id: user.google_id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      ativo: user.ativo
    };
    
    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email });
    
    // Atualizar cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };
    
    res.cookie('token', newToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      message: 'Tokens renovados com sucesso',
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        foto_perfil: user.foto_perfil
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error);
    
    // Limpar cookies inválidos
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.status(401).json({
      success: false,
      message: 'Refresh token inválido'
    });
  }
});

// Rota para logout
router.post('/logout', (req, res) => {
  try {
    // Limpar cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// Rota para verificar status de autenticação
router.get('/me', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
        success: false,
        authenticated: false,
        message: 'Usuário não autenticado'
      });
    }

    const client = await pool.connect();
    const userQuery = await client.query(
      'SELECT id, email, nome, role, foto_perfil, ativo, ultimo_login FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    client.release();
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const user = userQuery.rows[0];
    
    res.json({
      success: true,
      authenticated: true,
      user: user
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// Rota para verificar se está logado (sem requirer token)
router.get('/status', (req, res) => {
  try {
    const { token } = req.cookies;
    
    if (!token) {
      return res.json({
        success: true,
        authenticated: false
      });
    }
    
    // Tentar verificar token básico
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.json({
          success: true,
          authenticated: false
        });
      }
      
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          nome: decoded.nome,
          role: decoded.role
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    res.json({
      success: true,
      authenticated: false
    });
  }
});

module.exports = {
  router,
  initializePool
};
