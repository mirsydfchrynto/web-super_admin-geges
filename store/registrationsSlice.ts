
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tenant } from '../types';

interface RegistrationsState {
  items: Tenant[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: RegistrationsState = {
  items: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async Thunk to fetch registrations
export const fetchRegistrations = createAsyncThunk(
  'registrations/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const tenantsRef = collection(db, 'tenants');
      
      // FIX: Added 'awaiting_payment' because Flutter app creates tenants with this status 
      // and doesn't explicitly change root status upon payment submission (only updates payment map).
      const q = query(
        tenantsRef, 
        where('status', 'in', ['waiting_proof', 'payment_submitted', 'pending_payment', 'awaiting_payment']) 
      );

      const snapshot = await getDocs(q);
      const data: Tenant[] = [];

      snapshot.forEach((doc) => {
        const rawData = doc.data();
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

      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const registrationsSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegistrations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRegistrations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchRegistrations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default registrationsSlice.reducer;
