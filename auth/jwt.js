const jwt = require('jsonwebtoken');

// Gerar JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
    issuer: 'crm-lavagem',
    audience: 'crm-lavagem-users'
  });
};

// Gerar Refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'crm-lavagem',
    audience: 'crm-lavagem-refresh'
  });
};

// Verificar token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'crm-lavagem',
      audience: 'crm-lavagem-users'
    });
  } catch (error) {
    throw new Error('Token inválido');
  }
};

// Verificar refresh token
const verifyRefreshToken = (refreshToken) => {
  try {
    return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'crm-lavagem',
      audience: 'crm-lavagem-refresh'
    });
  } catch (error) {
    throw new Error('Refresh token inválido');
  }
};

// Extrair payload sem verificar (para debug)
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

// Verificar se token está próximo do vencimento (últimos 5 minutos)
const isTokenExpiringSoon = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    // Se restam menos de 5 minutos (300 segundos)
    return timeUntilExpiry < 300;
  } catch (error) {
    return true;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpiringSoon
};
