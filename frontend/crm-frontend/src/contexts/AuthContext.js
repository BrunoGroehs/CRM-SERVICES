import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConnection } from './ConnectionContext';

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
      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiBaseUrl}/auth/me`, {
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
    const apiBaseUrl = process.env.REACT_APP_API_URL || '';
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  const logout = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      await fetch(`${apiBaseUrl}/auth/logout`, {
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
      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
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
