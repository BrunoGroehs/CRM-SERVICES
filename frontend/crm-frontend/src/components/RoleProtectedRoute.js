import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const RoleProtectedRoute = ({ children, allowedRoles = [], fallback = null }) => {
  const { user } = useAuth();

  // Se não há usuário autenticado, não renderiza nada
  if (!user) {
    return fallback || (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#666' 
      }}>
        <h3>🔒 Acesso Negado</h3>
        <p>Você precisa estar autenticado para acessar esta página.</p>
      </div>
    );
  }

  // Se o usuário não tem a role necessária, mostra mensagem de acesso negado
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return fallback || (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#666',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h3>🚫 Acesso Restrito</h3>
        <p>Você não tem permissão para acessar esta página.</p>
        <p>
          <strong>Sua role:</strong> 
          <span style={{
            padding: '4px 12px',
            marginLeft: '8px',
            borderRadius: '20px',
            backgroundColor: user.role === 'admin' ? '#dc3545' : 
                           user.role === 'manager' ? '#fd7e14' : '#28a745',
            color: 'white',
            fontSize: '0.85em',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            {user.role}
          </span>
        </p>
        <p><strong>Roles necessárias:</strong> {allowedRoles.join(', ')}</p>
      </div>
    );
  }

  // Se o usuário tem permissão, renderiza o componente
  return children;
};

export default RoleProtectedRoute;
