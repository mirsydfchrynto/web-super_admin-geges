import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertCircle, Loader2, FileText, Download, ExternalLink, Clock, FileCheck, Receipt, Send } from 'lucide-react';
import { Tenant } from '../types';
import { approveTenantRegistration, rejectTenantRegistration, approveRefund } from '../services/provisioningService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';
import { getDisplayImageUrl, fileToBase64 } from '../lib/utils';

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
    const toastId = toast.loading("Processing refund data...");

    try {
      // 1. Convert File to Base64 (No Firebase Storage allowed)
      const base64Data = await fileToBase64(refundProofFile);

      // 2. Call Service with Base64 string
      await approveRefund(tenant, base64Data, refundNote);
      
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
        className="bg-cardBg/90 backdrop-blur-2xl border border-glassBorder w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glassBorder bg-white/5">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {tenant.business_name}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-widest ${hasProof ? 'bg-gold/20 text-gold border-gold/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                {tenant.status.replace('_', ' ')}
              </span>
            </h2>
            <p className="text-gray-500 font-mono text-[10px] mt-1 tracking-tighter">TENANT ID: {tenant.id}</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                <button onClick={() => setActiveTab('overview')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${activeTab === 'overview' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>OVERVIEW</button>
                <button onClick={() => setActiveTab('documents')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${activeTab === 'documents' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>DOCUMENTS</button>
                <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${activeTab === 'history' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>HISTORY</button>
             </div>
             <button aria-label="Close" onClick={onClose} className="p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-transparent hover:border-white/10"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          
          {/* LEFT SIDE CONTENT */}
          <div className="flex-1 p-8 bg-black/20">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-cardBg p-6 rounded-2xl border border-glassBorder relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Receipt size={80} className="text-gold"/>
                       </div>
                       <div className="flex items-center gap-3 mb-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                          <Receipt size={14} className="text-gold"/> Billing Summary
                       </div>
                       <div className="text-3xl font-bold text-white mb-1 tracking-tight">{formatCurrency(invoiceAmount)}</div>
                       <div className="text-xs text-gray-500 mb-6 font-mono">Invoice ID: {tenant.invoice?.invoice_id || 'PENDING'}</div>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md border border-white/10 text-gray-400 uppercase tracking-wider">Plan: {tenant.plan || 'MONTHLY'}</span>
                       </div>
                    </div>

                    <div className="bg-cardBg p-6 rounded-2xl border border-glassBorder relative overflow-hidden group">
                       <div className="flex items-center gap-3 mb-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                          <CheckCircle size={14} className="text-gold"/> Payment Verification
                       </div>
                       {hasProof ? (
                         <div className="relative w-full h-32 bg-black/40 rounded-xl overflow-hidden group cursor-pointer border border-white/5 hover:border-gold/30 transition-all">
                            <img src={getDisplayImageUrl(paymentProofBase64 || paymentProofUrl)!} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="Proof" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                               <ExternalLink size={20} className="text-white"/>
                            </div>
                         </div>
                       ) : (
                         <div className="w-full h-32 bg-danger/5 border border-danger/20 rounded-xl flex flex-col items-center justify-center text-danger text-xs gap-2">
                            <AlertCircle size={24} /> No Proof Found
                         </div>
                       )}
                    </div>
                 </div>
                 <div className="bg-cardBg p-8 rounded-2xl border border-glassBorder">
                    <h3 className="text-gray-500 text-[10px] font-bold uppercase mb-6 flex items-center gap-2 tracking-widest"><FileText size={14} className="text-gold"/> Account Information</h3>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-12 text-sm">
                       <div><p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Full Name</p><p className="text-white font-bold text-lg">{tenant.owner_name}</p></div>
                       <div><p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Contact Phone</p><p className="text-white font-bold text-lg font-mono">{tenant.owner_phone || '-'}</p></div>
                       <div className="col-span-2"><p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Registered Email</p><p className="text-white font-bold text-lg font-mono">{tenant.owner_email}</p></div>
                       <div className="col-span-2"><p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter mb-1">Business Address</p><p className="text-gray-300 text-base leading-relaxed">{tenant.address || '-'}</p></div>
                    </div>
                 </div>
              </div>
            )}
            
            {activeTab === 'documents' && (
              <div className="space-y-8">
                 {loadingDocs && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold w-8 h-8"/></div>}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-cardBg rounded-2xl border border-glassBorder p-6 flex flex-col items-center group">
                       <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">SIUP Document</h3>
                       <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/5 relative group-hover:border-gold/30 transition-all">
                          {companyDocBase64 ? (
                             <img src={getDisplayImageUrl(companyDocBase64)!} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-all" alt="SIUP" />
                          ) : (
                             <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                                <FileText size={32} opacity={0.3}/>
                                <span className="text-[10px] font-bold">MISSING</span>
                             </div>
                          )}
                       </div>
                    </div>
                    <div className="bg-cardBg rounded-2xl border border-glassBorder p-6 flex flex-col items-center group">
                       <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">NPWP Document</h3>
                       <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/5 relative group-hover:border-gold/30 transition-all">
                          {taxDocBase64 ? (
                             <img src={getDisplayImageUrl(taxDocBase64)!} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-all" alt="NPWP" />
                          ) : (
                             <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                                <FileText size={32} opacity={0.3}/>
                                <span className="text-[10px] font-bold">MISSING</span>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-cardBg rounded-2xl border border-glassBorder overflow-hidden">
                 <div className="divide-y divide-white/5">
                    {tenant.history && [...tenant.history].reverse().map((log, idx) => (
                      <div key={idx} className="p-6 flex gap-6 hover:bg-white/[0.02] transition-colors relative group">
                         <div className="mt-1 relative z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_rgba(195,164,123,0.4)] group-hover:scale-125 transition-transform"></div>
                         </div>
                         <div className="flex-1">
                            <p className="text-sm text-gray-300 leading-relaxed">{log.note}</p>
                            <div className="flex items-center gap-4 mt-2">
                               <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1.5 uppercase tracking-tighter"><Clock size={10} /> {formatDate(log.created_at)}</span>
                               <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-500 uppercase tracking-widest">{log.status}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: ACTION PANEL */}
          <div className="w-full md:w-96 bg-cardBg border-l border-glassBorder p-8 flex flex-col">
             <div className="mb-8">
                <h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6">Review Action Panel</h4>
                
                {isRefundRequested ? (
                   <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 animate-in slide-in-from-right-4 duration-500">
                      <h3 className="text-sm font-bold text-rose-400 mb-4 flex items-center gap-2"><Receipt size={16}/> Process Refund</h3>
                      <div className="bg-black/40 p-4 rounded-xl mb-6 text-xs text-gray-400 border border-white/5 leading-relaxed">
                         <strong className="text-rose-400 uppercase text-[9px] tracking-wider block mb-1">User Reason:</strong>
                         "{tenant.cancellation_request?.reason || '-'}"
                      </div>
                      
                      <div className="space-y-5">
                         <div>
                            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest block mb-2">Proof of Transfer</label>
                            <div className="relative group">
                               <input 
                                 type="file" 
                                 accept="image/*"
                                 onChange={(e) => e.target.files && setRefundProofFile(e.target.files[0])}
                                 className="w-full cursor-pointer text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-white/5 file:text-white hover:file:bg-white/10 file:transition-all"
                               />
                            </div>
                         </div>
                         <div>
                            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest block mb-2">Internal Note</label>
                            <textarea
                              value={refundNote}
                              onChange={(e) => setRefundNote(e.target.value)}
                              placeholder="Describe refund details..."
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white focus:border-rose-500/50 outline-none resize-none h-24 transition-all"
                            />
                         </div>
                         
                         <button
                           onClick={handleRefundConfirm}
                           disabled={processing || !refundProofFile}
                           className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-rose-900/20 disabled:opacity-30 disabled:grayscale"
                         >
                           {processing ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                           COMPLETE REFUND
                         </button>
                      </div>
                   </div>
                ) : isRejecting ? (
                  <div className="bg-danger/5 border border-danger/20 rounded-2xl p-6 animate-in slide-in-from-right-4 duration-500">
                     <h3 className="text-sm font-bold text-danger mb-4 flex items-center gap-2"><XCircle size={16}/> Decline Application</h3>
                     <textarea
                       value={rejectionReason}
                       onChange={(e) => setRejectionReason(e.target.value)}
                       placeholder="Provide a clear reason for rejection..."
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:border-danger/50 outline-none resize-none h-40 mb-6 transition-all"
                       autoFocus
                     />
                     <div className="flex flex-col gap-3">
                        <button
                          onClick={handleRejectConfirm}
                          disabled={processing || !rejectionReason.trim()}
                          className="w-full py-4 text-xs font-bold text-white bg-danger hover:bg-[#b72626] rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-danger/20 disabled:opacity-30"
                        >
                          {processing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          SEND REJECTION
                        </button>
                        <button
                          onClick={() => setIsRejecting(false)}
                          className="w-full py-3 text-[10px] font-bold text-gray-500 hover:text-white bg-transparent border border-white/5 hover:border-white/10 rounded-xl transition-all"
                        >
                          CANCEL ACTION
                        </button>
                     </div>
                  </div>
                ) : (
                  <div className="p-5 bg-gold/5 border border-gold/20 rounded-2xl text-xs text-gold/80 leading-relaxed italic">
                     <p className="font-bold mb-2 uppercase tracking-tighter not-italic text-gold">Current Status: {tenant.status}</p>
                     <p>Please double-check all documents and payment proof before proceeding with provisioning.</p>
                  </div>
                )}
             </div>

             {!isRejecting && !isRefundRequested && (
               <div className="mt-auto space-y-4">
                  <button
                    onClick={handleApprove}
                    disabled={processing || !hasProof}
                    className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-2xl transition-all transform hover:-translate-y-1 ${
                      !hasProof 
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5'
                      : 'bg-gold hover:bg-goldHover text-black shadow-gold/20'
                    }`}
                  >
                    {processing ? <Loader2 className="animate-spin" /> : <CheckCircle size={22} />}
                    <span className="text-sm tracking-tight">{processing ? t('details.btn_provisioning') : t('details.btn_approve')}</span>
                  </button>

                  <button
                    onClick={() => setIsRejecting(true)}
                    disabled={processing}
                    className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 bg-white/5 hover:bg-danger/10 text-gray-500 hover:text-danger border border-white/5 hover:border-danger/30 transition-all group"
                  >
                    <XCircle size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] tracking-widest uppercase">{t('details.btn_reject')}</span>
                  </button>
               </div>
             )}
          </div>

        </div>
      </motion.div>
    </div>
  );
};