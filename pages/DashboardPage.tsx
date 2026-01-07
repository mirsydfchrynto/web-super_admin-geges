
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Store, Clock, TrendingUp, ArrowRight, Activity, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tenant } from '../types';
import { useTranslation } from '../hooks/useTranslation';

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  loading?: boolean;
  subtext?: string;
  isGold?: boolean;
}> = ({ title, value, icon, loading, subtext, isGold }) => (
  <div className={`p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 border ${isGold ? 'bg-gold border-gold' : 'bg-cardBg border-glassBorder hover:border-gold/50'}`}>
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
    const fetchStats = async () => {
      setLoading(true);
      try {
        // 1. Barbershops Count
        const barbershopsColl = collection(db, "barbershops");
        const activeSnapshot = await getCountFromServer(barbershopsColl);
        
        // 2. Pending Approvals & Recent Tenants
        const tenantsColl = collection(db, "tenants");
        const qPendingCandidates = query(
          tenantsColl, 
          where('status', 'in', ['waiting_proof', 'payment_submitted', 'pending_payment', 'awaiting_payment'])
        );
        const pendingSnap = await getDocs(qPendingCandidates);
        
        let pendingCount = 0;
        const recents: Tenant[] = [];

        pendingSnap.forEach(doc => {
          const data = doc.data() as Tenant;
          const tenantWithId = { ...data, id: doc.id };
          const hasProof = data.payment?.payment_proof_base64 || data.payment?.proofUrl;
          const verifStatus = data.payment?.verificationStatus;
          
          if (hasProof || verifStatus === 'pending' || data.status === 'waiting_proof' || data.status === 'payment_submitted') {
            pendingCount++;
          }
          recents.push(tenantWithId);
        });

        recents.sort((a, b) => {
           const timeA = a.created_at?.seconds ? a.created_at.seconds : (a.created_at || 0);
           const timeB = b.created_at?.seconds ? b.created_at.seconds : (b.created_at || 0);
           return timeB - timeA;
        });
        setRecentTenants(recents.slice(0, 5));

        // 3. Users Count
        const usersColl = collection(db, "users");
        const usersSnapshot = await getCountFromServer(usersColl);

        // 4. SaaS Revenue Calculation
        // Calculate revenue from Tenants who are 'active' (Approved & Verified)
        // This sums up the registration_fee or invoice.amount
        const qRevenue = query(
          tenantsColl,
          where('status', '==', 'active')
        );
        const revenueSnap = await getDocs(qRevenue);
        
        let calculatedRevenue = 0;
        let successfulRegistrations = 0;

        revenueSnap.forEach(doc => {
          const data = doc.data() as Tenant;
          // Priority: Invoice Amount -> Registration Fee -> 0
          const amount = data.invoice?.amount || data.registration_fee || 0;
          
          calculatedRevenue += amount;
          successfulRegistrations++;
        });

        const revenueString = new Intl.NumberFormat('id-ID', {
          style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(calculatedRevenue);

        setStats({
          activeTenants: activeSnapshot.data().count,
          waitingApproval: pendingCount,
          totalUsers: usersSnapshot.data().count,
          revenue: revenueString,
          transactions: successfulRegistrations
        });

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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
          {t('common.system_online')}
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
                            hasProof 
                            ? 'bg-gold/10 text-gold border border-gold/20' 
                            : 'bg-danger/10 text-danger border border-danger/20'
                          }`}>
                            {hasProof ? t('dashboard.ready_review') : t('dashboard.wait_payment')}
                          </span>
                        </div>
                        <button 
                          onClick={() => navigate('/inbox')}
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
           <div className="bg-cardBg border border-gold/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-gold opacity-10">
                 <Store size={100} />
              </div>
              <h3 className="text-white font-bold mb-2 relative z-10">{t('dashboard.guidelines')}</h3>
              <p className="text-sm text-textSecondary mb-6 relative z-10">
                {t('dashboard.guide_desc')}
              </p>
              <button 
                onClick={() => navigate('/inbox')}
                className="w-full py-3 bg-gold hover:bg-goldHover text-black rounded-xl text-sm font-bold transition-colors shadow-lg shadow-gold/10 relative z-10"
              >
                {t('dashboard.go_inbox')}
              </button>
           </div>
        </div>
      </div>
    </Layout>
  );
};
