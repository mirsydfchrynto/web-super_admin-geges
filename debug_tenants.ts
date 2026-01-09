
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkTenants() {
  console.log("Fetching all barbershops (no ordering)...");
  try {
    const snapshot = await getDocs(collection(db, 'barbershops'));
    console.log(`Found ${snapshot.size} documents.`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | Name: ${data.name} | CreatedAt: ${data.created_at ? 'EXISTS' : 'MISSING'}`);
    });
  } catch (error) {
    console.error("Error fetching:", error);
  }
}

checkTenants();
