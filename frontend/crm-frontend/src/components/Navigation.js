import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleAdminClick = () => {
    navigate('/admin');
    setIsDropdownOpen(false);
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('.hamburger')) {
        setMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fechar menu mobile ao navegar
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Body scroll lock
  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }, [mobileOpen]);

  return (
  <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <img src="/logo.png" alt="CRM Services" className="nav-logo-img" />
          CRM Services
        </Link>
        <button className={`hamburger ${mobileOpen ? 'is-active' : ''}`} aria-label="Menu" aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(o => !o)}>
          <span />
          <span />
          <span />
        </button>
  {/* Backdrop */}
  <div className={`nav-backdrop ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />
  <ul ref={mobileMenuRef} className={`nav-menu ${mobileOpen ? 'open' : ''}`}>
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
          <li className="nav-item">
            <Link to="/calendario" className={isActive('/calendario')}>
              📅 Calendário
            </Link>
          </li>
        </ul>
  <div className="nav-user">
          <div className="user-menu" ref={dropdownRef}>
            <div className="user-avatar" onClick={toggleDropdown}>
              {user?.foto_perfil ? (
                <img src={user.foto_perfil} alt="Avatar" />
              ) : (
                <span className="user-avatar-fallback">👤</span>
              )}
            </div>
            <div className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
              <div className="dropdown-item user-name">
                👤 {user?.nome || user?.email}
              </div>
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <button className="dropdown-item admin-link" onClick={handleAdminClick}>
                  🛡️ Admin
                </button>
              )}
              <button className="dropdown-item logout" onClick={handleLogout}>
                🚪 Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
