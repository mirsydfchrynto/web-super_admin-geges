
export interface TenantPayment {
  payment_proof_base64?: string;
  proofUrl?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  paidBy?: string;
  paidAt?: any;
}

export interface TenantInvoice {
  amount: number;
  currency: string;
  status: string;
  invoice_id: string;
  payment_deadline?: any;
  created_at?: any;
}

export interface TenantHistory {
  note: string;
  status: string;
  type: string;
  created_at: any;
}

export interface Tenant {
  id: string; 
  business_name: string;
  owner_email: string;
  owner_name: string;
  owner_phone?: string;
  owner_uid: string;
  address?: string;
  status: 'draft' | 'awaiting_payment' | 'waiting_proof' | 'payment_submitted' | 'active' | 'rejected' | 'cancelled';
  rejection_reason?: string;
  
  // Documents
  company_doc_ref?: string;
  tax_doc_ref?: string;
  document_base64?: string;
  
  // Financials
  payment?: TenantPayment;
  invoice?: TenantInvoice;
  
  // Metadata
  history?: TenantHistory[];
  created_at?: any;
  package_id?: string;
  plan?: string;
  registration_fee?: number;

  // Provisioning Results (Synced with Flutter App)
  shop_id?: string;
  admin_email?: string;
  temp_password?: string;
}

// Updated to match Flutter Model & Sample Data exactly
export interface Barbershop {
  name: string;
  address: string;       // Matches 'address' in DB
  admin_uid: string;     // Found in sample data
  rating: number;
  imageUrl: string;      // Matches 'imageUrl' (camelCase) in DB sample/Flutter code
  gallery_urls: string[]; // Matches 'gallery_urls'
  services: string[]; 
  facilities: string[];
  isOpen: boolean;
  isActive: boolean;     // Found in sample data
  open_hour: number;     // Matches 'open_hour'
  close_hour: number;    // Matches 'close_hour'
  weekly_holidays: number[];
  barber_selection_fee: number;
  google_maps_url?: string;
  whatsapp_number?: string;
}

// Updated to match UserData.fromFirestore preference (snake_case keys)
export interface User {
  name: string;
  role: 'super_admin' | 'admin_owner' | 'customer';
  barbershop_id?: string;    // Flutter prefers snake_case
  phone_number?: string;     // Flutter prefers snake_case
  photo_base64?: string;     // Flutter prefers snake_case
  favorite_barbershops?: string[];
  email?: string;
  created_at?: any;
}

export interface Notification {
  user_id: string;
  title: string;
  body: string;
  delivered: boolean;
  created_at: any;
}

export interface Queue {
  id: string;
  barbershop_id: string;
  customer_id: string;
  total_price: number;
  status: 'waiting' | 'booked' | 'ongoing' | 'served' | 'cancelled' | 'refund_completed';
  is_refunded?: boolean; // Added for Revenue Logic
  refund_deduction?: number;
  created_at?: any;
}
