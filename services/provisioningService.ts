import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { doc, writeBatch, serverTimestamp, collection, arrayUnion, Timestamp, updateDoc, deleteDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig, db } from '../lib/firebase';
import { Tenant, Barbershop, User, Notification } from '../types';
import { DEFAULT_BARBERSHOP_IMAGE, DEFAULT_SERVICES, DEFAULT_FACILITIES, DEFAULT_OPEN_HOUR, DEFAULT_CLOSE_HOUR } from '../lib/constants';

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
 * Improved with Atomic Rollback and Centralized Constants
 */
export const approveTenantRegistration = async (tenant: Tenant) => {
  console.log("=== START PROVISIONING ===");
  console.log("Target:", tenant.business_name);
  
  const password = generatePassword();
  const secondaryAppName = `provisioning-${Date.now()}`;
  let secondaryApp: firebase.app.App | undefined;
  let createdUser: firebase.User | null = null;

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
    createdUser = userCredential.user;
    const newOwnerUid = createdUser?.uid;
    
    if (!newOwnerUid) throw new Error("Could not create user or retrieve UID.");
    
    console.log("   > Auth Created. New UID:", newOwnerUid);
    
    // NOTE: We do NOT sign out yet. We keep the session to allow rollback (delete) if needed.

    // 3. Prepare Database Batch
    console.log("3. Preparing Database Writes...");
    const batch = writeBatch(db);
    
    // --- A. Create Barbershop Document ---
    const newShopId = doc(collection(db, "barbershops")).id; 
    console.log("   > Generated Shop ID:", newShopId);
    const barbershopRef = doc(db, 'barbershops', newShopId);
    
    const newBarbershopData: Barbershop = {
      name: tenant.business_name,
      address: tenant.address || "Alamat belum diatur", 
      whatsapp_number: tenant.owner_phone || "",
      admin_uid: newOwnerUid,
      
      // Use Constants
      rating: 5.0, 
      imageUrl: DEFAULT_BARBERSHOP_IMAGE,
      gallery_urls: [], 
      services: DEFAULT_SERVICES, 
      facilities: DEFAULT_FACILITIES, 
      isOpen: false, 
      isActive: true, 
      open_hour: DEFAULT_OPEN_HOUR,
      close_hour: DEFAULT_CLOSE_HOUR,
      weekly_holidays: [],
      barber_selection_fee: 0,
      google_maps_url: "",
    };
    batch.set(barbershopRef, newBarbershopData);

    // --- B. Create User Document (New Admin Owner) ---
    const userRef = doc(db, 'users', newOwnerUid);
    
    const newUserData: User = {
      name: tenant.owner_name,
      email: tenant.owner_email,
      role: 'admin_owner', 
      barbershop_id: newShopId, 
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
      'payment.verificationStatus': 'verified',
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
      user_id: tenant.owner_uid,
      title: "Pendaftaran Disetujui",
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
    
    // ROLLBACK MECHANISM
    if (createdUser) {
      console.warn("Performing Rollback: Deleting created Auth User...", createdUser.uid);
      try {
        await createdUser.delete();
        console.log("Rollback successful: User deleted.");
      } catch (cleanupError) {
        console.error("CRITICAL: Failed to rollback user deletion!", cleanupError);
        // This is a rare worst-case, but at least we tried.
      }
    }

    if (error.code === 'auth/email-already-in-use') {
      throw new Error(`Email ${tenant.owner_email} sudah terdaftar. Gunakan email lain.`);
    }
    throw new Error(error.message || "Unknown provisioning error");
  } finally {
    // 5. Cleanup Secondary App
    if (secondaryApp) {
      console.log("5. Cleaning up secondary app...");
      // Ensure we are signed out before deleting the app instance (just in case)
      await secondaryApp.auth().signOut().catch(() => {});
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

/**
 * SCENARIO C: APPROVE REFUND (CANCEL WITH REFUND)
 */
export const approveRefund = async (tenant: Tenant, refundProofUrl: string, adminNote: string) => {
  console.log("=== APPROVING REFUND ===", tenant.id);
  
  const batch = writeBatch(db);
  const tenantRef = doc(db, 'tenants', tenant.id);

  try {
     const historyEntry = {
      created_at: Timestamp.now(),
      note: `Refund Disetujui & Dibatalkan. Note: ${adminNote}`,
      status: 'cancelled',
      type: 'refund_completed' 
    };

    const updates: any = {
       status: 'cancelled',
       'payment.verificationStatus': 'refunded',
       'invoice.status': 'refunded',
       'invoice.cancel_reason': `Refund Processed: ${adminNote}`,
       'refund_proof_url': refundProofUrl,
       'refund_status': 'completed',
       'refunded_at': serverTimestamp(),
       history: arrayUnion(historyEntry),
       updated_at: serverTimestamp()
    };

    batch.update(tenantRef, updates);

    // Notification
    const notificationRef = doc(collection(db, 'notifications'));
    const notificationData: Notification = {
      user_id: tenant.owner_uid,
      title: "Pengembalian Dana Berhasil",
      body: `Permintaan refund "${tenant.business_name}" telah diproses.\nAdmin Note: ${adminNote}\nSilakan cek detail di aplikasi.`,
      delivered: false,
      created_at: serverTimestamp()
    };
    batch.set(notificationRef, notificationData);

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Refund Error:", error);
    throw new Error(error.message || "Failed to approve refund");
  }
};

/**
 * SCENARIO D: SUSPEND TENANT (Late Payment / Violation)
 */
export const suspendTenant = async (tenant: Tenant, reason: string) => {
  console.log("=== SUSPENDING TENANT ===", tenant.id);
  
  const batch = writeBatch(db);
  const tenantRef = doc(db, 'tenants', tenant.id);

  try {
     const historyEntry = {
      created_at: Timestamp.now(),
      note: `Suspended by Admin: ${reason}`,
      status: 'suspended',
      type: 'account_suspended' 
    };

    const updates: any = {
       status: 'suspended',
       suspension_reason: reason,
       history: arrayUnion(historyEntry),
       updated_at: serverTimestamp()
    };

    batch.update(tenantRef, updates);

    // Also deactivate the Shop if it exists
    if (tenant.shop_id) {
       const shopRef = doc(db, 'barbershops', tenant.shop_id);
       batch.update(shopRef, { isActive: false });
    }

    // Notification
    const notificationRef = doc(collection(db, 'notifications'));
    const notificationData: Notification = {
      user_id: tenant.owner_uid,
      title: "Akun Ditangguhkan",
      body: `Akun tenant Anda ditangguhkan sementara.\nAlasan: ${reason}\nHubungi admin untuk info lebih lanjut.`,
      delivered: false,
      created_at: serverTimestamp()
    };
    batch.set(notificationRef, notificationData);

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Suspension Error:", error);
    throw new Error(error.message || "Failed to suspend tenant");
  }
};

/**
 * SCENARIO E: DELETE TENANT (Permanent)
 */
export const deleteTenant = async (tenant: Tenant) => {
  console.log("=== DELETING TENANT PERMANENTLY ===", tenant.id);
  
  const batch = writeBatch(db);
  const tenantRef = doc(db, 'tenants', tenant.id);

  try {
    batch.delete(tenantRef);

    // Deactivate Shop if exists (or delete it too? User asked to delete tenant/barbershop data permanently)
    // To be safe and clean, we should probably delete the shop too if we are hard deleting.
    // But let's stick to the previous logic of deactivating shop to avoid stranding bookings, OR delete it.
    // User said "hapus data tenant/ barbershop", implying cleanup.
    // Let's delete the shop document as well if it exists.
    if (tenant.shop_id) {
       const shopRef = doc(db, 'barbershops', tenant.shop_id);
       batch.delete(shopRef);
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Delete Error:", error);
    throw new Error(error.message || "Failed to delete tenant");
  }
};

/**
 * DELETE BARBERSHOP (Permanent & Cascading)
 */
export const deleteBarbershop = async (shopId: string) => {
  console.log("=== DELETING BARBERSHOP & RELATED DATA PERMANENTLY ===", shopId);
  const batch = writeBatch(db);
  const shopRef = doc(db, 'barbershops', shopId);
  
  try {
    // 1. Get Shop Data to find Admin UID
    const shopSnap = await getDoc(shopRef);
    if (!shopSnap.exists()) {
       throw new Error("Barbershop not found");
    }
    const shopData = shopSnap.data() as Barbershop;
    
    // 2. Delete Barbershop Doc
    batch.delete(shopRef);

    // 3. Find and Delete Tenant Application (where shop_id == shopId)
    const tenantQ = query(collection(db, 'tenants'), where('shop_id', '==', shopId));
    const tenantSnap = await getDocs(tenantQ);
    tenantSnap.forEach((tDoc) => {
       console.log(`> Queuing Tenant deletion: ${tDoc.id}`);
       batch.delete(tDoc.ref);
    });

    // 4. Find and Delete Owner User (admin_uid)
    if (shopData.admin_uid) {
       console.log(`> Queuing User deletion: ${shopData.admin_uid}`);
       const userRef = doc(db, 'users', shopData.admin_uid);
       batch.delete(userRef);
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Delete Shop Error:", error);
    throw new Error(error.message || "Failed to delete barbershop");
  }
};

/**
 * DELETE USER (Permanent)
 */
export const deleteUser = async (userId: string) => {
  console.log("=== DELETING USER PERMANENTLY ===", userId);
  const userRef = doc(db, 'users', userId);
  
  try {
    await deleteDoc(userRef);
    return { success: true };
  } catch (error: any) {
    console.error("Delete User Error:", error);
    throw new Error(error.message || "Failed to delete user");
  }
};