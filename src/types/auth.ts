export interface ApiEnvelope<T> {
  data: T;
  timestamp: string;
}

export interface StudentSession {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  loginId: string;
  displayName: string;
  role: string;
}

export interface StudentSessionSnapshot extends StudentSession {
  isAuthenticated: boolean;
}

export interface LoginPayload {
  loginId: string;
  password: string;
}

export interface RegisterPayload {
  loginId: string;
  email: string;
  name: string;
  nickname: string;
  password: string;
  phoneNumber: string;
  acceptedTermCodes: string[];
}

export interface SmsSendPayload {
  phoneNumber: string;
}

export interface SmsSendResponse {
  phoneNumber: string;
  expiresAt: string;
}

export interface SmsVerifyPayload {
  phoneNumber: string;
  code: string;
}

export interface SmsVerifyResponse {
  phoneNumber: string;
  verifiedAt: string;
}

export interface RegistrationTerm {
  code: string;
  title: string;
  version: string;
  required: boolean;
  contentUrl: string | null;
}
