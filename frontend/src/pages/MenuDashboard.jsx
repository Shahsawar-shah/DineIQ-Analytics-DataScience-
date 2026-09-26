import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { KPICard, DataTable, LoadingSkeleton, ErrorState } from '../components/Shared';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function MenuDashboard() {
  const [classifications, setClassifications] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [highWastage, setHighWastage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cls, top, waste] = await Promise.all([
          api.menu.classifications(),
          api.menu.topRevenue(10),
          api.menu.highWastage(5)
        ]);
        setClassifications(cls);
        setTopItems(top);
        setHighWastage(waste);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  const tabs = ['All', 'Profit Driver', 'Volume Driver', 'Hidden Opportunity', 'Low Performer'];
  // We'll mock the tab data by filtering topItems for demonstration since there's no allItems API endpoint mentioned.
  const tableData = activeTab === 'All' ? topItems : topItems.filter(i => i.classification === activeTab);

  const tableColumns = [
    { header: 'Item Name', accessor: 'item_name' },
    { header: 'Category', accessor: 'category' },
    { header: 'Revenue', render: (r) => `$${r.revenue.toLocaleString()}` },
    { header: 'Profit %', render: (r) => `${(r.profit_margin * 100).toFixed(1)}%` },
    { header: 'Rating', render: (r) => `⭐ ${r.rating.toFixed(1)}` },
    { header: 'Wastage %', render: (r) => `${(r.wastage_percentage * 100).toFixed(1)}%` },
    { header: 'Class', render: (r) => (
      <span style={{ 
        color: r.classification === 'Profit Driver' ? '#10B981' : (r.classification === 'Volume Driver' ? '#6366F1' : (r.classification === 'Hidden Opportunity' ? '#F59E0B' : '#EF4444')),
        backgroundColor: `${r.classification === 'Profit Driver' ? '#10B981' : (r.classification === 'Volume Driver' ? '#6366F1' : (r.classification === 'Hidden Opportunity' ? '#F59E0B' : '#EF4444'))}20`,
        padding: '0.25rem 0.5rem',
        borderRadius: '1rem',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        whiteSpace: 'nowrap'
      }}>
        {r.classification}
      </span>
    )},
    { header: 'Prob', render: (r) => `${(r.classification_probability * 100).toFixed(0)}%` }
  ];

  const wasteColumns = [
    { header: 'Item Name', accessor: 'item_name' },
    { header: 'Wastage', render: (r) => (
      <span style={{ 
        color: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.2)',
        padding: '0.25rem 0.5rem',
        borderRadius: '1rem',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        {r.wastage_percentage > 0.5 && '⚠️'} {(r.wastage_percentage * 100).toFixed(1)}%
      </span>
    )},
    { header: 'Revenue', render: (r) => `$${r.revenue.toLocaleString()}` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <KPICard icon="🔥" label="Profit Drivers" value={`${classifications.counts['Profit Driver']} items`} color="#10B981" />
        <KPICard icon="📈" label="Volume Drivers" value={`${classifications.counts['Volume Driver']} items`} color="#6366F1" />
        <KPICard icon="💎" label="Hidden Opportunities" value={`${classifications.counts['Hidden Opportunity']} items`} color="#F59E0B" />
        <KPICard icon="⚠️" label="Low Performers" value={`${classifications.counts['Low Performer']} items`} color="#EF4444" />
      </div>

      <div style={{ backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? '#6366F1' : 'transparent',
                color: activeTab === tab ? '#F8FAFC' : '#94A3B8',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <DataTable columns={tableColumns} data={tableData} />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>Top 10 Revenue</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="item_name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#050B18', borderColor: 'rgba(99,102,241,0.2)', color: '#F8FAFC', borderRadius: '0.5rem' }}
                />
                <Bar dataKey="revenue" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>High Wastage Warning</h3>
          <DataTable columns={wasteColumns} data={highWastage} />
        </div>
      </div>
    </div>
  );
}
