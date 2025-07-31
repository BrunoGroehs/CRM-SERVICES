const jwt = require('jsonwebtoken');
const { ROLES, hasPermission, isValidRole } = require('../config/roles');

// Middleware de autenticação JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    const cookieToken = req.cookies?.token; // Token via cookie
    
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }

      req.user = user;
      next();
    });

  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
};

// Middleware para verificar se usuário está ativo
const checkActiveUser = async (req, res, next) => {
  try {
    if (!req.user.ativo) {
      return res.status(403).json({
        success: false,
        message: 'Usuário inativo'
      });
    }
    next();
  } catch (error) {
    console.error('Erro ao verificar usuário ativo:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
};

// Middleware para verificar roles
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user.role || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permissão insuficiente'
        });
      }
      next();
    } catch (error) {
      console.error('Erro ao verificar role:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  };
};

// Middleware para verificar permissões específicas
const checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user.role || !hasPermission(req.user.role, permission)) {
        return res.status(403).json({
          success: false,
          message: 'Permissão insuficiente para esta operação'
        });
      }
      next();
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  };
};

// Middleware para verificar se é administrador
const requireAdmin = checkRole([ROLES.ADMIN]);

// Middleware para verificar se é administrador ou gerente
const requireManagerOrAdmin = checkRole([ROLES.ADMIN, ROLES.MANAGER]);

// Middleware para verificar qualquer usuário autenticado
const requireAnyRole = checkRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.USER]);

// Middleware opcional - não bloqueia se não houver token
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.token;
    
    const token = headerToken || cookieToken;

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = user;
      }
      next();
    });

  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  checkActiveUser,
  checkRole,
  checkPermission,
  requireAdmin,
  requireManagerOrAdmin,
  requireAnyRole,
  optionalAuth
};
