
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDB2mkhbMiuKnvybfU-fIRhvWXnADEZa5o",
  authDomain: "geges-smartbarber-project.firebaseapp.com",
  projectId: "geges-smartbarber-project",
  storageBucket: "geges-smartbarber-project.firebasestorage.app",
  messagingSenderId: "51527807075",
  appId: "1:51527807075:web:4943c3694db47a720a4856",
  measurementId: "G-PGDQQQMVF8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixTenants() {
  console.log("Fixing missing created_at...");
  const snapshot = await getDocs(collection(db, 'barbershops'));
  
  for (const d of snapshot.docs) {
    const data = d.data();
    if (!data.created_at) {
      console.log(`Fixing ${d.id}...`);
      await updateDoc(doc(db, 'barbershops', d.id), {
        created_at: serverTimestamp(),
        isActive: true // Memastikan juga aktif
      });
    }
  }
  console.log("Done.");
}

fixTenants();
