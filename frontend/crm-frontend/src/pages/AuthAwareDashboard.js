import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';

const AuthAwareDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    const handleAuthParams = async () => {
      const authStatus = searchParams.get('auth');
      const userName = searchParams.get('user');
      const error = searchParams.get('error');

      if (error) {
        console.error('Erro na autenticação:', error);
        navigate('/login?error=' + error, { replace: true });
        return;
      }

      if (authStatus === 'success') {
        console.log('✅ Login realizado com sucesso para:', userName);
        
        // Atualizar o status de autenticação
        await checkAuthStatus();
        
        // Limpar os parâmetros da URL
        navigate('/', { replace: true });
        
        // Mostrar mensagem de sucesso
        if (userName) {
          console.log(`🎉 Bem-vindo, ${decodeURIComponent(userName)}!`);
        }
      }
    };

    if (searchParams.has('auth') || searchParams.has('error')) {
      handleAuthParams();
    }
  }, [searchParams, navigate, checkAuthStatus]);

  return <Dashboard />;
};

export default AuthAwareDashboard;
