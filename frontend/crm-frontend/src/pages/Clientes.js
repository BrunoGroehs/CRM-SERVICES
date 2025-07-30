import React, { useState, useEffect } from 'react';
import './Clientes.css';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    cep: '',
    indicacao: ''
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const isEditing = editingCliente && editingCliente.id;

    try {
      const url = isEditing 
        ? `http://localhost:3000/clientes/${editingCliente.id}`
        : 'http://localhost:3000/clientes';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Atualizar a lista de clientes
      await fetchClientes();
      
      // Limpar formulário e fechar modal
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        endereco: '',
        cidade: '',
        cep: '',
        indicacao: ''
      });
      setEditingCliente(null);
      setShowModal(false);
      
    } catch (err) {
      console.error(isEditing ? 'Erro ao editar cliente:' : 'Erro ao cadastrar cliente:', err);
      alert(`Erro ao ${isEditing ? 'editar' : 'cadastrar'} cliente: ` + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setEditingCliente(null);
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      cidade: '',
      cep: '',
      indicacao: ''
    });
    setShowModal(true);
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      cep: cliente.cep || '',
      indicacao: cliente.indicacao || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      cidade: '',
      cep: '',
      indicacao: ''
    });
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
        <button className="add-btn" onClick={openModal}>
          ➕ CLIENTE +
        </button>
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
                  <span className="info-value">{cliente.email || 'Não informado'}</span>
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
                {cliente.indicacao && (
                  <div className="info-row">
                    <span className="info-label">👥 Indicação:</span>
                    <span className="info-value">{cliente.indicacao}</span>
                  </div>
                )}
                {cliente.criado_em && (
                  <div className="info-row">
                    <span className="info-label">📅 Cadastrado em:</span>
                    <span className="info-value">{formatDate(cliente.criado_em)}</span>
                  </div>
                )}
              </div>
              <div className="card-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(cliente)}
                  title="Editar cliente"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="refresh-btn" onClick={fetchClientes} disabled={loading}>
        {loading ? '🔄 Atualizando...' : '🔄 Atualizar Lista'}
      </button>

      {/* Modal para cadastro de cliente */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCliente ? '✏️ Editar Cliente' : '➕ Cadastrar Novo Cliente'}</h2>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="cliente-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nome">Nome Completo *</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefone">Telefone *</label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    required
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cidade">Cidade *</label>
                  <input
                    type="text"
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                    placeholder="Nome da cidade"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="endereco">Endereço</label>
                  <input
                    type="text"
                    id="endereco"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cep">CEP</label>
                  <input
                    type="text"
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="indicacao">👥 Indicação</label>
                  <input
                    type="text"
                    id="indicacao"
                    name="indicacao"
                    value={formData.indicacao}
                    onChange={handleInputChange}
                    placeholder="Quem indicou este cliente?"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  ❌ Cancelar
                </button>
                <button type="submit" disabled={submitting} className="submit-btn">
                  {submitting 
                    ? '⏳ Salvando...' 
                    : editingCliente 
                      ? '💾 Salvar Alterações' 
                      : '✅ Salvar Cliente'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
