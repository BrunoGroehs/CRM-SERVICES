import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConnection } from './ConnectionContext';
import { getApiUrl } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const { reportNetworkIssue } = useConnection();

  // Verificar status de autenticação ao carregar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('auth/me'), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          setAuthenticated(true);
        } else {
          setUser(null);
          setAuthenticated(false);
        }
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
  console.error('Erro ao verificar autenticação:', error);
  // Não desloga em erro de rede; apenas sinaliza e mantém estado atual
  reportNetworkIssue('auth_check_failed');
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirecionar para Google OAuth
    window.location.href = getApiUrl('auth/google');
  };

  const logout = async () => {
    try {
      await fetch(getApiUrl('auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
      
      setUser(null);
      setAuthenticated(false);
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await fetch(getApiUrl('auth/refresh'), {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setAuthenticated(true);
        return true;
      } else {
        setUser(null);
        setAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Erro ao renovar autenticação:', error);
      // Sinaliza problema de rede e não altera estado de auth
      reportNetworkIssue('auth_refresh_failed');
      return 'network_error';
    }
  };

  const value = {
    user,
    loading,
    authenticated,
    login,
    logout,
    refreshAuth,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
