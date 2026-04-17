import type {
  LoginPayload,
  RegistrationTerm,
  RegisterPayload,
  SmsSendResponse,
  SmsVerifyPayload,
  SmsVerifyResponse,
  StudentSession,
} from '@/types/auth';

interface MockStudentAccount {
  loginId: string;
  email: string | null;
  name: string;
  nickname: string;
  password: string;
  phoneNumber: string;
}

interface PendingSmsVerification {
  phoneNumber: string;
  code: string;
  expiresAt: string;
}

const normalizePhoneNumber = (value: string): string => {
  let digits = value.replaceAll(/\D/g, '');
  if (digits.startsWith('82')) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
};

const resolveAccountDisplayName = (account: MockStudentAccount): string => {
  return account.nickname || account.name;
};

const buildSession = (account: MockStudentAccount): StudentSession => {
  return {
    accessToken: `mock-access-token-${account.loginId}-${String(Date.now())}`,
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    loginId: account.loginId,
    displayName: resolveAccountDisplayName(account),
    role: 'ROLE_STUDENT',
  };
};

const createInitialAccounts = (): MockStudentAccount[] => {
  return [
    {
      loginId: 'student01',
      email: 'student@sono.test',
      name: '홍길동',
      nickname: '길동',
      password: 'password123',
      phoneNumber: '01012345678',
    },
  ];
};

let accounts = createInitialAccounts();
let pendingVerification: PendingSmsVerification | null = null;
let verifiedPhoneNumber: string | null = null;
let currentRefreshToken: string | null = null;
let currentSessionLoginId: string | null = null;

const registrationTerms: RegistrationTerm[] = [
  {
    code: 'SERVICE_TERMS',
    title: '이용약관',
    version: '2026-03-17',
    required: true,
    contentUrl: '/terms/service',
  },
  {
    code: 'PRIVACY_POLICY',
    title: '개인정보 처리방침',
    version: '2026-03-17',
    required: true,
    contentUrl: '/terms/privacy',
  },
  {
    code: 'MARKETING',
    title: '마케팅 정보 수신 동의',
    version: '2026-03-17',
    required: false,
    contentUrl: '/terms/marketing',
  },
];

export const resetMockStudentAuthState = () => {
  accounts = createInitialAccounts();
  pendingVerification = null;
  verifiedPhoneNumber = null;
  currentRefreshToken = null;
  currentSessionLoginId = null;
};

export const getMockRegistrationTerms = (): RegistrationTerm[] => {
  return registrationTerms;
};

export const sendMockSmsVerification = (phoneNumber: string): SmsSendResponse | null => {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  if (!/^01\d{8,9}$/.test(normalizedPhoneNumber)) {
    return null;
  }

  if (accounts.some((account) => account.phoneNumber === normalizedPhoneNumber)) {
    throw new Error('Phone number is already registered.');
  }

  const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
  pendingVerification = {
    phoneNumber: normalizedPhoneNumber,
    code: '123456',
    expiresAt,
  };
  verifiedPhoneNumber = null;

  return {
    phoneNumber: normalizedPhoneNumber,
    expiresAt,
  };
};

export const verifyMockSmsCode = (payload: SmsVerifyPayload): SmsVerifyResponse | null => {
  if (!pendingVerification) {
    return null;
  }

  const normalizedPhoneNumber = normalizePhoneNumber(payload.phoneNumber);
  if (
    pendingVerification.phoneNumber !== normalizedPhoneNumber ||
    pendingVerification.code !== payload.code
  ) {
    return null;
  }

  verifiedPhoneNumber = normalizedPhoneNumber;
  pendingVerification = null;

  return {
    phoneNumber: normalizedPhoneNumber,
    verifiedAt: new Date().toISOString(),
  };
};

export const registerMockStudent = (
  payload: RegisterPayload,
): { session: StudentSession; refreshToken: string } | null => {
  const normalizedPhoneNumber = normalizePhoneNumber(payload.phoneNumber);
  const requiredTermCodes = registrationTerms
    .filter((term) => term.required)
    .map((term) => term.code);

  if (verifiedPhoneNumber !== normalizedPhoneNumber) {
    return null;
  }

  if (!requiredTermCodes.every((code) => payload.acceptedTermCodes.includes(code))) {
    throw new Error('Required registration terms must be accepted.');
  }

  if (
    accounts.some(
      (account) =>
        account.loginId === payload.loginId ||
        account.email === payload.email ||
        account.phoneNumber === normalizedPhoneNumber,
    )
  ) {
    throw new Error('Account already exists.');
  }

  const account: MockStudentAccount = {
    loginId: payload.loginId,
    email: payload.email,
    name: payload.name,
    nickname: payload.nickname,
    password: payload.password,
    phoneNumber: normalizedPhoneNumber,
  };

  accounts = [...accounts, account];
  verifiedPhoneNumber = null;

  const session = buildSession(account);
  const refreshToken = `mock-refresh-token-${payload.loginId}-${String(Date.now())}`;
  currentRefreshToken = refreshToken;
  currentSessionLoginId = payload.loginId;

  return { session, refreshToken };
};

export const loginMockStudent = (
  payload: LoginPayload,
): { session: StudentSession; refreshToken: string } | null => {
  const account = accounts.find(
    (candidate) => candidate.loginId === payload.loginId && candidate.password === payload.password,
  );

  if (!account) {
    return null;
  }

  const session = buildSession(account);
  const refreshToken = `mock-refresh-token-${payload.loginId}-${String(Date.now())}`;
  currentRefreshToken = refreshToken;
  currentSessionLoginId = payload.loginId;

  return { session, refreshToken };
};

export const refreshMockStudentSession = (): StudentSession | null => {
  if (!currentRefreshToken || !currentSessionLoginId) {
    return null;
  }

  const account = accounts.find((candidate) => candidate.loginId === currentSessionLoginId);
  if (!account) {
    return null;
  }

  currentRefreshToken = `mock-refresh-token-${account.loginId}-${String(Date.now())}`;
  return buildSession(account);
};

export const getCurrentMockStudentDisplayName = (): string => {
  if (!currentSessionLoginId) {
    return '현재 사용자';
  }

  const account = accounts.find((candidate) => candidate.loginId === currentSessionLoginId);
  if (!account) {
    return '현재 사용자';
  }

  return resolveAccountDisplayName(account);
};

export const logoutMockStudent = () => {
  currentRefreshToken = null;
  currentSessionLoginId = null;
};
