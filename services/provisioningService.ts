import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { doc, writeBatch, serverTimestamp, collection, arrayUnion, Timestamp } from 'firebase/firestore';
import { firebaseConfig, db } from '../lib/firebase';
import { Tenant, Barbershop, User, Notification } from '../types';

/**
 * Generates a secure random password for the new tenant admin
 */
const generatePassword = (length = 8): string => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

/**
 * SCENARIO B: APPROVE TENANT & AUTOMATED PROVISIONING
 * 1. Creates Auth User (via Secondary App to avoid admin logout)
 * 2. Creates Barbershop Document (Default Data)
 * 3. Creates User Profile (role: admin_owner)
 * 4. Updates Tenant (Active, Verified, Inject Credentials for Customer visibility)
 * 5. Sends Notification
 */
export const approveTenantRegistration = async (tenant: Tenant) => {
  console.log("=== START PROVISIONING ===");
  console.log("Target:", tenant.business_name);
  
  const password = generatePassword();
  const secondaryAppName = `provisioning-${Date.now()}`;
  let secondaryApp: firebase.app.App | undefined;

  try {
    // 1. Initialize Secondary App (Compat SDK)
    console.log("1. Initializing Secondary Firebase App...");
    secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = secondaryApp.auth();
    
    // CRITICAL: Set persistence to NONE to avoid overwriting the Main Admin's session
    await secondaryAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);

    // 2. Create User in Firebase Auth
    console.log(`2. Creating Auth User for ${tenant.owner_email}...`);
    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(tenant.owner_email, password);
    const newOwnerUid = userCredential.user?.uid;
    
    if (!newOwnerUid) throw new Error("Could not create user or retrieve UID.");
    
    console.log("   > Auth Created. New UID:", newOwnerUid);
    
    // Immediately sign out the secondary user
    await secondaryAuth.signOut();

    // 3. Prepare Database Batch
    console.log("3. Preparing Database Writes...");
    const batch = writeBatch(db);
    
    // --- A. Create Barbershop Document ---
    const newShopId = doc(collection(db, "barbershops")).id; 
    console.log("   > Generated Shop ID:", newShopId);
    const barbershopRef = doc(db, 'barbershops', newShopId);
    
    // Data "Seadanya" (Defaults + Registration Data)
    const newBarbershopData: Barbershop = {
      name: tenant.business_name,
      address: tenant.address || "Alamat belum diatur", 
      whatsapp_number: tenant.owner_phone || "",
      admin_uid: newOwnerUid, // Link to the new Auth UID
      
      // Defaults for starter shop
      rating: 5.0, 
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/geges-smartbarber-project.appspot.com/o/defaults%2Fbarbershop_placeholder.png?alt=media&token=default",
      gallery_urls: [], 
      services: ["Potong Rambut", "Cukur Jenggot"], 
      facilities: ["AC", "Parkir", "Wifi"], 
      isOpen: false, // Closed by default until owner sets it up
      isActive: true, // Subscription is active
      open_hour: 9,
      close_hour: 21,
      weekly_holidays: [],
      barber_selection_fee: 0,
      google_maps_url: "",
    };
    batch.set(barbershopRef, newBarbershopData);

    // --- B. Create User Document (New Admin Owner) ---
    const userRef = doc(db, 'users', newOwnerUid);
    
    // Data User "Seadanya"
    const newUserData: User = {
      name: tenant.owner_name,
      email: tenant.owner_email,
      role: 'admin_owner', // CRITICAL: This gives them access to the Owner App
      barbershop_id: newShopId, // Links User to the new Shop
      phone_number: tenant.owner_phone || "", 
      photo_base64: "", 
      favorite_barbershops: [],
      created_at: serverTimestamp()
    };
    batch.set(userRef, newUserData);

    // --- C. Update Tenant Document (Source of Truth for Customer) ---
    const tenantRef = doc(db, 'tenants', tenant.id);
    
    const historyEntry = {
      note: `Approved & Provisioned. Shop ID: ${newShopId}`,
      status: 'active',
      type: 'system',
      created_at: Timestamp.now()
    };

    const tenantUpdates = {
      status: 'active',
      'payment.verificationStatus': 'verified', // Auto-verify proof
      // INJECT CREDENTIALS so Customer can see them in their app
      admin_email: tenant.owner_email,
      temp_password: password,
      shop_id: newShopId,
      history: arrayUnion(historyEntry),
      updated_at: serverTimestamp()
    };
    batch.update(tenantRef, tenantUpdates);

    // --- D. Create Notification (Sent to ORIGINAL Customer UID) ---
    const notificationRef = doc(collection(db, 'notifications'));
    const notificationData: Notification = {
      user_id: tenant.owner_uid, // Send to the person who applied
      title: "Pendaftaran Disetujui! 🚀",
      body: `Selamat! Barbershop "${tenant.business_name}" telah aktif.\n\nSilakan login ke aplikasi OWNER dengan:\nEmail: ${tenant.owner_email}\nPassword: ${password}`,
      delivered: false,
      created_at: serverTimestamp()
    };
    batch.set(notificationRef, notificationData);

    // 4. Commit Batch
    console.log("4. Committing to Firestore...");
    await batch.commit();
    console.log("=== PROVISIONING SUCCESS ===");

    return { 
      success: true, 
      shopId: newShopId, 
      ownerId: newOwnerUid,
      generatedPassword: password 
    };

  } catch (error: any) {
    console.error("!!! PROVISIONING FAILED !!!", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error(`Email ${tenant.owner_email} sudah terdaftar. Gunakan email lain.`);
    }
    throw new Error(error.message || "Unknown provisioning error");
  } finally {
    // 5. Cleanup Secondary App
    if (secondaryApp) {
      console.log("5. Cleaning up secondary app...");
      await secondaryApp.delete(); 
    }
  }
};

/**
 * SCENARIO A: REJECT TENANT
 */
export const rejectTenantRegistration = async (tenant: Tenant, reason: string) => {
  console.log("=== REJECTING TENANT ===", tenant.id);
  
  const batch = writeBatch(db);
  const tenantRef = doc(db, 'tenants', tenant.id);

  try {
     const historyEntry = {
      created_at: Timestamp.now(),
      note: `Ditolak Admin: ${reason}`,
      status: 'rejected',
      type: 'registration_rejected' 
    };

    const updates: any = {
       status: 'rejected',
       'payment.verificationStatus': 'rejected',
       'invoice.status': 'rejected',
       'invoice.cancel_reason': reason,
       rejection_reason: reason,
       history: arrayUnion(historyEntry),
       updated_at: serverTimestamp()
    };

    batch.update(tenantRef, updates);

    // Notification
    const notificationRef = doc(collection(db, 'notifications'));
    const notificationData: Notification = {
      user_id: tenant.owner_uid,
      title: "Pendaftaran Ditolak",
      body: `Maaf, pendaftaran "${tenant.business_name}" ditolak.\nAlasan: ${reason}`,
      delivered: false,
      created_at: serverTimestamp()
    };
    batch.set(notificationRef, notificationData);

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Rejection Error:", error);
    throw new Error(error.message || "Failed to reject tenant");
  }
};