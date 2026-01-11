import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Store, Clock, TrendingUp, ArrowRight, Activity, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tenant } from '../types';
import { useTranslation } from '../hooks/useTranslation';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ReviewAnalytics: React.FC = () => {
  const [data, setData] = useState([
    { name: 'Sentimen Positif', count: 0, color: '#22c55e' }, // Emerald-500
    { name: 'Sentimen Negatif', count: 0, color: '#ef4444' }, // Red-500
  ]);
  const [summary, setSummary] = useState({ total: 0, satisfaction: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reviewsColl = collection(db, "app_ratings");
    
    const unsubscribe = onSnapshot(reviewsColl, (snapshot) => {
      let positive = 0;
      let negative = 0;

      snapshot.forEach(doc => {
        const d = doc.data();
        const sentiment = d.sentiment?.toLowerCase();
        
        if (sentiment === 'positif') {
          positive++;
        } else if (sentiment === 'negatif') {
          negative++;
        } else if (!sentiment) {
           // If sentiment field is missing, use rating as secondary source
           const rating = d.rating || 0;
           if (rating >= 4) positive++;
           else if (rating > 0 && rating <= 3) negative++;
        }
        // 'netral' is skipped explicitly
      });

      const total = positive + negative;
      const satisfaction = total > 0 ? Math.round((positive / total) * 100) : 0;

      setData([
        { name: 'Positif', count: positive, color: '#22c55e' },
        { name: 'Negatif', count: negative, color: '#ef4444' },
      ]);
      setSummary({ total, satisfaction });
      setLoading(false);
    }, (error) => {
      console.error("Error listening to reviews:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-cardBg border border-glassBorder rounded-2xl p-6 relative overflow-hidden h-full flex flex-col shadow-xl">
      <div className="flex justify-between items-center mb-6">
         <h3 className="text-white font-bold flex items-center gap-2">
            <Activity className="text-gold" size={20}/> Analisa Kepuasan
         </h3>
         <div className="bg-white/5 px-3 py-1 rounded-full text-[10px] text-gray-400 font-mono tracking-widest uppercase">Sentiment AI</div>
      </div>
      
      <div className="flex-1 w-full min-h-[220px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
             <Loader2 className="animate-spin text-gold" size={32}/>
          </div>
        ) : summary.total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs">
             <Activity size={40} className="mb-2 opacity-20"/>
             Belum ada ulasan teranalisa.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', border: '1px solid rgba(255,215,0,0.1)' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
         <div className="flex justify-between items-end">
            <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">Total Feedback Valid</span>
            <span className="text-white font-bold text-lg">{summary.total}</span>
         </div>
         <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 w-[var(--progress-width)]" 
              style={{ '--progress-width': `${summary.satisfaction}%` } as React.CSSProperties}
            ></div>
         </div>
         <div className="flex justify-between text-[10px] font-bold">
            <span className="text-emerald-400">{summary.satisfaction}% Kepuasan</span>
            <span className="text-gray-500">Target: 85%</span>
         </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  loading?: boolean;
  subtext?: string;
  isGold?: boolean;
}> = ({ title, value, icon, loading, subtext, isGold }) => (
  <div className={`p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 border glass-shine-hover ${isGold ? 'bg-gold border-gold' : 'bg-cardBg border-glassBorder hover:border-gold/50'}`}>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${isGold ? 'bg-black/10 text-black' : 'bg-darkBg text-gold'}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
        </div>
      </div>
      
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isGold ? 'text-black/60' : 'text-textSecondary'}`}>{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-gray-700/50 rounded animate-pulse"></div>
        ) : (
          <h3 className={`text-3xl font-bold ${isGold ? 'text-black' : 'text-white'}`}>{value}</h3>
        )}
        {subtext && !loading && (
          <p className={`text-xs mt-1 ${isGold ? 'text-black/70' : 'text-gray-500'}`}>{subtext}</p>
        )}
      </div>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {  
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const [stats, setStats] = useState({
    activeTenants: 0,
    waitingApproval: 0,
    totalUsers: 0,
    revenue: "Rp 0",
    transactions: 0
  });
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // 1. Real-time Users Count
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const total = snapshot.size;
      const deleted = snapshot.docs.filter(d => d.data().isDeleted === true).length;
      setStats(prev => ({ ...prev, totalUsers: total - deleted }));
    });

    // 2. Real-time Tenants (Revenue, Pending, Recent)
    // Optimized: Only fetch what is necessary for the dashboard
    const unsubscribeTenants = onSnapshot(query(collection(db, "tenants"), orderBy('created_at', 'desc')), (snapshot) => {
      let calculatedRevenue = 0;
      let successfulRegistrations = 0;
      let pendingCount = 0;
      const recents: Tenant[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as Tenant;
        const status = (data.status as string) || '';
        
        if (status === 'deleted') return;

        // Stats: Global Totals
        if (status === 'active') {
          const amount = data.invoice?.amount || data.registration_fee || 0;
          calculatedRevenue += amount;
          successfulRegistrations++;
        }

        // List: Pending Action Items (Needs Review)
        if (['waiting_proof', 'payment_submitted', 'pending_payment', 'awaiting_payment', 'cancellation_requested'].includes(status)) {
          pendingCount++;
          // Only show top 5 in dashboard for performance
          if (recents.length < 5) {
            recents.push({ ...data, id: doc.id });
          }
        }
      });

      const revenueString = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
      }).format(calculatedRevenue);

      setStats(prev => ({
        ...prev,
        waitingApproval: pendingCount,
        revenue: revenueString,
        transactions: successfulRegistrations
      }));
      setRecentTenants(recents);
    });

    // 3. Real-time Barbershops (Active Partners Count - Source of Truth)
    const unsubscribeBarbershops = onSnapshot(collection(db, "barbershops"), (snapshot) => {
       // Count all barbershops that are not soft-deleted
       const count = snapshot.docs.filter(doc => !doc.data().isDeleted).length;
       setStats(prev => ({ ...prev, activeTenants: count }));
       setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTenants();
      unsubscribeBarbershops();
    };
  }, []);

  return (
    <Layout>
      <div className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('common.command_center')}</h1>
          <p className="text-textSecondary mt-1">{t('common.overview')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-gold bg-gold/10 px-4 py-2 rounded-full border border-gold/20">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
          Realtime
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title={t('dashboard.revenue')} 
          value={stats.revenue} 
          icon={<TrendingUp />} 
          loading={loading}
          isGold={true} 
          subtext={`${stats.transactions} ${t('dashboard.sub_trans')}`}
        />
        <StatCard 
          title={t('dashboard.active_tenants')} 
          value={stats.activeTenants} 
          icon={<Store />} 
          loading={loading}
          subtext={t('dashboard.sub_shops')}
        />
        <StatCard 
          title={t('dashboard.pending')} 
          value={stats.waitingApproval} 
          icon={<Clock />} 
          loading={loading} 
          subtext={t('dashboard.sub_action')}
        />
        <StatCard 
          title={t('dashboard.total_users')} 
          value={stats.totalUsers} 
          icon={<Users />} 
          loading={loading}
          subtext={t('dashboard.sub_cust')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-cardBg rounded-2xl border border-glassBorder overflow-hidden flex flex-col">
          <div className="p-6 border-b border-glassBorder flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="text-gold" size={20}/> {t('dashboard.recent_reg')}
            </h2>
            <button 
              onClick={() => navigate('/inbox')}
              className="text-xs text-gold hover:text-white transition-colors flex items-center gap-1 font-bold uppercase tracking-wider"
            >
              {t('dashboard.view_all')} <ArrowRight size={12} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto min-h-[300px]">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse"></div>)}
              </div>
            ) : recentTenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-textSecondary p-8">
                <Clock size={40} className="mb-2 opacity-50" />
                <p>{t('dashboard.no_data')}</p>
              </div>
            ) : (
              <div className="divide-y divide-glassBorder">
                {recentTenants.map((tenant) => {
                   const hasProof = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
                   const isRefundReq = tenant.status === 'cancellation_requested';
                   
                   return (
                    <div key={tenant.id} className="p-5 hover:bg-white/5 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                
                        <div>
                          <h4 className="text-white font-bold text-sm mb-1">{tenant.business_name}</h4>
                          <div className="flex items-center gap-2 text-xs text-textSecondary">
                             <span>{tenant.owner_email}</span>
                             <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                             <span className="flex items-center gap-1"><Calendar size={10}/> {formatDate(tenant.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isRefundReq
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : hasProof 
                              ? 'bg-gold/10 text-gold border border-gold/20' 
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' // Changed to green/neutral for non-pending
                          }`}>
                            {isRefundReq ? 'Refund Req' : (hasProof ? t('dashboard.ready_review') : tenant.status.replace('_', ' '))}
                          </span>
                        </div>
                        <button 
                          onClick={() => navigate(isRefundReq ? `/tenants/${tenant.id}` : '/inbox')}
                          aria-label="View Details"
                          className="p-2 text-textSecondary hover:text-white bg-transparent hover:bg-white/10 rounded-lg transition-all"
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                   );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <ReviewAnalytics />
        </div>
      </div>
    </Layout>
  );
};