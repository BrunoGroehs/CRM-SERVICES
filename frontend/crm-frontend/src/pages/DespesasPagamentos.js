import React, { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import MultiFuncionariosSelect from '../components/MultiFuncionariosSelect';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiUrl } from '../utils/api';
import { formatCurrency, formatDate, monthKey, monthLabel, monthRange, parseYMDLocal, isYMD } from '../utils/format';
import './DespesasPagamentos.css';

// Pequena ajuda para estados por linha
const useRowState = () => {
  const [state, setState] = useState({}); // id => { saving, editing, error }
  const set = (id, patch) => setState(prev => ({ ...prev, [id]: { ...(prev[id]||{}), ...patch } }));
  const get = (id) => state[id] || {};
  return { get, set };
};

const DespesasPagamentos = () => {
  const { add: toast } = useToast();
  const fetchAuth = useAuthenticatedFetch();
  const { user } = useAuth();
  const canEdit = ['admin', 'manager'].includes(user?.role);

  // Filtros principais (mês atual por padrão)
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`; // YYYY-MM
  const [month, setMonth] = useState(defaultMonth);
  const [funcionarioFilter, setFuncionarioFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [statusPagamentoFilter, setStatusPagamentoFilter] = useState('todos'); // pendente|pago|todos

  // Dados master
  const [usuarios, setUsuarios] = useState([]);
  const [clientesById, setClientesById] = useState({}); // opcional, preenchido dos serviços

  // Serviços concluídos do mês
  const [servicos, setServicos] = useState([]);
  const servicoRow = useRowState();

  // Despesas do mês
  const [despesas, setDespesas] = useState([]);
  const despesaRow = useRowState();

  // Pagamentos do mês
  const [pagamentos, setPagamentos] = useState([]);
  const pagamentoRow = useRowState();

  // Dialogs
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null, tone: 'danger' });
  const [rateioModal, setRateioModal] = useState(false);
  const [rateioRules, setRateioRules] = useState([]);

  // Range do mês selecionado
  const { from, to } = useMemo(() => monthRange(month), [month]);

  // Carregamento inicial e quando o mês mudar
  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    loadServicos();
    loadDespesas();
    loadPagamentos();
  loadRateioRules();
  }, [from, to, statusPagamentoFilter]);

  // Carregadores
  const loadUsuarios = async () => {
    try {
      const res = await fetchAuth(getApiUrl('admin/users'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsuarios(data.users || []);
    } catch (e) {
      console.error('Falha ao carregar usuários', e);
      toast('Erro ao carregar usuários', { type: 'error' });
    }
  };

  const loadServicos = async () => {
    try {
      // Backend atual não filtra por query; buscar tudo e filtrar no cliente
      const res = await fetchAuth(getApiUrl('servicos'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const all = payload.data || [];
      // Filtrar concluídos e por range (comparando datas)
      const fromD = parseYMDLocal(from) || new Date(from);
      fromD.setHours(0,0,0,0);
      const toD = parseYMDLocal(to) || new Date(to);
      toD.setHours(23,59,59,999);
      const list = all.filter(s => {
        if (s.status !== 'concluido' || !s.data) return false;
        const d = isYMD(s.data) ? parseYMDLocal(s.data) : new Date(s.data);
        if (!d || isNaN(d.getTime())) return false;
        return d >= fromD && d <= toD;
      });
      // Mapa de clientes
      const map = {};
      list.forEach(s => { if (s.cliente_id && s.cliente_nome) map[s.cliente_id] = s.cliente_nome; });
      setClientesById(map);
      setServicos(list);
    } catch (e) {
      console.error('Falha ao carregar serviços', e);
      toast('Erro ao carregar serviços concluídos', { type: 'error' });
    }
  };

  const loadDespesas = async () => {
    try {
      const url = getApiUrl(`despesas?from=${from}&to=${to}`);
      const res = await fetchAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDespesas(data.data || data.despesas || []);
    } catch (e) {
      console.warn('Endpoint de despesas ausente ou falha. UI seguirá sem dados de despesas.', e);
      setDespesas([]);
    }
  };

  const loadPagamentos = async () => {
    try {
      const statusParam = statusPagamentoFilter === 'todos' ? '' : `&status=${statusPagamentoFilter}`;
      const url = getApiUrl(`pagamento-funcionarios?from=${from}&to=${to}${statusParam}`);
      const res = await fetchAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPagamentos(data.data || data.pagamentos || []);
    } catch (e) {
      console.warn('Endpoint de pagamentos ausente ou falha. UI seguirá sem dados de pagamentos.', e);
      setPagamentos([]);
    }
  };

  const loadRateioRules = async () => {
    try {
      const res = await fetchAuth(getApiUrl('rateio-config'));
      if (res.ok) {
        const data = await res.json();
        setRateioRules(data.data || []);
      }
    } catch (e) { /* ignore */ }
  };

  const addRule = async (rule) => {
    try {
      const res = await fetchAuth(getApiUrl('rateio-config'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rule) });
      if (!res.ok) throw new Error('fail');
      toast('Regra salva', { type:'success' });
      await loadRateioRules();
    } catch (e) { toast('Falha ao salvar regra', { type:'error' }); }
  };

  const deleteRule = async (id) => {
    try {
      const res = await fetchAuth(getApiUrl(`rateio-config/${id}`), { method:'DELETE' });
      if (!res.ok) throw new Error('fail');
      toast('Regra removida', { type:'success' });
      await loadRateioRules();
    } catch (e) { toast('Falha ao remover regra', { type:'error' }); }
  };

  // Helpers
  const usuariosMap = useMemo(() => Object.fromEntries((usuarios||[]).map(u => [String(u.id), u])), [usuarios]);

  const receitaMes = useMemo(() => servicos.reduce((sum, s) => sum + (parseFloat(s.valor)||0), 0), [servicos]);
  const despesasMes = useMemo(() => despesas.reduce((sum, d) => sum + (parseFloat(d.valor)||0), 0), [despesas]);
  const resultadoMes = useMemo(() => receitaMes - despesasMes, [receitaMes, despesasMes]);

  // Serviços do mês (para seleção em despesas), ordenados por data desc
  const servicosDoMes = useMemo(() => {
    return [...servicos].sort((a,b) => new Date(b.data) - new Date(a.data));
  }, [servicos]);
  const servicosMapById = useMemo(() => Object.fromEntries(servicos.map(s => [String(s.id), s])), [servicos]);
  const servicoLabel = (s) => s ? `${formatDate(s.data)} — ${(s.cliente_nome || `Cliente #${s.cliente_id}`)} — ${formatCurrency(s.valor||0)}` : '-';
  
  // Agregado de pagamentos por funcionário para o mês
  const pagamentosPorFuncionario = useMemo(() => {
    const agg = {};
    for (const p of pagamentos) {
      const fid = String(p.funcionario_id);
      const val = parseFloat(p.valor) || 0;
      if (!agg[fid]) agg[fid] = { funcionario_id: fid, total: 0, pagos: 0, pendentes: 0 };
      agg[fid].total += val;
      if ((p.status||'pendente') === 'pago') agg[fid].pagos += val; else agg[fid].pendentes += val;
    }
    return Object.values(agg).sort((a,b) => b.total - a.total);
  }, [pagamentos]);

  const filteredServicos = useMemo(() => {
    return servicos.filter(s => {
      const funcionarioIds = Array.isArray(s.funcionario_responsavel) ? s.funcionario_responsavel : [];
      const clienteNome = clientesById[s.cliente_id] || '';
      const byFuncionario = !funcionarioFilter || funcionarioIds.some(fid => String(fid) === String(funcionarioFilter));
      const byCliente = !clienteFilter || clienteNome.toLowerCase().includes(clienteFilter.toLowerCase());
      return byFuncionario && byCliente;
    });
  }, [servicos, funcionarioFilter, clienteFilter, clientesById]);

  const servicosByMonth = useMemo(() => {
    const groups = {};
    filteredServicos.forEach(s => {
      const key = monthKey(s.data);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [filteredServicos]);

  // Ações: editar funcionários em serviço
  const saveFuncionariosServico = async (servicoId, funcionarioIds, alocacoes) => {
    if (!canEdit) return;
    try {
      servicoRow.set(servicoId, { saving: true, error: null });
      const body = { funcionario_responsavel: (funcionarioIds||[]).map(String), alocacoes: Array.isArray(alocacoes) ? alocacoes : undefined };
      const res = await fetchAuth(getApiUrl(`servicos/${servicoId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadServicos();
      toast('Vínculo de funcionários salvo', { type: 'success' });
    } catch (e) {
      console.error('Erro ao salvar funcionários', e);
      servicoRow.set(servicoId, { error: e.message });
      toast('Erro ao salvar funcionários do serviço', { type: 'error' });
    } finally {
      servicoRow.set(servicoId, { saving: false });
    }
  };

  const handleGerarPagamentos = async (servico) => {
  if (!canEdit) return;
    try {
      pagamentoRow.set(`gen-${servico.id}`, { saving: true });
      // Se serviço possui alocacoes com percentuais, usar 'percentual'; caso contrário, 'igual'
      const tipo = Array.isArray(servico.alocacoes) && servico.alocacoes.some(a => a && (a.percentual || a.percentual === 0)) ? 'percentual' : 'igual';
      const porcentagens = tipo === 'percentual' ? Object.fromEntries((servico.alocacoes||[]).filter(a => a && a.usuario_id != null).map(a => [String(a.usuario_id), a.percentual ?? 0])) : undefined;
      const payload = { servico_id: servico.id, tipo_rateio: tipo, referencia_calculo: 'valor_servico', data_prevista: from, porcentagens };
      const res = await fetchAuth(getApiUrl('pagamento-funcionarios/generate'), {
        method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadPagamentos();
      if (res.status === 409) {
        toast('Pagamentos já existem para este serviço', { type: 'info' });
      } else {
        toast('Pagamentos gerados', { type: 'success' });
      }
    } catch (e) {
      console.warn('Gerar pagamentos falhou', e);
      toast('Falha ao gerar pagamentos. Verifique backend.', { type: 'error' });
    } finally {
      pagamentoRow.set(`gen-${servico.id}`, { saving: false });
    }
  };

  // CRUD Despesas
  const addDespesa = async (d) => {
  if (!canEdit) return;
    try {
      despesaRow.set('new', { saving: true });
      const res = await fetchAuth(getApiUrl('despesas'), { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(d) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDespesas();
      toast('Despesa adicionada', { type: 'success' });
    } catch (e) {
      toast('Falha ao adicionar despesa (endpoint ausente?)', { type: 'error' });
    } finally {
      despesaRow.set('new', { saving: false });
    }
  };

  const updateDespesa = async (id, patch) => {
  if (!canEdit) return;
    try {
      despesaRow.set(id, { saving: true });
      const res = await fetchAuth(getApiUrl(`despesas/${id}`), { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDespesas();
      toast('Despesa atualizada', { type: 'success' });
    } catch (e) {
      toast('Falha ao atualizar despesa', { type: 'error' });
    } finally {
      despesaRow.set(id, { saving: false });
    }
  };

  const deleteDespesa = async (id) => {
  if (!canEdit) return;
    setConfirm({ open: true, title: 'Excluir despesa', tone: 'danger', message: 'Tem certeza que deseja excluir esta despesa?', onConfirm: async () => {
      try {
        despesaRow.set(id, { saving: true });
        const res = await fetchAuth(getApiUrl(`despesas/${id}`), { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await loadDespesas();
        toast('Despesa excluída', { type: 'success' });
      } catch (e) {
        toast('Falha ao excluir despesa', { type: 'error' });
      } finally {
        despesaRow.set(id, { saving: false });
      }
    }});
  };

  // Ações em pagamento
  const patchPagamento = async (id, patch) => {
  if (!canEdit) return;
    try {
      pagamentoRow.set(id, { saving: true });
      const res = await fetchAuth(getApiUrl(`pagamento-funcionarios/${id}`), { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadPagamentos();
      toast('Pagamento atualizado', { type: 'success' });
    } catch (e) {
      toast('Falha ao atualizar pagamento', { type: 'error' });
    } finally {
      pagamentoRow.set(id, { saving: false });
    }
  };

  const marcarComoPago = async (p) => {
  if (!canEdit) return;
    const hoje = new Date();
    const patch = {
      status: 'pago',
      data_pagamento: hoje.toISOString().slice(0,10),
      metodo: p.metodo || 'transferencia',
      valor_pago: p.valor_pago && parseFloat(p.valor_pago) > 0 ? p.valor_pago : p.valor
    };
    await patchPagamento(p.id, patch);
  };

  const deletePagamento = async (id) => {
  if (!canEdit) return;
    setConfirm({ open: true, title: 'Excluir pagamento', tone: 'danger', message: 'Excluir este lançamento de pagamento?', onConfirm: async () => {
      try {
        pagamentoRow.set(id, { saving: true });
        const res = await fetchAuth(getApiUrl(`pagamento-funcionarios/${id}`), { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await loadPagamentos();
        toast('Pagamento excluído', { type: 'success' });
      } catch (e) {
        toast('Falha ao excluir pagamento', { type: 'error' });
      } finally {
        pagamentoRow.set(id, { saving: false });
      }
    }});
  };

  // Form para nova despesa
  const [novaDespesa, setNovaDespesa] = useState({ data: from, valor: '', categoria: '', tipo: '', descricao: '', servico_id: '' });

  // Render helpers
  const renderServicosSection = () => {
    const key = monthKey(from);
    const list = servicosByMonth[key] || [];
    const total = list.reduce((sum, s) => sum + (parseFloat(s.valor)||0), 0);
  const servicosComPagamentos = new Set(pagamentos.map(p => String(p.servico_id)));

    return (
      <section className="card">
        <header className="section-header">
          <h2>Serviços concluídos — {monthLabel(from)} <span className="muted">Receita {formatCurrency(total)}</span></h2>
          <div className="filters-row">
            <label>
              Mês
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </label>
            <label>
              Funcionário
              <select value={funcionarioFilter} onChange={e => setFuncionarioFilter(e.target.value)}>
                <option value="">Todos</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome || u.email}</option>)}
              </select>
            </label>
            <label>
              Cliente
              <input type="text" placeholder="Filtrar por cliente" value={clienteFilter} onChange={e => setClienteFilter(e.target.value)} />
            </label>
          </div>
        </header>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Funcionários</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={5} className="empty">Nenhum serviço concluído no mês.</td></tr>
              )}
              {list.map(s => {
                const row = servicoRow.get(s.id);
                // Normalizar array de funcionários para MultiFuncionariosSelect
                const current = (Array.isArray(s.funcionario_responsavel) ? s.funcionario_responsavel : [])
                  .map(fid => ({ id: String(fid), nome: usuariosMap[String(fid)]?.nome || String(fid) }));
                const jaGerado = servicosComPagamentos.has(String(s.id));
                return (
                  <ServicoRow
                    key={s.id}
                    servico={s}
                    funcionarios={current}
                    usuarios={usuarios}
                    saving={row.saving}
                    error={row.error}
                    onSave={(ids, allocs) => saveFuncionariosServico(s.id, ids, allocs)}
                    onGerar={() => handleGerarPagamentos(s)}
                    jaGerado={jaGerado}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderDespesasSection = () => {
    const total = despesas.reduce((sum, d) => sum + (parseFloat(d.valor)||0), 0);
    return (
      <section className="card">
        <header className="section-header">
          <h2>Despesas — {monthLabel(from)} <span className="muted">Total {formatCurrency(total)}</span></h2>
        </header>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Serviço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {despesas.length === 0 && (
                <tr><td colSpan={6} className="empty">Nenhuma despesa no mês.</td></tr>
              )}
                {despesas.map(d => {
                const row = despesaRow.get(d.id);
                return (
                  <tr key={d.id} className={row.saving ? 'saving' : ''}>
                    <td>{formatDate(d.data)}</td>
                    <td>{d.categoria || '-'}</td>
                    <td>{d.descricao || '-'}</td>
                    <td><span className="badge">{formatCurrency(d.valor)}</span></td>
                    <td>
                      {d.servico_id ? (
                        servicoLabel(servicosMapById[String(d.servico_id)]) || `#${d.servico_id}`
                      ) : '-'}
                    </td>
                    <td>
                      <button className="btn subtle" onClick={() => updateDespesa(d.id, { /* abriria modal real; patch simples */ descricao: d.descricao })} disabled={row.saving || !canEdit}>Editar</button>
                      <button className="btn danger" onClick={() => deleteDespesa(d.id)} disabled={row.saving || !canEdit}>Excluir</button>
                    </td>
                  </tr>
                );
              })}
              <tr className={despesaRow.get('new').saving ? 'saving' : ''}>
                <td>
                  <input type="date" value={novaDespesa.data} onChange={e => setNovaDespesa(nd => ({ ...nd, data: e.target.value }))} />
                </td>
                <td>
                  <input type="text" placeholder="Categoria" value={novaDespesa.categoria} onChange={e => setNovaDespesa(nd => ({ ...nd, categoria: e.target.value }))} />
                </td>
                <td>
                  <input type="text" placeholder="Descrição" value={novaDespesa.descricao} onChange={e => setNovaDespesa(nd => ({ ...nd, descricao: e.target.value }))} />
                </td>
                <td>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={novaDespesa.valor} onChange={e => setNovaDespesa(nd => ({ ...nd, valor: e.target.value }))} />
                </td>
                <td>
                  <select value={novaDespesa.servico_id} onChange={e => setNovaDespesa(nd => ({ ...nd, servico_id: e.target.value }))}>
                    <option value="">Vincular a um serviço do mês (opcional)</option>
                    {servicosDoMes.map(s => (
                      <option key={s.id} value={s.id}>{servicoLabel(s)}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn" onClick={() => {
                    const sid = novaDespesa.servico_id ? parseInt(novaDespesa.servico_id, 10) : undefined;
                    const payload = { ...novaDespesa, valor: parseFloat(novaDespesa.valor||0) };
                    if (!sid) delete payload.servico_id; else payload.servico_id = sid;
                    addDespesa(payload);
                  }} disabled={despesaRow.get('new').saving || !canEdit}>Adicionar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderPagamentosSection = () => {
    return (
      <section className="card">
        <header className="section-header">
          <h2>Pagamentos a funcionários — {monthLabel(from)}</h2>
          <div className="filters-row">
            <label>
              Status
              <select value={statusPagamentoFilter} onChange={(e)=> setStatusPagamentoFilter(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="pago">Pagos</option>
              </select>
            </label>
            <button className="btn" onClick={() => setRateioModal(true)} disabled={!canEdit}>Configurar percentuais</button>
          </div>
        </header>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Total</th>
                <th>Pagos</th>
                <th>Pendentes</th>
              </tr>
            </thead>
            <tbody>
              {pagamentosPorFuncionario.length === 0 && (
                <tr><td colSpan={4} className="empty">Nenhum pagamento neste mês.</td></tr>
              )}
              {pagamentosPorFuncionario.map(row => {
                const nome = usuariosMap[row.funcionario_id]?.nome || row.funcionario_id;
                return (
                  <tr key={row.funcionario_id}>
                    <td>{nome}</td>
                    <td><span className="badge">{formatCurrency(row.total)}</span></td>
                    <td className="positive">{formatCurrency(row.pagos)}</td>
                    <td className="negative">{formatCurrency(row.pendentes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderResumoSection = () => {
    return (
      <section className="card">
        <header className="section-header">
          <h2>Resumo — {monthLabel(from)}</h2>
        </header>
        <div className="resumo-cards">
          <div className="resumo-item">
            <div className="label">Receita (serviços)</div>
            <div className="value positive">{formatCurrency(receitaMes)}</div>
          </div>
          <div className="resumo-item">
            <div className="label">Despesas</div>
            <div className="value negative">{formatCurrency(despesasMes)}</div>
          </div>
          <div className="resumo-item">
            <div className="label">Resultado</div>
            <div className={`value ${resultadoMes>=0?'positive':'negative'}`}>{formatCurrency(resultadoMes)}</div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>💸 Despesas e Pagamentos</h1>
          <p>Gerencie serviços concluídos, despesas e repasses a funcionários por mês</p>
        </div>
      </div>

      {renderServicosSection()}
      {renderDespesasSection()}
      {renderPagamentosSection()}
      {renderResumoSection()}

      {rateioModal && (
        <div className="modal-backdrop" onClick={() => setRateioModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Configurar percentuais</h3>
              <button className="close" onClick={() => setRateioModal(false)}>×</button>
            </header>
            <div className="modal-body">
              <p className="muted">Regras aplicadas na geração automática:</p>
              <div className="rules">
                <h4>Regras atuais</h4>
                <ul>
                  {rateioRules.map(r => (
                    <li key={r.id}>
                      <code>{r.tipo}</code> {r.usuario_id ? `#${r.usuario_id}` : (r.usuarios ? `[${r.usuarios.join(',')}]` : '')} → {r.percent}%
                      <button className="btn subtle" onClick={() => deleteRule(r.id)} disabled={!canEdit}>Remover</button>
                    </li>
                  ))}
                  {rateioRules.length === 0 && <li className="muted">Sem regras</li>}
                </ul>
              </div>
              <div className="quick-add">
                <h4>Atalhos</h4>
                <div className="grid-2">
                  <button className="btn" onClick={() => addRule({ tipo:'solo', usuario_id: usuarios.find(u=>/bruno/i.test(u.nome||''))?.id, percent:20 })}>Bruno sozinho 20%</button>
                  <button className="btn" onClick={() => addRule({ tipo:'solo', usuario_id: usuarios.find(u=>/diego/i.test(u.nome||''))?.id, percent:20 })}>Diego sozinho 20%</button>
                </div>
                <div className="grid-2">
                  <button className="btn" onClick={() => {
                    const bruno = usuarios.find(u=>/bruno/i.test(u.nome||''))?.id; const diego = usuarios.find(u=>/diego/i.test(u.nome||''))?.id;
                    if (bruno && diego) addRule({ tipo:'combo', usuarios:[bruno, diego], percent:16 });
                    else toast('Não encontrei Bruno e Diego', { type:'warning' });
                  }}>Bruno + Diego (cada 16%)</button>
                  <button className="btn" onClick={() => addRule({ tipo:'fixed', usuario_id: usuarios.find(u=>/manuela/i.test(u.nome||''))?.id, percent:15 })}>Manuela sempre 15%</button>
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn" onClick={() => setRateioModal(false)}>Fechar</button>
            </footer>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        tone={confirm.tone || 'danger'}
        message={confirm.message}
        onConfirm={() => { const fn = confirm.onConfirm; setConfirm(c => ({ ...c, open:false })); fn && fn(); }}
        onCancel={() => setConfirm(c => ({ ...c, open:false }))}
      />
    </div>
  );
};

const ServicoRow = ({ servico, funcionarios, usuarios, saving, error, onSave, onGerar, jaGerado }) => {
  const [value, setValue] = useState(funcionarios || []);
  const [generating, setGenerating] = useState(false);
  useEffect(() => { setValue(funcionarios || []); }, [funcionarios]);

  const ids = value.map(v => v.id);
  const clienteNome = servico.cliente_nome || `Cliente #${servico.cliente_id}`;

  return (
    <tr className={saving ? 'saving' : ''}>
      <td>{formatDate(servico.data)}</td>
      <td><strong>{clienteNome}</strong></td>
      <td><span className="badge">{formatCurrency(servico.valor||0)}</span></td>
      <td>
        <MultiFuncionariosSelect
          usuarios={usuarios}
          value={value}
          onChange={setValue}
          label={''}
          hint={'Selecione os funcionários vinculados'}
        />
      </td>
      <td className="nowrap">
  <button className="btn" onClick={() => onSave(ids)} disabled={saving}>Salvar</button>
        <button
          className="btn secondary"
          onClick={async () => { if (generating || jaGerado) return; setGenerating(true); try { await onGerar(); } finally { setGenerating(false); } }}
          disabled={saving || generating || jaGerado}
          title={jaGerado ? 'Pagamentos já gerados para este serviço' : undefined}
        >{generating ? 'Gerando...' : (jaGerado ? 'Já gerado' : 'Gerar pagamentos')}</button>
        {error && <div className="row-error">{error}</div>}
      </td>
    </tr>
  );
};

export default DespesasPagamentos;
