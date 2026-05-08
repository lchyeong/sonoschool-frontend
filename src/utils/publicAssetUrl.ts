const S3_STORAGE_SCHEME = 's3://';

const isS3HttpHost = (host: string): boolean => {
  const normalizedHost = host.toLowerCase();

  return (
    normalizedHost === 's3.amazonaws.com' ||
    normalizedHost.startsWith('s3.') ||
    normalizedHost.startsWith('s3-') ||
    normalizedHost.includes('.s3.') ||
    normalizedHost.includes('.s3-')
  );
};

export const isUnsafeStorageAssetUrl = (value: string | null | undefined): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.toLowerCase().startsWith(S3_STORAGE_SCHEME)) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return isS3HttpHost(url.hostname);
  } catch {
    return false;
  }
};

export const sanitizePublicAssetUrl = (
  value: string | null | undefined,
  fallback: string | null = null,
): string | null => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed || isUnsafeStorageAssetUrl(trimmed)) {
    return fallback;
  }

  return trimmed;
};

export const sanitizeRequiredPublicAssetUrl = (
  value: string | null | undefined,
  fallback: string,
): string => sanitizePublicAssetUrl(value, fallback) ?? fallback;
