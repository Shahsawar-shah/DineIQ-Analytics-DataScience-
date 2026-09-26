import React from 'react';
import { KPICard, DataTable } from '../components/Shared';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function CustomerDashboard() {
  const pieData = [
    { name: 'High-Value Loyal', value: 10000, color: '#10B981' },
    { name: 'Occasional', value: 22500, color: '#6366F1' },
    { name: 'Promotion-Driven', value: 7500, color: '#F59E0B' },
    { name: 'At-Risk', value: 5000, color: '#EF4444' },
    { name: 'New', value: 5000, color: '#06B6D4' },
  ];

  const rfmData = [
    { name: 'Recency', score: 4.2 },
    { name: 'Frequency', score: 3.8 },
    { name: 'Monetary', score: 4.5 },
  ];

  const topCustomers = [
    { id: 'CUST-027', rfm: 15, segment: 'High-Value Loyal', value: 2340 },
    { id: 'CUST-063', rfm: 15, segment: 'High-Value Loyal', value: 2180 },
    { id: 'CUST-101', rfm: 15, segment: 'High-Value Loyal', value: 1950 },
    { id: 'CUST-133', rfm: 15, segment: 'High-Value Loyal', value: 1820 },
    { id: 'CUST-222', rfm: 15, segment: 'High-Value Loyal', value: 1740 },
  ];

  const columns = [
    { header: 'Customer ID', accessor: 'id' },
    { header: 'RFM Score', render: (r) => (
      <span style={{ backgroundColor: '#10B98120', color: '#10B981', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold' }}>
        ⭐ {r.rfm}
      </span>
    )},
    { header: 'Segment', render: (r) => (
      <span style={{ backgroundColor: '#6366F120', color: '#6366F1', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
        {r.segment}
      </span>
    )},
    { header: 'Total Value', render: (r) => <strong style={{ color: '#F8FAFC' }}>${r.value.toLocaleString()}</strong> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <KPICard icon="👥" label="Total Customers" value="50,000" color="#6366F1" />
        <KPICard icon="💎" label="High-Value" value="10,000" color="#10B981" />
        <KPICard icon="⚠️" label="At-Risk" value="5,000" color="#EF4444" />
        <KPICard icon="👋" label="New Customers" value="5,000" color="#06B6D4" />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>Customer Segments</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#050B18', borderColor: 'rgba(99,102,241,0.2)', color: '#F8FAFC', borderRadius: '0.5rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>RFM Score Distribution</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rfmData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} domain={[0, 5]} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#050B18', borderColor: 'rgba(99,102,241,0.2)', color: '#F8FAFC', borderRadius: '0.5rem' }} />
                <Bar dataKey="score" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
        <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>Top Customers (RFM 15)</h3>
        <DataTable columns={columns} data={topCustomers} />
      </div>
    </div>
  );
}
