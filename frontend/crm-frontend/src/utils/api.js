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
