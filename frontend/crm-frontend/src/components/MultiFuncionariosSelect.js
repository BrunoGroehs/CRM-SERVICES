import React from 'react';
import '../styles/components/funcionarios.css';

/**
 * MultiFuncionariosSelect
 * Props:
 *  - usuarios: [{ id, nome, email }]
 *  - value: [{ id, nome }]
 *  - onChange: fn(newArray)
 *  - label (optional)
 *  - hint (optional)
 */
const MultiFuncionariosSelect = ({ usuarios = [], value = [], onChange, label = 'Funcionários', hint }) => {
  const addUser = (userId) => {
    if (!userId) return;
    const user = usuarios.find(u => String(u.id) === String(userId));
    if (!user) return;
    if (value.some(v => v.id === user.id)) return; // already
    onChange([ ...value, { id: user.id, nome: user.nome || user.email } ]);
  };

  const removeUser = (id) => {
    onChange(value.filter(v => v.id !== id));
  };

  return (
    <div className="multi-funcionarios-wrapper">
      <label className="multi-funcionarios-label">{label}</label>
      <div className="multi-funcionarios-control">
        <select onChange={e => { addUser(e.target.value); e.target.value=''; }}>
          <option value="">Selecionar usuário...</option>
          {usuarios.filter(u => !value.some(v => v.id === u.id)).map(u => (
            <option key={u.id} value={u.id}>{u.nome || u.email}</option>
          ))}
        </select>
      </div>
      {value.length > 0 && (
        <div className="multi-funcionarios-chips">
          {value.map(f => (
            <span key={f.id} className="func-chip" title={f.nome}>
              {f.nome}
              <button type="button" onClick={() => removeUser(f.id)} aria-label={`Remover ${f.nome}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <small className="multi-funcionarios-hint">{hint || 'Armazena somente id e nome (sem FK) para cálculo de custos e repasses.'}</small>
    </div>
  );
};

export default MultiFuncionariosSelect;