import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration provided in the spec
export const firebaseConfig = {
  apiKey: "AIzaSyDB2mkhbMiuKnvybfU-fIRhvWXnADEZa5o",
  authDomain: "geges-smartbarber-project.firebaseapp.com",
  projectId: "geges-smartbarber-project",
  storageBucket: "geges-smartbarber-project.firebasestorage.app",
  messagingSenderId: "51527807075",
  appId: "1:51527807075:web:4943c3694db47a720a4856",
  measurementId: "G-PGDQQQMVF8"
};

// Initialize App using Compat API to ensure 'initializeApp' is available
const app = firebase.initializeApp(firebaseConfig);

// Export Auth instance (Compat/v8 style)
export const auth = app.auth();

// Export Firestore instance (Modular/v9 style)
export const db = getFirestore(app);

export default app;