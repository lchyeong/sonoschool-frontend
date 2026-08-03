import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  ApiEnvelope,
  AvailabilityCheckResponse,
  FindLoginIdPayload,
  FindLoginIdResponse,
  LoginPayload,
  LoginSmsVerifyPayload,
  PasswordResetPayload,
  PasswordResetSendPayload,
  RegistrationTerm,
  RegisterPayload,
  SmsSendPayload,
  SmsSendResponse,
  SmsVerifyPayload,
  SmsVerifyResponse,
  StudentLoginResult,
  StudentSession,
} from '@/types/auth';
import { getOrCreateAuthDeviceId } from '@/utils/authDeviceId';

const unwrapApiEnvelope = <T>(response: ApiEnvelope<T>): T => {
  return response.data;
};

const alignExpiryToClientClock = (
  expiresAt: string,
  serverTimestamp: string | null | undefined,
): string => {
  const expiresAtMilliseconds = Date.parse(expiresAt);
  const serverTimestampMilliseconds = serverTimestamp ? Date.parse(serverTimestamp) : Number.NaN;

  if (
    Number.isNaN(expiresAtMilliseconds) ||
    Number.isNaN(serverTimestampMilliseconds) ||
    expiresAtMilliseconds <= serverTimestampMilliseconds
  ) {
    return expiresAt;
  }

  return new Date(Date.now() + (expiresAtMilliseconds - serverTimestampMilliseconds)).toISOString();
};

export const loginStudent = async (payload: LoginPayload): Promise<StudentLoginResult> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentLoginResult>>(
      '/api/v1/auth/login',
      payload,
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '로그인에 실패했습니다.');
  }
};

export const verifyStudentLoginSms = async (
  payload: LoginSmsVerifyPayload,
): Promise<StudentSession> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentLoginResult>>(
      '/api/v1/auth/login/verify-sms',
      payload,
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    const result = unwrapApiEnvelope(response.data);
    if (result.status !== 'COMPLETED') {
      throw new Error('로그인을 완료하지 못했습니다.');
    }
    return result;
  } catch (error: unknown) {
    throw toApiError(error, '문자 인증 확인에 실패했습니다.');
  }
};

export const registerStudent = async (payload: RegisterPayload): Promise<StudentSession> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentSession>>(
      '/api/v1/auth/register',
      payload,
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '회원가입에 실패했습니다.');
  }
};

export const checkLoginIdAvailability = async (
  loginId: string,
): Promise<AvailabilityCheckResponse> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AvailabilityCheckResponse>>(
      '/api/v1/auth/check-login-id',
      {
        params: { loginId },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '아이디 중복 확인에 실패했습니다.');
  }
};

export const checkEmailAvailability = async (email: string): Promise<AvailabilityCheckResponse> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<AvailabilityCheckResponse>>(
      '/api/v1/auth/check-email',
      {
        params: { email },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '이메일 중복 확인에 실패했습니다.');
  }
};

export const fetchRegistrationTerms = async (): Promise<RegistrationTerm[]> => {
  try {
    const response = await axiosInstance.get<ApiEnvelope<RegistrationTerm[]>>(
      '/api/v1/terms/registration',
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '회원가입 약관을 불러오지 못했습니다.');
  }
};

export const sendSmsVerification = async (payload: SmsSendPayload): Promise<SmsSendResponse> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsSendResponse>>(
      '/api/v1/auth/sms/send',
      payload,
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    const smsResponse = unwrapApiEnvelope(response.data);
    return {
      ...smsResponse,
      expiresAt: alignExpiryToClientClock(smsResponse.expiresAt, response.data.timestamp),
    };
  } catch (error: unknown) {
    throw toApiError(error, '인증번호 발송에 실패했습니다.');
  }
};

export const verifySmsCode = async (payload: SmsVerifyPayload): Promise<SmsVerifyResponse> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsVerifyResponse>>(
      '/api/v1/auth/sms/verify',
      payload,
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '인증번호 확인에 실패했습니다.');
  }
};

export const findLoginId = async (payload: FindLoginIdPayload): Promise<FindLoginIdResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<FindLoginIdResponse>>(
      '/api/v1/auth/recovery/login-id',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '가입 정보를 확인하지 못했습니다.');
  }
};

export const sendPasswordResetSms = async (
  payload: PasswordResetSendPayload,
): Promise<SmsSendResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsSendResponse>>(
      '/api/v1/auth/recovery/password/send',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '인증번호 발송에 실패했습니다.');
  }
};

export const resetPassword = async (payload: PasswordResetPayload): Promise<void> => {
  try {
    await axiosInstance.post<ApiEnvelope<null>>('/api/v1/auth/recovery/password/reset', payload);
  } catch (error: unknown) {
    throw toApiError(error, '비밀번호를 재설정하지 못했습니다.');
  }
};

export const refreshStudentSession = async (): Promise<StudentSession> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentSession>>(
      '/api/v1/auth/refresh',
      undefined,
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '로그인 정보가 확인되지 않아 다시 로그인이 필요합니다.');
  }
};

export const logoutStudent = async (): Promise<void> => {
  try {
    await axiosInstance.post<ApiEnvelope<null>>('/api/v1/auth/logout');
  } catch (error: unknown) {
    throw toApiError(error, '로그아웃에 실패했습니다.');
  }
};
