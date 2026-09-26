import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { icon: '🏠', label: 'Overview', path: '/dashboard', exact: true },
  { icon: '📊', label: 'Menu Intelligence', path: '/dashboard/menu' },
  { icon: '👥', label: 'Customers', path: '/dashboard/customers' },
  { icon: '🗑️', label: 'Wastage', path: '/dashboard/wastage' },
  { icon: '🔮', label: 'Dual Pipeline', path: '/dashboard/pipeline' },
  { icon: '💡', label: 'Recommendations', path: '/dashboard/recommendations' },
  { icon: '⚙️', label: 'Settings', path: '/dashboard/settings' },
];

export const Sidebar = () => {
  return (
    <div style={{
      width: '240px',
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      backgroundColor: '#050B18',
      borderRight: '1px solid rgba(99,102,241,0.2)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 0',
      zIndex: 100
    }}>
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#F8FAFC', fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🍽️</span> DineIQ Analytics
        </h1>
      </div>
      
      <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item, i) => (
          <NavLink
            key={i}
            to={item.path}
            end={item.exact}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              color: isActive ? '#F8FAFC' : '#94A3B8',
              backgroundColor: isActive ? '#6366F1' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.2s',
              boxShadow: isActive ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
              fontWeight: isActive ? '600' : '400',
            })}
            onMouseEnter={(e) => {
              if (e.currentTarget.style.backgroundColor === 'transparent') {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.className.includes('active')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: '#06B6D4', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
          TechWiz 7 Competition
        </div>
        <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>v1.0.0</div>
      </div>
    </div>
  );
};
