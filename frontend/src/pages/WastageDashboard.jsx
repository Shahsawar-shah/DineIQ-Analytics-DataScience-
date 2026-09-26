import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { KPICard, DataTable, LoadingSkeleton, ErrorState } from '../components/Shared';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function WastageDashboard() {
  const [highWastage, setHighWastage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.menu.highWastage(5)
      .then(data => setHighWastage(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const reasons = [
    { name: 'Overproduction', value: 35, color: '#F59E0B' },
    { name: 'Spoilage', value: 25, color: '#EF4444' },
    { name: 'Prep Error', value: 20, color: '#6366F1' },
    { name: 'Expired', value: 15, color: '#94A3B8' },
    { name: 'Customer Return', value: 5, color: '#10B981' },
  ];

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  const riskColumns = [
    { header: 'Item Name', accessor: 'item_name' },
    { header: 'Wastage %', render: (r) => (
      <span style={{ backgroundColor: '#EF444420', color: '#EF4444', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold' }}>
        {r.wastage_percentage > 0.5 && '⚠️ '} {(r.wastage_percentage * 100).toFixed(1)}%
      </span>
    )},
    { header: 'Revenue Lost (Est)', render: (r) => `$${(r.revenue * r.wastage_percentage).toLocaleString(undefined, {maximumFractionDigits:0})}` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <KPICard icon="🗑️" label="Total Wastage Records" value="49,500" color="#EF4444" />
        <KPICard icon="⚠️" label="High Wastage Items" value="5" color="#F59E0B" />
        <KPICard icon="📊" label="Avg Wastage %" value="24.75%" color="#6366F1" />
        <KPICard icon="✨" label="Impossible Records Cleaned" value="500" color="#10B981" />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>High Wastage Items</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={highWastage}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="item_name" stroke="#94A3B8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#050B18', borderColor: 'rgba(99,102,241,0.2)', color: '#F8FAFC', borderRadius: '0.5rem' }} />
                <Bar dataKey="wastage_percentage" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>Wastage by Reason</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={reasons} innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                  {reasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#050B18', borderColor: 'rgba(99,102,241,0.2)', color: '#F8FAFC', borderRadius: '0.5rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
        <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>Wastage Risk Items (&gt; 50%)</h3>
        <DataTable columns={riskColumns} data={highWastage.filter(i => i.wastage_percentage > 0.5)} />
      </div>
    </div>
  );
}
