import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import AuthAwareDashboard from './pages/AuthAwareDashboard';
import Clientes from './pages/Clientes';
import Servicos from './pages/Servicos';
import Recontatos from './pages/Recontatos';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Navigation />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<AuthAwareDashboard />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/servicos" element={<Servicos />} />
                    <Route path="/recontatos" element={<Recontatos />} />
                  </Routes>
                </main>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
