import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleBarbershopStatus } from '../../services/provisioningService';
import { writeBatch, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Mock Firestore Functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'), // Return string instead of undefined
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    commit: vi.fn(),
    delete: vi.fn(),
  })),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(),
  getFirestore: vi.fn(), // Added
}));

// Mock Firebase Compat
vi.mock('firebase/compat/app', () => ({
  default: {
    initializeApp: vi.fn(() => ({
      auth: vi.fn(() => ({
        setPersistence: vi.fn(),
        createUserWithEmailAndPassword: vi.fn(),
        signOut: vi.fn(),
      })),
      delete: vi.fn(),
    })),
    auth: {
      Auth: {
        Persistence: { NONE: 'NONE' }
      }
    }
  }
}));

// Mock Lib Firebase
vi.mock('../lib/firebase', () => ({
  db: {}, // Mock db object
  functions: {},
  firebaseConfig: {}
}));

// Mock Firebase Functions (httpsCallable)
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => vi.fn()),
}));

describe('Provisioning Service - Toggle Status', () => {
  const mockBatch = {
    update: vi.fn(),
    commit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (writeBatch as any).mockReturnValue(mockBatch);
  });

  it('should suspend barbershop and associated user when isActive is false', async () => {
    const shopId = 'shop-1';
    const isActive = false; // SUSPEND ACTION

    // Mock Shop Data
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ admin_uid: 'user-1' })
    });

    // Mock Tenant Query (Empty for simplicity)
    (getDocs as any).mockResolvedValue({
      forEach: vi.fn()
    });

    await toggleBarbershopStatus(shopId, isActive);

    // 1. Verify Shop Update (isActive: false, isOpen: false)
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(), // shopRef
      expect.objectContaining({ isActive: false, isOpen: false })
    );

    // 2. Verify User Update (isSuspended: true)
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(), // userRef
      expect.objectContaining({ isSuspended: true })
    );

    // 3. Verify Commit
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('should activate barbershop and user when isActive is true', async () => {
    const shopId = 'shop-1';
    const isActive = true; // ACTIVATE ACTION

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ admin_uid: 'user-1' })
    });
    (getDocs as any).mockResolvedValue({ forEach: vi.fn() });

    await toggleBarbershopStatus(shopId, isActive);

    // 1. Verify Shop Update (isActive: true)
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(), 
      expect.objectContaining({ isActive: true })
    );

    // 2. Verify User Update (isSuspended: false)
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(), 
      expect.objectContaining({ isSuspended: false })
    );
  });
});
