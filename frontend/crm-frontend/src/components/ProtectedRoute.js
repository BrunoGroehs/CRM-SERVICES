import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';
import '../styles/components/loading.css';

const ProtectedRoute = ({ children }) => {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Login />;
  }

  return children;
};

export default ProtectedRoute;
