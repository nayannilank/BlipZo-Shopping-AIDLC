export interface RegisterRequest {
    email?: string;
    phone?: string;
    password: string;
    role: 'Buyer' | 'Seller';
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
//# sourceMappingURL=auth.d.ts.map