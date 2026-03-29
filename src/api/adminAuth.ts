import axios from 'axios';
import { z } from 'zod';

import axiosInstance from '@/api/axiosInstance';
import type { AdminLoginRequest, AdminLoginResponse } from '@/types/adminAuth';
import { getOrCreateAuthDeviceId } from '@/utils/authDeviceId';

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  return issues ? `\n${issues}` : '';
};

const adminLoginResponseSchema = z.object({
  status: z.enum(['COMPLETED', 'SMS_REQUIRED']),
  accessToken: z.string().min(1).nullable().optional(),
  tokenType: z.string().min(1).nullable().optional(),
  expiresAt: z.string().min(1).nullable().optional(),
  loginId: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().min(1),
});

const getBackendMessage = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const message = record['message'];

  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  return null;
};

const toAdminUserMessage = (backendMessage: string | null): string => {
  switch (backendMessage) {
    case 'Invalid admin credentials':
    case 'Invalid username or password.':
      return '아이디 또는 비밀번호를 확인해 주세요.';
    default:
      return '관리자 요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

const handleAxiosAdminError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const backendMessage = getBackendMessage(error.response?.data);
    throw new Error(toAdminUserMessage(backendMessage));
  }

  throw error;
};

export const loginAdmin = async (payload: AdminLoginRequest): Promise<AdminLoginResponse> => {
  const authDeviceId = getOrCreateAuthDeviceId();

  try {
    const response = await axiosInstance.post<{ data: unknown }>(
      '/api/v1/auth/login',
      {
        loginId: payload.identifier,
        password: payload.password,
      },
      {
        headers: {
          'X-Auth-Device-Id': authDeviceId,
        },
      },
    );
    const parsed = adminLoginResponseSchema.safeParse(response.data.data);

    if (!parsed.success) {
      throw new Error(`[adminAuth] Invalid login response.${toZodErrorMessage(parsed.error)}`);
    }

    if (parsed.data.role !== 'ROLE_ADMIN') {
      throw new Error('관리자 권한 계정으로 로그인해 주세요.');
    }

    if (
      parsed.data.status !== 'COMPLETED' ||
      !parsed.data.accessToken ||
      !parsed.data.tokenType ||
      !parsed.data.expiresAt
    ) {
      throw new Error('관리자 로그인에 실패했습니다. 다시 시도해 주세요.');
    }

    return {
      accessToken: parsed.data.accessToken,
      tokenType: parsed.data.tokenType,
      expiresAt: parsed.data.expiresAt,
      loginId: parsed.data.loginId,
      adminDisplayName: parsed.data.displayName,
      role: parsed.data.role,
    };
  } catch (error: unknown) {
    return handleAxiosAdminError(error);
  }
};
