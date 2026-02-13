const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

// Rate limiter para rotas de autenticação - TEMPORARIAMENTE DESABILITADO PARA TESTES
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto apenas
  max: 1000, // 1000 tentativas - praticamente sem limite para testes
  message: {
    success: false,
    message: 'Rate limit atingido - isso não deveria aparecer durante testes'
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
  legacyHeaders: false,
  skipFailedRequests: false,
  keyGenerator: (req, res) => {
    const forwarded = req.get('x-forwarded-for');
    const key = req.ip || (forwarded ? forwarded.split(',')[0].trim() : req.connection?.remoteAddress);
    logger.debug('⏱️ RateLimit key', { key, ip: req.ip, ips: req.ips, xff: forwarded || null });
    return key || 'unknown';
  }
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
