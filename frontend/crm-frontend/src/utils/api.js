// API utility functions
// Detecta automaticamente a URL base da API
const getBaseUrl = () => {
  // Se estiver definido nas variáveis de ambiente, use
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Se estiver em produção (mesmo domínio), use a URL atual
  if (window.location.hostname === 'crm-services.onrender.com') {
    return window.location.origin;
  }
  
  // Para desenvolvimento local
  return 'http://localhost:3001';
};

const API_BASE_URL = getBaseUrl();

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

export const apiRequest = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, defaultOptions);
    return response;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

export default { getApiUrl, apiRequest };
