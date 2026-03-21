const STORAGE_KEY = 'sonoschool.auth.device-id';

const createFallbackDeviceId = () => {
  return `auth-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

export const getOrCreateAuthDeviceId = (): string => {
  if (typeof window === 'undefined') {
    return 'server-render';
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextId =
    typeof window.crypto.randomUUID === 'function'
      ? `auth-${window.crypto.randomUUID()}`
      : createFallbackDeviceId();
  window.localStorage.setItem(STORAGE_KEY, nextId);
  return nextId;
};
