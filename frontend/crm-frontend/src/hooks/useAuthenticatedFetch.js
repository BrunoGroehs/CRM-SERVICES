import { useAuth } from '../contexts/AuthContext';
import { useConnection } from '../contexts/ConnectionContext';

export const useAuthenticatedFetch = () => {
  const { refreshAuth, logout } = useAuth();
  const { reportNetworkIssue } = useConnection();

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
        
        if (refreshSuccess === 'network_error') {
          // Não conseguimos falar com o backend; acionar recuperação
          reportNetworkIssue('refresh_401');
          throw new Error('Servidor indisponível');
        } else if (refreshSuccess) {
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
  // Se for um problema de rede (TypeError: Failed to fetch) ou AbortError, sinalizar
  reportNetworkIssue('fetch_failed');
      throw error;
    }
  };

  return authenticatedFetch;
};
