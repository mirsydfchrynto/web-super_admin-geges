import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tenant } from '../types';
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Calendar, 
  Download, 
  FileCheck,
  Maximize2,
  X,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Store,
  Key,
  Copy,
  AlertCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';
import { ApprovalModal } from '../components/ApprovalModal';

export const TenantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  // New Shop State after approval
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);
  const [generatedCreds, setGeneratedCreds] = useState<{email: string, pass: string} | null>(null);
  
  // Document States
  const [companyDocBase64, setCompanyDocBase64] = useState<string | null>(null);
  const [taxDocBase64, setTaxDocBase64] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Zoom State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fetchTenant = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'tenants', id);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data();
        const tenantData = { 
          id: snap.id, 
          ...data,
          created_at: data.created_at?.toMillis ? data.created_at.toMillis() : data.created_at
        } as Tenant;
        
        setTenant(tenantData);
        
        // Check if credentials already exist (for page reload after approval)
        if (tenantData.status === 'active' && tenantData.temp_password) {
            setGeneratedCreds({
              email: tenantData.admin_email || tenantData.owner_email,
              pass: tenantData.temp_password
            });
            setCreatedShopId(tenantData.shop_id || null);
        }
        
        // Fetch Sub-documents
        setLoadingDocs(true);
        try {
            if (tenantData.company_doc_ref) {
              const cDocRef = doc(db, tenantData.company_doc_ref);
              const cSnap = await getDoc(cDocRef);
              if (cSnap.exists() && cSnap.data().content_base64) {
                setCompanyDocBase64(cSnap.data().content_base64);
              }
            } else if (tenantData.document_base64) {
              setCompanyDocBase64(tenantData.document_base64);
            }

            if (tenantData.tax_doc_ref) {
              const tDocRef = doc(db, tenantData.tax_doc_ref);
              const tSnap = await getDoc(tDocRef);
              if (tSnap.exists() && tSnap.data().content_base64) {
                setTaxDocBase64(tSnap.data().content_base64);
              }
            }
        } catch (docErr) {
          console.error("Error fetching sub-docs", docErr);
        } finally {
          setLoadingDocs(false);
        }

      } else {
        toast.error("Tenant not found");
        navigate('/tenants');
      }
    } catch (error) {
      console.error("Error fetching tenant:", error);
      toast.error("Failed to load tenant details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [id, navigate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      </Layout>
    );
  }

  if (!tenant) return null;

  const formatCurrency = (val?: number) => val ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val) : '-';
  
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    waiting_proof: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    awaiting_payment: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    payment_submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const paymentProofBase64 = tenant.payment?.payment_proof_base64;
  const paymentProofUrl = tenant.payment?.proofUrl;
  const hasProof = !!paymentProofBase64 || !!paymentProofUrl;

  return (
    <Layout>
      {showApprovalModal && (
        <ApprovalModal 
          tenant={tenant} 
          onClose={() => setShowApprovalModal(false)}
          onRefresh={fetchTenant}
        />
      )}

      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full transition-colors">
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
        <button onClick={() => navigate('/inbox')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={20} /> {t('details.back_inbox')}
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-cardBg/50 p-6 rounded-2xl border border-glassBorder backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {tenant.business_name.substring(0,2).toUpperCase()}
             </div>
             <div>
                <h1 className="text-2xl font-bold text-white">{tenant.business_name}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                  <span className="font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5">ID: {tenant.id}</span>
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
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
               <div>
                  <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-2">
                     <CheckCircle size={24} /> {t('details.provisioned_title')}
                  </h2>
                  <p className="text-emerald-200/70 max-w-lg">{t('details.provisioned_desc')}</p>
                  
                  {createdShopId && (
                     <button 
                       onClick={() => navigate(`/barbershops/${createdShopId}`)}
                       className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/50"
                     >
                       <Store size={16} /> {t('details.open_shop')}
                     </button>
                  )}
               </div>

               <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/20 min-w-[300px]">
                  <div className="text-xs text-emerald-400 font-bold uppercase mb-3 flex items-center gap-2">
                     <Key size={12} /> Admin Credentials
                  </div>
                  <div className="space-y-3">
                     <div>
                        <label className="text-[10px] text-gray-400 uppercase">Email</label>
                        <div className="flex items-center justify-between bg-black/30 p-2 rounded border border-white/5">
                           <code className="text-emerald-300 text-sm">{generatedCreds.email}</code>
                           <button onClick={() => copyToClipboard(generatedCreds.email)} className="text-gray-500 hover:text-white"><Copy size={14}/></button>
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] text-gray-400 uppercase">Password</label>
                        <div className="flex items-center justify-between bg-black/30 p-2 rounded border border-white/5">
                           <code className="text-emerald-300 text-sm font-bold tracking-widest">{generatedCreds.pass}</code>
                           <button onClick={() => copyToClipboard(generatedCreds.pass)} className="text-gray-500 hover:text-white"><Copy size={14}/></button>
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
               
               {loadingDocs ? (
                 <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* SIUP Document */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 group hover:border-gold/30 transition-colors">
                       <div className="flex justify-between items-start mb-3">
                          <h3 className="text-sm font-bold text-gray-300">{t('details.siup')}</h3>
                          {companyDocBase64 && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded border border-green-500/30">Uploaded</span>}
                       </div>
                       
                       {companyDocBase64 ? (
                         <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 group cursor-pointer" onClick={() => setZoomedImage(`data:image/jpeg;base64,${companyDocBase64}`)}>
                            <img src={`data:image/jpeg;base64,${companyDocBase64}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Company Doc" />
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

                       {companyDocBase64 && (
                         <button className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300 flex items-center justify-center gap-2 transition-colors">
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
                       
                       {taxDocBase64 ? (
                         <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 group cursor-pointer" onClick={() => setZoomedImage(`data:image/jpeg;base64,${taxDocBase64}`)}>
                            <img src={`data:image/jpeg;base64,${taxDocBase64}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Tax Doc" />
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
               )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            
            {/* Approval Action Box */}
            <div className="bg-cardBg border border-glassBorder rounded-xl p-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">{t('details.approval_action')}</h3>
               
               <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${hasProof ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                     <div className="flex items-center gap-3 mb-2">
                        {hasProof ? <CheckCircle className="text-green-400" size={20}/> : <AlertCircle className="text-red-400" size={20}/>}
                        <span className={`font-bold ${hasProof ? 'text-green-400' : 'text-red-400'}`}>
                           {hasProof ? "Payment Proof Valid" : "Missing Payment Proof"}
                        </span>
                     </div>
                     {!hasProof && <p className="text-xs text-red-300/70 ml-8">{t('details.cannot_approve')}</p>}
                  </div>

                  <button 
                     onClick={() => setShowApprovalModal(true)}
                     className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 group"
                  >
                     <ShieldCheck size={20} className="group-hover:scale-110 transition-transform"/>
                     {t('details.btn_approve')}
                  </button>

                  <div className="text-center text-xs text-gray-500 pt-2 border-t border-white/5">
                     Tenant will be notified immediately.
                  </div>
               </div>
            </div>

            {/* Payment Proof Preview */}
            <div className="bg-cardBg border border-glassBorder rounded-xl p-6">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                  {t('details.payment_proof')}
                  {hasProof && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">UPLOADED</span>}
               </h3>
               
               {hasProof ? (
                  <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden border border-gray-700 group cursor-pointer" onClick={() => setZoomedImage(paymentProofBase64 ? `data:image/jpeg;base64,${paymentProofBase64}` : paymentProofUrl!)}>
                     <img src={paymentProofBase64 ? `data:image/jpeg;base64,${paymentProofBase64}` : paymentProofUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Proof" />
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
    </Layout>
  );
};