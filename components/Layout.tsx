
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logoutUser } from '../store/authSlice';
import { fetchRegistrations } from '../store/registrationsSlice';
import { toggleLanguage } from '../store/languageSlice';
import { useTranslation } from '../hooks/useTranslation';
import { auth } from '../lib/firebase';
import { 
  LayoutDashboard, 
  Inbox, 
  Store, 
  LogOut, 
  Scissors,
  Users,
  Languages
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { items: registrations } = useSelector((state: RootState) => state.registrations);
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      dispatch(fetchRegistrations());
    }
  }, [dispatch, user]);

  const pendingCount = registrations.filter(r => 
    ['waiting_proof', 'payment_submitted', 'pending_payment'].includes(r.status)
  ).length;

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
    { label: t('common.tenants'), path: '/tenants', icon: <Store size={20} /> }, 
    { label: t('common.users'), path: '/users', icon: <Users size={20} /> },
  ];

  return (
    <div className="min-h-screen flex bg-darkBg text-white overflow-hidden relative font-sans">
      {/* Sidebar - Solid Dark Grey Surface */}
      <aside className="w-64 bg-cardBg border-r border-glassBorder z-10 flex flex-col h-screen shadow-2xl">
        <div className="p-8 flex items-center gap-4 border-b border-glassBorder/50">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-gold/20 flex-shrink-0">
             <img 
               src="geges-logo.png" 
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
            <h1 className="font-bold text-lg tracking-wide text-white">GEGES</h1>
            <p className="text-[10px] text-gold uppercase tracking-widest font-semibold">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-gold text-black font-bold shadow-lg shadow-gold/20' 
                    : 'text-textSecondary hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-black text-gold' : 'bg-danger text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-glassBorder/50 space-y-4">
          
          {/* Language Switcher */}
          <button 
            onClick={() => dispatch(toggleLanguage())}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold bg-black/20 text-gray-400 rounded-lg hover:bg-black/40 hover:text-white transition-colors border border-glassBorder"
          >
            <div className="flex items-center gap-2">
              <Languages size={14} />
              <span>LANGUAGE</span>
            </div>
            <span className="text-gold uppercase bg-gold/10 px-2 py-0.5 rounded">
              {useSelector((state: RootState) => state.language.currentLanguage)}
            </span>
          </button>

          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-glass border border-gold/30 overflow-hidden">
               {user?.photo_base64 ? (
                 <img src={`data:image/jpeg;base64,${user.photo_base64}`} alt="profile" className="w-full h-full object-cover"/>
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
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-danger bg-danger/10 hover:bg-danger/20 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content - Pure Black Background */}
      <main className="flex-1 overflow-y-auto relative z-10 bg-darkBg p-8 scroll-smooth">
        {children}
      </main>
    </div>
  );
};
