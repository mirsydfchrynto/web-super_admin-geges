import React, { useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthUser, setLoading, logoutUser } from './store/authSlice';
import { RootState } from './store';
import { doc, getDoc } from 'firebase/firestore';
import { User } from './types';
import { Loader2 } from 'lucide-react';
import { useRealtimeRegistrations } from './hooks/useRealtimeRegistrations';

// --- LAZY LOADING (Code Splitting) ---
// Optimizes initial load by splitting the bundle into smaller chunks
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const InboxPage = React.lazy(() => import('./pages/InboxPage').then(module => ({ default: module.InboxPage })));
const TenantsPage = React.lazy(() => import('./pages/TenantsPage').then(module => ({ default: module.TenantsPage })));
const TenantDetailsPage = React.lazy(() => import('./pages/TenantDetailsPage').then(module => ({ default: module.TenantDetailsPage })));
const BarbershopDetailsPage = React.lazy(() => import('./pages/BarbershopDetailsPage').then(module => ({ default: module.BarbershopDetailsPage })));
const UsersPage = React.lazy(() => import('./pages/UsersPage').then(module => ({ default: module.UsersPage })));
const RefundRequestsPage = React.lazy(() => import('./pages/RefundRequestsPage').then(module => ({ default: module.RefundRequestsPage })));
const ReviewsPage = React.lazy(() => import('./pages/ReviewsPage').then(module => ({ default: module.ReviewsPage })));

const LoadingFallback = () => (
  <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center text-white gap-4">
    <Loader2 className="animate-spin w-10 h-10 text-gold" />
    <p className="text-sm text-gray-400 tracking-widest uppercase">Loading System...</p>
  </div>
);

const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  if (loading) return <LoadingFallback />;

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  // Global Real-time Listener for Super Admin Notifications
  useRealtimeRegistrations(user?.role === 'super_admin');

  useEffect(() => {
    // Using Compat Auth instance method
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch extended user profile for role check
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
             const userData = userDoc.data() as User;
             // STRICT ROLE CHECK
             if (userData.role === 'super_admin') {
               dispatch(setAuthUser({ user: userData, uid: user.uid }));
             } else {
               // If valid auth but wrong role, force logout
               await auth.signOut();
               dispatch(logoutUser());
             }
          } else {
             // Doc doesn't exist
             await auth.signOut();
             dispatch(logoutUser());
          }
        } catch (e) {
          console.error("Auth Fetch Error", e);
          dispatch(logoutUser());
        }
      } else {
        dispatch(logoutUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E1E1E',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/inbox" 
              element={
                <PrivateRoute>
                  <InboxPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/tenants" 
              element={
                <PrivateRoute>
                  <TenantsPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/tenants/:id" 
              element={
                <PrivateRoute>
                  <TenantDetailsPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/barbershops/:id" 
              element={
                <PrivateRoute>
                  <BarbershopDetailsPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <PrivateRoute>
                  <UsersPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/refunds" 
              element={
                <PrivateRoute>
                  <RefundRequestsPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/reviews" 
            element={
              <PrivateRoute>
                <ReviewsPage />
              </PrivateRoute>
            } 
          />
          {/* Fallback to Dashboard if authenticated, else Login */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </Router>
    </>
  );
};

export default App;