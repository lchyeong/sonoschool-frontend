import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import type {
  ApiEnvelope,
  LoginPayload,
  LoginSmsVerifyPayload,
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
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentSession>>(
      '/api/v1/auth/register',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '회원가입에 실패했습니다.');
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
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsSendResponse>>(
      '/api/v1/auth/sms/send',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '인증번호 발송에 실패했습니다.');
  }
};

export const verifySmsCode = async (payload: SmsVerifyPayload): Promise<SmsVerifyResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsVerifyResponse>>(
      '/api/v1/auth/sms/verify',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '인증번호 확인에 실패했습니다.');
  }
};

export const refreshStudentSession = async (): Promise<StudentSession> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentSession>>('/api/v1/auth/refresh');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    throw toApiError(error, '세션을 갱신하지 못했습니다.');
  }
};

export const logoutStudent = async (): Promise<void> => {
  try {
    await axiosInstance.post<ApiEnvelope<null>>('/api/v1/auth/logout');
  } catch (error: unknown) {
    throw toApiError(error, '로그아웃에 실패했습니다.');
  }
};
