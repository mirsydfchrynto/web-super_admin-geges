import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InboxPage } from './pages/InboxPage';
import { TenantsPage } from './pages/TenantsPage';
import { TenantDetailsPage } from './pages/TenantDetailsPage';
import { BarbershopDetailsPage } from './pages/BarbershopDetailsPage';
import { UsersPage } from './pages/UsersPage';
import { RefundRequestsPage } from './pages/RefundRequestsPage'; // Import New Page
import { ReviewsPage } from './pages/ReviewsPage'; // Import Reviews Page
import { Toaster } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthUser, setLoading, logoutUser } from './store/authSlice';
import { RootState } from './store';
import { doc, getDoc } from 'firebase/firestore';
import { User } from './types';
import { Loader2 } from 'lucide-react';

const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center text-white">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const dispatch = useDispatch();

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
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      <Router>
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
      </Router>
    </>
  );
};

export default App;