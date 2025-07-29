import React, { useState, useEffect } from 'react';
import './Clientes.css';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/clientes');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setClientes(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <h3>Carregando clientes...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">
          <h3>Erro ao carregar clientes</h3>
          <p>{error}</p>
          <button onClick={fetchClientes} className="retry-btn">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Clientes</h1>
        <p>Lista de todos os clientes cadastrados no sistema</p>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{clientes.length}</span>
          <span className="stat-label">Total de Clientes</span>
        </div>
      </div>

      {clientes.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum cliente encontrado</h3>
          <p>Não há clientes cadastrados no sistema.</p>
        </div>
      ) : (
        <div className="data-grid">
          {clientes.map((cliente) => (
            <div key={cliente.id} className="data-card">
              <div className="card-header">
                <h3>{cliente.nome}</h3>
                <span className="card-id">ID: {cliente.id}</span>
              </div>
              <div className="card-content">
                <div className="info-row">
                  <span className="info-label">📧 Email:</span>
                  <span className="info-value">{cliente.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📱 Telefone:</span>
                  <span className="info-value">{cliente.telefone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📍 Endereço:</span>
                  <span className="info-value">{cliente.endereco}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">🏙️ Cidade:</span>
                  <span className="info-value">{cliente.cidade}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📮 CEP:</span>
                  <span className="info-value">{cliente.cep}</span>
                </div>
                {cliente.criado_em && (
                  <div className="info-row">
                    <span className="info-label">📅 Cadastrado em:</span>
                    <span className="info-value">{formatDate(cliente.criado_em)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="refresh-btn" onClick={fetchClientes} disabled={loading}>
        {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
      </button>
    </div>
  );
};

export default Clientes;
