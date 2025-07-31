import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Verificar status de autenticação ao carregar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl('/auth/me');
      console.log('🔍 DEBUG: Calling API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        credentials: 'include'
      });
      
      console.log('🔍 DEBUG: Response status:', response.status);
      console.log('🔍 DEBUG: Response headers:', response.headers.get('content-type'));
      
      if (response.ok) {
        const textResponse = await response.text();
        console.log('🔍 DEBUG: Raw response:', textResponse.substring(0, 200));
        
        try {
          const data = JSON.parse(textResponse);
          if (data.success) {
            setUser(data.user);
            setAuthenticated(true);
          } else {
            setUser(null);
            setAuthenticated(false);
          }
        } catch (parseError) {
          console.error('🚨 JSON Parse Error:', parseError);
          console.error('🚨 Response was:', textResponse);
          setUser(null);
          setAuthenticated(false);
        }
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirecionar para Google OAuth
    window.location.href = getApiUrl('/auth/google');
  };

  const logout = async () => {
    try {
      await fetch(getApiUrl('/auth/logout'), {
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
      const response = await fetch(getApiUrl('/auth/refresh'), {
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
      setUser(null);
      setAuthenticated(false);
      return false;
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
