
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchRegistrations } from '../store/registrationsSlice';
import { Tenant } from '../types';
import { Eye, Search, RefreshCcw, Calendar, CreditCard, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export const InboxPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: tenants, loading } = useSelector((state: RootState) => state.registrations);
  const [searchTerm, setSearchTerm] = useState('');
  const { t, formatDate } = useTranslation();

  useEffect(() => {
    if (tenants.length === 0) dispatch(fetchRegistrations());
  }, [dispatch, tenants.length]);

  const filteredTenants = tenants.filter(t => 
    t.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTenantStatusDisplay = (tenant: Tenant) => {
    const hasProof = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
    const verifStatus = tenant.payment?.verificationStatus;
    
    if (hasProof || verifStatus === 'pending') {
      return { label: t('dashboard.ready_review'), classes: 'bg-gold/20 text-gold border-gold/30', actionable: true };
    }
    if (tenant.status === 'awaiting_payment' || tenant.status === 'waiting_proof') {
      return { label: t('dashboard.wait_payment'), classes: 'bg-warning/10 text-warning border-warning/20', actionable: false };
    }
    return { label: tenant.status.replace('_', ' '), classes: 'bg-gray-800 text-gray-500 border-gray-700', actionable: false };
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('inbox.title')}</h1>
          <p className="text-textSecondary">{t('inbox.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
            <input 
              type="text" 
              placeholder={t('common.search')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-cardBg border border-transparent rounded-[20px] pl-10 pr-4 py-3 text-sm text-white focus:border-gold outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => dispatch(fetchRegistrations())}
            className="p-3 bg-cardBg rounded-[20px] text-textSecondary hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-cardBg rounded-2xl overflow-hidden border border-glassBorder shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/30 text-textSecondary text-xs uppercase tracking-wider border-b border-glassBorder">
                <th className="p-5 font-bold">{t('inbox.table_date')}</th>
                <th className="p-5 font-bold">{t('inbox.table_business')}</th>
                <th className="p-5 font-bold">{t('inbox.table_owner')}</th>
                <th className="p-5 font-bold">{t('inbox.table_status')}</th>
                <th className="p-5 font-bold text-right">{t('inbox.table_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glassBorder/50">
              {filteredTenants.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-textSecondary">{t('dashboard.no_data')}</td></tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const statusInfo = getTenantStatusDisplay(tenant);
                  const hasProof = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
                  return (
                    <tr key={tenant.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-5 text-textSecondary text-sm"><div className="flex items-center gap-2"><Calendar size={14} />{formatDate(tenant.created_at)}</div></td>
                      <td className="p-5"><div className="font-bold text-white">{tenant.business_name}</div><div className="text-xs text-textSecondary">{tenant.plan || 'Monthly'}</div></td>
                      <td className="p-5"><div className="text-white text-sm">{tenant.owner_name}</div><div className="text-xs text-textSecondary">{tenant.owner_email}</div></td>
                      <td className="p-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border uppercase ${statusInfo.classes}`}>{statusInfo.label}</span>
                        {hasProof && <div className="text-xs text-gold flex items-center gap-1 mt-1 font-semibold"><CreditCard size={10} /> {t('inbox.proof_attached')}</div>}
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
                          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${statusInfo.actionable ? 'bg-gold hover:bg-goldHover text-black' : 'bg-darkBg text-textSecondary hover:text-white'}`}
                        >
                          <Eye size={14} /> {t('inbox.btn_review')}
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
