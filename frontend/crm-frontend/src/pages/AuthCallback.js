import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const authStatus = searchParams.get('auth');
      const userName = searchParams.get('user');
      const error = searchParams.get('error');

      if (error) {
        console.error('Erro na autenticação:', error);
        navigate('/login?error=' + error);
        return;
      }

      if (authStatus === 'success') {
        console.log('✅ Login realizado com sucesso para:', userName);
        
        // Verificar status de autenticação para atualizar o contexto
        await checkAuthStatus();
        
        // Redirecionar para dashboard
        navigate('/', { replace: true });
      } else {
        // Se não há parâmetros de auth, redirecionar para login
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, checkAuthStatus]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '2rem',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        <h2>Finalizando login...</h2>
        <p>Aguarde enquanto configuramos sua sessão</p>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
