import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertCircle, Loader2, FileText, Download, ExternalLink, Clock, FileCheck, Receipt, Send } from 'lucide-react';
import { Tenant } from '../types';
import { approveTenantRegistration, rejectTenantRegistration, approveRefund } from '../services/provisioningService';
import { doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app, { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';
import { getDisplayImageUrl } from '../lib/utils';

interface ApprovalModalProps {
  tenant: Tenant;
  onClose: () => void;
  onRefresh: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ tenant, onClose, onRefresh }) => {
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history'>('overview');
  
  // Rejection UI State
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Refund UI State
  const [refundProofFile, setRefundProofFile] = useState<File | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const isRefundRequested = tenant.status === 'cancellation_requested';

  const { t, formatDate } = useTranslation();
  
  // Document States
  const [companyDocBase64, setCompanyDocBase64] = useState<string | null>(null);
  const [taxDocBase64, setTaxDocBase64] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Fetch Documents from Subcollection Paths
  useEffect(() => {
    const fetchDocs = async () => {
      setLoadingDocs(true);
      try {
        if (tenant.company_doc_ref) {
          const docRef = doc(db, tenant.company_doc_ref);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data().content_base64) {
            setCompanyDocBase64(snap.data().content_base64);
          }
        } else if (tenant.document_base64) {
          setCompanyDocBase64(tenant.document_base64); // Legacy
        }

        if (tenant.tax_doc_ref) {
          const docRef = doc(db, tenant.tax_doc_ref);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data().content_base64) {
            setTaxDocBase64(snap.data().content_base64);
          }
        }
      } catch (error) {
        console.error("Error fetching docs:", error);
        toast.error(t('common.error'));
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchDocs();
  }, [tenant]);

  const handleApprove = async () => {
    if (!confirm(t('details.btn_approve') + "?")) return;
    
    setProcessing(true);
    const toastId = toast.loading("Provisioning infrastructure...");
    
    try {
      await approveTenantRegistration(tenant);
      toast.success(t('common.success'), { id: toastId });
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(`Provisioning Failed: ${error.message}`, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Mohon isi alasan penolakan.");
      return;
    }

    setProcessing(true);
    const toastId = toast.loading("Rejecting application...");

    try {
      await rejectTenantRegistration(tenant, rejectionReason);
      toast.success("Pendaftaran ditolak.", { id: toastId });
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed: ${error.message}`, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const handleRefundConfirm = async () => {
    if (!refundProofFile) {
       toast.error("Wajib upload bukti transfer refund.");
       return;
    }
    if (!refundNote.trim()) {
       toast.error("Wajib isi catatan refund.");
       return;
    }

    setProcessing(true);
    const toastId = toast.loading("Uploading proof & processing refund...");

    try {
      // 1. Upload Proof
      const storage = getStorage(app);
      const storageRef = ref(storage, `refunds/${tenant.id}_${Date.now()}`);
      await uploadBytes(storageRef, refundProofFile);
      const downloadUrl = await getDownloadURL(storageRef);

      // 2. Call Service
      await approveRefund(tenant, downloadUrl, refundNote);
      
      toast.success("Refund berhasil diproses.", { id: toastId });
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(`Refund Failed: ${error.message}`, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const paymentProofBase64 = tenant.payment?.payment_proof_base64;
  const paymentProofUrl = tenant.payment?.proofUrl;
  const hasProof = !!paymentProofBase64 || !!paymentProofUrl;
  
  const invoiceAmount = tenant.invoice?.amount || tenant.registration_fee || 0;
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-[#0f172a] border border-glassBorder w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glassBorder bg-cardBg/50">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {tenant.business_name}
              <span className={`text-xs px-2 py-1 rounded-full border uppercase ${hasProof ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                {tenant.status.replace('_', ' ')}
              </span>
            </h2>
            <p className="text-gray-400 text-sm mt-1">Tenant ID: {tenant.id}</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-black/30 rounded-lg p-1">
                <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Overview</button>
                <button onClick={() => setActiveTab('documents')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'documents' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Legal Docs</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>History</button>
             </div>
             <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          
          {/* LEFT SIDE CONTENT */}
          <div className="flex-1 p-6 bg-black/10">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-cardBg/50 p-5 rounded-xl border border-glassBorder relative overflow-hidden">
                       <div className="flex items-center gap-3 mb-3 text-gray-400 text-xs font-bold uppercase tracking-wider">
                          <Receipt size={14} className="text-emerald-400"/> Invoice Details
                       </div>
                       <div className="text-2xl font-bold text-white mb-1">{formatCurrency(invoiceAmount)}</div>
                       <div className="text-sm text-gray-400 mb-4">Invoice ID: {tenant.invoice?.invoice_id || 'Generating...'}</div>
                       <div className="flex items-center gap-2">
                          <span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10 text-gray-300">Plan: {tenant.plan?.toUpperCase() || 'MONTHLY'}</span>
                       </div>
                    </div>

                    <div className="bg-cardBg/50 p-5 rounded-xl border border-glassBorder relative overflow-hidden">
                       <div className="flex items-center gap-3 mb-3 text-gray-400 text-xs font-bold uppercase tracking-wider">
                          <CheckCircle size={14} className="text-blue-400"/> {t('details.payment_proof')}
                       </div>
                       {hasProof ? (
                         <div className="relative w-full h-32 bg-black/40 rounded-lg overflow-hidden group cursor-pointer border border-gray-700">
                            <img src={getDisplayImageUrl(paymentProofBase64 || paymentProofUrl)!} className="w-full h-full object-cover" alt="Proof" />
                         </div>
                       ) : (
                         <div className="w-full h-32 bg-red-500/5 border border-red-500/20 rounded-lg flex flex-col items-center justify-center text-red-400 text-xs gap-2">
                            <AlertCircle size={24} /> No Proof
                         </div>
                       )}
                    </div>
                 </div>
                 <div className="bg-cardBg/50 p-6 rounded-xl border border-glassBorder">
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 flex items-center gap-2"><FileText size={14} /> {t('details.owner_info')}</h3>
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                       <div><p className="text-gray-500 text-xs">Full Name</p><p className="text-white font-medium">{tenant.owner_name}</p></div>
                       <div><p className="text-gray-500 text-xs">Phone</p><p className="text-white font-medium">{tenant.owner_phone || '-'}</p></div>
                       <div className="col-span-2"><p className="text-gray-500 text-xs">Email</p><p className="text-white font-medium">{tenant.owner_email}</p></div>
                       <div className="col-span-2"><p className="text-gray-500 text-xs">Address</p><p className="text-gray-300">{tenant.address || '-'}</p></div>
                    </div>
                 </div>
              </div>
            )}
            
            {activeTab === 'documents' && (
              <div className="space-y-6">
                 {loadingDocs && <Loader2 className="animate-spin text-blue-400 mx-auto"/>}
                 <div className="bg-cardBg/50 rounded-xl border border-glassBorder p-4 flex flex-col items-center">
                    <h3 className="text-white font-bold mb-4">SIUP Document</h3>
                    {companyDocBase64 ? <img src={getDisplayImageUrl(companyDocBase64)!} className="max-h-[300px] rounded border border-gray-700" alt="SIUP" /> : <p className="text-gray-500 text-sm">No Document</p>}
                 </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-cardBg/50 rounded-xl border border-glassBorder overflow-hidden">
                 <div className="divide-y divide-glassBorder">
                    {tenant.history && [...tenant.history].reverse().map((log, idx) => (
                      <div key={idx} className="p-4 flex gap-4 hover:bg-white/5 transition-colors">
                         <div className="mt-1"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div></div>
                         <div>
                            <p className="text-sm text-gray-200">{log.note}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> {formatDate(log.created_at)}</span>
                               <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 uppercase tracking-wide">{log.status}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: ACTION PANEL */}
          <div className="w-full md:w-80 bg-cardBg border-l border-glassBorder p-6 flex flex-col">
             <div className="mb-6">
                <h4 className="text-gray-400 text-xs font-bold uppercase mb-4">{t('details.approval_action')}</h4>
                
                {isRefundRequested ? (
                   <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 animate-in slide-in-from-right-4">
                      <h3 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2"><Receipt size={16}/> Permintaan Refund</h3>
                      <div className="bg-black/40 p-3 rounded mb-3 text-xs text-gray-300 border border-white/5">
                         <strong>Alasan User:</strong><br/>
                         "{tenant.cancellation_request?.reason || '-'}"
                      </div>
                      
                      <div className="space-y-3">
                         <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Upload Bukti Transfer</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => e.target.files && setRefundProofFile(e.target.files[0])}
                              className="w-full mt-1 text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                            />
                         </div>
                         <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Catatan Admin</label>
                            <textarea
                              value={refundNote}
                              onChange={(e) => setRefundNote(e.target.value)}
                              placeholder="Cth: Dana dikembalikan via BCA..."
                              className="w-full mt-1 bg-black/40 border border-orange-500/30 rounded p-2 text-xs text-white focus:border-orange-500 outline-none resize-none h-20"
                            />
                         </div>
                         
                         <button
                           onClick={handleRefundConfirm}
                           disabled={processing || !refundProofFile}
                           className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                         >
                           {processing ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                           KONFIRMASI REFUND
                         </button>
                      </div>
                   </div>
                ) : isRejecting ? (
                  <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4 animate-in slide-in-from-right-4 duration-300">
                     <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2"><XCircle size={16}/> Konfirmasi Penolakan</h3>
                     <textarea
                       value={rejectionReason}
                       onChange={(e) => setRejectionReason(e.target.value)}
                       placeholder="Masukkan alasan penolakan (Wajib)..."
                       className="w-full bg-black/40 border border-red-500/30 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:border-red-500 outline-none resize-none h-32 mb-3"
                       autoFocus
                     />
                     <div className="flex flex-col gap-2">
                        <button
                          onClick={handleRejectConfirm}
                          disabled={processing || !rejectionReason.trim()}
                          className="w-full py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {processing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          KIRIM PENOLAKAN
                        </button>
                        <button
                          onClick={() => setIsRejecting(false)}
                          className="w-full py-2 text-xs font-bold text-gray-400 hover:text-white bg-transparent border border-gray-600 rounded-lg transition-colors"
                        >
                          BATAL
                        </button>
                     </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg text-xs text-blue-200 mb-4">
                     <p className="mb-2"><strong>Status: {tenant.status}</strong></p>
                     <p className="opacity-70">Pastikan bukti pembayaran valid sebelum menyetujui.</p>
                  </div>
                )}
             </div>

             {!isRejecting && !isRefundRequested && (
               <div className="mt-auto space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={processing || !hasProof}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                      !hasProof 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {processing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                    {processing ? t('details.btn_provisioning') : t('details.btn_approve')}
                  </button>

                  <button
                    onClick={() => setIsRejecting(true)}
                    disabled={processing}
                    className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
                  >
                    <XCircle size={18} />
                    {t('details.btn_reject')}
                  </button>
               </div>
             )}
          </div>

        </div>
      </motion.div>
    </div>
  );
};