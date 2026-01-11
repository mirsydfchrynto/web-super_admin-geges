import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setRegistrations } from '../store/registrationsSlice';
import { Tenant } from '../types';

export const useRealtimeRegistrations = (shouldFetch: boolean) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!shouldFetch) return;

    // Listen to ALL tenants to handle updates/history/new requests
    const q = query(collection(db, 'tenants'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Tenant[] = [];
      snapshot.forEach((doc) => {
        const rawData = doc.data();
        // Skip deleted if not hard-deleted yet (though hard-delete removes doc entirely)
        if (rawData.status === 'deleted' && !rawData.isDeleted) return; 

        data.push({ 
          id: doc.id, 
          ...rawData,
          created_at: rawData.created_at ? (rawData.created_at as Timestamp).toMillis() : Date.now() 
        } as unknown as Tenant);
      });

      // Sort by newest first
      data.sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeB - timeA;
      });

      dispatch(setRegistrations(data));
    }, (error) => {
      console.error("Realtime fetch error:", error);
    });

    return () => unsubscribe();
  }, [dispatch, shouldFetch]);
};
