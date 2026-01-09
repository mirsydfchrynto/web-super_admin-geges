
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

async function checkTenantStatuses() {
  console.log("Fetching ALL tenants to check statuses...");
  try {
    const snapshot = await getDocs(collection(db, 'tenants'));
    console.log(`Found ${snapshot.size} tenant documents.`);
    
    const statusCounts: Record<string, number> = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'UNDEFINED';
      
      console.log(`ID: ${doc.id.padEnd(20)} | Status: ${status}`);
      
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log("\n--- STATUS SUMMARY ---");
    console.table(statusCounts);

  } catch (error) {
    console.error("Error fetching tenants:", error);
  }
}

checkTenantStatuses();
