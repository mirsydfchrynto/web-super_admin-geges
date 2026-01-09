import { Timestamp } from 'firebase/firestore';

export interface AppRating {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  feedback: string;
  platform: string;
  createdAt: Timestamp;
  sentiment?: 'positif' | 'negatif';
  sentimentConfidence?: number;
}
