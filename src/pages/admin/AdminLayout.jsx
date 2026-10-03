import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthProvider';
import './admin.css';

const AdminSidebar = ({ mobileOpen, setMobileOpen }) => {
  const navItems = [
    { name: 'Dashboard', path: '/admin', exact: true },
    { name: 'Gallery', path: '/admin/gallery' },
    { name: 'Music', path: '/admin/music' },
    { name: 'Tracks', path: '/admin/tracks' },
    { name: 'Beats', path: '/admin/beats' },
    { name: 'Media', path: '/admin/media' },
    { name: 'Links', path: '/admin/links' },
    { name: 'Merchandise', path: '/admin/merchandise' },
    { name: 'Settings', path: '/admin/settings' },
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  };

  return (
    <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-logo">
          chomka<span>STUDIO</span>
        </div>
      </div>
      <nav className="admin-sidebar-nav">
        {navItems.map(item => (
          <NavLink 
            key={item.name} 
            to={item.path}
            end={item.exact}
            onClick={handleNavClick}
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        Silachomka Admin CMS
      </div>
    </aside>
  );
};

const AdminHeader = ({ user, logout, toggleMobile }) => {
  const location = useLocation();
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Dashboard';
    if (path.includes('/gallery')) return 'Gallery Management';
    if (path.includes('/music')) return 'Music Management';
    if (path.includes('/tracks')) return 'Tracks Management';
    if (path.includes('/beats')) return 'Beats Management';
    if (path.includes('/media')) return 'Media Assets';
    if (path.includes('/links')) return 'Social Links';
    if (path.includes('/merchandise')) return 'Merchandise';
    if (path.includes('/settings')) return 'Settings';
    return 'Admin';
  };

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="admin-mobile-toggle" onClick={toggleMobile} aria-label="Toggle Navigation">
          ☰
        </button>
        <div className="admin-header-title">{getPageTitle()}</div>
      </div>
      <div className="admin-header-user">
        <span style={{ color: 'var(--muted)' }}>{user?.email}</span>
        <button onClick={logout} className="studio-pill-btn">Logout</button>
      </div>
    </header>
  );
};

export const AdminLayout = () => {
  const { user, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout-wrapper">
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="admin-main">
        <AdminHeader 
          user={user} 
          logout={logout} 
          toggleMobile={() => setMobileOpen(!mobileOpen)} 
        />
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
