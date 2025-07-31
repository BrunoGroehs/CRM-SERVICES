import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';

const ProtectedRoute = ({ children }) => {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login />;
  }

  return children;
};

export default ProtectedRoute;
