// API utility functions
const getBaseUrl = () => {
  // Se REACT_APP_API_URL está definida, use ela
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Em produção, use a mesma origem
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // Em desenvolvimento, use localhost:3001
  return 'http://localhost:3001';
};

const API_BASE_URL = getBaseUrl();

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Utility functions para lidar com datas e timezone
export const formatDateLocal = (date) => {
  // Formatar data considerando timezone local
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateString = (dateString) => {
  // Parse string de data evitando problemas de UTC
  // Adiciona horário meio-dia para evitar problemas de timezone
  return new Date(dateString + 'T12:00:00');
};

export const formatDateFromString = (dateString) => {
  // Para strings do banco, formatar considerando timezone local
  try {
    const date = parseDateString(dateString);
    return formatDateLocal(date);
  } catch (error) {
    console.warn('Erro ao formatar data:', dateString, error);
    return dateString;
  }
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
