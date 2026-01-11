import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchRegistrations } from '../store/registrationsSlice';
import { Tenant } from '../types';
import { Eye, Search, RefreshCcw, Calendar, CreditCard, Filter, CheckCircle, XCircle, Clock, ChevronRight, Inbox as InboxIcon } from 'lucide-react';
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
    
    const status = t.status?.toLowerCase() || '';
    if (status === 'deleted') return false;

    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = ['waiting_proof', 'payment_submitted', 'pending_payment', 'awaiting_payment', 'pending', 'cancellation_requested'].includes(status);
    } else if (activeTab === 'active') {
      matchesTab = status === 'active';
    } else if (activeTab === 'rejected') {
      matchesTab = ['rejected', 'cancelled', 'declined', 'denied', 'suspended'].includes(status);
    }
    
    return matchesSearch && matchesTab;
  });

  const getTenantStatusDisplay = (tenant: Tenant) => {
    const hasProof = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
    const verifStatus = tenant.payment?.verificationStatus;
    const status = tenant.status?.toLowerCase();
    
    if (status === 'active') {
       return { label: 'Active', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' };
    }
    if (status === 'rejected') {
       return { label: 'Rejected', classes: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500' };
    }
    if (status === 'suspended') {
       return { label: 'Suspended', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-500' };
    }
    if (status === 'cancellation_requested') {
       return { label: 'Refund Requested', classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-500 animate-pulse' };
    }
    if (hasProof || verifStatus === 'pending') {
      return { label: 'Ready for Review', classes: 'bg-gold/10 text-gold border-gold/20', dot: 'bg-gold animate-pulse' };
    }
    return { label: tenant.status.replace('_', ' '), classes: 'bg-gray-800 text-gray-400 border-gray-700', dot: 'bg-gray-500' };
  };

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pending', label: 'Needs Review', icon: <InboxIcon size={14}/> },
    { id: 'active', label: 'Active Tenants', icon: <CheckCircle size={14}/> },
    { id: 'rejected', label: 'Rejected/Suspended', icon: <XCircle size={14}/> },
    { id: 'all', label: 'All History', icon: <Filter size={14}/> },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-8 mb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              {t('inbox.title')}
            </h1>
            <p className="text-gray-400 max-w-xl text-sm leading-relaxed">{t('inbox.subtitle')}</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search tenant, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-72 bg-cardBg/50 border border-glassBorder rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-gold/50 focus:bg-cardBg outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => dispatch(fetchRegistrations())}
              aria-label="Refresh Registrations"
              className="p-2.5 bg-cardBg/50 border border-glassBorder rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all active:scale-95"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="border-b border-white/5">
           <div className="flex gap-8 overflow-x-auto pb-px no-scrollbar">
             {tabs.map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`group flex items-center gap-2 pb-4 text-sm font-medium transition-all relative whitespace-nowrap ${
                   activeTab === tab.id ? 'text-gold' : 'text-gray-500 hover:text-gray-300'
                 }`}
               >
                 <span className={`p-1.5 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-gold/10' : 'group-hover:bg-white/5'}`}>
                    {tab.icon}
                 </span>
                 {tab.label}
                 
                 {/* Active Line Indicator */}
                 {activeTab === tab.id && (
                   <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold shadow-[0_0_8px_rgba(195,164,123,0.5)]"></div>
                 )}

                 {/* Counter Badge */}
                 {tab.id === 'pending' && (
                   <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white font-bold border border-white/5">
                     {tenants.filter(t => ['waiting_proof', 'payment_submitted', 'pending_payment', 'awaiting_payment', 'pending', 'cancellation_requested'].includes(t.status?.toLowerCase())).length}
                   </span>
                 )}
               </button>
             ))}
           </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-cardBg/30 border border-glassBorder rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="p-5 font-semibold pl-8">Business Profile</th>
                <th className="p-5 font-semibold">Owner Contact</th>
                <th className="p-5 font-semibold">Application Date</th>
                <th className="p-5 font-semibold">Status</th>
                <th className="p-5 font-semibold text-right pr-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTenants.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-gray-500">
                   <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                         <Filter size={32} className="opacity-30"/>
                      </div>
                      <p className="text-lg font-medium text-gray-400">No results found</p>
                      <p className="text-sm opacity-50">Try adjusting your filters or search terms.</p>
                   </div>
                </td></tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const statusInfo = getTenantStatusDisplay(tenant);
                  const hasProof = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
                  return (
                    <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => navigate(`/tenants/${tenant.id}`)}>
                      <td className="p-5 pl-8">
                        <div className="font-bold text-white text-base mb-1 group-hover:text-gold transition-colors">{tenant.business_name}</div>
                        <div className="text-xs text-gray-500 font-mono bg-white/5 inline-block px-1.5 py-0.5 rounded">ID: {tenant.id.substring(0,8)}...</div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                              {tenant.owner_name.charAt(0)}
                           </div>
                           <div>
                              <div className="text-white text-sm font-medium">{tenant.owner_name}</div>
                              <div className="text-xs text-gray-500">{tenant.owner_email}</div>
                           </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="text-gray-400 text-sm flex items-center gap-2">
                           <Calendar size={14} className="text-gray-600"/>
                           {formatDate(tenant.created_at)}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${statusInfo.classes}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></div>
                          {statusInfo.label}
                        </div>
                        {hasProof && activeTab === 'pending' && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                            <CreditCard size={10} className="text-gold" /> Proof Attached
                          </div>
                        )}
                      </td>
                      <td className="p-5 pr-8 text-right">
                        <button 
                          aria-label="View Details"
                          onClick={(e) => { e.stopPropagation(); navigate(`/tenants/${tenant.id}`); }}
                          className="p-2 text-gray-400 hover:text-white bg-transparent hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-white/10"
                        >
                          <ChevronRight size={20} />
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
