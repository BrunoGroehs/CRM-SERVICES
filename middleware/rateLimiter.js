const rateLimit = require('express-rate-limit');

// Rate limiter para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 2 * 60 * 1000, // 5 min (prod) / 2 min (dev)
  max: process.env.DISABLE_RATE_LIMIT === 'true' ? 1000 : 
       (process.env.NODE_ENV === 'production' ? 20 : 50), // Controle por env var
  message: {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Muitas tentativas de login. Tente novamente em 5 minutos.'
      : 'Muitas tentativas de login. Tente novamente em 2 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Aplicar apenas para rotas específicas
  skip: (req) => {
    // Não aplicar rate limit para logout e em desenvolvimento local
    return req.path === '/auth/logout' || 
           (process.env.NODE_ENV !== 'production' && req.ip === '::1') ||
           (process.env.NODE_ENV !== 'production' && req.ip === '127.0.0.1');
  }
});

// Rate limiter geral para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter mais restritivo para operações sensíveis
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // máximo 10 requests por IP
  message: {
    success: false,
    message: 'Muitas operações sensíveis. Tente novamente em 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter
};
