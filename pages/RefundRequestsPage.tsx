import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tenant } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { Receipt, Loader2, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const RefundRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Query for tenants with status 'cancellation_requested'
      const q = query(
        collection(db, 'tenants'), 
        where('status', '==', 'cancellation_requested')
      );
      
      const snapshot = await getDocs(q);
      const data: Tenant[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.status === 'deleted') return; // Filter out soft-deleted

        data.push({ 
           id: doc.id, 
           ...d,
           created_at: d.created_at?.toMillis ? d.created_at.toMillis() : d.created_at
        } as Tenant);
      });

      // Sort manually by requested_at desc (if field exists) or created_at
      data.sort((a, b) => {
         const timeA = (a.cancellation_request?.requested_at as Timestamp)?.seconds || 0;
         const timeB = (b.cancellation_request?.requested_at as Timestamp)?.seconds || 0;
         return timeB - timeA;
      });

      setRequests(data);
    } catch (error) {
      console.error("Error fetching refunds:", error);
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatCurrency = (val?: number) => val ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val) : '-';

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          Request Pembatalan & Refund
        </h1>
        <p className="text-textSecondary">Daftar permintaan pengembalian dana dari tenant.</p>
      </div>

      <div className="bg-cardBg rounded-2xl overflow-hidden border border-glassBorder shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/30 text-textSecondary text-xs uppercase tracking-wider border-b border-glassBorder">
                <th className="p-5 font-bold">Tenant Info</th>
                <th className="p-5 font-bold">Total Refund</th>
                <th className="p-5 font-bold">Alasan</th>
                <th className="p-5 font-bold">Waktu Request</th>
                <th className="p-5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glassBorder/50">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-textSecondary"><Loader2 className="animate-spin mx-auto mb-2" />Loading Requests...</td></tr>
              ) : requests.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-textSecondary"><AlertCircle className="mx-auto mb-2 opacity-50"/> Tidak ada permintaan refund saat ini.</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-5">
                       <div className="font-bold text-white">{req.business_name}</div>
                       <div className="text-xs text-textSecondary">{req.owner_name}</div>
                       <div className="text-[10px] text-gray-500 font-mono mt-1">{req.id}</div>
                    </td>
                    <td className="p-5 text-emerald-400 font-bold font-mono">
                       {formatCurrency(req.invoice?.amount || req.registration_fee)}
                    </td>
                    <td className="p-5 max-w-xs">
                       <div className="bg-black/30 p-2 rounded border border-white/5 text-xs text-gray-300 italic truncate">
                          "{req.cancellation_request?.reason || '-'}"
                       </div>
                    </td>
                    <td className="p-5 text-sm text-textSecondary">
                       <div className="flex items-center gap-2">
                          <Clock size={14}/>
                          {req.cancellation_request?.requested_at 
                             ? formatDate(req.cancellation_request.requested_at) 
                             : formatDate(req.created_at)}
                       </div>
                    </td>
                    <td className="p-5 text-right">
                       <button 
                         onClick={() => navigate(`/tenants/${req.id}`)}
                         className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ml-auto shadow-lg shadow-orange-900/20"
                       >
                          PROSES <ArrowRight size={14}/>
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};
