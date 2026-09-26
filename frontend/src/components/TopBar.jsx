import React from 'react';
import { useLocation } from 'react-router-dom';

export const TopBar = () => {
  const location = useLocation();
  const getTitle = () => {
    switch(location.pathname) {
      case '/dashboard': return 'Executive Overview';
      case '/dashboard/menu': return 'Menu Intelligence';
      case '/dashboard/customers': return 'Customer Analytics';
      case '/dashboard/wastage': return 'Wastage Analysis';
      case '/dashboard/pipeline': return 'Dual Pipeline Status';
      case '/dashboard/recommendations': return 'Recommendations';
      case '/dashboard/settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      height: '64px',
      position: 'fixed',
      top: 0,
      left: '240px',
      right: 0,
      backgroundColor: '#050B18',
      borderBottom: '1px solid rgba(99,102,241,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      zIndex: 90
    }}>
      <h2 style={{ color: '#F8FAFC', margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
        {getTitle()}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <span style={{ fontSize: '1.25rem' }}>🔔</span>
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            backgroundColor: '#EF4444',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6rem',
            fontWeight: 'bold'
          }}>3</span>
        </div>
        <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>{dateStr}</div>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#6366F1',
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          SA
        </div>
      </div>
    </div>
  );
};
