import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { suspendTenant, deleteTenant } from '../services/provisioningService';
import { Layout } from '../components/Layout';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tenant, Barbershop } from '../types';
import { 
  ArrowLeft, FileText, Calendar, Download, FileCheck, Maximize2, X,
  CheckCircle, XCircle, ShieldCheck, Store, Key, Copy, AlertCircle,
  Clock, MapPin, Loader2, Send, Receipt, Ban, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';
import { ApprovalModal } from '../components/ApprovalModal';
import { getDisplayImageUrl } from '../lib/utils';

// --- SKELETON COMPONENTS FOR SMOOTH LOADING ---
const DetailSkeleton = () => (
  <div className="animate-pulse space-y-8">
    {/* Header Skeleton */}
    <div className="bg-cardBg/50 p-6 rounded-2xl border border-glassBorder flex flex-col md:flex-row justify-between gap-4">
       <div className="flex gap-4 items-center">
          <div className="w-16 h-16 bg-white/5 rounded-lg"></div>
          <div className="space-y-2">
             <div className="h-6 w-48 bg-white/10 rounded"></div>
             <div className="h-4 w-32 bg-white/5 rounded"></div>
          </div>
       </div>
       <div className="h-10 w-32 bg-white/5 rounded-full"></div>
    </div>
    
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
       {/* Left Col Skeleton */}
       <div className="xl:col-span-2 space-y-8">
          <div className="bg-cardBg/50 p-6 rounded-xl border border-glassBorder h-48"></div>
          <div className="bg-cardBg/50 p-6 rounded-xl border border-glassBorder h-64"></div>
       </div>
       {/* Right Col Skeleton */}
       <div className="space-y-8">
          <div className="bg-cardBg/50 p-6 rounded-xl border border-glassBorder h-80"></div>
          <div className="bg-cardBg/50 p-6 rounded-xl border border-glassBorder h-64"></div>
       </div>
    </div>
  </div>
);

export const TenantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  
  // Data States
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [createdShop, setCreatedShop] = useState<Barbershop | null>(null);
  
  // Computed/Derived States
  const [generatedCreds, setGeneratedCreds] = useState<{email: string, pass: string} | null>(null);
  const [documents, setDocuments] = useState<{siup: string | null, tax: string | null}>({ siup: null, tax: null });
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);

  // --- OPTIMIZED PARALLEL FETCHING ---
  const fetchAllData = useCallback(async () => {
    if (!id) return;
    
    // Don't set loading(true) if we already have data (silent refresh), 
    // unless it's the first load or explicit refresh.
    if (!tenant) setLoading(true);

    try {
      const tenantRef = doc(db, 'tenants', id);
      const tenantSnap = await getDoc(tenantRef);
      
      if (!tenantSnap.exists()) {
        toast.error("Tenant not found");
        navigate('/tenants');
        return;
      }

      const tenantData = { 
        id: tenantSnap.id, 
        ...tenantSnap.data(),
        // Robust Date Handling: Check if method exists (Timestamp) or use raw value
        created_at: tenantSnap.data()?.created_at?.toMillis 
          ? tenantSnap.data().created_at.toMillis() 
          : (tenantSnap.data()?.created_at || Date.now())
      } as Tenant;

      // PARALLEL FETCHING: Prepare all promises safely
      const promises: Promise<any>[] = [];

      // 1. Created Shop (Safe Fetch)
      if (tenantData.shop_id) {
        promises.push(getDoc(doc(db, 'barbershops', tenantData.shop_id)).catch(() => ({ exists: () => false })));
      } else {
        promises.push(Promise.resolve({ exists: () => false }));
      }

      // 2. SIUP Document (Safe Fetch)
      if (tenantData.company_doc_ref) {
        promises.push(getDoc(doc(db, tenantData.company_doc_ref)).catch(() => ({ exists: () => false })));
      } else if (tenantData.document_base64) {
        promises.push(Promise.resolve({ exists: () => true, data: () => ({ content_base64: tenantData.document_base64 }) }));
      } else {
        promises.push(Promise.resolve({ exists: () => false }));
      }

      // 3. Tax Document (Safe Fetch)
      if (tenantData.tax_doc_ref) {
        promises.push(getDoc(doc(db, tenantData.tax_doc_ref)).catch(() => ({ exists: () => false })));
      } else {
        promises.push(Promise.resolve({ exists: () => false }));
      }

      // EXECUTE ALL SAFELY
      const [shopSnap, siupSnap, taxSnap] = await Promise.all(promises);

      // PROCESS RESULTS
      // Only set shop if it truly exists and data is valid
      if (shopSnap && typeof shopSnap.exists === 'function' && shopSnap.exists()) {
         setCreatedShop(shopSnap.data() as Barbershop);
      } else {
         setCreatedShop(null);
      }

      const newDocs = { siup: null as string | null, tax: null as string | null };
      if (siupSnap && typeof siupSnap.exists === 'function' && siupSnap.exists()) {
        const data = siupSnap.data();
        if (data) newDocs.siup = data.content_base64;
      }
      if (taxSnap && typeof taxSnap.exists === 'function' && taxSnap.exists()) {
        const data = taxSnap.data();
        if (data) newDocs.tax = data.content_base64;
      }
      setDocuments(newDocs);

      // Creds Logic
      if (tenantData.status === 'active' && tenantData.temp_password) {
        setGeneratedCreds({
          email: tenantData.admin_email || tenantData.owner_email,
          pass: tenantData.temp_password
        });
      }

      // Finally, set the main tenant data
      setTenant(tenantData);

    } catch (error: any) {
      console.error("Error fetching details:", error);
      toast.error(`Gagal memuat data: ${error.message || "Unknown error"}`);
    } finally {
      // Small delay to ensure smooth transition if data loads too fast
      setTimeout(() => setLoading(false), 300);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatCurrency = (val?: number) => val ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val) : '-';
  
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    waiting_proof: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    awaiting_payment: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    payment_submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancellation_requested: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  // --- MAIN RENDER ---
  return (
    <Layout>
      {showApprovalModal && tenant && (
        <ApprovalModal 
          tenant={tenant} 
          onClose={() => setShowApprovalModal(false)}
          onRefresh={fetchAllData}
        />
      )}

      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}>
          <button 
            aria-label="Close Preview"
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
          >
            <X size={32} />
          </button>
          <img 
            src={zoomedImage} 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10" 
            alt="Zoomed" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto pb-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors font-medium text-sm">
          <ArrowLeft size={20} /> {t('common.back')}
        </button>

        {loading || !tenant ? (
          <DetailSkeleton />
        ) : (
          <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-cardBg/50 p-6 rounded-2xl border border-glassBorder backdrop-blur-md">
              <div className="flex items-center gap-6">
                 <div>
                    <h1 className="text-2xl font-bold text-white">{tenant.business_name}</h1>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <span className="font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5">ID: {tenant.id.substring(0,8)}...</span>
                      <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(tenant.created_at)}</span>
                    </div>
                 </div>
              </div>
              <div className={`px-4 py-2 rounded-full border text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${statusColors[tenant.status] || 'bg-gray-500/20 text-gray-400'}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                {tenant.status.replace('_', ' ')}
              </div>
            </div>

            {/* SUCCESS STATE - Provisioning Credentials */}
            {(tenant.status === 'active' && generatedCreds) && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck size={120} className="text-emerald-500" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row gap-6">
                   <div className="flex-1">
                      <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-2">
                         <CheckCircle size={24} /> {t('details.provisioned_title')}
                      </h2>
                      <p className="text-emerald-200/70 mb-4">{t('details.provisioned_desc')}</p>
                      
                      {createdShop && (
                        <div className="bg-black/40 rounded-xl p-4 border border-emerald-500/20 backdrop-blur-sm max-w-md">
                            <div className="flex items-center gap-3 mb-3">
                               <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0">
                                  {createdShop.imageUrl ? (
                                    <img src={getDisplayImageUrl(createdShop.imageUrl)!} className="w-full h-full object-cover" alt={createdShop.name}/>
                                  ) : (
                                    <Store size={20} className="text-gray-400"/>
                                  )}
                               </div>
                               <div>
                                  <div className="text-white font-bold">{createdShop.name}</div>
                                  <div className="text-xs text-gray-400 flex items-center gap-1">
                                     <MapPin size={10}/> {createdShop.address || (createdShop as any).addres}
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2">
                               <span className="text-emerald-400 flex items-center gap-1">
                                  <Clock size={10}/> {createdShop.open_hour || (createdShop as any).openHour}:00 - {createdShop.close_hour || (createdShop as any).closeHour}:00
                               </span>
                               <span className="text-gray-500">Shop ID: {createdShop.id || tenant.shop_id}</span>
                            </div>
                        </div>
                      )}

                      {tenant.shop_id && (
                         <button 
                           onClick={() => navigate(`/barbershops/${tenant.shop_id}`)}
                           className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/50"
                         >
                           <Store size={16} /> {t('details.open_shop')}
                         </button>
                      )}
                   </div>

                   <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/20 min-w-[300px] h-fit">
                      <div className="text-xs text-emerald-400 font-bold uppercase mb-3 flex items-center gap-2">
                         <Key size={12} /> Admin Credentials
                      </div>
                      <div className="space-y-3">
                         <div>
                            <label className="text-[10px] text-gray-400 uppercase">Email</label>
                            <div className="flex items-center justify-between bg-black/30 p-2 rounded border border-white/5">
                               <code className="text-emerald-300 text-sm">{generatedCreds.email}</code>
                               <button onClick={() => copyToClipboard(generatedCreds.email)} aria-label="Copy Email" className="text-gray-500 hover:text-white"><Copy size={14}/></button>
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] text-gray-400 uppercase">Password</label>
                            <div className="flex items-center justify-between bg-black/30 p-2 rounded border border-white/5">
                               <code className="text-emerald-300 text-sm font-bold tracking-widest">{generatedCreds.pass}</code>
                               <button onClick={() => copyToClipboard(generatedCreds.pass)} aria-label="Copy Password" className="text-gray-500 hover:text-white"><Copy size={14}/></button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Left Column */}
              <div className="xl:col-span-2 space-y-8">
                {/* Owner Info */}
                <div className="bg-cardBg/50 border border-glassBorder rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 pb-3 border-b border-white/5">
                    <FileText className="text-blue-500" size={20}/> {t('details.owner_info')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="text-xs text-gray-500 uppercase tracking-wider">{t('inbox.table_owner')}</label><p className="text-white font-medium text-lg">{tenant.owner_name}</p></div>
                    <div><label className="text-xs text-gray-500 uppercase tracking-wider">{t('users.table_contact')}</label><p className="text-white font-medium text-lg">{tenant.owner_phone || '-'}</p></div>
                    <div className="md:col-span-2"><label className="text-xs text-gray-500 uppercase tracking-wider">Email (Login Account)</label><p className="text-white font-medium text-lg font-mono">{tenant.owner_email}</p></div>
                    <div className="md:col-span-2"><label className="text-xs text-gray-500 uppercase tracking-wider">{t('tenants.table_address')}</label><p className="text-gray-300">{tenant.address || 'Not Provided'}</p></div>
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-cardBg/50 border border-glassBorder rounded-xl p-6">
                   <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 pb-3 border-b border-white/5">
                    <FileCheck className="text-gold" size={20}/> {t('details.legal_docs')}
                   </h2>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* SIUP Document */}
                      <div className="bg-black/20 rounded-xl p-4 border border-white/5 group hover:border-gold/30 transition-colors">
                         <div className="flex justify-between items-start mb-3">
                            <h3 className="text-sm font-bold text-gray-300">{t('details.siup')}</h3>
                            {documents.siup && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded border border-green-500/30">Uploaded</span>}
                         </div>
                         
                         {documents.siup ? (
                           <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 group cursor-pointer" onClick={() => setZoomedImage(getDisplayImageUrl(documents.siup))}>
                              <img src={getDisplayImageUrl(documents.siup)!} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Company Doc" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Maximize2 className="text-white" size={24} />
                              </div>
                           </div>
                         ) : (
                           <div className="aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700">
                              <FileText size={32} className="mb-2 opacity-50"/>
                              <span className="text-xs">{t('details.no_doc')}</span>
                           </div>
                         )}

                         {documents.siup && (
                           <button className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300 flex items-center justify-center gap-2 transition-colors" aria-label="Download Document">
                              <Download size={14} /> {t('details.download_orig')}
                           </button>
                         )}
                      </div>

                      {/* Tax Document */}
                      <div className="bg-black/20 rounded-xl p-4 border border-white/5 group hover:border-gold/30 transition-colors">
                         <div className="flex justify-between items-start mb-3">
                            <h3 className="text-sm font-bold text-gray-300">{t('details.npwp')}</h3>
                            <span className="text-xs text-gray-500 font-mono">{tenant.tax_id || 'N/A'}</span>
                         </div>
                         
                         {documents.tax ? (
                           <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 group cursor-pointer" onClick={() => setZoomedImage(getDisplayImageUrl(documents.tax))}>
                              <img src={getDisplayImageUrl(documents.tax)!} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Tax Doc" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Maximize2 className="text-white" size={24} />
                              </div>
                           </div>
                         ) : (
                           <div className="aspect-video bg-gray-800/50 rounded-lg flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700">
                              <FileText size={32} className="mb-2 opacity-50"/>
                              <span className="text-xs">{t('details.no_doc')}</span>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                
                {/* Approval Action Box */}
                <div className="bg-cardBg border border-glassBorder rounded-xl p-6 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                   <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">{t('details.approval_action')}</h3>
                   
                   <div className="space-y-4">
                      {/* --- ACTIVE STATE --- */}
                      {tenant.status === 'active' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                           <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center gap-2 mb-4">
                              <CheckCircle size={14}/> 
                              <div>
                                <span className="font-bold">Tenant Aktif & Beroperasi.</span>
                                <div className="text-[10px] opacity-70">Shop ID: {tenant.shop_id || '-'}</div>
                              </div>
                           </div>
                           {/* Active Tenant Actions could be expanded here (e.g., Edit Plan), but currently focused on Termination */}
                        </div>
                      )}

                      {/* --- REFUND REQUEST STATE --- */}
                      {tenant.status === 'cancellation_requested' && (
                        <button 
                           onClick={() => setShowApprovalModal(true)}
                           className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2 group animate-pulse"
                        >
                           <Receipt size={20} className="group-hover:rotate-12 transition-transform"/>
                           Process Refund Request
                        </button>
                      )}

                      {/* --- PENDING / APPROVAL STATE --- */}
                      {['awaiting_payment', 'waiting_proof', 'payment_submitted'].includes(tenant.status) && (
                         <button 
                           onClick={() => setShowApprovalModal(true)}
                           className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 group"
                        >
                           <ShieldCheck size={20} className="group-hover:scale-110 transition-transform"/>
                           {t('details.btn_manage')} / {t('details.btn_approve')}
                        </button>
                      )}

                      {/* --- TERMINAL STATE INFO (Rejected, Suspended, Cancelled) --- */}
                      {['rejected', 'suspended', 'cancelled'].includes(tenant.status) && (
                        <div className={`p-4 rounded-xl border mb-2 text-center ${
                          tenant.status === 'suspended' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                          'bg-gray-800/50 border-gray-700 text-gray-400'
                        }`}>
                           <div className="text-xs uppercase font-bold mb-1 flex justify-center items-center gap-2">
                              {tenant.status === 'suspended' ? <Ban size={14}/> : <XCircle size={14}/>}
                              Status: {tenant.status.toUpperCase()}
                           </div>
                           <div className="text-xs opacity-70">
                             {tenant.status === 'suspended' 
                                ? "Akun ini sedang ditangguhkan. Hapus jika tidak ada penyelesaian." 
                                : "Aplikasi ini telah berakhir. Anda dapat menghapus data ini untuk kebersihan database."}
                           </div>
                        </div>
                      )}

                      {/* --- DANGER ZONE: DELETE ACTION (Available for Active & Terminal States) --- */}
                      {['active', 'rejected', 'suspended', 'cancelled'].includes(tenant.status) && (
                         <div className="pt-4 border-t border-white/5 mt-2">
                           <button 
                              onClick={async () => {
                                const isCritical = tenant.status === 'active';
                                const msg = isCritical
                                  ? `PERINGATAN KERAS!\n\nTenant ini sedang AKTIF.\nMenghapus tenant ini akan MENUTUP Barbershop terkait secara otomatis.\n\nApakah Anda yakin ingin melanjutkan penghapusan?`
                                  : `Apakah Anda yakin ingin menghapus data tenant ini? (Data akan diarsipkan/soft-delete)`;

                                if (window.confirm(msg)) {
                                  setSuspending(true);
                                  const toastId = toast.loading("Deleting tenant...");
                                  try {
                                    await deleteTenant(tenant);
                                    toast.success("Tenant Deleted (Archived)", { id: toastId });
                                    navigate('/tenants');
                                  } catch (e: any) {
                                    toast.error("Failed: " + e.message, { id: toastId });
                                    setSuspending(false);
                                  }
                                }
                              }}
                              disabled={suspending}
                              className="w-full py-3 bg-transparent hover:bg-red-900/20 text-red-500 hover:text-red-400 border border-red-900/50 hover:border-red-500 rounded-xl transition-all flex items-center justify-center gap-2 group font-bold text-xs tracking-wider"
                           >
                              {suspending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                              {tenant.status === 'active' ? 'TERMINATE & DELETE' : 'DELETE DATA'}
                           </button>
                         </div>
                      )}

                      <div className="text-center text-[10px] text-gray-600 pt-2 italic">
                         {tenant.status === 'active' 
                           ? "Deleting will immediately close the shop and revoke access." 
                           : "Deleting performs a soft-delete for audit trail."}
                      </div>
                   </div>
                </div>

                {/* Payment Proof Preview */}
                <div className="bg-cardBg border border-glassBorder rounded-xl p-6">
                   {(() => {
                      const proofUrl = tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl;
                      return (
                        <>
                           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                              {t('details.payment_proof')}
                              {proofUrl && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">UPLOADED</span>}
                           </h3>
                           
                           {proofUrl ? (
                              <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden border border-gray-700 group cursor-pointer" onClick={() => setZoomedImage(getDisplayImageUrl(proofUrl))}>
                                 <img src={getDisplayImageUrl(proofUrl)!} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Proof" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="text-white drop-shadow-md" size={32} />
                                 </div>
                              </div>
                           ) : (
                              <div className="aspect-[3/4] bg-white/5 rounded-lg flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700">
                                 <XCircle size={40} className="mb-2 opacity-50" />
                                 <span className="text-sm">No Proof Uploaded</span>
                              </div>
                           )}

                           <div className="mt-4 pt-4 border-t border-white/5">
                              <div className="flex justify-between items-center text-sm mb-2">
                                 <span className="text-gray-400">Total Bill</span>
                                 <span className="text-white font-bold text-lg">{formatCurrency(tenant.invoice?.amount || tenant.registration_fee)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                 <span>Method</span>
                                 <span className="uppercase">{tenant.payment?.paidBy || 'Manual Transfer'}</span>
                              </div>
                           </div>
                        </>
                      );
                   })()}
                </div>
              </div>
            </div>

            {/* History Log */}
            <div className="mt-10 bg-cardBg/30 border border-glassBorder rounded-xl p-6">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Clock size={16} /> {t('details.history_log')}
               </h3>
               <div className="space-y-6 relative pl-4 border-l-2 border-white/10">
                  {tenant.history ? (
                     [...tenant.history].reverse().map((log, idx) => (
                        <div key={idx} className="relative pl-6">
                           <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-darkBg border-2 border-blue-500"></div>
                           <p className="text-gray-300 text-sm">{log.note}</p>
                           <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-600">{formatDate(log.created_at)}</span>
                              <span className="text-[10px] uppercase bg-white/5 px-2 rounded text-gray-400">{log.status}</span>
                           </div>
                        </div>
                     ))
                  ) : (
                     <p className="text-gray-500 text-sm italic pl-6">No history available.</p>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};