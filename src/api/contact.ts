import axios from 'axios';

import axiosInstance from './axiosInstance';

export interface ContactFormData {
  title: string;
  email: string;
  content: string;
  product?: string;
  name?: string;
  jobTitle?: string;
  phone?: string;
  turnstileToken: string;
}

export interface SubmitContactFormResponse {
  ok: true;
}

const DEFAULT_ERROR_MESSAGE = '문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.';

const isSuccessPayload = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  return record['ok'] === true || record['success'] === true;
};

const getBackendMessage = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  const message = record['message'];
  if (typeof message === 'string' && message.trim()) return message.trim();

  const error = record['error'];
  if (typeof error === 'string' && error.trim()) return error.trim();

  return null;
};

const toUserMessage = (backendMessage: string | null): string => {
  if (!backendMessage) return DEFAULT_ERROR_MESSAGE;

  switch (backendMessage) {
    case 'Invalid title':
      return '제목을 확인해주세요.';
    case 'Invalid email':
      return '이메일을 확인해주세요.';
    case 'Invalid content':
      return '내용을 확인해주세요.';
    case 'Missing turnstileToken':
      return '스팸 방지 인증이 필요합니다.';
    case 'Turnstile verification failed':
      return '스팸 방지 인증에 실패했습니다. 다시 시도해주세요.';
    case 'Invalid body':
    case 'Invalid JSON':
      return '요청 형식이 올바르지 않습니다. 다시 시도해주세요.';
    default:
      return DEFAULT_ERROR_MESSAGE;
  }
};

export const submitContactForm = async (
  data: ContactFormData,
): Promise<SubmitContactFormResponse> => {
  try {
    const response = await axiosInstance.post('/contact', data);
    const responseData: unknown = response.data;

    if (isSuccessPayload(responseData)) return { ok: true };

    const backendMessage = getBackendMessage(responseData);
    throw new Error(toUserMessage(backendMessage));
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const backendMessage = getBackendMessage(error.response?.data);
      throw new Error(toUserMessage(backendMessage));
    }

    throw error;
  }
};
