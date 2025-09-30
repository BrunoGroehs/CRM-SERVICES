import React, { useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { getApiUrl } from '../utils/api';

// Inline select to add a user to a service
export default function UserSelectInline({ onAdd }) {
  const fetchAuth = useAuthenticatedFetch();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(()=>{
    (async ()=>{
      try {
        const resp = await fetchAuth(getApiUrl('usuarios/min'));
        const json = await resp.json();
        setUsers(json.data || []);
      } catch(e) { /* ignore */ }
    })();
  }, []);

  const add = () => {
    const id = Number(selected);
    if (id && onAdd) onAdd(id);
    setSelected('');
  };

  return (
    <div className="user-select-inline">
      <select value={selected} onChange={(e)=>setSelected(e.target.value)}>
        <option value="">Adicionar funcionário…</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
      </select>
      <button className="btn sm" onClick={add} disabled={!selected}>Adicionar</button>
    </div>
  );
}
