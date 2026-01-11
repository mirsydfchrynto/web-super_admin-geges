import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { reviewService } from '../services/reviewService';
import { AppRating } from '../types/review';
import { Star, TrendingUp, TrendingDown, MessageSquare, ThumbsUp, ThumbsDown, Loader2, Database } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const COLORS = {
  positive: '#22c55e', // Green-500
  negative: '#ef4444', // Red-500
  neutral: '#94a3b8'   // Slate-400
};

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<AppRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await reviewService.getAllReviews();
      setReviews(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
  };

  // --- Statistics Calculation ---
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) 
    : '0';
  
  const positiveCount = reviews.filter(r => (r.rating >= 4)).length; // Simplified logic if sentiment field is missing
  const negativeCount = reviews.filter(r => (r.rating <= 2)).length;
  
  const positivePercentage = totalReviews > 0 ? ((positiveCount / totalReviews) * 100).toFixed(1) : '0';

  // --- Chart Data Preparation ---
  const sentimentData = [
    { name: 'Positif (4-5★)', value: positiveCount, color: COLORS.positive },
    { name: 'Negatif (1-2★)', value: negativeCount, color: COLORS.negative },
    { name: 'Netral (3★)', value: totalReviews - positiveCount - negativeCount, color: COLORS.neutral },
  ];

  const starDistribution = [1, 2, 3, 4, 5].map(star => ({
    name: `${star} Bintang`,
    count: reviews.filter(r => Math.round(r.rating) === star).length
  }));

  if (loading) {
     return (
        <Layout>
           <div className="h-[80vh] flex items-center justify-center">
              <Loader2 className="animate-spin text-gold w-10 h-10" />
           </div>
        </Layout>
     );
  }

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-start">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Analisa Sentimen & Review</h1>
            <p className="text-textSecondary text-sm">Monitor kepuasan pengguna berdasarkan ulasan aplikasi.</p>
          </div>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-textSecondary hover:text-white border border-glassBorder rounded-lg transition-all text-xs font-semibold uppercase tracking-wider"
          >
            <Database size={14} />
            Refresh Data
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KpiCard 
            title="Total Ulasan" 
            value={totalReviews.toString()} 
            icon={<MessageSquare className="text-blue-400" />} 
          />
          <KpiCard 
            title="Rata-rata Rating" 
            value={avgRating} 
            icon={<Star className="text-yellow-400" />} 
            subValue="/ 5.0"
          />
          <KpiCard 
            title="Sentimen Positif" 
            value={`${positivePercentage}%`} 
            icon={<ThumbsUp className="text-green-400" />} 
            subValue={`${positiveCount} ulasan`}
          />
          <KpiCard 
            title="Sentimen Negatif" 
            value={`${(100 - parseFloat(positivePercentage)).toFixed(1)}%`} 
            icon={<ThumbsDown className="text-red-400" />} 
            subValue={`${negativeCount} ulasan`}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sentiment Distribution */}
          <div className="bg-cardBg border border-glassBorder rounded-2xl p-6 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
               <TrendingUp size={18} className="text-gold" /> Distribusi Sentimen
             </h3>
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={sentimentData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {sentimentData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                     ))}
                   </Pie>
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                   />
                   <Legend verticalAlign="bottom" height={36} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Star Rating Distribution */}
          <div className="bg-cardBg border border-glassBorder rounded-2xl p-6 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
               <Star size={18} className="text-gold" /> Distribusi Bintang
             </h3>
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={starDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 12}} interval={0} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#F4B400" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-cardBg border border-glassBorder rounded-2xl overflow-hidden shadow-xl">
           <div className="p-6 border-b border-glassBorder/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Daftar Ulasan Terbaru</h3>
              <span className="text-xs text-textSecondary uppercase tracking-widest font-semibold">Realtime Data</span>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-black/20 text-textSecondary text-xs uppercase tracking-wider">
                   <th className="p-4 font-semibold">Pengguna</th>
                   <th className="p-4 font-semibold">Rating</th>
                   <th className="p-4 font-semibold">Ulasan</th>
                   <th className="p-4 font-semibold">Sentimen</th>
                   <th className="p-4 font-semibold text-right">Tanggal</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-glassBorder/30">
                 {reviews.map((review) => (
                   <tr key={review.id} className="hover:bg-white/5 transition-colors text-sm">
                     <td className="p-4">
                       <div className="font-bold text-white">{review.userName || 'Anonymous'}</div>
                       <div className="text-xs text-textSecondary">{review.userEmail}</div>
                     </td>
                     <td className="p-4">
                        <div className="flex items-center gap-1 text-gold font-bold">
                           <span>{review.rating}</span>
                           <Star size={12} fill="currentColor" />
                        </div>
                     </td>
                     <td className="p-4 text-gray-300 max-w-xs truncate" title={review.feedback}>
                        {review.feedback}
                     </td>
                     <td className="p-4">
                        {review.sentiment ? (
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              review.sentiment === 'positif' 
                                 ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                 : 'bg-red-500/10 text-red-500 border-red-500/20'
                           }`}>
                              {review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1)}
                              {review.sentimentConfidence && (
                                 <span className="ml-1 opacity-70 text-[10px]">
                                    ({(review.sentimentConfidence * 100).toFixed(0)}%)
                                 </span>
                              )}
                           </span>
                        ) : (
                           <span className="text-textSecondary text-xs">-</span>
                        )}
                     </td>
                     <td className="p-4 text-right text-textSecondary font-mono text-xs">
                        {review.createdAt ? format(review.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: id }) : '-'}
                     </td>
                   </tr>
                 ))}
                 {reviews.length === 0 && (
                    <tr>
                       <td colSpan={5} className="p-8 text-center text-textSecondary">
                          Belum ada data ulasan.
                       </td>
                    </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </Layout>
  );
};

// Helper Component for KPI Cards
const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; subValue?: string }> = ({ 
   title, value, icon, subValue 
}) => (
  <div className="bg-cardBg border border-glassBorder rounded-2xl p-6 relative overflow-hidden group hover:border-gold/30 transition-all">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150">
       {icon}
    </div>
    <div className="flex flex-col gap-1 relative z-10">
      <div className="text-textSecondary text-xs uppercase tracking-wider font-semibold mb-1 flex items-center gap-2">
         {icon} {title}
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      {subValue && <div className="text-xs text-gold/80 font-mono mt-1">{subValue}</div>}
    </div>
  </div>
);

export default ReviewsPage;
