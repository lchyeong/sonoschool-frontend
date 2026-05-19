import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toApiError, toApiResponseValidationError } from '@/api/errors';

describe('API errors', () => {
  it('maps stale-session errors into a user-friendly re-login message', () => {
    const apiError = toApiError(
      {
        isAxiosError: true,
        message: 'Request failed with status code 401',
        response: {
          data: {
            code: 'AUTH_401_SESSION',
            message: 'Session is no longer valid.',
          },
          status: 401,
        },
      },
      '세션을 갱신하지 못했습니다.',
    );

    expect(apiError.code).toBe('AUTH_401_SESSION');
    expect(apiError.status).toBe(401);
    expect(apiError.userMessage).toBe(
      '다른 기기에서 로그인되었거나 인증 시간이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.',
    );
  });

  it('maps invalid credential errors into the shared login message', () => {
    const apiError = toApiError(
      {
        isAxiosError: true,
        message: 'Request failed with status code 401',
        response: {
          data: {
            code: 'AUTH_401',
            message: 'Invalid username or password.',
          },
          status: 401,
        },
      },
      '로그인에 실패했습니다.',
    );

    expect(apiError.code).toBe('AUTH_401');
    expect(apiError.userMessage).toBe('아이디 및 비밀번호를 확인해주세요.');
  });

  it('maps video worker dispatch failures into an admin-friendly message', () => {
    const apiError = toApiError(
      {
        isAxiosError: true,
        message: 'Request failed with status code 502',
        response: {
          data: {
            code: 'VIDEO_502_WORKER_DISPATCH',
            message: 'Failed to submit the encoding job to the HLS worker.',
          },
          status: 502,
        },
      },
      '영상 처리를 시작하지 못했습니다.',
    );

    expect(apiError.code).toBe('VIDEO_502_WORKER_DISPATCH');
    expect(apiError.status).toBe(502);
    expect(apiError.userMessage).toBe(
      '영상 인코딩 서버에 연결하지 못했습니다. 인코딩 워커 실행 상태를 확인한 뒤 다시 시도해 주세요.',
    );
  });

  it('maps payment and enrollment domain failures into actionable messages', () => {
    const apiError = toApiError(
      {
        isAxiosError: true,
        message: 'Request failed with status code 409',
        response: {
          data: {
            code: 'PAYMENT_409_FULFILLMENT_PENDING',
            message: 'Payment was approved but enrollment fulfillment is pending.',
          },
          status: 409,
        },
      },
      'PC 결제 승인에 실패했습니다.',
    );

    expect(apiError.code).toBe('PAYMENT_409_FULFILLMENT_PENDING');
    expect(apiError.status).toBe(409);
    expect(apiError.userMessage).toBe(
      '결제 승인은 완료됐고 수강 등록을 확인 중입니다. 잠시 후 내 강의실을 확인해 주세요.',
    );
  });

  it('keeps invalid response diagnostics out of the user-facing message', () => {
    const parsed = z.object({ items: z.array(z.string()).min(1) }).safeParse({ items: [] });

    if (parsed.success) {
      throw new Error('Expected the fixture to fail validation.');
    }

    const apiError = toApiResponseValidationError({
      source: 'homeHeroSlides',
      userMessage: '슬라이드 정보가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });

    expect(apiError.message).toBe(
      '슬라이드 정보가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(apiError.debugMessage).toContain('[homeHeroSlides] Invalid response.');
    expect(apiError.debugMessage).toContain('items');
  });
});
