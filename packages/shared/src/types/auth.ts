export interface RegisterRequest {
  // Common fields
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: 'Buyer' | 'Seller';
  // Buyer-specific
  dateOfBirth?: string; // ISO date string
  gender?: 'Male' | 'Female' | 'Other' | 'PreferNotToSay';
  // Seller-specific
  companyName?: string;
  companyUrl?: string;
  companyAddress?: string;
  tanPanNumber?: string;
  gstNumber?: string;
  inceptionDate?: string; // ISO date string
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OtpRequestPayload {
  phone: string;
}

export interface OtpVerifyPayload {
  phone: string;
  otp: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: 'Buyer' | 'Seller';
}
