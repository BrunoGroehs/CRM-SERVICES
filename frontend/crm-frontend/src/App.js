import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import Navigation from './components/Navigation';
import AuthAwareDashboard from './pages/AuthAwareDashboard';
import Clientes from './pages/Clientes';
import Servicos from './pages/Servicos';
import Recontatos from './pages/Recontatos';
import Calendario from './pages/Calendario';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import ConnectionBanner from './components/ConnectionBanner';
import DespesasPagamentos from './pages/DespesasPagamentos';
import './App.css';
import './styles/tokens.css';
import './styles/global.css';

function App() {
  return (
    <ToastProvider>
      <ConnectionProvider>
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <Navigation />
                    <ConnectionBanner />
                    <main className="main-content">
                      <Routes>
                        <Route path="/" element={<AuthAwareDashboard />} />
                        <Route path="/clientes" element={<Clientes />} />
                        <Route path="/servicos" element={<Servicos />} />
                        <Route path="/recontatos" element={<Recontatos />} />
                        <Route path="/calendario" element={<Calendario />} />
                        <Route path="/financeiro" element={<DespesasPagamentos />} />
                        <Route path="/admin" element={
                          <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
                            <AdminPanel />
                          </RoleProtectedRoute>
                        } />
                      </Routes>
                    </main>
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ConnectionProvider>
    </ToastProvider>
  );
}

export default App;
