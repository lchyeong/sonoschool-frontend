import axiosInstance from '@/api/axiosInstance';
import { toApiError } from '@/api/errors';
import { shouldUseMockFallback } from '@/api/fallback';
import {
  getMockRegistrationTerms,
  loginMockStudent,
  logoutMockStudent,
  refreshMockStudentSession,
  registerMockStudent,
  sendMockSmsVerification,
  verifyMockSmsCode,
} from '@/mocks/data/studentAuth';
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

const getMockStudentAuthErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  switch (error.message) {
    case 'Phone number is already registered.':
      return '이미 가입된 휴대폰 번호입니다.';
    case 'Required registration terms must be accepted.':
      return '필수 약관 동의가 필요합니다.';
    case 'Account already exists.':
      return '이미 가입된 계정 정보입니다.';
    default:
      return fallbackMessage;
  }
};

export const loginStudent = async (payload: LoginPayload): Promise<StudentLoginResult> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentLoginResult>>(
      '/api/auth/login',
      payload,
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResult = loginMockStudent(payload);

      if (mockResult) {
        return {
          ...mockResult.session,
          challengeExpiresAt: null,
          challengeToken: null,
          maskedPhoneNumber: null,
          status: 'COMPLETED',
        };
      }
    }

    throw toApiError(error, '로그인에 실패했습니다.');
  }
};

export const verifyStudentLoginSms = async (
  payload: LoginSmsVerifyPayload,
): Promise<StudentSession> => {
  const authDeviceId = getOrCreateAuthDeviceId();
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentLoginResult>>(
      '/api/auth/login/verify-sms',
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
      '/api/auth/register',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      try {
        const mockResult = registerMockStudent(payload);

        if (mockResult) {
          return mockResult.session;
        }
      } catch (mockError: unknown) {
        throw new Error(getMockStudentAuthErrorMessage(mockError, '회원가입에 실패했습니다.'));
      }
    }

    throw toApiError(error, '회원가입에 실패했습니다.');
  }
};

export const fetchRegistrationTerms = async (): Promise<RegistrationTerm[]> => {
  try {
    const response =
      await axiosInstance.get<ApiEnvelope<RegistrationTerm[]>>('/api/terms/registration');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      return getMockRegistrationTerms();
    }

    throw toApiError(error, '회원가입 약관을 불러오지 못했습니다.');
  }
};

export const sendSmsVerification = async (payload: SmsSendPayload): Promise<SmsSendResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsSendResponse>>(
      '/api/auth/sms/send',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      try {
        const mockResponse = sendMockSmsVerification(payload.phoneNumber);

        if (mockResponse) {
          return mockResponse;
        }
      } catch (mockError: unknown) {
        throw new Error(getMockStudentAuthErrorMessage(mockError, '인증번호 발송에 실패했습니다.'));
      }
    }

    throw toApiError(error, '인증번호 발송에 실패했습니다.');
  }
};

export const verifySmsCode = async (payload: SmsVerifyPayload): Promise<SmsVerifyResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<SmsVerifyResponse>>(
      '/api/auth/sms/verify',
      payload,
    );
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockResponse = verifyMockSmsCode(payload);

      if (mockResponse) {
        return mockResponse;
      }
    }

    throw toApiError(error, '인증번호 확인에 실패했습니다.');
  }
};

export const refreshStudentSession = async (): Promise<StudentSession> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<StudentSession>>('/api/auth/refresh');
    return unwrapApiEnvelope(response.data);
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      const mockSession = refreshMockStudentSession();

      if (mockSession) {
        return mockSession;
      }
    }

    throw toApiError(error, '세션을 갱신하지 못했습니다.');
  }
};

export const logoutStudent = async (): Promise<void> => {
  try {
    await axiosInstance.post<ApiEnvelope<null>>('/api/auth/logout');
  } catch (error: unknown) {
    if (shouldUseMockFallback(error)) {
      logoutMockStudent();
      return;
    }

    throw toApiError(error, '로그아웃에 실패했습니다.');
  }
};
