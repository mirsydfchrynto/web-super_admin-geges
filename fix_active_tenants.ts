import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from './lib/firebase.ts'; // Added .ts

// Initialize Firebase (Client SDK for script)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FIX_DATA = [
  {
    shopId: 'febrian_barber',
    tenantId: 'tenant_febrian',
    name: 'Febrian Barbershop',
    email: 'febrian@geges.com',
    owner: 'Febrian Owner',
    phone: '081234567890',
    address: 'Jl. Febrian No. 1'
  },
  {
    shopId: 'paul_barber',
    tenantId: 'tenant_paul',
    name: 'Paul Barbershop',
    email: 'paul@geges.com',
    owner: 'Paul Owner',
    phone: '081234567891',
    address: 'Jl. Paul No. 2'
  },
  {
    shopId: 'UEA2AnQqXPztqkQru74A',
    tenantId: 'tenant_planet',
    name: 'Planet Barbershop',
    email: 'planet@geges.com',
    owner: 'Planet Owner',
    phone: '081234567892',
    address: 'Jl. Planet No. 3'
  },
  {
    shopId: 'enrkzpqpzwq9BHncF1VE',
    tenantId: 'tenant_palalu',
    name: 'palalu',
    email: 'palalu@geges.com',
    owner: 'Palalu Owner',
    phone: '081234567893',
    address: 'Jl. Palalu No. 4'
  }
];

const fixTenants = async () => {
  console.log("Starting Tenant Fix...");

  for (const item of FIX_DATA) {
    console.log(`Processing ${item.name}...`);
    
    // 1. Ensure Barbershop exists and is Active
    const shopRef = doc(db, 'barbershops', item.shopId);
    const shopSnap = await getDoc(shopRef);
    
    if (shopSnap.exists()) {
       await updateDoc(shopRef, { 
         isActive: true, 
         isDeleted: false,
         name: item.name, // Ensure name sync
         admin_uid: `uid_${item.shopId}` // Ensure link
       });
       console.log(`  > Shop ${item.shopId} updated to Active.`);
    } else {
       await setDoc(shopRef, {
         name: item.name,
         address: item.address,
         isActive: true,
         isOpen: true,
         imageUrl: 'https://cdn-icons-png.flaticon.com/512/706/706830.png',
         rating: 5.0,
         admin_uid: `uid_${item.shopId}`,
         open_hour: 9,
         close_hour: 21,
         services: ['Haircut'],
         facilities: ['AC']
       });
       console.log(`  > Shop ${item.shopId} CREATED.`);
    }

    // 2. Ensure Tenant exists and is Active
    const tenantRef = doc(db, 'tenants', item.tenantId);
    const tenantSnap = await getDoc(tenantRef);

    const tenantData = {
      id: item.tenantId,
      business_name: item.name,
      owner_email: item.email,
      owner_name: item.owner,
      owner_phone: item.phone,
      owner_uid: `uid_${item.shopId}`,
      address: item.address,
      status: 'active',
      shop_id: item.shopId,
      admin_email: item.email,
      created_at: Timestamp.now(),
      registration_fee: 150000,
      invoice: {
        amount: 150000,
        currency: 'IDR',
        status: 'paid',
        invoice_id: `INV-${Date.now()}-${item.shopId}`
      },
      payment: {
        verificationStatus: 'verified',
        paidBy: 'manual_fix',
        paidAt: Timestamp.now()
      }
    };

    if (tenantSnap.exists()) {
       await updateDoc(tenantRef, { status: 'active', shop_id: item.shopId });
       console.log(`  > Tenant ${item.tenantId} updated to Active.`);
    } else {
       await setDoc(tenantRef, tenantData);
       console.log(`  > Tenant ${item.tenantId} CREATED.`);
    }
  }

  console.log("Fix Complete. Dashboard should now show 4 Active Tenants and Revenue.");
  process.exit(0);
};

fixTenants().catch(console.error);
