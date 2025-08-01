// API utility functions
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Se não há base URL definida (produção), use caminho relativo
  if (!API_BASE_URL) {
    return `/${cleanEndpoint}`;
  }
  
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
