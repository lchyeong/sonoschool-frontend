export interface AdminLoginRequest {
  identifier: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  loginId: string;
  adminDisplayName: string;
  role: string;
}
