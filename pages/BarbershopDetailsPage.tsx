
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Barbershop } from '../types';
import { ArrowLeft, Save, Loader2, Store, MapPin, Clock, ImageIcon, Scissors, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useTranslation } from '../hooks/useTranslation';

export const BarbershopDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { isDirty }, watch } = useForm<Barbershop>();
  const isActiveValue = watch("isActive");

  useEffect(() => {
    const fetchBarbershop = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'barbershops', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) reset(snap.data() as Barbershop);
      } catch (error) {
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchBarbershop();
  }, [id, navigate, reset]);

  const onSubmit = async (data: Barbershop) => {
    if (!id) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'barbershops', id);
      const payload = {
        ...data,
        open_hour: Number(data.open_hour),
        close_hour: Number(data.close_hour),
        barber_selection_fee: Number(data.barber_selection_fee)
      };
      if (payload.isActive === false) payload.isOpen = false;

      await updateDoc(docRef, payload);
      toast.success(payload.isActive ? "Barbershop updated!" : "Barbershop SUSPENDED & CLOSED.");
      reset(data);
    } catch (error: any) {
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-cardBg border border-transparent rounded-[20px] px-5 py-3 text-white placeholder-gray-500 focus:border-gold focus:ring-0 outline-none transition-all duration-300 hover:bg-white/5";
  const labelClass = "block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 ml-3";

  if (loading) return <Layout><div className="flex justify-center pt-20"><Loader2 className="animate-spin text-gold" size={48} /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-10">
        <button onClick={() => navigate('/tenants')} className="flex items-center gap-2 text-textSecondary hover:text-white mb-6 transition-colors font-medium text-sm">
          <ArrowLeft size={18} /> {t('common.back')}
        </button>

        <div className="bg-darkBg border border-glassBorder rounded-3xl p-8">
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-glassBorder">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="bg-gold p-2 rounded-lg text-black"><Scissors size={20} /></div>
                Edit Barbershop
              </h1>
            </div>
            {isDirty && <span className="text-black bg-warning px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">Unsaved Changes</span>}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* Basic Info */}
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Store size={18} className="text-gold" /> Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className={labelClass}>{t('tenants.table_shop')}</label>
                  <input {...register("name", { required: true })} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('tenants.table_address')}</label>
                  <textarea {...register("address", { required: true })} rows={3} className={`${inputClass} resize-none rounded-3xl`} />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp</label>
                  <input {...register("whatsapp_number")} placeholder="628..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Maps URL</label>
                  <input {...register("google_maps_url")} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="space-y-6 pt-6 border-t border-glassBorder/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-gold" /> Operations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Open (24h)</label>
                  <input type="number" {...register("open_hour")} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Close (24h)</label>
                  <input type="number" {...register("close_hour")} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fee (Rp)</label>
                  <input type="number" {...register("barber_selection_fee")} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="space-y-6 pt-6 border-t border-glassBorder/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-gold" /> Branding
              </h3>
              <div>
                <label className={labelClass}>Image URL / Base64</label>
                <input {...register("imageUrl")} className={inputClass} />
              </div>
            </div>

            {/* Admin Actions */}
            <div className="space-y-6 pt-6 border-t border-glassBorder/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert size={18} className="text-danger" /> Danger Zone
              </h3>
              <div className={`border rounded-2xl p-5 flex items-center justify-between ${isActiveValue ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
                <div>
                   <h4 className={`font-bold ${isActiveValue ? 'text-success' : 'text-danger'}`}>{t('common.status')}</h4>
                   <p className="text-xs text-textSecondary mt-1">Controls global visibility.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register("isActive")} className="sr-only peer" />
                  <div className="w-14 h-7 bg-cardBg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                type="submit" 
                disabled={saving || !isDirty}
                className={`px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  isDirty 
                    ? 'bg-gold hover:bg-goldHover text-black shadow-lg shadow-gold/20' 
                    : 'bg-cardBg text-gray-600 cursor-not-allowed'
                }`}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {saving ? 'Saving...' : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};
