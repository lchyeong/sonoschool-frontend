import { describe, expect, it } from 'vitest';

import {
  createMockCheckoutRedirectPayload,
  getMockPaymentResult,
  getMockPaymentResultByToken,
} from '@/mocks/data/payments';

describe('payments mock data', () => {
  it('returns payment results by id and token with aligned identifiers', () => {
    const completedPayment = getMockPaymentResult(501);
    const tokenPayment = getMockPaymentResultByToken('mock-card-completed');

    expect(completedPayment?.status).toBe('COMPLETED');
    expect(tokenPayment?.id).toBe(501);
    expect(tokenPayment?.orderNumber).toBe(completedPayment?.orderNumber);
  });

  it('builds checkout redirect payloads from the selected mock payment scenario', () => {
    const cardRedirect = createMockCheckoutRedirectPayload('CARD');
    const virtualAccountRedirect = createMockCheckoutRedirectPayload('VIRTUAL_ACCOUNT');

    expect(cardRedirect.paymentId).toBe(501);
    expect(cardRedirect.status).toBe('COMPLETED');
    expect(virtualAccountRedirect.resultToken).toBe('mock-vbank-registered');
    expect(virtualAccountRedirect.status).toBe('REGISTERED');
  });
});
