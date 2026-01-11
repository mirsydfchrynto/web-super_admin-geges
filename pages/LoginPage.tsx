
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useDispatch } from 'react-redux';
import { setAuthUser, setLoading } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Scissors, Loader2, Mail, Lock } from 'lucide-react';
import { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

export const LoginPage: React.FC = () => {
  const { register, handleSubmit } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(data.email, data.password);
      const user = userCredential.user;
      
      if (!user || !user.email) throw new Error("Authentication failed.");

      // 1. Strict Email Whitelist Enforecement
      if (user.email !== 'admin@geges.com') {
        await auth.signOut();
        throw new Error("Access Restricted: Only admin@geges.com can login.");
      }

      const uid = user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await auth.signOut();
        throw new Error("Account exists but User Profile is missing.");
      }

      const userData = userDocSnap.data() as User;
      if (userData.role !== 'super_admin') {
        await auth.signOut();
        throw new Error("Access Denied: You are not a Super Admin.");
      }

      dispatch(setAuthUser({ user: userData, uid }));
      toast.success(`${t('login.success_msg')}, ${userData.name}!`);
      navigate('/');
    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMessage = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = t('login.invalid_cred');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = t('login.too_many');
      }
      toast.error(errorMessage || "Login Failed");
      dispatch(setLoading(false));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* LIQUID GOLD BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-gold/20 rounded-full blur-[100px] animate-drift-slow mix-blend-screen"></div>
         <div className="absolute bottom-[10%] right-[20%] w-80 h-80 bg-goldHover/20 rounded-full blur-[80px] animate-drift-medium mix-blend-screen"></div>
         <div className="absolute top-[40%] left-[50%] w-64 h-64 bg-yellow-600/10 rounded-full blur-[60px] animate-drift-fast mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-md bg-cardBg/60 backdrop-blur-3xl p-10 rounded-[30px] border border-white/10 shadow-2xl relative overflow-hidden group z-10">
        
        {/* Subtle internal shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

        <div className="flex flex-col items-center mb-10 relative z-10">
          {/* LOGO REPLACEMENT */}
          <div className="mb-6 rounded-[24px] shadow-2xl shadow-gold/10 p-1 bg-gradient-to-br from-gold/30 to-transparent">
            <div className="bg-black rounded-[22px] overflow-hidden w-32 h-32 flex items-center justify-center relative">
               <img 
                 src="ivon.png" 
                 alt="Geges Logo" 
                 className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                 onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = document.getElementById('logo-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                 }}
               />
               <div id="logo-fallback" className="hidden flex flex-col items-center justify-center text-gold">
                  <Scissors size={48} strokeWidth={1.5} />
                  <span className="text-xs font-bold mt-2">NO IMAGE</span>
               </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{t('login.title')}</h1>
          <p className="text-textSecondary text-sm">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-textSecondary ml-4 uppercase tracking-wider">{t('login.email')}</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500 group-focus-within/input:text-gold transition-colors" />
              </div>
              <input
                {...register('email', { required: true })}
                type="email"
                className="w-full bg-darkBg border border-transparent text-white placeholder-gray-600 text-sm rounded-3xl focus:ring-1 focus:ring-gold/50 focus:border-gold/50 block w-full pl-12 p-4 transition-all duration-300 shadow-inner shadow-black/50"
                placeholder="admin@gegesbarber.com"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-textSecondary ml-4 uppercase tracking-wider">{t('login.password')}</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within/input:text-gold transition-colors" />
              </div>
              <input
                {...register('password', { required: true })}
                type="password"
                className="w-full bg-darkBg border border-transparent text-white placeholder-gray-600 text-sm rounded-3xl focus:ring-1 focus:ring-gold/50 focus:border-gold/50 block w-full pl-12 p-4 transition-all duration-300 shadow-inner shadow-black/50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-gold to-goldHover text-black font-bold text-base py-4 rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/30 transition-all duration-300 flex justify-center items-center gap-2 transform active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin text-black" />
              ) : (
                t('login.btn_access')
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="fixed bottom-4 text-[10px] text-gray-600">
        &copy; 2024 Geges Smart Barber Ecosystem
      </div>
    </div>
  );
};
