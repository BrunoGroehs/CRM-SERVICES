import React, { useEffect, useMemo, useState } from 'react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { useToast } from '../contexts/ToastContext';
import { getApiUrl } from '../utils/api';
import './Financas.css';
import UserSelectInline from '../components/UserSelectInline';

function MonthPicker({ value, onChange }) {
  const [local, setLocal] = useState(value || new Date().toISOString().slice(0,7));
  const inputRef = React.useRef();
  useEffect(()=>{ setLocal(value); }, [value]);
  const addMonths = (base, delta) => {
    const [y,m] = base.split('-').map(Number);
    const d = new Date(y, m-1+delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  };
  const formatMonth = (ym) => {
    if (!ym) return '';
    const [y,m] = ym.split('-').map(Number);
    const d = new Date(y, (m||1)-1, 1);
    const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const go = (delta) => { const nm = addMonths(local, delta); setLocal(nm); onChange?.(nm); };
  return (
    <div className="month-nav" role="group" aria-label="Seletor de mês">
      <button className="nav-btn" onClick={()=> go(-1)} title="Anterior" aria-label="Mês anterior">←</button>
      <button className="label-btn" onClick={()=> inputRef.current?.click()} title="Escolher mês">
        {formatMonth(local)}
      </button>
      <input ref={inputRef} className="visually-hidden" type="month" value={local}
             onChange={(e)=>{ setLocal(e.target.value); onChange?.(e.target.value); }} />
      <button className="nav-btn" onClick={()=> go(+1)} title="Próximo" aria-label="Próximo mês">→</button>
    </div>
  );
}

function HistoricoItem({ item, fmt, onSave, onDelete }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(item?.valor ?? ''));
  return (
    <div className="hist-line" style={{ alignItems:'center' }}>
      <span>{new Date(item.pago_em).toLocaleString()}</span>
      <span style={{ color:'#666' }}>Competência: {String(item.competencia).slice(0,10)}</span>
      {editando ? (
        <div className="money-box">
          <span className="prefix">R$</span>
          <input className="money-input" type="number" min={0} step="0.01" value={valor}
            onChange={e=> setValor(e.target.value)} />
        </div>
      ) : (
        <span>{fmt(item.valor)}</span>
      )}
      <div style={{ display:'flex', gap:8 }}>
        {editando ? (
          <>
            <button className="btn" style={{ padding:'4px 8px' }} onClick={()=>{ const v = Number(valor); if (v>0) onSave(v); setEditando(false); }}>Salvar</button>
            <button className="btn" style={{ padding:'4px 8px' }} onClick={()=>{ setEditando(false); setValor(String(item.valor)); }}>Cancelar</button>
          </>
        ) : (
          <>
            <button className="btn" style={{ padding:'4px 8px' }} onClick={()=> setEditando(true)}>Editar</button>
            <button className="btn" style={{ padding:'4px 8px' }} onClick={()=> onDelete?.()}>Excluir</button>
          </>
        )}
      </div>
    </div>
  );
}

const Financas = () => {
  // Converte strings "pt-BR" (ex.: 1.234,56) ou números para Number seguro
  const parseBR = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v).trim();
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    // Caso 1: apenas vírgula -> vírgula é decimal (pt-BR)
    if (hasComma && !hasDot) {
      const num = Number(s.replace(',', '.'));
      return Number.isFinite(num) ? num : 0;
    }
    // Caso 2: apenas ponto -> ponto é decimal (en-US)
    if (hasDot && !hasComma) {
      const num = Number(s);
      return Number.isFinite(num) ? num : 0;
    }
    // Caso 3: possui ambos -> último separador é o decimal; o outro é milhar
    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      const decimalSep = lastComma > lastDot ? ',' : '.';
      const thousandSep = decimalSep === ',' ? '.' : ',';
      const normalized = s.split(thousandSep).join('').replace(decimalSep, '.');
      const num = Number(normalized);
      return Number.isFinite(num) ? num : 0;
    }
    // Fallback: remover espaços e tentar parse
    const num = Number(s.replace(/\s+/g, ''));
    return Number.isFinite(num) ? num : 0;
  };
  const fmt = (n) => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(parseBR(n));
  const shortName = (name) => {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0][0] || '';
      const last = parts[parts.length - 1][0] || '';
      return `${first}.${last}.`;
    }
    // nome único: 2 primeiras letras + ponto
    const w = parts[0];
    return (w.slice(0, 2) + '.');
  };
  const fetchAuth = useAuthenticatedFetch();
  const { add: pushToast } = useToast();
  const [month, setMonth] = useState(()=> new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(false);
  const [servicos, setServicos] = useState([]);
  const [totais, setTotais] = useState([]);
  const [savingComissoes, setSavingComissoes] = useState(false);
  const [comissoes, setComissoes] = useState({}); // { usuario_id: percentual }
  // UI state for partial payments and history per user
  const [valoresPagar, setValoresPagar] = useState({}); // { usuario_id: number|string }
  const [paying, setPaying] = useState({}); // { usuario_id: boolean }
  const [expanded, setExpanded] = useState({}); // { usuario_id: boolean }
  const [historicos, setHistoricos] = useState({}); // { usuario_id: [ {id, competencia, valor, pago_em} ] }
  const [loadingHist, setLoadingHist] = useState({}); // { usuario_id: boolean }
  // Despesas UI state
  const [despesas, setDespesas] = useState([]);
  const [novaDespesa, setNovaDespesa] = useState({ descricao:'', valor:'' });

  const loadData = async (m = month) => {
    setLoading(true);
    try {
      const [sResp, tResp, dResp] = await Promise.all([
        fetchAuth(getApiUrl(`financas/servicos?month=${encodeURIComponent(m)}`)),
        fetchAuth(getApiUrl(`financas/totais-usuarios?month=${encodeURIComponent(m)}`)),
        fetchAuth(getApiUrl(`financas/despesas?month=${encodeURIComponent(m)}`))
      ]);
      const parseJsonOrThrow = async (resp, label) => {
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await resp.text();
          throw new Error(`${label}: resposta não é JSON (status ${resp.status}).`);
        }
        return resp.json();
      };
  const sJson = await parseJsonOrThrow(sResp, 'Serviços do mês');
  const tJson = await parseJsonOrThrow(tResp, 'Totais por usuário');
  const dJson = await parseJsonOrThrow(dResp, 'Despesas do mês');
      if (!sJson.success) throw new Error(sJson.message || 'Erro ao buscar serviços');
      if (!tJson.success) throw new Error(tJson.message || 'Erro ao buscar totais');
  setServicos(sJson.data || []);
  setTotais(tJson.data || []);
  setDespesas(dJson.data || []);
    } catch (e) {
      console.error(e);
      pushToast('Erro ao carregar Finanças: ' + e.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ loadData(); }, []);

  const totalMes = useMemo(()=> servicos.reduce((acc, s)=> acc + parseBR(s.valor), 0), [servicos]);
  const totalDespesas = useMemo(()=> despesas.reduce((acc, d)=> acc + parseBR(d.valor), 0), [despesas]);
  const totalEmpresa = useMemo(()=> {
    const emp = (totais || []).find(t => t.usuario_id === 'empresa');
    return Number(emp?.saldo ?? 0);
  }, [totais]);

  const onSalvarComissoes = async () => {
    setSavingComissoes(true);
    try {
      // validação: soma dos percentuais não pode ultrapassar 100%
      const soma = (totais || [])
        .filter(t => t.usuario_id !== 'empresa')
        .reduce((acc, t) => acc + (Number(comissoes[t.usuario_id] ?? t.percentual ?? 0)), 0);
      if (soma > 100.0001) {
        throw new Error(`A soma das comissões (${soma.toFixed(2)}%) ultrapassa 100%.`);
      }
      const items = Object.entries(comissoes).map(([usuario_id, percentual])=> ({ usuario_id: Number(usuario_id), percentual: Number(percentual)||0 }));
      const resp = await fetchAuth(getApiUrl('financas/comissoes'), { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ items }) });
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await resp.text();
        throw new Error('Salvar comissões: resposta não é JSON');
      }
      const json = await resp.json();
  if (!json.success) throw new Error(json.message || 'Falha ao salvar comissões');
  pushToast('Comissões salvas', { type: 'success' });
      await loadData(month);
    } catch (e) {
      pushToast('Erro: ' + e.message, { type: 'error' });
    } finally {
      setSavingComissoes(false);
    }
  };

  const pagarUsuario = async (usuario_id) => {
    try {
      setPaying(prev => ({ ...prev, [usuario_id]: true }));
      const valor = valoresPagar[usuario_id];
      const body = { usuario_id, month };
      const parsedValor = valor === undefined || valor === '' ? undefined : Number(valor);
      if (!isNaN(parsedValor)) body.valor = parsedValor;
      const resp = await fetchAuth(getApiUrl('financas/pagar'), { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await resp.text();
        throw new Error('Pagamento: resposta não é JSON');
      }
      const json = await resp.json();
      if (!json.success) throw new Error(json.message || 'Falha ao pagar');
      const registrado = Number(json.registrado || json.total || 0);
      pushToast(`Pagamento registrado: R$ ${registrado.toFixed(2)}`, { type: 'success' });
      // refresh totals and services
      await loadData(month);
  // reset input para 0 após registrar pagamento
  setValoresPagar(prev => ({ ...prev, [usuario_id]: '0' }));
    } catch (e) {
      pushToast('Erro: ' + e.message, { type: 'error' });
    } finally {
      setPaying(prev => ({ ...prev, [usuario_id]: false }));
    }
  };

  const toggleHistorico = async (usuario_id) => {
    const willExpand = !expanded[usuario_id];
    setExpanded(prev => ({ ...prev, [usuario_id]: willExpand }));
    if (willExpand && !historicos[usuario_id]) {
      try {
        setLoadingHist(prev => ({ ...prev, [usuario_id]: true }));
        const resp = await fetchAuth(getApiUrl(`financas/pagamentos?usuario_id=${usuario_id}&month=${encodeURIComponent(month)}`));
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await resp.text();
          throw new Error('Histórico: resposta não é JSON');
        }
        const json = await resp.json();
        if (!json.success) throw new Error(json.message || 'Falha ao buscar histórico');
        setHistoricos(prev => ({ ...prev, [usuario_id]: json.data || [] }));
      } catch (e) {
        pushToast('Erro: ' + e.message, { type: 'error' });
      } finally {
        setLoadingHist(prev => ({ ...prev, [usuario_id]: false }));
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Finanças</h1>
        <div className="toolbar">
          <MonthPicker value={month} onChange={(m)=>{ setMonth(m); loadData(m); }} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><span className="label">Faturamento do mês</span><span className="value">{fmt(totalMes)}</span></div>
        <div className="stat-card"><span className="label">Despesas do mês</span><span className="value">{fmt(totalDespesas)}</span></div>
        <div className="stat-card"><span className="label">Empresa (saldo)</span><span className="value">{fmt(totalEmpresa)}</span></div>
        <div className="stat-card"><span className="label">Funcionários</span><span className="value">{(totais||[]).filter(t=>t.usuario_id!=='empresa').length}</span></div>
      </div>

      {loading ? (
        <div className="loading"><span className="spinner"/>Carregando…</div>
      ) : (
        <div className="grid">
          <div>
            <h2 className="section-title">Serviços do mês</h2>
            <div className="card">
              {servicos.length === 0 ? (
                <div className="empty">Nenhum serviço no mês.</div>
              ) : (
                <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="nowrap">Data</th>
                      <th>Cliente</th>
                      <th className="nowrap">Valor</th>
                      <th>Funcionários</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicos.map(s => (
                      <tr key={s.id}>
                        <td className="nowrap data-cell">{new Date(s.data).toLocaleDateString('pt-BR')}</td>
                        <td>{s.cliente_nome}</td>
                        <td className="nowrap valor-cell">{fmt(s.valor)}</td>
                        <td>
                          <div className="funcionarios-cell">
                            <div className="funcionarios-add">
                              <UserSelectInline onAdd={async (usuarioId)=>{
                                try {
                                  const resp = await fetchAuth(getApiUrl(`financas/servicos/${s.id}/usuarios`), { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ usuario_id: usuarioId }) });
                                  const json = await resp.json();
                                  if (!json.success) throw new Error(json.message||'Falha ao adicionar');
                                  pushToast('Usuário adicionado ao serviço', { type:'success' });
                                  await loadData(month);
                                } catch(e){
                                  pushToast('Erro: '+e.message, { type:'error' });
                                }
                              }} />
                            </div>
                            <div className="funcionarios-list">
                              {(Array.isArray(s.funcionarios) ? s.funcionarios : []).map((f, idx) => {
                                const display = shortName(f.nome) || ('#'+f.usuario_id);
                                return (
                                <span key={idx} className="pill sm" title={f.nome}>
                                  {display} ({Number(f.percentual||0)}%)
                                  <button
                                    className="close"
                                    title="Remover"
                                    onClick={async ()=>{
                                      try {
                                        const resp = await fetchAuth(getApiUrl(`financas/servicos/${s.id}/usuarios/${f.usuario_id}`), { method:'DELETE' });
                                        const json = await resp.json();
                                        if (!json.success) throw new Error(json.message||'Falha ao remover');
                                        pushToast('Usuário removido do serviço', { type:'success' });
                                        await loadData(month);
                                      } catch(e){
                                        pushToast('Erro: '+e.message, { type:'error' });
                                      }
                                    }}>
                                    ×
                                  </button>
                                </span>
                              );})}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="table-foot">Total do mês: {fmt(totalMes)}</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="section-title">Totais por funcionário</h2>
            <div className="card">
              {totais.length === 0 ? (
                <div className="empty">Sem totais para o mês.</div>
              ) : (
                <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                  {totais.map(t => {
                    const total = Number(t.total || 0);
                    const pago = Number(t.pago || 0);
                    const saldo = Number(t.saldo != null ? t.saldo : total - pago);
                    // default input 0.00
                    const inputValor = valoresPagar[t.usuario_id] ?? '0';
                    const isPaying = !!paying[t.usuario_id];
                    return (
                      <li key={t.usuario_id} className="row total-row">
                        <div className="row-main">
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {t.usuario_id !== 'empresa' && (
                              <button className="icon-btn" title="Ver histórico deste mês" onClick={() => toggleHistorico(t.usuario_id)} aria-label="Ver histórico">
                                ⓘ
                              </button>
                            )}
                            <div className="nome">
                              {t.nome || ('Usuário #' + t.usuario_id)}
                              {typeof t.percentual === 'number' && (
                                <span style={{ marginLeft:6, color:'#666', fontWeight:400 }}>({Number(t.percentual).toFixed(2)}%)</span>
                              )}
                            </div>
                          </div>
                          <div className="valores">
                            {t.usuario_id !== 'empresa' && (
                              <span className="muted small">Total {fmt(total)} · Pago {fmt(pago)}</span>
                            )}
                            <span className={saldo<0? 'saldo negativo' : saldo>0? 'saldo' : 'saldo zero'}>
                              Saldo: {fmt(saldo)}
                            </span>
                            {t.usuario_id === 'empresa' && t.empresa && (
                              <span className="muted small">Bruto {fmt(t.empresa.bruto)} · Despesas {fmt(t.empresa.despesas)}</span>
                            )}
                          </div>
                        </div>
                        {t.usuario_id !== 'empresa' && (
                        <div className="row-actions">
                          <div className="money-box">
                            <span className="prefix">R$</span>
                            <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder={'0.00'}
                            value={inputValor}
                            onChange={e => setValoresPagar(prev => ({ ...prev, [t.usuario_id]: e.target.value }))}
                            className="money-input"
                            disabled={isPaying}
                          />
                          </div>
                          <button
                            className="btn sm"
                            disabled={isPaying}
                            onClick={() => pagarUsuario(t.usuario_id)}
                          >{isPaying ? 'Pagando…' : 'Pagar'}</button>
                        </div>
                        )}
                        {t.usuario_id !== 'empresa' && expanded[t.usuario_id] && (
                          <div className="historico">
                            {loadingHist[t.usuario_id] ? (
                              <div className="hist-line">Carregando histórico…</div>
                            ) : (
                              (historicos[t.usuario_id] && historicos[t.usuario_id].length > 0) ? (
                                historicos[t.usuario_id].map(h => (
                                  <HistoricoItem 
                                    key={h.id}
                                    item={h}
                                    fmt={fmt}
                                    onSave={async (novoValor)=>{
                                      const resp = await fetchAuth(getApiUrl(`financas/pagamentos/${h.id}`), { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ valor: novoValor }) });
                                      const json = await resp.json();
                                      if (!json.success) throw new Error(json.message||'Falha ao editar pagamento');
                                      pushToast('Pagamento atualizado', { type:'success' });
                                      await loadData(month);
                                      setHistoricos(prev=> ({ ...prev, [t.usuario_id]: undefined }));
                                      setExpanded(prev=> ({ ...prev, [t.usuario_id]: false }));
                                      await toggleHistorico(t.usuario_id); // força recarregar
                                    }}
                                    onDelete={async ()=>{
                                      const resp = await fetchAuth(getApiUrl(`financas/pagamentos/${h.id}`), { method:'DELETE' });
                                      const json = await resp.json();
                                      if (!json.success) throw new Error(json.message||'Falha ao remover pagamento');
                                      pushToast('Pagamento removido', { type:'success' });
                                      await loadData(month);
                                      setHistoricos(prev=> ({ ...prev, [t.usuario_id]: undefined }));
                                      setExpanded(prev=> ({ ...prev, [t.usuario_id]: false }));
                                      await toggleHistorico(t.usuario_id);
                                    }}
                                  />
                                ))
                              ) : (
                                <div className="hist-line vazio">Sem pagamentos neste mês.</div>
                              )
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <h3 className="section-title" style={{ marginTop:16 }}>Comissões padrão</h3>
            <div className="card" style={{ padding:12 }}>
              <p className="muted" style={{ marginTop:0 }}>Defina a % padrão por usuário (0-100). Depois, salve.</p>
              {(() => {
                const usuariosSemEmpresa = (totais || []).filter(t => t.usuario_id !== 'empresa');
                const somaPct = usuariosSemEmpresa.reduce((acc, t) => acc + (Number(comissoes[t.usuario_id] ?? t.percentual ?? 0)), 0);
                const pctEmpresa = Math.max(0, 100 - somaPct);
                return (
              <div className="comissoes-grid">
                {usuariosSemEmpresa.map(t => (
                  <label key={t.usuario_id} className="comissao-item">
                    <span className="comissao-nome">{t.nome || ('Usuário #' + t.usuario_id)}</span>
                    <div className="comissao-input">
                      <input type="number" min={0} max={100} step="0.5"
                        value={comissoes[t.usuario_id] ?? (t.percentual ?? '')}
                        onChange={e => setComissoes(prev => ({ ...prev, [t.usuario_id]: e.target.value }))}
                        placeholder="%" />
                      <span>%</span>
                    </div>
                  </label>
                ))}
                <div className="comissao-item" style={{ opacity:.9 }}>
                  <span className="comissao-nome">Empresa (automático)</span>
                  <div className="comissao-input">
                    <input type="number" readOnly value={pctEmpresa.toFixed(2)} />
                    <span>%</span>
                  </div>
                </div>
              </div>
                );
              })()}
              <div style={{ marginTop:12 }}>
                <button className="btn" disabled={savingComissoes} onClick={onSalvarComissoes}>
                  {savingComissoes ? 'Salvando…' : 'Salvar comissões'}
                </button>
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop:16 }}>Despesas do mês</h3>
            <div className="card" style={{ padding:12 }}>
              <div className="inline-form compact">
                <input
                  type="text"
                  placeholder="Descrição (ex: Gasolina)"
                  value={novaDespesa.descricao}
                  onChange={e=> setNovaDespesa(prev=> ({ ...prev, descricao: e.target.value }))}
                  style={{ flex:1, padding:'6px 8px' }}
                />
                <div className="money-box">
                  <span className="prefix">R$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className="money-input"
                    value={novaDespesa.valor}
                    onChange={e=> setNovaDespesa(prev=> ({ ...prev, valor: e.target.value }))}
                  />
                </div>
                <button className="btn" onClick={async ()=>{
                  try {
                    const v = Number(novaDespesa.valor);
                    if (!novaDespesa.descricao || !(v > 0)) {
                      pushToast('Preencha descrição e valor > 0', { type:'warning' });
                      return;
                    }
                    const resp = await fetchAuth(getApiUrl('financas/despesas'), { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ month, descricao: novaDespesa.descricao, valor: v }) });
                    const json = await resp.json();
                    if (!json.success) throw new Error(json.message || 'Falha ao criar despesa');
                    setNovaDespesa({ descricao:'', valor:'' });
                    await loadData(month);
                  } catch(e){
                    pushToast('Erro: '+e.message, { type:'error' });
                  }
                }}>Adicionar</button>
              </div>
              {despesas.length === 0 ? (
                <div className="empty">Sem despesas no mês.</div>
              ) : (
                <ul className="despesas-list" style={{ listStyle:'none', padding:0, margin:0 }}>
                  {despesas.map(d => (
                    <li key={d.id} className="hist-line" style={{ alignItems:'center' }}>
                      <span>{new Date(d.created_at).toLocaleString()}</span>
                      <span style={{ flex:1 }}>{d.descricao}</span>
                      <span>{fmt(d.valor)}</span>
                      <button className="btn" style={{ padding:'4px 8px' }} title="Remover" onClick={async ()=>{
                        try {
                          const resp = await fetchAuth(getApiUrl(`financas/despesas/${d.id}`), { method:'DELETE' });
                          const json = await resp.json();
                          if (!json.success) throw new Error(json.message || 'Falha ao remover');
                          await loadData(month);
                        } catch(e){ pushToast('Erro: '+e.message, { type:'error' }); }
                      }}>Excluir</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financas;
