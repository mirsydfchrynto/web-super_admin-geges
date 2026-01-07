
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Barbershop } from '../types';
import { Search, Ban, MapPin, Store, RefreshCcw, Info, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

interface BarbershopWithId extends Barbershop { id: string; }

export const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<BarbershopWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "barbershops"));
      const data: BarbershopWithId[] = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as BarbershopWithId));
      setTenants(data);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleToggleActive = async (id: string, currentActiveState: boolean, name: string) => {
    setTogglingId(id);
    const newActiveState = !currentActiveState;
    try {
      const updates: any = { isActive: newActiveState };
      if (newActiveState === false) updates.isOpen = false;
      await updateDoc(doc(db, 'barbershops', id), updates);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      toast.success(newActiveState ? `${name} ${t('tenants.status_active')}` : `${name} ${t('tenants.status_suspended')}`);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div><h1 className="text-2xl font-bold text-white">{t('tenants.title')}</h1><p className="text-textSecondary">{t('tenants.subtitle')}</p></div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
            <input type="text" placeholder={t('common.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-cardBg border border-transparent rounded-[20px] pl-10 pr-4 py-3 text-sm text-white focus:border-gold outline-none w-64 transition-all" />
          </div>
          <button onClick={fetchTenants} className="p-3 bg-cardBg rounded-[20px] text-textSecondary hover:text-white"><RefreshCcw size={20} /></button>
        </div>
      </div>

      <div className="bg-cardBg rounded-2xl overflow-hidden border border-glassBorder shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/30 text-textSecondary text-xs uppercase tracking-wider border-b border-glassBorder">
                <th className="p-5 font-bold">{t('tenants.table_shop')}</th>
                <th className="p-5 font-bold">{t('tenants.table_address')}</th>
                <th className="p-5 font-bold text-center">{t('common.status')}</th>
                <th className="p-5 font-bold text-right">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glassBorder/50">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className={`transition-colors ${!tenant.isActive ? 'bg-danger/5' : 'hover:bg-white/5'}`}>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-darkBg border border-glassBorder`}>
                        {tenant.imageUrl ? <img src={tenant.imageUrl} className="w-full h-full object-cover" /> : <Store size={20} className="text-textSecondary" />}
                      </div>
                      <div>
                        <div className={`font-bold ${!tenant.isActive ? 'text-textSecondary line-through' : 'text-white'}`}>{tenant.name}</div>
                        <div className="text-xs text-textSecondary font-mono">{tenant.id.substring(0,8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-sm text-textSecondary"><div className="flex items-center gap-2"><MapPin size={14} /><span className="truncate max-w-[200px]">{tenant.address || "N/A"}</span></div></td>
                  <td className="p-5 text-center">
                     <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border ${tenant.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                       {tenant.isActive ? t('tenants.status_active') : t('tenants.status_suspended')}
                     </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => navigate(`/barbershops/${tenant.id}`)} className="p-2 bg-darkBg text-gold hover:bg-gold hover:text-black rounded-xl transition-all"><Info size={16} /></button>
                      <button onClick={() => handleToggleActive(tenant.id, tenant.isActive, tenant.name)} disabled={togglingId === tenant.id} className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors min-w-[100px] justify-center ${tenant.isActive ? 'bg-danger/10 text-danger hover:bg-danger hover:text-white' : 'bg-success hover:bg-success/80 text-white'}`}>
                        {togglingId === tenant.id ? <Loader2 size={14} className="animate-spin" /> : (tenant.isActive ? t('tenants.btn_suspend') : t('tenants.btn_activate'))}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};
