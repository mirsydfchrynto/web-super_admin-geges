import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppRating } from '../types/review';

export const reviewService = {
  async getAllReviews(): Promise<AppRating[]> {
    try {
      const q = query(collection(db, 'app_ratings'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppRating[];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }
};
