// API utility functions
// Prefer explicit env; in local dev (frontend 3000, backend 3001), default to backend port
const inferDevBase = () => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (port === '3000') {
      return `${protocol}//${hostname}:3001`;
    }
  }
  return '';
};
const rawBase = process.env.REACT_APP_API_URL || inferDevBase();
const API_BASE_URL = (rawBase || '').trim().replace(/[\s/]+$/, '');

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = (endpoint || '').trim().replace(/^\/+/, '');
  
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