export type CartQueryScope = 'authenticated' | 'guest';

export const resolveCartQueryScope = (isAuthenticated: boolean): CartQueryScope => {
  return isAuthenticated ? 'authenticated' : 'guest';
};
