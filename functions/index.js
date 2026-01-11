const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Callable Function: Delete User from Firebase Auth
 * Can only be called by authenticated users (Super Admin check recommended)
 */
exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
  // 1. Ensure caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const uid = data.uid;
  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with one argument 'uid'."
    );
  }

  try {
    console.log(`[deleteAuthUser] Request to delete UID: ${uid} by ${context.auth.uid}`);
    
    // 2. Delete the user from Firebase Authentication
    await admin.auth().deleteUser(uid);
    
    console.log(`[deleteAuthUser] Successfully deleted UID: ${uid}`);
    return { success: true, message: `Auth User ${uid} deleted.` };
  
  } catch (error) {
    console.error(`[deleteAuthUser] Error deleting user ${uid}:`, error);
    
    // Handle "User Not Found" gracefully (Idempotency)
    if (error.code === 'auth/user-not-found') {
      console.warn(`[deleteAuthUser] User ${uid} not found in Auth. Considering success.`);
      return { success: true, message: "User not found (already deleted)." };
    }

    throw new functions.https.HttpsError("internal", error.message);
  }
});
