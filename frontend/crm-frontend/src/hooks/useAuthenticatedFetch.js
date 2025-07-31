import { useAuth } from '../contexts/AuthContext';

export const useAuthenticatedFetch = () => {
  const { refreshAuth, logout } = useAuth();

  const authenticatedFetch = async (url, options = {}) => {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      let response = await fetch(url, defaultOptions);
      
      // Se token expirou, tentar refresh
      if (response.status === 401) {
        const refreshSuccess = await refreshAuth();
        
        if (refreshSuccess) {
          // Tentar novamente com novo token
          response = await fetch(url, defaultOptions);
        } else {
          // Refresh falhou, fazer logout
          logout();
          throw new Error('Sessão expirada');
        }
      }
      
      return response;
    } catch (error) {
      console.error('Erro na requisição autenticada:', error);
      throw error;
    }
  };

  return authenticatedFetch;
};
