import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          📊 CRM Services
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className={isActive('/')}>
              🏠 Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/clientes" className={isActive('/clientes')}>
              👥 Clientes
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/servicos" className={isActive('/servicos')}>
              🔧 Serviços
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/recontatos" className={isActive('/recontatos')}>
              📞 Recontatos
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
