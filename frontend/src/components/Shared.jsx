import React from 'react';

export const KPICard = ({ icon, label, value, color, trend }) => {
  return (
    <div style={{
      backgroundColor: '#0D1526',
      borderRadius: '1rem',
      padding: '1.5rem',
      border: '1px solid rgba(99,102,241,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 0 15px rgba(99,102,241,0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        color: color
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: '#94A3B8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ color: '#F8FAFC', fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</div>
        {trend && <div style={{ color: trend.startsWith('+') ? '#10B981' : '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{trend}</div>}
      </div>
    </div>
  );
};

export const DataTable = ({ columns, data, loading }) => {
  if (loading) return <LoadingSkeleton />;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
            {columns.map((col, i) => (
              <th key={i} style={{ padding: '1rem', color: '#94A3B8', fontWeight: '600', fontSize: '0.875rem' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ 
              borderBottom: '1px solid rgba(99,102,241,0.1)',
              backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
            }}>
              {columns.map((col, j) => (
                <td key={j} style={{ padding: '1rem', color: '#F8FAFC', fontSize: '0.875rem' }}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const LoadingSkeleton = () => (
  <div style={{
    width: '100%',
    height: '100%',
    minHeight: '200px',
    backgroundColor: '#0D1526',
    borderRadius: '1rem',
    border: '1px solid rgba(99,102,241,0.2)',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <style>
      {`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}
    </style>
    <div style={{ color: '#6366F1' }}>Loading...</div>
  </div>
);

export const ErrorState = ({ message }) => (
  <div style={{
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid #EF4444',
    borderRadius: '1rem',
    padding: '2rem',
    color: '#F8FAFC',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
    <div style={{ color: '#EF4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>Error Loading Data</div>
    <div style={{ color: '#94A3B8' }}>{message}</div>
  </div>
);
