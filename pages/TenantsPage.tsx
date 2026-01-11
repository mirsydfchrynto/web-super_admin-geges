import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { collection, getDocs, doc, updateDoc, query, limit, orderBy, startAfter, where, QueryDocumentSnapshot, DocumentData, startAt, endAt } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Barbershop } from '../types';
import { Search, MapPin, Store, RefreshCcw, Info, Loader2, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { APP_CONFIG } from '../lib/constants';
import { getDisplayImageUrl } from '../lib/utils';

interface BarbershopWithId extends Barbershop { id: string; }

export const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<BarbershopWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Mode: 'browse' (default, sorted by created_at) or 'search' (sorted by name)
  const isSearchMode = searchTerm.trim().length > 0;

  const fetchTenants = useCallback(async (isLoadMore = false) => {
    // RESET: We use client-side logic for safety now
    if (isLoadMore) return; 
    
    setLoading(true);
    
    try {
      const collectionRef = collection(db, "barbershops");
      // FETCH ALL - Safest way to ensure no data is hidden by missing indexes/fields
      const snapshot = await getDocs(collectionRef);
      
      // ROBUST MAPPING & SHOW ALL (Mimic Flutter Logic)
      const data: BarbershopWithId[] = [];
      snapshot.forEach((doc) => {
        const raw = doc.data() as any;
        
        // Helper parse hour
        const parseHour = (val: any, fallback: number) => {
           if (typeof val === 'number') return val;
           if (typeof val === 'string') return parseInt(val) || fallback;
           return fallback;
        };

        const safeBarbershop: BarbershopWithId = {
          id: doc.id,
          name: raw.name || 'Nama Barbershop',
          // Handle legacy typo
          address: raw.address || raw.addres || 'Alamat Tidak Diketahui',
          imageUrl: raw.imageUrl || 'https://cdn-icons-png.flaticon.com/512/706/706830.png',
          // Respect existing value, default true for legacy
          isActive: raw.isActive !== undefined ? raw.isActive : true, 
          isOpen: raw.isOpen || false,
          isDeleted: raw.isDeleted || false, // Show status in UI but don't hide row
          
          admin_uid: raw.admin_uid || '',
          rating: raw.rating || 0,
          gallery_urls: raw.gallery_urls || raw.galleryUrls || [],
          services: raw.services || [],
          facilities: raw.facilities || [],
          open_hour: parseHour(raw.open_hour || raw.openHour, 9),
          close_hour: parseHour(raw.close_hour || raw.closeHour, 21),
          weekly_holidays: raw.weekly_holidays || raw.weeklyHolidays || [],
          barber_selection_fee: raw.barber_selection_fee || raw.barberSelectionFee || 5000,
          created_at: raw.created_at,
          google_maps_url: raw.google_maps_url,
          whatsapp_number: raw.whatsapp_number
        };

        data.push(safeBarbershop);
      });

      // CLIENT SIDE SORT (Robust against missing created_at)
      if (isSearchMode) {
         const term = searchTerm.toLowerCase();
         const filtered = data.filter(d => d.name.toLowerCase().includes(term));
         setTenants(filtered);
      } else {
         // Sort by created_at desc, treat missing as old (0)
         data.sort((a, b) => {
            const timeA = a.created_at?.seconds || 0;
            const timeB = b.created_at?.seconds || 0;
            return timeB - timeA;
         });
         setTenants(data);
      }
      
      setHasMore(false); // No pagination for now (fetch all)

    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [isSearchMode, searchTerm, t]);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Reset pagination on search change
      setLastDoc(null);
      fetchTenants(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]); // Don't include fetchTenants to avoid loops, useEffect handles trigger

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

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('tenants.title')}</h1>
          <p className="text-textSecondary">{t('tenants.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
            <input 
              type="text" 
              placeholder={t('common.search') + " (Server-Side)..."} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-cardBg border border-transparent rounded-[20px] pl-10 pr-4 py-3 text-sm text-white focus:border-gold outline-none w-64 transition-all" 
            />
          </div>
          <button 
            onClick={() => { setLastDoc(null); fetchTenants(false); }} 
            aria-label="Refresh Data"
            className="p-3 bg-cardBg rounded-[20px] text-textSecondary hover:text-white"
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
                <th className="p-5 font-bold">{t('tenants.table_shop')}</th>
                <th className="p-5 font-bold">{t('tenants.table_address')}</th>
                <th className="p-5 font-bold text-center">{t('common.status')}</th>
                <th className="p-5 font-bold text-right">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glassBorder/50">
              {loading && !loadingMore && tenants.length === 0 ? (
                 <tr><td colSpan={4} className="p-8 text-center text-textSecondary"><Loader2 className="animate-spin mx-auto mb-2" />Loading Data...</td></tr>
              ) : tenants.length === 0 ? (
                 <tr><td colSpan={4} className="p-8 text-center text-textSecondary">{t('dashboard.no_data')}</td></tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className={`transition-colors ${!tenant.isActive ? 'bg-danger/5' : 'hover:bg-white/5'}`}>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-darkBg border border-glassBorder flex-shrink-0`}>
                          {tenant.imageUrl ? (
                            <img src={getDisplayImageUrl(tenant.imageUrl)!} alt={tenant.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store size={20} className="text-textSecondary" />
                          )}
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
                        <button onClick={() => navigate(`/barbershops/${tenant.id}`)} aria-label="View Details" className="p-2 bg-darkBg text-gold hover:bg-gold hover:text-black rounded-xl transition-all"><Info size={16} /></button>
                        <button onClick={() => handleToggleActive(tenant.id, tenant.isActive, tenant.name)} disabled={togglingId === tenant.id} className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors min-w-[100px] justify-center ${tenant.isActive ? 'bg-danger/10 text-danger hover:bg-danger hover:text-white' : 'bg-success hover:bg-success/80 text-white'}`}>
                          {togglingId === tenant.id ? <Loader2 size={14} className="animate-spin" /> : (tenant.isActive ? t('tenants.btn_suspend') : t('tenants.btn_activate'))}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Load More Trigger */}
        {!isSearchMode && hasMore && tenants.length > 0 && (
          <div className="p-4 border-t border-glassBorder text-center">
            <button 
              onClick={() => fetchTenants(true)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 text-sm text-gold hover:text-goldHover disabled:opacity-50"
            >
              {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ArrowDown size={16} />}
              {loadingMore ? 'Loading more...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};