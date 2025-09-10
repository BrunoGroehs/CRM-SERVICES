import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import './Recontatos.css';
import { getApiUrl } from '../utils/api';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

const Recontatos = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [recontatos, setRecontatos] = useState([]);
  const [filteredRecontatos, setFilteredRecontatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  
  // Estados para paginação e busca
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;
  
  // Estados dos modais
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showServicoModal, setShowServicoModal] = useState(false);
  const [showProrrogarModal, setShowProrrogarModal] = useState(false);
  const [showProximoRecontatoModal, setShowProximoRecontatoModal] = useState(false);
  const [recontatoParaProrrogar, setRecontatoParaProrrogar] = useState(null);
  const [servicoCriado, setServicoCriado] = useState(null);
  const [recontatoParaEditar, setRecontatoParaEditar] = useState(null);
  
  // Estados para menu de ações por linha
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  
  const authenticatedFetch = useAuthenticatedFetch();
  const { add: pushToast } = useToast();
  const [proximoRecontatoData, setProximoRecontatoData] = useState({
    periodo: '',
    data_personalizada: '',
    motivo: '',
    observacoes: ''
  });
  const [prorrogacaoTempo, setProrrogacaoTempo] = useState({ tipo: 'dias', quantidade: 7 });
  const [clientes, setClientes] = useState([]);
  const [novoRecontatoData, setNovoRecontatoData] = useState({
    cliente_id: '',
    data_agendada: '',
    hora_agendada: '',
    tipo_recontato: 'follow-up',
    motivo: '',
    status: 'agendado',
    observacoes: '',
    funcionario_responsavel: ''
  });
  const [formData, setFormData] = useState({
    cliente_id: '',
    data: '',
    hora: '',
    valor: '',
    notas: '',
    status: 'agendado',
    funcionario_responsavel: [], // agora array de IDs
  });
  const [usuarios, setUsuarios] = useState([]); // usuários para seleção de responsáveis
  const [formErrors, setFormErrors] = useState({});
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [clientePreSelecionado, setClientePreSelecionado] = useState(null);
  const [servicosHistorico, setServicosHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [recontatoParaDeletar, setRecontatoParaDeletar] = useState(null);

  // Carregar usuários para seleção de responsáveis de serviço
  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      // Preferir endpoint público mínimo, com fallback para admin
      let response = await authenticatedFetch(getApiUrl('usuarios/min'));
      if (response.ok) {
        const data = await response.json();
        const arr = data.data || data.users || data;
        const mapped = Array.isArray(arr) ? arr.map(u => ({ id: u.id, nome: u.nome })) : [];
        setUsuarios(mapped);
        return;
      }
      response = await authenticatedFetch(getApiUrl('admin/users'));
      if (response.ok) {
        const data = await response.json();
        const arr = data.users || data.data || data;
        const mapped = Array.isArray(arr) ? arr.map(u => ({ id: u.id, nome: u.nome })) : [];
        setUsuarios(mapped);
      } else {
        setUsuarios([]);
      }
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
      setUsuarios([]);
    }
  };

  // Função para determinar o status do recontato
  const getStatusInfo = (recontato) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataAgendada = new Date(recontato.data_agendada);
    dataAgendada.setHours(0, 0, 0, 0);
    
    // Removido o status "realizado" - não existe mais
    
    if (dataAgendada < hoje) {
      return { status: 'atrasado', label: 'Atrasado', class: 'atrasado' };
    }
    
    if (dataAgendada.getTime() === hoje.getTime()) {
      return { status: 'hoje', label: 'Hoje', class: 'hoje' };
    }

    // Próximos 7 dias
    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() + 7);
    
    if (dataAgendada <= seteDias) {
      return { status: 'proximos', label: 'Próximos 7 dias', class: 'proximos' };
    }
    
    // Se não está atrasado, não é hoje, nem próximos 7 dias = longe demais
    return { status: 'longe', label: 'Longe demais para se preocupar', class: 'longe' };
  };

  // Função para aplicar filtros
  const applyFilter = useCallback(() => {
    let filtered = recontatos;
    
    // Aplicar filtro de status primeiro
    switch (activeFilter) {
      case 'atrasados':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'atrasado');
        break;
      case 'hoje':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'hoje');
        break;
      case 'proximos':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'proximos');
        break;
      case 'longe':
        filtered = recontatos.filter(r => getStatusInfo(r).status === 'longe');
        break;
      default:
        filtered = recontatos;
    }
    
    // Aplicar busca por texto
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(recontato => {
        const cliente = clientes.find(c => c.id === recontato.cliente_id);
        return (
          recontato.id?.toString().includes(searchLower) ||
          cliente?.nome?.toLowerCase().includes(searchLower) ||
          cliente?.cidade?.toLowerCase().includes(searchLower) ||
          recontato.observacoes?.toLowerCase().includes(searchLower) ||
          formatDate(recontato.data_agendada).includes(searchLower) ||
          getStatusInfo(recontato).label.toLowerCase().includes(searchLower)
        );
      });
    }
    
    setFilteredRecontatos(filtered);
  }, [recontatos, activeFilter, searchTerm, clientes]);

  // Funções de paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecontatos = filteredRecontatos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecontatos.length / itemsPerPage);

  // Resetar página quando filtro ou busca muda
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Função para abrir menu de ações
  const handleRowClick = (recontato, event) => {
    event.stopPropagation();
    setShowActionsMenu(showActionsMenu === recontato.id ? null : recontato.id);
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchRecontatos();
    fetchClientes();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const fetchRecontatos = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(getApiUrl('recontatos'));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRecontatos(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar recontatos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de próximo recontato quando vier da criação de serviço
  useEffect(() => {
    const state = location.state;
    if (state && state.triggerProximoRecontato && state.clienteId) {
      // Guardar info mínima para o submit
      setServicoCriado({ cliente_id: state.clienteId });
      setShowProximoRecontatoModal(true);
      // Limpar o state de navegação para evitar reabrir no back/refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const fetchServicosHistorico = async (clienteId) => {
    console.log('Carregando histórico para cliente:', clienteId);
    try {
      setLoadingHistorico(true);
      const response = await authenticatedFetch(getApiUrl(`servicos/cliente/${clienteId}`));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Histórico carregado:', data);
      setServicosHistorico(data.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setServicosHistorico([]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await authenticatedFetch(getApiUrl('clientes'));
      if (response.ok) {
        const data = await response.json();
        // Ordenar clientes alfabeticamente por nome
        const clientesOrdenados = (data.data || []).sort((a, b) => 
          a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        );
        setClientes(clientesOrdenados);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  // Função para criar novo recontato
  const handleSubmitNovoRecontato = async (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!novoRecontatoData.cliente_id) {
  pushToast('Selecione um cliente.', { type: 'warning' });
      return;
    }
    
    if (!novoRecontatoData.data_agendada) {
  pushToast('Informe a data do recontato.', { type: 'warning' });
      return;
    }
    
    if (!novoRecontatoData.motivo.trim()) {
  pushToast('Informe o motivo do recontato.', { type: 'warning' });
      return;
    }
    
    try {
      const response = await authenticatedFetch(getApiUrl('recontatos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoRecontatoData)
      });

      if (response.ok) {
        const result = await response.json();
  pushToast('Recontato criado com sucesso!', { type: 'success' });
        setShowAddModal(false);
        setNovoRecontatoData({
          cliente_id: '',
          data_agendada: '',
          hora_agendada: '',
          tipo_recontato: 'follow-up',
          motivo: '',
          status: 'agendado',
          observacoes: '',
          funcionario_responsavel: ''
        });
        fetchRecontatos(); // Atualiza a lista
      } else {
        const error = await response.json();
  pushToast('Erro ao criar recontato: ' + (error.message || 'Erro desconhecido'), { type: 'error' });
      }
    } catch (err) {
      console.error('Erro ao criar recontato:', err);
  pushToast('Erro ao criar recontato: ' + err.message, { type: 'error' });
    }
  };

  // Função para editar recontato
  const handleSubmitEditarRecontato = async (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!recontatoParaEditar.data_agendada) {
  pushToast('Informe a data do recontato.', { type: 'warning' });
      return;
    }
    
    if (!recontatoParaEditar.motivo.trim()) {
  pushToast('Informe o motivo do recontato.', { type: 'warning' });
      return;
    }

    try {
      const response = await authenticatedFetch(getApiUrl(`recontatos/${recontatoParaEditar.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_agendada: recontatoParaEditar.data_agendada,
          hora_agendada: recontatoParaEditar.hora_agendada,
          motivo: recontatoParaEditar.motivo,
          observacoes: recontatoParaEditar.observacoes
        })
      });

      if (response.ok) {
  pushToast('Recontato atualizado com sucesso!', { type: 'success' });
        setShowEditModal(false);
        setRecontatoParaEditar(null);
        fetchRecontatos(); // Atualiza a lista
      } else {
        const error = await response.json();
  pushToast('Erro ao atualizar recontato: ' + (error.message || 'Erro desconhecido'), { type: 'error' });
      }
    } catch (err) {
      console.error('Erro ao atualizar recontato:', err);
  pushToast('Erro ao atualizar recontato: ' + err.message, { type: 'error' });
    }
  };

  // Funções do modal de serviço
  const handleCriarServico = (recontato) => {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    
    setFormData({
      cliente_id: recontato.cliente_id,
      data: dataFormatada,
      hora: '09:00',
      valor: '',
      notas: `Recontato realizado - ${recontato.observacoes || ''}`,
      status: 'agendado',
      funcionario_responsavel: ''
    });
    setFormErrors({});
    
    // Buscar histórico do cliente automaticamente
    if (recontato.cliente_id) {
      fetchServicosHistorico(recontato.cliente_id);
    }
    
    setShowServicoModal(true);
  };

  const handleCloseServicoModal = () => {
    setShowServicoModal(false);
    setClientePreSelecionado(null);
    setServicosHistorico([]);
    setFormData({
      cliente_id: '',
      data: '',
      hora: '',
      valor: '',
      notas: '',
      status: 'agendado',
      funcionario_responsavel: ''
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Se o cliente foi alterado, buscar histórico de serviços
    if (name === 'cliente_id' && value) {
      fetchServicosHistorico(value);
    } else if (name === 'cliente_id' && !value) {
      setServicosHistorico([]);
    }
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.cliente_id) {
      errors.cliente_id = 'Cliente é obrigatório';
    }
    
    if (!formData.data) {
      errors.data = 'Data é obrigatória';
    }
    
    if (!formData.hora) {
      errors.hora = 'Hora é obrigatória';
    }
    
    if (formData.valor && isNaN(formData.valor)) {
      errors.valor = 'Valor deve ser um número válido';
    }
    
    return errors;
  };

  const handleSubmitServico = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const dataToSend = { ...formData };
      if (Array.isArray(dataToSend.funcionario_responsavel)) {
        dataToSend.funcionario_responsavel = dataToSend.funcionario_responsavel.map(id => String(id));
      }
      const response = await authenticatedFetch(getApiUrl('servicos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar serviço');
      }

      const servicoResult = await response.json();
      
      // Armazenar informações do serviço criado e do cliente
      const clienteInfo = clientes.find(c => c.id === formData.cliente_id);
      setServicoCriado({
        ...servicoResult,
        cliente_nome: clienteInfo?.nome || 'Cliente',
        cliente_id: formData.cliente_id
      });

  pushToast('Serviço criado com sucesso!', { type: 'success' });
      handleCloseServicoModal();
      
      // Abrir modal para próximo recontato
      setShowProximoRecontatoModal(true);
      
    } catch (err) {
      console.error('Erro ao criar serviço:', err);
      setFormErrors({ submit: err.message });
    }
  };

  // Função auxiliar para formatar datas corretamente
  const formatDateSafe = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      // Se for uma string de data ISO, converter
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Erro na data';
    }
  };

  // Funções para prorrogação
  const handleProrrogar = (recontato) => {
    console.log('Recontato selecionado para prorrogação:', recontato);
    console.log('Data do recontato:', recontato.data_agendada);
    
    setRecontatoParaProrrogar(recontato);
    setProrrogacaoTempo({ tipo: 'dias', quantidade: 7 });
    setShowProrrogarModal(true);
  };

  const handleCloseProrrogarModal = () => {
    setShowProrrogarModal(false);
    setRecontatoParaProrrogar(null);
    setProrrogacaoTempo({ tipo: 'dias', quantidade: 7 });
  };

  const handleProrrogacaoChange = (campo, valor) => {
    setProrrogacaoTempo(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const calcularNovaData = () => {
    if (!recontatoParaProrrogar) return null;
    
    try {
      // Criar data a partir da string ISO
      const dataAtual = new Date(recontatoParaProrrogar.data_agendada);
      
      // Verificar se a data é válida
      if (isNaN(dataAtual.getTime())) {
        console.error('Data inválida:', recontatoParaProrrogar.data_agendada);
        return null;
      }
      
      const novaData = new Date(dataAtual);
      const quantidade = parseInt(prorrogacaoTempo.quantidade);
      
      if (isNaN(quantidade) || quantidade <= 0) {
        return null;
      }
      
      switch (prorrogacaoTempo.tipo) {
        case 'dias':
          novaData.setDate(novaData.getDate() + quantidade);
          break;
        case 'semanas':
          novaData.setDate(novaData.getDate() + (quantidade * 7));
          break;
        case 'meses':
          novaData.setMonth(novaData.getMonth() + quantidade);
          break;
        default:
          return null;
      }
      
      return novaData;
    } catch (error) {
      console.error('Erro ao calcular nova data:', error);
      return null;
    }
  };

  const confirmarProrrogacao = async () => {
    if (!recontatoParaProrrogar) return;
    
    try {
      const novaData = calcularNovaData();
      
      if (!novaData) {
  pushToast('Falha ao calcular a nova data, verifique os valores.', { type: 'error' });
        return;
      }
      
      const dataFormatada = novaData.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log('Enviando prorrogação:', {
        id: recontatoParaProrrogar.id,
        data_antiga: recontatoParaProrrogar.data_agendada,
        data_nova: dataFormatada
      });
      
      const response = await authenticatedFetch(getApiUrl(`recontatos/${recontatoParaProrrogar.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_agendada: dataFormatada,
          status: 'agendado' // Resetar status para agendado (status válido)
        }),
      });

      if (!response.ok) {
        // Tentar obter detalhes do erro
        let errorMessage = 'Erro ao prorrogar recontato';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Erro ao parsear resposta de erro:', parseError);
        }
        throw new Error(errorMessage);
      }

  pushToast(`Recontato prorrogado para ${formatDateSafe(novaData.toISOString())}!`, { type: 'success' });
      handleCloseProrrogarModal();
      await fetchRecontatos(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao prorrogar recontato:', err);
  pushToast(`Erro ao prorrogar recontato: ${err.message}`, { type: 'error' });
    }
  };

  // Funções para próximo recontato
  const getProximoRecontatoOptions = () => {
    const hoje = new Date();
    const options = [];
    
    // 6 meses
    const seisMeses = new Date(hoje);
    seisMeses.setMonth(hoje.getMonth() + 6);
    options.push({
      label: '6 Meses',
      value: '6_meses',
      data: seisMeses.toISOString().split('T')[0],
      description: seisMeses.toLocaleDateString('pt-BR')
    });
    
    // 1 ano
    const umAno = new Date(hoje);
    umAno.setFullYear(hoje.getFullYear() + 1);
    options.push({
      label: '1 Ano',
      value: '1_ano',
      data: umAno.toISOString().split('T')[0],
      description: umAno.toLocaleDateString('pt-BR')
    });
    
    // 1 ano e meio
    const umAnoEMeio = new Date(hoje);
    umAnoEMeio.setMonth(hoje.getMonth() + 18);
    options.push({
      label: '1 Ano e Meio',
      value: '1_ano_meio',
      data: umAnoEMeio.toISOString().split('T')[0],
      description: umAnoEMeio.toLocaleDateString('pt-BR')
    });
    
    return options;
  };

  const handleProximoRecontatoOptionClick = (option) => {
    setProximoRecontatoData(prev => ({
      ...prev,
      periodo: option.value,
      data_personalizada: option.data
    }));
  };

  const handleProximoRecontatoInputChange = (e) => {
    const { name, value } = e.target;
    setProximoRecontatoData(prev => ({
      ...prev,
      [name]: value,
      // Se escolher data personalizada, limpar período pré-definido
      ...(name === 'data_personalizada' ? { periodo: 'personalizada' } : {})
    }));
  };

  const handleSubmitProximoRecontato = async (e) => {
    e.preventDefault();

    if (!servicoCriado) {
  pushToast('Erro: informações do serviço não encontradas', { type: 'error' });
      return;
    }

    try {
      const dataRecontato = proximoRecontatoData.data_personalizada;
      
      if (!dataRecontato) {
  pushToast('Selecione uma data para o próximo recontato', { type: 'warning' });
        return;
      }

      if (!proximoRecontatoData.motivo.trim()) {
  pushToast('Informe o motivo do recontato', { type: 'warning' });
        return;
      }

      // Encontrar o recontato atual do cliente para atualizar
      const recontatoAtual = recontatos.find(r => r.cliente_id === servicoCriado.cliente_id);
      let response;
      if (recontatoAtual) {
        // Atualiza o existente
        response = await authenticatedFetch(getApiUrl(`recontatos/${recontatoAtual.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data_agendada: dataRecontato,
            motivo: proximoRecontatoData.motivo,
            observacoes: proximoRecontatoData.observacoes,
            status: 'agendado'
          })
        });
      } else {
        // Cria um novo recontato caso não exista
        response = await authenticatedFetch(getApiUrl('recontatos'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: servicoCriado.cliente_id,
            data_agendada: dataRecontato,
            motivo: proximoRecontatoData.motivo,
            observacoes: proximoRecontatoData.observacoes,
            status: 'agendado'
          })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

  pushToast('Recontato reagendado com sucesso!', { type: 'success' });
      handleCloseProximoRecontatoModal();
      await fetchRecontatos(); // Recarregar lista
      
    } catch (err) {
      console.error('Erro ao reagendar recontato:', err);
  pushToast('Erro ao reagendar recontato: ' + err.message, { type: 'error' });
    }
  };

  const handleCloseProximoRecontatoModal = () => {
    setShowProximoRecontatoModal(false);
    setServicoCriado(null);
    setProximoRecontatoData({
      periodo: '',
      data_personalizada: '',
      motivo: '',
      observacoes: ''
    });
  };

  const handleSkipProximoRecontato = () => {
  pushToast('Serviço criado com sucesso! Recontato não foi reagendado.', { type: 'success' });
    handleCloseProximoRecontatoModal();
  };

  const askDeleteRecontato = (recontato) => {
    setRecontatoParaDeletar(recontato);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteRecontato = async () => {
    if (!recontatoParaDeletar) return;
    try {
      const response = await authenticatedFetch(getApiUrl(`recontatos/${recontatoParaDeletar.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      pushToast('Recontato deletado com sucesso!', { type: 'success' });
      handleCloseModal();
      await fetchRecontatos();
    } catch (err) {
      console.error('Erro ao deletar recontato:', err);
      pushToast('Erro ao deletar recontato: ' + err.message, { type: 'error' });
    } finally {
      setConfirmDeleteOpen(false);
      setRecontatoParaDeletar(null);
    }
  };

  const cancelDeleteRecontato = () => {
    setConfirmDeleteOpen(false);
    setRecontatoParaDeletar(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Erro na data';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStats = () => {
    const stats = {
      total: recontatos.length,
      atrasados: 0,
      hoje: 0,
      proximos: 0,
      longe: 0
    };

    recontatos.forEach(recontato => {
      const statusInfo = getStatusInfo(recontato);
      switch (statusInfo.status) {
        case 'atrasado':
          stats.atrasados++;
          break;
        case 'hoje':
          stats.hoje++;
          break;
        case 'proximos':
          stats.proximos++;
          break;
        case 'longe':
          stats.longe++;
          break;
        default:
          break;
      }
    });

    return stats;
  };

  const handleContatar = (recontato) => {
    // Abrir WhatsApp ou telefone
    const phone = recontato.cliente_telefone.replace(/\D/g, '');
    const message = `Olá ${recontato.cliente_nome}, estou entrando em contato conforme agendado. Como posso ajudá-lo?`;
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleVerDetalhes = async (recontato) => {
    setSelectedCliente(recontato);
    setShowModal(true);
    await fetchServicosHistorico(recontato.cliente_id);
  };

  const handleEditarRecontato = (recontato) => {
    const cliente = clientes.find(c => c.id === recontato.cliente_id);
    
    // Formatar a data para o formato YYYY-MM-DD
    const dataFormatada = new Date(recontato.data_agendada).toISOString().split('T')[0];
    
    setRecontatoParaEditar({
      id: recontato.id,
      cliente_id: recontato.cliente_id,
      clienteNome: cliente?.nome || `Cliente #${recontato.cliente_id}`,
      data_agendada: dataFormatada,
      hora_agendada: recontato.hora_agendada || '',
      motivo: recontato.motivo || '',
      observacoes: recontato.observacoes || ''
    });
    
    setShowEditModal(true);
  };

  const handleAgendarServico = async (recontato) => {
    // Abrir modal de serviço com cliente pré-selecionado e bloqueado
    setFormData({
      cliente_id: recontato.cliente_id,
      data: '',
      hora: '',
      valor: '',
      status: 'agendado',
      notas: '',
  funcionario_responsavel: []
    });
    
    // Pré-selecionar e bloquear o cliente
    setClientePreSelecionado({
      id: recontato.cliente_id,
      nome: recontato.cliente_nome
    });
    
    // Carregar histórico de serviços do cliente
    await fetchServicosHistorico(recontato.cliente_id);
    
    setShowServicoModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCliente(null);
    setServicosHistorico([]);
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <h3>Carregando recontatos...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">
          <h3>Erro ao carregar recontatos</h3>
          <p>{error}</p>
          <button onClick={fetchRecontatos} className="retry-btn">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>📞 Recontatos</h1>
          <p>Lista de todos os recontatos agendados no sistema</p>
        </div>
        <button className="modern-add-btn" onClick={() => setShowAddModal(true)}>
          <span className="btn-icon">+</span>
          <span className="btn-text">Adicionar Recontato</span>
        </button>
      </div>

      <div className="stats-bar recontatos-stats">
        <div 
          className={`stat-item ${activeFilter === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveFilter('todos')}
        >
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Todos</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'atrasados' ? 'active' : ''}`}
          onClick={() => setActiveFilter('atrasados')}
        >
          <span className="stat-value stat-danger">{stats.atrasados}</span>
          <span className="stat-label">Atrasados</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'hoje' ? 'active' : ''}`}
          onClick={() => setActiveFilter('hoje')}
        >
          <span className="stat-value stat-warning">{stats.hoje}</span>
          <span className="stat-label">Hoje</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'proximos' ? 'active' : ''}`}
          onClick={() => setActiveFilter('proximos')}
        >
          <span className="stat-value stat-info">{stats.proximos}</span>
          <span className="stat-label">Próximos 7 dias</span>
        </div>
        <div 
          className={`stat-item ${activeFilter === 'longe' ? 'active' : ''}`}
          onClick={() => setActiveFilter('longe')}
        >
          <span className="stat-value stat-secondary">{stats.longe}</span>
          <span className="stat-label">Longe demais</span>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="search-bar">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Pesquisar por ID, cliente, cidade, observações, data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredRecontatos.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum recontato encontrado</h3>
          <p>
            {searchTerm 
              ? 'Nenhum recontato corresponde à sua busca.' 
              : `Não há recontatos ${activeFilter === 'todos' ? 'cadastrados' : `na categoria "${activeFilter}"`} no sistema.`
            }
          </p>
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tabela de Recontatos */}
          <div className="table-container">
            <table className="recontatos-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Data Recontato</th>
                  <th>Motivo</th>
                  <th className="observacoes-col">Observações</th>
                </tr>
              </thead>
              <tbody>
                {currentRecontatos.map((recontato) => {
                  const statusInfo = getStatusInfo(recontato);
                  const cliente = clientes.find(c => c.id === recontato.cliente_id);
                  
                  return (
                    <tr 
                      key={recontato.id} 
                      className={`recontato-row ${statusInfo.class}`}
                      onClick={(e) => handleRowClick(recontato, e)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <td className="id-cell">{recontato.id}</td>
                      <td className="nome-cell">
                        <strong>{cliente?.nome || `Cliente #${recontato.cliente_id}`}</strong>
                      </td>
                      <td className="telefone-cell">
                        {cliente?.telefone || 'N/A'}
                      </td>
                      <td className="data-cell">
                        <div className="data-info">
                          <span className="data">{formatDate(recontato.data_agendada)}</span>
                          {recontato.hora_agendada && (
                            <span className="hora">{formatTime(recontato.hora_agendada)}</span>
                          )}
                        </div>
                      </td>
                      <td className="motivo-cell">
                        {recontato.motivo || 'N/A'}
                      </td>
                      <td className="observacoes-cell" title={recontato.observacoes || 'Sem observações'}>
                        <span className="observacoes-text">
                          {recontato.observacoes ? 
                            (recontato.observacoes.length > 50 ? 
                              `${recontato.observacoes.substring(0, 50)}...` : 
                              recontato.observacoes
                            ) : 
                            'Sem observações'
                          }
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Menu de ações posicionado fora da tabela */}
            {showActionsMenu && (
              <div className="actions-menu-overlay" onClick={() => setShowActionsMenu(null)}>
                <div className="actions-menu" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const recontato = currentRecontatos.find(r => r.id === showActionsMenu);
                    const cliente = clientes.find(c => c.id === recontato?.cliente_id);
                    return (
                      <>
                        <div className="actions-menu-header">
                          <div className="cliente-info-header">
                            <h3 className="cliente-name">{cliente?.nome || `Cliente #${recontato?.cliente_id}`}</h3>
                            <span className="recontato-date">Recontato: {formatDate(recontato?.data_agendada)}</span>
                          </div>
                          <button 
                            className="close-actions-btn" 
                            onClick={() => setShowActionsMenu(null)}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="actions-dropdown">
                          <button 
                            className="action-btn contatar-btn"
                            onClick={() => {
                              setShowActionsMenu(null);
                              handleContatar(recontato);
                            }}
                          >
                            📞 Contatar
                          </button>
                          
                          <button 
                            className="action-btn servico-btn"
                            onClick={() => {
                              setShowActionsMenu(null);
                              handleAgendarServico(recontato);
                            }}
                          >
                            🛠️ Agendar Serviço
                          </button>
                          
                          <button 
                            className="action-btn prorrogar-btn"
                            onClick={() => {
                              setShowActionsMenu(null);
                              handleProrrogar(recontato);
                            }}
                          >
                            ⏳ Prorrogar
                          </button>
                          
                          <button 
                            className="action-btn detalhes-btn"
                            onClick={() => {
                              setShowActionsMenu(null);
                              handleVerDetalhes(recontato);
                            }}
                          >
                            📋 Ver Detalhes
                          </button>
                          
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => {
                              setShowActionsMenu(null);
                              handleEditarRecontato(recontato);
                            }}
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Controles de Paginação */}
          <div className="pagination-container">
            <div className="pagination-info">
              Exibindo {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredRecontatos.length)} de {filteredRecontatos.length} recontatos
              {activeFilter !== 'todos' && ` (filtro: ${activeFilter})`}
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Anterior
              </button>
              
              <div className="pagination-pages">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      className={`pagination-page ${currentPage === pageNumber ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próximo →
              </button>
            </div>
          </div>
        </>
      )}

      <button className="refresh-btn" onClick={fetchRecontatos} disabled={loading}>
        <span className="refresh-icon">↻</span>
        <span className="refresh-text">{loading ? ' Atualizando...' : ' Atualizar Lista'}</span>
      </button>

      {/* Modal de Criação de Recontato */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div 
            className="modal-shell modal-lg" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Criar novo recontato"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📞 Novo Recontato</h2>
              <button className="modal-btn icon" onClick={() => setShowAddModal(false)} aria-label="Fechar modal de novo recontato">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-form-section">
                <form onSubmit={handleSubmitNovoRecontato} className="modal-form">
                  {/* CLIENTE */}
                  <div className="form-group">
                    <label htmlFor="cliente_id">Cliente *</label>
                    <select
                      id="cliente_id"
                      value={novoRecontatoData.cliente_id}
                      onChange={(e) => setNovoRecontatoData(prev => ({ ...prev, cliente_id: e.target.value }))}
                      required
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} - {cliente.telefone}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DATA E HORA */}
                  <div className="form-group-row-horizontal">
                    <div className="form-group">
                      <label htmlFor="data_agendada">Data *</label>
                      <input
                        type="date"
                        id="data_agendada"
                        value={novoRecontatoData.data_agendada}
                        onChange={(e) => setNovoRecontatoData(prev => ({ ...prev, data_agendada: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="hora_agendada">Hora</label>
                      <input
                        type="time"
                        id="hora_agendada"
                        value={novoRecontatoData.hora_agendada}
                        onChange={(e) => setNovoRecontatoData(prev => ({ ...prev, hora_agendada: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* TIPO E STATUS */}
                  <div className="form-group-row-horizontal">
                    <div className="form-group">
                      <label htmlFor="tipo_recontato">Tipo</label>
                      <select
                        id="tipo_recontato"
                        value={novoRecontatoData.tipo_recontato}
                        onChange={(e) => setNovoRecontatoData(prev => ({ ...prev, tipo_recontato: e.target.value }))}
                      >
                        <option value="follow-up">Follow-up</option>
                        <option value="vendas">Vendas</option>
                        <option value="suporte">Suporte</option>
                        <option value="agendamento">Agendamento</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="status">Status</label>
                      <select
                        id="status"
                        value={novoRecontatoData.status}
                        onChange={(e) => setNovoRecontatoData(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="agendado">Agendado</option>
                        <option value="realizado">Realizado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="reagendado">Reagendado</option>
                      </select>
                    </div>
                  </div>

                  {/* MOTIVO */}
                  <div className="form-group">
                    <label htmlFor="motivo">Motivo *</label>
                    <input
                      type="text"
                      id="motivo"
                      value={novoRecontatoData.motivo}
                      onChange={(e) => setNovoRecontatoData(prev => ({ ...prev, motivo: e.target.value }))}
                      placeholder="Ex: Apresentar novos serviços, Follow-up de proposta..."
                      required
                    />
                  </div>

                  {/* Campo Funcionário Responsável removido conforme solicitação */}

                  {/* OBSERVAÇÕES */}
                  <div className="form-group">
                    <label htmlFor="observacoes">Observações</label>
                    <textarea
                      id="observacoes"
                      value={novoRecontatoData.observacoes}
                      onChange={(e) => setNovoRecontatoData(prev => ({ ...prev, observacoes: e.target.value }))}
                      placeholder="Observações adicionais sobre o recontato..."
                      rows="3"
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="modal-btn outline" onClick={() => setShowAddModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="modal-btn">
                      Criar Recontato
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prorrogação */}
      {showProrrogarModal && recontatoParaProrrogar && (
        <div className="modal-overlay" onClick={handleCloseProrrogarModal}>
          <div 
            className="modal-shell modal-md prorrogar-modal" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Prorrogar recontato"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>⏳ Prorrogar Recontato</h2>
              <button className="modal-btn icon" onClick={handleCloseProrrogarModal} aria-label="Fechar modal de prorrogação">✕</button>
            </div>

            <div className="modal-body">
              <div className="prorrogar-info">
                <h3>Cliente: {recontatoParaProrrogar.cliente_nome}</h3>
                <p>Data atual: {formatDateSafe(recontatoParaProrrogar.data_agendada)}</p>
              </div>
              
              <div className="prorrogar-form">
                <h4>Por quanto tempo deseja prorrogar?</h4>
                
                <div className="prorrogar-options">
                  <div className="quick-options">
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'dias' && prorrogacaoTempo.quantidade === 1 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'dias', quantidade: 1 })}
                    >
                      1 Dia
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'dias' && prorrogacaoTempo.quantidade === 3 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'dias', quantidade: 3 })}
                    >
                      3 Dias
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'dias' && prorrogacaoTempo.quantidade === 7 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'dias', quantidade: 7 })}
                    >
                      1 Semana
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'semanas' && prorrogacaoTempo.quantidade === 2 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'semanas', quantidade: 2 })}
                    >
                      2 Semanas
                    </button>
                    <button 
                      className={`quick-btn ${prorrogacaoTempo.tipo === 'meses' && prorrogacaoTempo.quantidade === 1 ? 'active' : ''}`}
                      onClick={() => setProrrogacaoTempo({ tipo: 'meses', quantidade: 1 })}
                    >
                      1 Mês
                    </button>
                  </div>
                  
                  <div className="custom-option">
                    <h5>Ou defina um período personalizado:</h5>
                    <div className="custom-inputs">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={prorrogacaoTempo.quantidade}
                        onChange={(e) => handleProrrogacaoChange('quantidade', e.target.value)}
                        className="quantidade-input"
                      />
                      <select
                        value={prorrogacaoTempo.tipo}
                        onChange={(e) => handleProrrogacaoChange('tipo', e.target.value)}
                        className="tipo-select"
                      >
                        <option value="dias">Dias</option>
                        <option value="semanas">Semanas</option>
                        <option value="meses">Meses</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {calcularNovaData() && (
                  <div className="nova-data-preview">
                    <strong>Nova data do recontato: {formatDateSafe(calcularNovaData().toISOString())}</strong>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button className="modal-btn outline" onClick={handleCloseProrrogarModal}>Cancelar</button>
                <button className="modal-btn" onClick={confirmarProrrogacao}>⏳ Confirmar Prorrogação</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Serviço */}
      {showServicoModal && (
        <div className="modal-overlay" onClick={handleCloseServicoModal}>
          <div 
            className="modal-shell modal-lg modal-servico" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Criar novo serviço"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📅 Novo Serviço</h2>
              <button className="modal-btn icon" onClick={handleCloseServicoModal} aria-label="Fechar modal de serviço">✕</button>
            </div>

            <div className="modal-body modal-body-servico">
              <div className="servico-layout-container">
                {/* Coluna da Esquerda - Formulário */}
                <div className="servico-form-column">
                  <div className="modal-form-section">
                    <form onSubmit={handleSubmitServico} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cliente_id">Cliente *</label>
                  {clientePreSelecionado ? (
                    <input
                      type="text"
                      id="cliente_id"
                      value={clientePreSelecionado.nome}
                      className="readonly-field"
                      readOnly
                    />
                  ) : (
                    <select
                      id="cliente_id"
                      name="cliente_id"
                      value={formData.cliente_id}
                      onChange={handleInputChange}
                      className={formErrors.cliente_id ? 'error' : ''}
                      required
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} - {cliente.telefone}
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.cliente_id && (
                    <span className="error-message">{formErrors.cliente_id}</span>
                  )}
                </div>
              </div>

              <div className="form-row-horizontal">
                <div className="form-group">
                  <label htmlFor="data">Data *</label>
                  <input
                    type="date"
                    id="data"
                    name="data"
                    value={formData.data}
                    onChange={handleInputChange}
                    className={formErrors.data ? 'error' : ''}
                    required
                  />
                  {formErrors.data && (
                    <span className="error-message">{formErrors.data}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="hora">Hora *</label>
                  <input
                    type="time"
                    id="hora"
                    name="hora"
                    value={formData.hora}
                    onChange={handleInputChange}
                    className={formErrors.hora ? 'error' : ''}
                    required
                  />
                  {formErrors.hora && (
                    <span className="error-message">{formErrors.hora}</span>
                  )}
                </div>
              </div>

              <div className="form-row-horizontal">
                <div className="form-group">
                  <label htmlFor="valor">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    id="valor"
                    name="valor"
                    value={formData.valor}
                    onChange={handleInputChange}
                    className={formErrors.valor ? 'error' : ''}
                    placeholder="0,00"
                  />
                  {formErrors.valor && (
                    <span className="error-message">{formErrors.valor}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="agendado">Agendado</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="notas">Observações</label>
                  <textarea
                    id="notas"
                    name="notas"
                    value={formData.notas}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Descreva o serviço a ser realizado..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Responsáveis</label>
                  <div className="multi-funcionarios-control">
                    <select onChange={e => {
                      const val = e.target.value;
                      if (val && !formData.funcionario_responsavel.includes(val)) {
                        setFormData(prev => ({ ...prev, funcionario_responsavel: [...prev.funcionario_responsavel, val] }));
                      }
                      e.target.value='';
                    }}>
                      <option value="">Adicionar usuário...</option>
                      {usuarios.filter(u => !formData.funcionario_responsavel.includes(String(u.id))).map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                  {Array.isArray(formData.funcionario_responsavel) && formData.funcionario_responsavel.length > 0 && (
                    <div className="multi-funcionarios-chips" style={{marginTop:'6px'}}>
                      {formData.funcionario_responsavel.map(fid => {
                        const u = usuarios.find(u => String(u.id) === String(fid));
                        const nome = u?.nome || fid;
                        return (
                          <span key={fid} className="func-chip" title={nome}>
                            {nome}
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, funcionario_responsavel: prev.funcionario_responsavel.filter(id => id !== fid) }))}>×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {formErrors.submit && (
                <div className="form-error">
                  {formErrors.submit}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" onClick={handleCloseServicoModal} className="modal-btn modal-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="modal-btn">
                  📅 Criar Serviço
                </button>
              </div>
            </form>
                  </div>
                </div>
                
                {/* Coluna da Direita - Histórico */}
                <div className="servico-historico-column">
                  <div className="modal-historico-section">
                    {/* Seção do Histórico do Cliente */}
                    {(formData.cliente_id || clientePreSelecionado) && (
                      <div className="modal-historico">
                        <h3>📋 Histórico de Serviços</h3>
                    {servicosHistorico.length > 0 ? (
                      <div className="historico-modal-lista">
                        {servicosHistorico.map((servico) => (
                          <div key={servico.id} className="historico-modal-item">
                            <div className="historico-modal-header">
                              <span className="servico-data-modal">
                                📅 {formatDate(servico.data)} - {servico.hora}
                              </span>
                              <span className={`status-badge-modal ${servico.status}`}>
                                {servico.status}
                              </span>
                            </div>
                            {servico.valor && (
                              <div className="servico-valor-modal">
                                💰 {formatCurrency(parseFloat(servico.valor))}
                              </div>
                            )}
                            {servico.funcionario_responsavel && (
                              <div className="servico-funcionario-modal">
                                👤 {servico.funcionario_responsavel}
                              </div>
                            )}
                            {servico.notas && (
                              <div className="servico-notas-modal">
                                📝 {servico.notas}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="sem-historico-modal">
                        <p>🔍 Nenhum serviço encontrado para este cliente</p>
                      </div>
                    )}
                  </div>
                )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Cliente */}
      {showModal && selectedCliente && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div 
            className="modal-shell modal-lg cliente-modal" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Detalhes do recontato"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📋 Detalhes do Recontato</h2>
              <button className="modal-btn icon" onClick={handleCloseModal} aria-label="Fechar modal de detalhes">✕</button>
            </div>

            <div className="modal-body">
              <div className="cliente-info-detailed">
                <div className="info-section">
                  <h3>👤 Informações do Cliente</h3>
                  <div className="info-grid">
                    <div className="info-row">
                      <span className="info-label">Nome:</span>
                      <span className="info-value">{selectedCliente.cliente_nome}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Telefone:</span>
                      <span className="info-value">{selectedCliente.cliente_telefone}</span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h3>📞 Detalhes do Recontato</h3>
                  <div className="info-grid">
                    <div className="info-row">
                      <span className="info-label">Data do Recontato:</span>
                      <span className="info-value">{formatDate(selectedCliente.data_agendada)}</span>
                    </div>
                    {selectedCliente.hora_agendada && (
                      <div className="info-row">
                        <span className="info-label">Hora:</span>
                        <span className="info-value">{formatTime(selectedCliente.hora_agendada)}</span>
                      </div>
                    )}
                    <div className="info-row">
                      <span className="info-label">Motivo:</span>
                      <span className="info-value">{selectedCliente.motivo || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                {selectedCliente.observacoes && (
                  <div className="info-section">
                    <h3>📝 Observações/Notas</h3>
                    <div className="observacoes-content">
                      <p>{selectedCliente.observacoes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="historico-section">
                <h3>📈 Histórico de Serviços</h3>
                
                {loadingHistorico ? (
                  <div className="loading-historico">
                    <p>Carregando histórico...</p>
                  </div>
                ) : servicosHistorico.length === 0 ? (
                  <div className="empty-historico">
                    <p>Nenhum serviço encontrado para este cliente.</p>
                  </div>
                ) : (
                  <div className="servicos-list">
                    {servicosHistorico.map((servico) => (
                      <div key={servico.id} className="servico-item">
                        <div className="servico-header">
                          <span className="servico-data">{formatDate(servico.data)}</span>
                          <span className={`servico-status ${servico.status}`}>
                            {servico.status || 'Agendado'}
                          </span>
                        </div>
                        <div className="servico-details">
                          <div className="servico-info">
                            <span className="servico-label">⏰ Hora:</span>
                            <span>{formatTime(servico.hora)}</span>
                          </div>
                          <div className="servico-info">
                            <span className="servico-label">💰 Valor:</span>
                            <span>{formatCurrency(servico.valor || 0)}</span>
                          </div>
                          {servico.funcionario_responsavel && (
                            <div className="servico-info">
                              <span className="servico-label">👤 Responsável:</span>
                              <span>{servico.funcionario_responsavel}</span>
                            </div>
                          )}
                          {servico.notas && (
                            <div className="servico-info">
                              <span className="servico-label">📝 Nota:</span>
                              <span>{servico.notas}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Ações do Recontato */}
              <div className="recontato-actions">
                <button 
                  className="delete-recontato-btn"
                  onClick={() => askDeleteRecontato(selectedCliente)}
                  title="Deletar este recontato permanentemente"
                >
                  🗑️ Deletar Recontato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Próximo Recontato */}
      {showProximoRecontatoModal && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && handleCloseProximoRecontatoModal()}>
          <div 
            className="modal-shell modal-md" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Reagendar recontato" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>🎯 Reagendar Recontato</h2>
              <button className="modal-btn icon" onClick={handleCloseProximoRecontatoModal} aria-label="Fechar modal">✕</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmitProximoRecontato} className="modal-form">
                <div className="success-message" style={{textAlign: 'center', marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px', border: '1px solid #4caf50', width: '100%'}}>
                  <p style={{margin: '5px 0', color: '#2e7d32', fontWeight: 'bold', fontSize: '16px'}}>✅ Serviço criado com sucesso!</p>
                  <p style={{margin: '5px 0', color: '#4caf50', fontSize: '14px'}}>Agora vamos reagendar o recontato deste cliente para dar continuidade ao relacionamento.</p>
                </div>

                <div className="form-group">
                  <label>📅 Quando fazer o próximo recontato?</label>
                  <div className="quick-options">
                    {getProximoRecontatoOptions().map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`quick-option ${proximoRecontatoData.periodo === option.value ? 'active' : ''}`}
                        onClick={() => handleProximoRecontatoOptionClick(option)}
                      >
                        <span className="option-label">{option.label}</span>
                        <span className="option-date">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="data_personalizada">Ou escolha uma data personalizada:</label>
                  <input
                    type="date"
                    id="data_personalizada"
                    name="data_personalizada"
                    value={proximoRecontatoData.data_personalizada}
                    onChange={handleProximoRecontatoInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="motivo_proximo">🎯 Motivo do Recontato *</label>
                  <input
                    type="text"
                    id="motivo_proximo"
                    name="motivo"
                    value={proximoRecontatoData.motivo}
                    onChange={handleProximoRecontatoInputChange}
                    placeholder="Ex: Follow-up pós-serviço, verificar satisfação, apresentar novos produtos..."
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="observacoes_proximo">📝 Observações (opcional):</label>
                  <textarea
                    id="observacoes_proximo"
                    name="observacoes"
                    value={proximoRecontatoData.observacoes}
                    onChange={handleProximoRecontatoInputChange}
                    placeholder=""
                    rows="3"
                    className="form-input"
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="modal-btn outline" onClick={handleSkipProximoRecontato}>⏭️ Pular Reagendamento</button>
                  <button type="submit" className="modal-btn">📅 Reagendar Recontato</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Recontato */}
      {showEditModal && recontatoParaEditar && (
        <div className="modal-overlay" data-modal="edit" onClick={() => setShowEditModal(false)}>
          <div 
            className="modal-shell modal-md" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Editar recontato" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>✏️ Editar Recontato</h2>
              <button className="modal-btn icon" onClick={() => setShowEditModal(false)} aria-label="Fechar modal de edição">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitEditarRecontato} className="modal-form">
                <div className="form-group">
                  <label htmlFor="clienteEdit">Cliente:</label>
                  <input
                    type="text"
                    id="clienteEdit"
                    value={recontatoParaEditar.clienteNome}
                    disabled
                    className="form-input disabled"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dataEdit">Data do Recontato: *</label>
                    <input
                      type="date"
                      id="dataEdit"
                      value={recontatoParaEditar.data_agendada}
                      onChange={(e) => setRecontatoParaEditar({
                        ...recontatoParaEditar,
                        data_agendada: e.target.value
                      })}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="horaEdit">Hora do Recontato:</label>
                    <input
                      type="time"
                      id="horaEdit"
                      value={recontatoParaEditar.hora_agendada}
                      onChange={(e) => setRecontatoParaEditar({
                        ...recontatoParaEditar,
                        hora_agendada: e.target.value
                      })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="motivoEdit">Motivo do Recontato: *</label>
                  <input
                    type="text"
                    id="motivoEdit"
                    value={recontatoParaEditar.motivo}
                    onChange={(e) => setRecontatoParaEditar({
                      ...recontatoParaEditar,
                      motivo: e.target.value
                    })}
                    required
                    className="form-input"
                    placeholder="Digite o motivo do recontato..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="observacoesEdit">Observações:</label>
                  <textarea
                    id="observacoesEdit"
                    value={recontatoParaEditar.observacoes}
                    onChange={(e) => setRecontatoParaEditar({
                      ...recontatoParaEditar,
                      observacoes: e.target.value
                    })}
                    placeholder="Observações adicionais sobre este recontato..."
                    rows="3"
                    className="form-input"
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="modal-btn outline" onClick={() => setShowEditModal(false)}>Cancelar</button>
                  <button type="submit" className="modal-btn">💾 Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Deletar recontato"
        tone="danger"
        message={`Tem certeza que deseja deletar o recontato de ${recontatoParaDeletar?.cliente_nome || ''}?`}
        details={<>
          <p><strong>Data:</strong> {recontatoParaDeletar ? formatDate(recontatoParaDeletar.data_agendada) : '-'}</p>
          {recontatoParaDeletar?.motivo && <p><strong>Motivo:</strong> {recontatoParaDeletar.motivo}</p>}
          <p style={{marginTop:'8px'}}>Esta ação não pode ser desfeita.</p>
        </>}
        confirmLabel="Deletar"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteRecontato}
        onCancel={cancelDeleteRecontato}
      />
    </div>
  );
};

export default Recontatos;
