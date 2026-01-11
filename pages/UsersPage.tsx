
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { collection, getDocs, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { deleteUser, toggleUserSuspension } from '../services/provisioningService';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import { 
  Search, 
  User as UserIcon, 
  Shield, 
  Scissors, 
  MoreVertical, 
  Mail, 
  KeyRound, 
  Filter, 
  Calendar,
  Save,
  Loader2,
  Phone,
  Store,
  ExternalLink,
  Trash2,
  Ban,
  PlayCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';
import { getDisplayImageUrl } from '../lib/utils';

interface UserWithId extends User {
  id: string;
}

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin_owner' | 'customer'>('all');
  const { t, formatDate } = useTranslation();
  
  // Edit State
  const [editingUser, setEditingUser] = useState<UserWithId | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let q = collection(db, "users");
      const querySnapshot = await getDocs(q);
      const data: UserWithId[] = [];
      querySnapshot.forEach((doc) => {
        const u = doc.data() as User;
        if (!u.isDeleted) {
          // Default isSuspended to false if missing
          data.push({ id: doc.id, ...u, isSuspended: u.isSuspended || false } as UserWithId);
        }
      });
      
      // Sort by Created At (Newest First)
      data.sort((a, b) => {
        const timeA = a.created_at?.seconds || 0;
        const timeB = b.created_at?.seconds || 0;
        return timeB - timeA;
      });

      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSuspend = async (user: UserWithId) => {
     const isSuspending = !user.isSuspended;
     const action = isSuspending ? "SUSPEND" : "ACTIVATE";
     
     if (window.confirm(`Are you sure you want to ${action} user '${user.name}'?`)) {
        setSuspendingId(user.id);
        const toastId = toast.loading(`${action}ing user...`);
        try {
           await toggleUserSuspension(user.id, isSuspending);
           toast.success(`User ${action.toLowerCase()}d successfully.`, { id: toastId });
           
           setUsers(prev => prev.map(u => 
              u.id === user.id ? { ...u, isSuspended: isSuspending } : u
           ));
        } catch (e: any) {
           toast.error("Failed: " + e.message, { id: toastId });
        } finally {
           setSuspendingId(null);
        }
     }
  };

  const handleEdit = (user: UserWithId) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleDelete = async (user: UserWithId) => {
     if (window.confirm(`PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN user '${user.name}'? Data tidak bisa dikembalikan.`)) {
        setDeletingId(user.id);
        const toastId = toast.loading("Deleting user permanently...");
        try {
           await deleteUser(user.id);
           toast.success("User permanently deleted.", { id: toastId });
           setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (e: any) {
           toast.error("Failed: " + e.message, { id: toastId });
        } finally {
           setDeletingId(null);
        }
     }
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    if (newRole === editingUser.role) {
      setEditingUser(null);
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, { role: newRole });
      
      toast.success(`${t('common.success')}: Role updated`);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? { ...u, role: newRole as any } : u
      ));
      
      setEditingUser(null);
    } catch (error: any) {
      console.error(error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    
    const toastId = toast.loading("Sending email...");
    try {
      await auth.sendPasswordResetEmail(email);
      toast.success("Reset email sent!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed: ${error.message}`, { id: toastId });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {t('users.title')}
            <span className="text-sm font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              {users.length}
            </span>
          </h1>
          <p className="text-gray-400">{t('users.subtitle')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
             <select 
               value={roleFilter}
               onChange={(e) => setRoleFilter(e.target.value as any)}
               aria-label="Filter by Role"
               className="w-full sm:w-auto bg-black/20 border border-white/5 rounded-lg pl-10 pr-8 py-2 text-sm text-white focus:outline-none focus:border-gold appearance-none cursor-pointer hover:bg-black/40"
             >
               <option value="all">All Roles</option>
               <option value="customer">{t('users.role_customer')}</option>
               <option value="admin_owner">{t('users.role_owner')}</option>
               <option value="super_admin">{t('users.role_super')}</option>
             </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder={t('common.search')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 bg-black/20 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-gold hover:bg-black/40"
            />
          </div>
        </div>
      </div>

      <div className="bg-cardBg/40 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="p-4 font-semibold">{t('users.table_profile')}</th>
                <th className="p-4 font-semibold">{t('users.table_role')}</th>
                <th className="p-4 font-semibold">{t('users.table_contact')}</th>
                <th className="p-4 font-semibold">{t('users.table_joined')}</th>
                <th className="p-4 font-semibold text-right">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glassBorder">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2"/> {t('common.loading')}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={`transition-colors group ${user.isSuspended ? 'bg-red-900/10 border-l-2 border-l-red-500' : 'hover:bg-white/5'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-600">
                          {user.photo_base64 ? (
                            <img src={getDisplayImageUrl(user.photo_base64)!} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className={`font-medium ${user.isSuspended ? 'text-red-400' : 'text-white'}`}>{user.name || "Unnamed User"}</div>
                          <div className="text-xs text-gray-500 font-mono">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        {user.isSuspended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white shadow-sm animate-pulse">
                            <Ban size={8} /> SUSPENDED
                          </span>
                        )}
                        
                        {user.role === 'super_admin' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <Shield size={10} /> SUPER ADMIN
                          </span>
                        )}
                        {user.role === 'admin_owner' && (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold/20 text-gold border border-gold/30">
                              <Scissors size={10} /> OWNER
                            </span>
                            {user.barbershop_id && (
                               <button 
                                 onClick={() => navigate(`/barbershops/${user.barbershop_id}`)}
                                 className="text-[10px] text-gray-400 hover:text-gold flex items-center gap-1 transition-colors"
                               >
                                  <Store size={10}/> {t('common.view')} Shop <ExternalLink size={8}/>
                               </button>
                            )}
                          </div>
                        )}
                        {user.role === 'customer' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            CUSTOMER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300 flex items-center gap-2">
                        <Mail size={12} className="text-gray-500"/> {user.email}
                      </div>
                      {user.phone_number && (
                        <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                           <Phone size={12} className="text-gray-500"/> {user.phone_number}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={14}/> {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => user.email && handleSendPasswordReset(user.email)}
                          title="Send Password Reset Email"
                          aria-label="Send Password Reset Email"
                          className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-orange-400 rounded-lg transition-colors border border-transparent hover:border-orange-500/30"
                        >
                          <KeyRound size={16} />
                        </button>
                        
                        <button 
                           onClick={() => handleToggleSuspend(user)}
                           disabled={suspendingId === user.id}
                           title={user.isSuspended ? "Activate User" : "Suspend User"}
                           className={`p-2 rounded-lg transition-colors border ${
                              user.isSuspended 
                                ? 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20' 
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20'
                           }`}
                        >
                           {suspendingId === user.id ? <Loader2 size={16} className="animate-spin"/> : (user.isSuspended ? <PlayCircle size={16}/> : <Ban size={16}/>)}
                        </button>
                        <button 
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 rounded-lg text-xs font-bold transition-colors"
                        >
                          {t('users.btn_manage')}
                        </button>
                        <button 
                           onClick={() => handleDelete(user)}
                           disabled={deletingId === user.id}
                           title="Delete User"
                           className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors"
                        >
                           {deletingId === user.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setEditingUser(null)}
          />
          
          {/* Modal Content */}
          <div className="bg-cardBg/90 backdrop-blur-xl border border-glassBorder w-full max-w-md rounded-2xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-white mb-2">{t('users.modal_title')}</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              {t('users.modal_desc')} <span className="text-white font-bold">{editingUser.name}</span>
            </p>
            
            <div className="space-y-6">
               <div>
                  <label className="block text-xs font-bold text-gold uppercase tracking-widest mb-3">System Role</label>
                  <div className="space-y-3">
                    <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 group ${
                      newRole === 'super_admin' 
                      ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                      : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}>
                      <input 
                        type="radio" 
                        name="role" 
                        value="super_admin" 
                        checked={newRole === 'super_admin'}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="hidden"
                      />
                      <div className={`p-2 rounded-lg ${newRole === 'super_admin' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                         <Shield size={20} />
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${newRole === 'super_admin' ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{t('users.role_super')}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{t('users.role_desc_super')}</div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 group ${
                      newRole === 'admin_owner' 
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                      : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}>
                      <input 
                        type="radio" 
                        name="role" 
                        value="admin_owner" 
                        checked={newRole === 'admin_owner'}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="hidden"
                      />
                      <div className={`p-2 rounded-lg ${newRole === 'admin_owner' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                         <Scissors size={20} />
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${newRole === 'admin_owner' ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{t('users.role_owner')}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{t('users.role_desc_owner')}</div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 group ${
                      newRole === 'customer' 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}>
                      <input 
                        type="radio" 
                        name="role" 
                        value="customer" 
                        checked={newRole === 'customer'}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="hidden"
                      />
                      <div className={`p-2 rounded-lg ${newRole === 'customer' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                         <UserIcon size={20} />
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${newRole === 'customer' ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{t('users.role_customer')}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{t('users.role_desc_customer')}</div>
                      </div>
                    </label>
                  </div>
               </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
              <button 
                onClick={() => setEditingUser(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleSaveRole}
                disabled={saving || newRole === editingUser.role}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  saving || newRole === editingUser.role 
                   ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                   : 'bg-gold hover:bg-goldHover text-black hover:scale-[1.02]'
                }`}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
