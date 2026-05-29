const RECOVERY_STORAGE_KEY = 'sonoschool:dynamic-import-reload';

const dynamicImportErrorPatterns = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'dynamically imported module',
  'chunkloaderror',
  'loading chunk',
];

export const isDynamicImportLoadError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : '';

  const normalizedMessage = message.toLowerCase();
  return dynamicImportErrorPatterns.some((pattern) => normalizedMessage.includes(pattern));
};

export const reloadOnceForDynamicImportFailure = (error: unknown): boolean => {
  if (!isDynamicImportLoadError(error) || typeof window === 'undefined') {
    return false;
  }

  const reloadKey = `${RECOVERY_STORAGE_KEY}:${window.location.pathname}`;
  if (window.sessionStorage.getItem(reloadKey) === '1') {
    return false;
  }

  window.sessionStorage.setItem(reloadKey, '1');
  window.location.reload();
  return true;
};
