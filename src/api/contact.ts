import axiosInstance from './axiosInstance';
import { toApiError } from './errors';

interface ApiEnvelope<T> {
  data: T;
  timestamp: string;
}

export interface ContactFormData {
  title: string;
  email: string;
  content: string;
  name?: string;
  jobTitle?: string;
  phone?: string;
  turnstileToken: string;
}

export interface SubmitContactFormResponse {
  ok: true;
}

export const submitContactForm = async (
  data: ContactFormData,
): Promise<SubmitContactFormResponse> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<SubmitContactFormResponse>>(
      '/api/v1/contact',
      data,
    );
    return response.data.data;
  } catch (error: unknown) {
    throw toApiError(error, '문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
};
