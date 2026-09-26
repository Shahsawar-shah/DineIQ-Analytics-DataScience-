import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { KPICard, DataTable, LoadingSkeleton, ErrorState } from '../components/Shared';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sumData = await api.menu.summary();
        const topData = await api.menu.topRevenue(5);
        setSummary(sumData);
        setTopItems(topData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}><LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton /></div>;
  if (error) return <ErrorState message={error} />;

  const pieData = summary ? [
    { name: 'Profit Driver', value: summary.classifications['Profit Driver'] || 0, color: '#10B981' },
    { name: 'Volume Driver', value: summary.classifications['Volume Driver'] || 0, color: '#6366F1' },
    { name: 'Hidden Opportunity', value: summary.classifications['Hidden Opportunity'] || 0, color: '#F59E0B' },
    { name: 'Low Performer', value: summary.classifications['Low Performer'] || 0, color: '#EF4444' }
  ] : [];

  const tableColumns = [
    { header: 'Rank', render: (row) => `#${topItems.indexOf(row) + 1}` },
    { header: 'Item Name', accessor: 'item_name' },
    { header: 'Revenue', render: (row) => `$${row.revenue.toLocaleString()}` },
    { header: 'Profit Margin', render: (row) => (
      <span style={{ 
        color: row.profit_margin > 0.6 ? '#10B981' : (row.profit_margin > 0.4 ? '#F59E0B' : '#EF4444'),
        backgroundColor: `${row.profit_margin > 0.6 ? '#10B981' : (row.profit_margin > 0.4 ? '#F59E0B' : '#EF4444')}20`,
        padding: '0.25rem 0.5rem',
        borderRadius: '1rem',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      }}>
        {(row.profit_margin * 100).toFixed(1)}%
      </span>
    )},
    { header: 'Rating', render: (row) => `⭐ ${row.rating.toFixed(1)}` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
        <KPICard icon="💰" label="Total Revenue" value={`$${summary.total_revenue.toLocaleString()}`} color="#10B981" trend="+12.5%" />
        <KPICard icon="🍽️" label="Menu Items" value="150" color="#6366F1" />
        <KPICard icon="🔥" label="Profit Drivers" value={summary.classifications['Profit Driver'] || 0} color="#F59E0B" />
        <KPICard icon="⭐" label="Avg Rating" value={summary.avg_rating.toFixed(2)} color="#06B6D4" trend="+0.1" />
        <KPICard icon="🗑️" label="Avg Wastage" value={`${(summary.avg_wastage * 100).toFixed(1)}%`} color="#EF4444" trend="-2.1%" />
      </div>

      {/* Row 2 */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: '6', backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1rem' }}>Top 5 Revenue Items</h3>
          <DataTable columns={tableColumns} data={topItems} />
        </div>
        <div style={{ flex: '4', backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1rem' }}>Classification Distribution</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050B18', borderColor: 'rgba(99,102,241,0.2)', color: '#F8FAFC', borderRadius: '0.5rem' }} 
                  itemStyle={{ color: '#F8FAFC' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>Total Items: {pieData.reduce((acc, curr) => acc + curr.value, 0)}</div>
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>Data Quality Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#050B18', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Records Processed</div>
              <div style={{ color: '#F8FAFC', fontSize: '1.25rem', fontWeight: 'bold' }}>1,305,677</div>
            </div>
            <div style={{ backgroundColor: '#050B18', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>After Cleaning</div>
              <div style={{ color: '#F8FAFC', fontSize: '1.25rem', fontWeight: 'bold' }}>1,289,177</div>
            </div>
            <div style={{ backgroundColor: '#050B18', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Errors Fixed</div>
              <div style={{ color: '#10B981', fontSize: '1.25rem', fontWeight: 'bold' }}>13,500</div>
            </div>
            <div style={{ backgroundColor: '#050B18', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Quarantined</div>
              <div style={{ color: '#EF4444', fontSize: '1.25rem', fontWeight: 'bold' }}>3,000</div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#94A3B8' }}>Data Quality Score</span>
              <span style={{ color: '#10B981', fontWeight: 'bold' }}>98.7%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#050B18', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '98.7%', height: '100%', backgroundColor: '#10B981', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#0D1526', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h3 style={{ color: '#F8FAFC', marginTop: 0, marginBottom: '1.5rem' }}>ML Pipeline Status</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, backgroundColor: '#050B18', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: '#F8FAFC', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🐍</span> Python Pipeline
              </div>
              <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Models: XGBoost, RF, DT</div>
              <div style={{ color: '#10B981', fontSize: '0.875rem', fontWeight: 'bold' }}>Best: XGBoost F1: 1.00</div>
              <div style={{ marginTop: 'auto', paddingTop: '1rem', color: '#10B981', fontWeight: 'bold', fontSize: '0.875rem' }}>✅ Complete</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#050B18', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: '#F8FAFC', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚡</span> Spark Pipeline
              </div>
              <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Models: RF, GBT, LogReg</div>
              <div style={{ marginTop: 'auto', paddingTop: '1rem', color: '#F59E0B', fontWeight: 'bold', fontSize: '0.875rem' }}>⏳ Running on VPS</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: '1rem', backgroundColor: '#050B18', borderRadius: '0.5rem', border: '1px dashed rgba(99,102,241,0.3)' }}>
            Pipeline Agreement: <span style={{ color: '#F8FAFC', fontStyle: 'italic' }}>Pending VPS results</span>
          </div>
        </div>
      </div>
    </div>
  );
}
