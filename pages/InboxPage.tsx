import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchRegistrations } from '../store/registrationsSlice';
import { Tenant } from '../types';
import { Eye, Search, RefreshCcw, Calendar, CreditCard, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

type FilterTab = 'pending' | 'active' | 'rejected' | 'all';

export const InboxPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: tenants, loading } = useSelector((state: RootState) => state.registrations);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const { t, formatDate } = useTranslation();

  useEffect(() => {
    if (tenants.length === 0) dispatch(fetchRegistrations());
  }, [dispatch, tenants.length]);

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.owner_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Debugging: Check what statuses we actually have
    // console.log(`Tenant: ${t.business_name}, Status: ${t.status}`);

    const status = t.status?.toLowerCase() || '';
    
    // Exclude deleted items from all views (Soft Delete)
    if (status === 'deleted') return false;

    let matchesTab = true;
    if (activeTab === 'pending') {
      // Added 'cancellation_requested' here
      matchesTab = ['waiting_proof', 'payment_submitted', 'pending_payment', 'awaiting_payment', 'pending', 'cancellation_requested'].includes(status);
    } else if (activeTab === 'active') {
      matchesTab = status === 'active';
    } else if (activeTab === 'rejected') {
      // Added 'suspended' here
      matchesTab = ['rejected', 'cancelled', 'declined', 'denied', 'suspended'].includes(status);
    }
    
    return matchesSearch && matchesTab;
  });

  const getTenantStatusDisplay = (tenant: Tenant) => {
    const hasProof = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
    const verifStatus = tenant.payment?.verificationStatus;
    const status = tenant.status?.toLowerCase();
    
    if (status === 'active') {
       return { label: 'Active', classes: 'bg-green-500/10 text-green-500 border-green-500/20', actionable: false };
    }
    if (status === 'rejected') {
       return { label: 'Rejected', classes: 'bg-red-500/10 text-red-500 border-red-500/20', actionable: false };
    }
    if (status === 'suspended') {
       return { label: 'Suspended', classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20', actionable: false };
    }
    if (status === 'cancellation_requested') {
       return { label: 'Refund Req.', classes: 'bg-rose-500/10 text-rose-500 border-rose-500/20', actionable: true };
    }
    if (hasProof || verifStatus === 'pending') {
      return { label: t('dashboard.ready_review'), classes: 'bg-gold/20 text-gold border-gold/30', actionable: true };
    }
    return { label: tenant.status.replace('_', ' '), classes: 'bg-gray-800 text-gray-400 border-gray-700', actionable: false };
  };

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pending', label: 'Needs Review', icon: <Clock size={14}/> },
    { id: 'active', label: 'Approved', icon: <CheckCircle size={14}/> },
    { id: 'rejected', label: 'Rejected', icon: <XCircle size={14}/> },
    { id: 'all', label: 'All History', icon: <Filter size={14}/> },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {t('inbox.title')}
            </h1>
            <p className="text-gray-400 text-sm">{t('inbox.subtitle')}</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder={t('common.search')} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 bg-black border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-gold/50 outline-none"
              />
            </div>
            <button 
              onClick={() => dispatch(fetchRegistrations())}
              aria-label="Refresh Registrations"
              className="p-2 bg-black border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* TAB SYSTEM */}
        <div className="flex overflow-x-auto border-b border-white/10 no-scrollbar">
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                 activeTab === tab.id 
                 ? 'border-gold text-gold' 
                 : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
               }`}
             >
               {tab.icon}
               {tab.label}
               {tab.id === 'pending' && (
                 <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                   {tenants.filter(t => ['waiting_proof', 'payment_submitted', 'pending_payment', 'awaiting_payment', 'pending', 'cancellation_requested'].includes(t.status?.toLowerCase())).length}
                 </span>
               )}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="p-4 font-semibold">{t('inbox.table_date')}</th>
                <th className="p-4 font-semibold">{t('inbox.table_business')}</th>
                <th className="p-4 font-semibold">{t('inbox.table_owner')}</th>
                <th className="p-4 font-semibold">{t('inbox.table_status')}</th>
                <th className="p-4 font-semibold text-right">{t('inbox.table_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTenants.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">
                   <Filter size={32} className="mx-auto mb-3 opacity-30"/>
                   {t('dashboard.no_data')} in this view.
                </td></tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const statusInfo = getTenantStatusDisplay(tenant);
                  const hasProof = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
                  return (
                    <tr key={tenant.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-gray-400 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2"><Calendar size={14} />{formatDate(tenant.created_at)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{tenant.business_name}</div>
                        <div className="text-xs text-gray-500">{tenant.plan || 'Monthly Subscription'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white text-sm">{tenant.owner_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{tenant.owner_email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${statusInfo.classes}`}>
                          {statusInfo.label}
                        </span>
                        {hasProof && activeTab === 'pending' && (
                          <div className="text-[10px] text-gold flex items-center gap-1 mt-1 font-semibold">
                            <CreditCard size={10} /> {t('inbox.proof_attached')}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            statusInfo.actionable 
                            ? 'bg-gold hover:bg-[#b89b72] text-black shadow-lg shadow-gold/10' 
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Eye size={14} /> {statusInfo.actionable ? t('inbox.btn_review') : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};