import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const DashboardLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#050B18' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '240px' }}>
        <TopBar />
        <main style={{ marginTop: '64px', padding: '24px', minHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
