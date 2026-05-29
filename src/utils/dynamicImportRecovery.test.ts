import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isDynamicImportLoadError,
  reloadOnceForDynamicImportFailure,
} from '@/utils/dynamicImportRecovery';

describe('dynamic import recovery', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('detects stale Vite dynamic import failures', () => {
    expect(
      isDynamicImportLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://sonoschool.kr/assets/CartPage-Bq9MRZgQ.js',
        ),
      ),
    ).toBe(true);
  });

  it('reloads once per path for stale dynamic import failures', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/cart',
        reload,
      },
    });

    const error = new TypeError('Failed to fetch dynamically imported module');

    expect(reloadOnceForDynamicImportFailure(error)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadOnceForDynamicImportFailure(error)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload for unrelated errors', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/cart',
        reload,
      },
    });

    expect(reloadOnceForDynamicImportFailure(new Error('Unexpected render failure'))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
