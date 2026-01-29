import axios from 'axios';

export class ApiError extends Error {
  public readonly status: number | null;
  public readonly userMessage: string;

  public constructor(params: { userMessage: string; status: number | null; cause?: unknown }) {
    super(params.userMessage);
    this.name = 'ApiError';
    this.userMessage = params.userMessage;
    this.status = params.status;
    this.cause = params.cause;
  }
}

const getAxiosErrorMessage = (error: unknown): string | null => {
  if (!axios.isAxiosError<unknown>(error)) return null;

  const responseData = error.response?.data;
  if (typeof responseData === 'string' && responseData.trim()) return responseData.trim();

  if (responseData && typeof responseData === 'object') {
    const record = responseData as Record<string, unknown>;
    const message = record['message'];
    if (typeof message === 'string' && message.trim()) return message.trim();
  }

  const message = error.message.trim();
  return message ? message : null;
};

export const toApiError = (
  error: unknown,
  fallbackUserMessage = '요청에 실패했습니다.',
): ApiError => {
  const userMessage = getAxiosErrorMessage(error) ?? fallbackUserMessage;
  const status = axios.isAxiosError(error) ? (error.response?.status ?? null) : null;
  return new ApiError({ userMessage, status, cause: error });
};
