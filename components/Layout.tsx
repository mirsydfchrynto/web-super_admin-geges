import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logoutUser } from '../store/authSlice';
import { fetchRegistrations } from '../store/registrationsSlice';
import { toggleLanguage } from '../store/languageSlice';
import { useTranslation } from '../hooks/useTranslation';
import { auth } from '../lib/firebase';
import { getDisplayImageUrl } from '../lib/utils';
import { 
  LayoutDashboard, 
  Inbox, 
  Store, 
  LogOut, 
  Scissors,
  Users,
  Languages,
  Receipt, // Import new icon
  MessageSquare // Import MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import logoImg from '../ivon.png';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { items: registrations } = useSelector((state: RootState) => state.registrations);
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const pendingCount = registrations.filter(r => 
    ['waiting_proof', 'payment_submitted', 'pending_payment'].includes(r.status)
  ).length;

  const refundCount = registrations.filter(r => r.status === 'cancellation_requested').length;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      dispatch(logoutUser());
      toast.success(t('common.logout') + " " + t('common.success'));
      navigate('/login');
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const menuItems = [
    { label: t('common.dashboard'), path: '/', icon: <LayoutDashboard size={20} /> },
    { 
      label: t('common.inbox'), 
      path: '/inbox', 
      icon: <Inbox size={20} />,
      badge: pendingCount > 0 ? pendingCount : null 
    },
    { 
      label: 'Request Pembatalan', 
      path: '/refunds', 
      icon: <Receipt size={20} />,
      badge: refundCount > 0 ? refundCount : null 
    },
    { label: t('common.tenants'), path: '/tenants', icon: <Store size={20} /> }, 
    { label: t('common.users'), path: '/users', icon: <Users size={20} /> },
    { label: 'Ulasan & Sentimen', path: '/reviews', icon: <MessageSquare size={20} /> },
  ];

  return (
    <div className="h-screen w-screen flex bg-darkBg text-white overflow-hidden relative font-sans">
      
      {/* GLOBAL AMBIENT BACKGROUND (Liquid Gold) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-gold/5 rounded-full blur-[120px] animate-drift-slow opacity-60 mix-blend-screen"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-yellow-900/10 rounded-full blur-[100px] animate-drift-medium opacity-50 mix-blend-screen"></div>
      </div>

      {/* Sidebar - Glassmorphism */}
      <aside className="w-64 h-full bg-cardBg/60 backdrop-blur-xl border-r border-white/5 z-20 flex flex-col shadow-2xl relative flex-shrink-0">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/50 border border-gold/20 flex-shrink-0 shadow-[0_0_15px_rgba(195,164,123,0.1)]">
             <img 
               src={logoImg} 
               alt="Logo" 
               className="w-full h-full object-cover"
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.nextElementSibling?.classList.remove('hidden');
               }} 
             />
             <div className="hidden w-full h-full flex items-center justify-center bg-gold text-black">
                <Scissors size={20} />
             </div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide text-white drop-shadow-md">GEGES</h1>
            <p className="text-[10px] text-gold uppercase tracking-widest font-semibold text-shadow-sm">Admin Portal</p>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-gold/30">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-500 group relative overflow-hidden flex-shrink-0 ${
                  isActive 
                    ? 'bg-gold text-black font-bold shadow-[0_0_20px_rgba(195,164,123,0.3)] glass-shine-hover' 
                    : 'text-textSecondary hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 relative z-10">
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full relative z-10 ${
                    isActive ? 'bg-black text-gold' : 'bg-danger text-white shadow-lg shadow-danger/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t border-white/5 space-y-4 bg-black/20">
          
          {/* Language Switcher */}
          <button 
            onClick={() => dispatch(toggleLanguage())}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold bg-black/40 text-gray-400 rounded-lg hover:bg-black/60 hover:text-white transition-colors border border-white/5 hover:border-white/10"
          >
            <div className="flex items-center gap-2">
              <Languages size={14} />
              <span>LANGUAGE</span>
            </div>
            <span className="text-gold uppercase bg-gold/10 px-2 py-0.5 rounded border border-gold/10">
              {useSelector((state: RootState) => state.language.currentLanguage)}
            </span>
          </button>

          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-gold/30 overflow-hidden shadow-inner flex-shrink-0">
               {user?.photo_base64 ? (
                 <img src={getDisplayImageUrl(user.photo_base64)!} alt="profile" className="w-full h-full object-cover"/>
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gold">SA</div>
               )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{user?.name || "Super Admin"}</p>
              <p className="text-[10px] text-textSecondary uppercase tracking-wide">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-danger bg-danger/10 hover:bg-danger/20 rounded-xl transition-colors border border-transparent hover:border-danger/30"
          >
            <LogOut size={16} />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content - Transparent to show Ambient Background */}
      <main className="flex-1 h-full overflow-y-auto relative z-10 bg-black/80 backdrop-blur-sm p-8 scroll-smooth">
        {children}
      </main>
    </div>
  );
};