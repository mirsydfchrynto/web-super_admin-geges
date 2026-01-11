import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteTenant } from '../services/provisioningService';
import { Layout } from '../components/Layout';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tenant, Barbershop } from '../types';
import { 
  ArrowLeft, FileText, Calendar, Download, Maximize2, X,
  CheckCircle, XCircle, ShieldCheck, Store, Key, Copy,
  Clock, MapPin, Loader2, Receipt, Ban, Trash2, Mail, Phone, Globe,
  AlertTriangle, ChevronRight, FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';
import { ApprovalModal } from '../components/ApprovalModal';
import { getDisplayImageUrl } from '../lib/utils';

export const TenantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [createdShop, setCreatedShop] = useState<Barbershop | null>(null);
  const [generatedCreds, setGeneratedCreds] = useState<{email: string, pass: string} | null>(null);
  const [documents, setDocuments] = useState<{siup: string | null, tax: string | null}>({ siup: null, tax: null });
  
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!id) return;
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
        created_at: tenantSnap.data()?.created_at?.toMillis 
          ? tenantSnap.data().created_at.toMillis() 
          : (tenantSnap.data()?.created_at || Date.now())
      } as Tenant;

      const promises: Promise<any>[] = [];

      if (tenantData.shop_id) {
        promises.push(getDoc(doc(db, 'barbershops', tenantData.shop_id)).catch(() => ({ exists: () => false })));
      } else {
        promises.push(Promise.resolve({ exists: () => false }));
      }

      if (tenantData.company_doc_ref) {
        promises.push(getDoc(doc(db, tenantData.company_doc_ref)).catch(() => ({ exists: () => false })));
      } else if (tenantData.document_base64) {
        promises.push(Promise.resolve({ exists: () => true, data: () => ({ content_base64: tenantData.document_base64 }) }));
      } else {
        promises.push(Promise.resolve({ exists: () => false }));
      }

      if (tenantData.tax_doc_ref) {
        promises.push(getDoc(doc(db, tenantData.tax_doc_ref)).catch(() => ({ exists: () => false })));
      } else {
        promises.push(Promise.resolve({ exists: () => false }));
      }

      const [shopSnap, siupSnap, taxSnap] = await Promise.all(promises);

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

      if (tenantData.status === 'active' && tenantData.temp_password) {
        setGeneratedCreds({
          email: tenantData.admin_email || tenantData.owner_email,
          pass: tenantData.temp_password
        });
      }

      setTenant(tenantData);

    } catch (error: any) {
      console.error("Error fetching details:", error);
      toast.error(`Gagal memuat data: ${error.message || "Unknown error"}`);
    } finally {
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

  const statusConfig: Record<string, { color: string, label: string, icon: any }> = {
    active: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Active Business', icon: CheckCircle },
    waiting_proof: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Waiting Proof', icon: Clock },
    awaiting_payment: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Awaiting Payment', icon: Clock },
    payment_submitted: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Payment Submitted', icon: CheckCircle },
    rejected: { color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Application Rejected', icon: XCircle },
    cancelled: { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', label: 'Cancelled', icon: Ban },
    cancellation_requested: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', label: 'Refund Requested', icon: Receipt },
    suspended: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'Account Suspended', icon: AlertTriangle },
  };

  if (loading || !tenant) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="animate-spin text-gold" size={40} />
        </div>
      </Layout>
    );
  }

  const currentStatus = statusConfig[tenant.status] || { color: 'text-gray-400 bg-gray-800', label: tenant.status, icon: Clock };
  const StatusIcon = currentStatus.icon;

  return (
    <Layout>
      {showApprovalModal && (
        <ApprovalModal 
          tenant={tenant} 
          onClose={() => setShowApprovalModal(false)}
          onRefresh={fetchAllData}
        />
      )}

      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
          <button aria-label="Close Preview" className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <X size={24} />
          </button>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10" alt="Preview" />
        </div>
      )}

      <div className="max-w-7xl mx-auto pb-20">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
              {t('common.back')}
           </button>
           <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <span>TENANT ID</span>
              <span className="bg-white/5 px-2 py-1 rounded text-gray-300">{tenant.id}</span>
           </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-cardBg/80 to-cardBg/40 backdrop-blur-xl p-8 mb-8 shadow-2xl group">
          <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-gold/10 rounded-full blur-[80px] animate-drift-slow pointer-events-none mix-blend-screen"></div>
          <div className="absolute bottom-[-50%] left-[10%] w-80 h-80 bg-yellow-600/10 rounded-full blur-[60px] animate-drift-medium pointer-events-none mix-blend-screen"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
             <div className="flex-1">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border backdrop-blur-md ${currentStatus.color}`}>
                   <StatusIcon size={14} />
                   {currentStatus.label}
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
                   {tenant.business_name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                   <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/5 rounded-full"><Calendar size={14}/></div>
                      Joined {formatDate(tenant.created_at)}
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/5 rounded-full"><Mail size={14}/></div>
                      {tenant.owner_email}
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/5 rounded-full"><Phone size={14}/></div>
                      {tenant.owner_phone || 'No Phone'}
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-3 min-w-[200px]">
                {['waiting_proof', 'payment_submitted', 'awaiting_payment', 'cancellation_requested'].includes(tenant.status) && (
                   <button 
                     onClick={() => setShowApprovalModal(true)}
                     className="w-full py-4 px-6 bg-gold hover:bg-goldHover text-black font-bold text-sm rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/30 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
                   >
                     {tenant.status === 'cancellation_requested' ? 'Review Refund' : 'Review Application'}
                     <ArrowLeft size={18} className="rotate-180" />
                   </button>
                )}
                
                {['active', 'rejected', 'suspended', 'cancelled'].includes(tenant.status) && (
                   <button 
                     onClick={async () => {
                        if (window.confirm("PERMANENTLY DELETE this tenant and all data? This cannot be undone.")) {
                           setSuspending(true);
                           try {
                              await deleteTenant(tenant);
                              toast.success("Deleted");
                              navigate('/tenants');
                           } catch(e:any) { toast.error(e.message); setSuspending(false); }
                        }
                     }}
                     disabled={suspending}
                     className="w-full py-3 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 hover:border-red-500/50 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2"
                   >
                     {suspending ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>}
                     DELETE DATA
                   </button>
                )}
             </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Credentials Card (Active Only) */}
            {tenant.status === 'active' && generatedCreds && (
              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-1 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
                 <div className="relative bg-cardBg/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                          <Key size={24} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-white">Owner Credentials</h3>
                          <p className="text-emerald-400 text-xs">Generated for {tenant.owner_email}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="bg-black/40 p-4 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Login Email</label>
                          <div className="flex items-center justify-between mt-1">
                             <code className="text-white font-mono">{generatedCreds.email}</code>
                             <button aria-label="Copy Email" onClick={() => copyToClipboard(generatedCreds.email)} className="text-gray-500 hover:text-white transition-colors"><Copy size={14}/></button>
                          </div>
                       </div>
                       <div className="bg-black/40 p-4 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Temporary Password</label>
                          <div className="flex items-center justify-between mt-1">
                             <code className="text-white font-mono tracking-widest">{generatedCreds.pass}</code>
                             <button aria-label="Copy Password" onClick={() => copyToClipboard(generatedCreds.pass)} className="text-gray-500 hover:text-white transition-colors"><Copy size={14}/></button>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* Owner Details */}
            <div className="bg-cardBg/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-xl">
               <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="text-blue-500" size={20}/>
                  {t('details.owner_info')}
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                  <div className="group">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block group-hover:text-blue-400 transition-colors">Full Name</label>
                     <p className="text-white text-lg font-medium">{tenant.owner_name}</p>
                  </div>
                  <div className="group">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block group-hover:text-blue-400 transition-colors">Phone Number</label>
                     <p className="text-white text-lg font-medium font-mono">{tenant.owner_phone || '-'}</p>
                  </div>
                  <div className="group col-span-1 md:col-span-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block group-hover:text-blue-400 transition-colors">Business Address</label>
                     <p className="text-gray-300 text-base leading-relaxed flex items-start gap-2">
                        <MapPin size={18} className="text-gray-600 mt-0.5 flex-shrink-0"/>
                        {tenant.address || "Address not provided"}
                     </p>
                  </div>
               </div>
            </div>

            {/* Legal Documents */}
            <div className="bg-cardBg/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-xl">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     <FileCheck className="text-gold" size={20}/>
                     Legal Documents
                  </h3>
                  {documents.siup && documents.tax && (
                     <span className="text-[10px] font-bold bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20">VERIFIED</span>
                  )}
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* SIUP Card */}
                  <div className="bg-black/20 rounded-xl p-1 border border-white/5 hover:border-gold/30 transition-all duration-300 group">
                     <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                           <span className="text-sm font-bold text-gray-300">SIUP License</span>
                           {documents.siup ? <CheckCircle size={14} className="text-emerald-500"/> : <XCircle size={14} className="text-gray-600"/>}
                        </div>
                        
                        {documents.siup ? (
                           <div 
                              className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer"
                              onClick={() => setZoomedImage(getDisplayImageUrl(documents.siup))}
                           >
                              <img 
                                 src={getDisplayImageUrl(documents.siup)!} 
                                 alt="SIUP Document Preview"
                                 className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="bg-black/60 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10">
                                    <Maximize2 size={20} className="text-white"/>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="aspect-video bg-white/5 rounded-lg border-2 border-dashed border-white/5 flex items-center justify-center">
                              <span className="text-xs text-gray-600">No Document</span>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* NPWP Card */}
                  <div className="bg-black/20 rounded-xl p-1 border border-white/5 hover:border-gold/30 transition-all duration-300 group">
                     <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                           <span className="text-sm font-bold text-gray-300">NPWP Tax ID</span>
                           <span className="text-[10px] font-mono text-gray-500">{tenant.tax_id || 'N/A'}</span>
                        </div>
                        
                        {documents.tax ? (
                           <div 
                              className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer"
                              onClick={() => setZoomedImage(getDisplayImageUrl(documents.tax))}
                           >
                              <img 
                                 src={getDisplayImageUrl(documents.tax)!} 
                                 alt="NPWP Document Preview"
                                 className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="bg-black/60 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10">
                                    <Maximize2 size={20} className="text-white"/>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="aspect-video bg-white/5 rounded-lg border-2 border-dashed border-white/5 flex items-center justify-center">
                              <span className="text-xs text-gray-600">No Document</span>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-8">
             
             {/* Payment Card */}
             <div className="bg-cardBg/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5">
                   <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Payment Info</h3>
                </div>
                
                <div className="p-6">
                   {/* Proof Image */}
                   {tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl ? (
                      <div 
                         className="relative aspect-[4/5] bg-black rounded-xl overflow-hidden border border-gray-700 cursor-pointer group mb-6"
                         onClick={() => setZoomedImage(getDisplayImageUrl(tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl))}
                      >
                         <img 
                            src={getDisplayImageUrl(tenant.payment?.payment_proof_base64 || tenant.payment?.proofUrl)!} 
                            alt="Payment Proof Preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                         <div className="absolute bottom-4 left-4 right-4">
                            <div className="text-xs text-gray-400 mb-1">Total Paid</div>
                            <div className="text-2xl font-bold text-white tracking-tight">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(tenant.invoice?.amount || tenant.registration_fee || 0)}
                            </div>
                         </div>
                         <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize2 size={16} className="text-white"/>
                         </div>
                      </div>
                   ) : (
                      <div className="aspect-square bg-white/5 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 mb-6">
                         <Receipt size={32} className="mb-2 opacity-50"/>
                         <span className="text-xs">Waiting for payment</span>
                      </div>
                   )}

                   {/* Payment Details */}
                   <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-500">Method</span>
                         <span className="text-white font-medium uppercase">{tenant.payment?.paidBy || 'Manual'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-500">Status</span>
                         <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            tenant.payment?.verificationStatus === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                         }`}>
                            {tenant.payment?.verificationStatus?.toUpperCase() || 'PENDING'}
                         </span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Timeline */}
             <div className="bg-cardBg/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Clock size={16}/> Activity Log
                </h3>
                
                <div className="relative pl-2 space-y-8">
                   <div className="absolute top-2 bottom-2 left-[11px] w-px bg-white/10"></div>
                   
                   {tenant.history && [...tenant.history].reverse().map((log, i) => (
                      <div key={i} className="relative pl-8 group">
                         <div className="absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full bg-darkBg border border-white/20 flex items-center justify-center z-10 group-hover:border-gold/50 transition-colors">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-gold transition-colors"></div>
                         </div>
                         <div className="text-sm text-gray-300 leading-snug mb-1 group-hover:text-white transition-colors">{log.note}</div>
                         <div className="text-[10px] text-gray-600 font-mono">{formatDate(log.created_at)}</div>
                      </div>
                   ))}
                   
                   {!tenant.history && <div className="pl-8 text-xs text-gray-600">No activity recorded</div>}
                </div>
             </div>

          </div>

        </div>
      </div>
    </Layout>
  );
};
