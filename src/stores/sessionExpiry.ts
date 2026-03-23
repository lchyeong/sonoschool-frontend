export const isExpiredSession = (expiresAt: string): boolean => {
  if (!expiresAt) {
    return true;
  }

  const expiresAtTime = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtTime)) {
    return true;
  }

  return expiresAtTime <= Date.now();
};
