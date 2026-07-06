import type { ChangeEvent, CSSProperties, FormEvent, ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { loginStudent, verifyStudentLoginSms } from '@/api/auth';
import { ApiError } from '@/api/errors';
import eyeOffIconSrc from '@/assets/icons/lucide_eye-off.svg';
import eyeIconSrc from '@/assets/icons/lucide_eye.svg';
import SmsVerificationModal from '@/components/auth/SmsVerificationModal/SmsVerificationModal';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { myCartQueryKey } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { StudentLoginChallenge } from '@/types/auth';
import { getOrCreateAuthDeviceId } from '@/utils/authDeviceId';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';
import { classNames } from '@/utils/classNames';
import { mergeGuestCartIntoServer } from '@/utils/mergeGuestCartIntoServer';

import styles from './StudentLoginForm.module.scss';

interface LoginFormValues {
  loginId: string;
  password: string;
}

interface LoginFormErrors {
  code?: string;
  loginId?: string;
  password?: string;
}

type LoginEyeIconStyle = CSSProperties & {
  '--login-eye-icon': string;
};

interface StudentLoginFormProps {
  className?: string | undefined;
  inputClassName?: string | undefined;
  inputErrorClassName?: string | undefined;
  inputFieldClassName?: string | undefined;
  inputLabelClassName?: string | undefined;
  rememberLoginIdLabel?: string | undefined;
  secondaryAction?: ReactNode;
  showRememberLoginId?: boolean | undefined;
  submitLabel?: string;
  submitButtonClassName?: string | undefined;
  supportText?: string;
  onSuccess?: () => void;
  loginIdInputRef?: RefObject<HTMLInputElement | null>;
  initialValues?: Partial<LoginFormValues> | undefined;
  variant?: 'default' | 'page';
}

interface LoginRedirectState {
  from?: {
    pathname?: string;
    search?: string;
  };
}

const INITIAL_FORM_VALUES: LoginFormValues = {
  loginId: '',
  password: '',
};
const LOGIN_AUTH_ERROR_MESSAGE = '아이디 및 비밀번호를 확인해주세요.';
const SMS_CODE_LENGTH = 6;
const LOGIN_SMS_CHALLENGE_STORAGE_KEY = 'sonoschool:login:sms-challenge';

type LoginChallengeOrigin = 'issued' | 'restored';

interface StoredLoginSmsChallenge {
  challenge: StudentLoginChallenge;
  deviceId: string;
}

const getRemainingSeconds = (expiresAt: string | null): number => {
  if (!expiresAt) return 0;

  const remainingMilliseconds = new Date(expiresAt).getTime() - Date.now();
  return remainingMilliseconds > 0 ? Math.ceil(remainingMilliseconds / 1000) : 0;
};

const isStudentLoginChallenge = (value: unknown): value is StudentLoginChallenge => {
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  return (
    record['status'] === 'SMS_REQUIRED' &&
    typeof record['challengeToken'] === 'string' &&
    typeof record['challengeExpiresAt'] === 'string' &&
    typeof record['maskedPhoneNumber'] === 'string' &&
    typeof record['loginId'] === 'string' &&
    typeof record['displayName'] === 'string' &&
    typeof record['role'] === 'string'
  );
};

const readStoredLoginSmsChallenge = (deviceId: string): StudentLoginChallenge | null => {
  if (typeof window === 'undefined') return null;

  try {
    const serialized = window.sessionStorage.getItem(LOGIN_SMS_CHALLENGE_STORAGE_KEY);
    if (!serialized) return null;

    const parsed = JSON.parse(serialized) as Partial<StoredLoginSmsChallenge>;
    if (parsed.deviceId !== deviceId || !isStudentLoginChallenge(parsed.challenge)) {
      window.sessionStorage.removeItem(LOGIN_SMS_CHALLENGE_STORAGE_KEY);
      return null;
    }

    if (getRemainingSeconds(parsed.challenge.challengeExpiresAt) === 0) {
      window.sessionStorage.removeItem(LOGIN_SMS_CHALLENGE_STORAGE_KEY);
      return null;
    }

    return parsed.challenge;
  } catch {
    window.sessionStorage.removeItem(LOGIN_SMS_CHALLENGE_STORAGE_KEY);
    return null;
  }
};

const saveLoginSmsChallenge = (challenge: StudentLoginChallenge, deviceId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      LOGIN_SMS_CHALLENGE_STORAGE_KEY,
      JSON.stringify({ challenge, deviceId } satisfies StoredLoginSmsChallenge),
    );
  } catch {
    // Storage failures should not block login SMS verification.
  }
};

const clearStoredLoginSmsChallenge = (): void => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(LOGIN_SMS_CHALLENGE_STORAGE_KEY);
  } catch {
    // Storage failures should not block login SMS verification.
  }
};

const StudentLoginForm = ({
  className,
  secondaryAction,
  inputClassName,
  inputErrorClassName,
  inputFieldClassName,
  inputLabelClassName,
  rememberLoginIdLabel = '아이디 저장',
  showRememberLoginId = false,
  submitLabel = '로그인',
  submitButtonClassName,
  supportText,
  onSuccess,
  loginIdInputRef,
  initialValues,
  variant = 'default',
}: StudentLoginFormProps) => {
  const internalLoginIdInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const authDeviceIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useToastStore((state) => state.showToast);

  const [formValues, setFormValues] = useState<LoginFormValues>(() => ({
    ...INITIAL_FORM_VALUES,
    ...initialValues,
  }));
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [loginChallenge, setLoginChallenge] = useState<StudentLoginChallenge | null>(null);
  const [loginChallengeOrigin, setLoginChallengeOrigin] = useState<LoginChallengeOrigin>('issued');
  const [rememberLoginId, setRememberLoginId] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const isPageVariant = variant === 'page';

  const getAuthDeviceId = () => {
    if (!authDeviceIdRef.current) {
      authDeviceIdRef.current = getOrCreateAuthDeviceId();
    }

    return authDeviceIdRef.current;
  };

  const resolvePostLoginPath = () => {
    const redirectState = location.state as LoginRedirectState | null;
    const from = redirectState?.from;

    if (typeof from?.pathname === 'string' && from.pathname.trim()) {
      return `${from.pathname}${typeof from.search === 'string' ? from.search : ''}`;
    }

    return routePaths.mypage;
  };

  const finalizeAuthenticatedLogin = async (session: {
    accessToken: string;
    tokenType: string;
    expiresAt: string;
    loginId: string;
    displayName: string;
    role: string;
  }) => {
    clearStoredLoginSmsChallenge();
    setSession(session);

    const cartScope = resolveCartQueryScope(true);
    const mergeResult = await mergeGuestCartIntoServer();

    if (mergeResult.serverCart) {
      queryClient.setQueryData(myCartQueryKey(cartScope), mergeResult.serverCart);
    }

    if (mergeResult.failedCount > 0) {
      showToast({
        message:
          '일부 비로그인 장바구니 항목은 옮기지 못했습니다. 장바구니에서 다시 확인해 주세요.',
        variant: 'info',
      });
    }

    showToast({
      message: `${session.displayName}님으로 로그인했습니다.`,
      variant: 'success',
    });

    if (onSuccess) {
      onSuccess();
      return;
    }

    void navigate(resolvePostLoginPath(), { replace: true });
  };

  const loginMutation = useMutation({
    mutationFn: loginStudent,
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === 'AUTH_429_SMS_SEND') {
        const storedChallenge = readStoredLoginSmsChallenge(getAuthDeviceId());
        if (storedChallenge && storedChallenge.loginId === formValues.loginId.trim()) {
          setLoginChallenge(storedChallenge);
          setLoginChallengeOrigin('restored');
          setVerificationCode('');
          showToast({
            message: '이미 발송된 인증번호가 아직 유효합니다. 문자함을 확인해 주세요.',
            variant: 'info',
          });
          return;
        }
      }

      if (isPageVariant) {
        if (
          error instanceof ApiError &&
          (error.code === 'AUTH_429_SMS_SEND' || error.code === 'AUTH_429_SMS_SEND_LIMIT')
        ) {
          setAuthErrorMessage(error.userMessage);
          return;
        }

        setAuthErrorMessage(LOGIN_AUTH_ERROR_MESSAGE);
        return;
      }

      showToast({
        message:
          error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (session) => {
      if (session.status === 'SMS_REQUIRED') {
        const authDeviceId = getAuthDeviceId();
        const storedChallenge = readStoredLoginSmsChallenge(authDeviceId);
        const isStoredChallengeReused = storedChallenge?.challengeToken === session.challengeToken;

        setLoginChallenge(session);
        setLoginChallengeOrigin(isStoredChallengeReused ? 'restored' : 'issued');
        setVerificationCode('');
        saveLoginSmsChallenge(session, authDeviceId);
        showToast({
          message: isStoredChallengeReused
            ? '이미 발송된 인증번호가 아직 유효합니다. 문자함을 확인해 주세요.'
            : `${session.maskedPhoneNumber} 번호로 인증번호를 보냈습니다.`,
          variant: isStoredChallengeReused ? 'info' : 'success',
        });
        return;
      }

      await finalizeAuthenticatedLogin(session);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyStudentLoginSms,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '문자 인증 확인에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (session) => {
      clearStoredLoginSmsChallenge();
      setLoginChallenge(null);
      setLoginChallengeOrigin('issued');
      setVerificationCode('');
      await finalizeAuthenticatedLogin(session);
    },
  });

  useEffect(() => {
    clearStoredLoginSmsChallenge();
  }, []);

  const handleFieldChange =
    (fieldName: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      if (fieldName === 'loginId') {
        const storedChallenge = readStoredLoginSmsChallenge(getAuthDeviceId());
        if (storedChallenge && storedChallenge.loginId !== nextValue.trim()) {
          clearStoredLoginSmsChallenge();
        }
      }

      setAuthErrorMessage(null);
      setFormValues((current) => ({
        ...current,
        [fieldName]: nextValue,
      }));

      setFormErrors((current) => ({
        ...current,
        [fieldName]: undefined,
      }));
    };

  const resolvedLoginIdInputRef = loginIdInputRef ?? internalLoginIdInputRef;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthErrorMessage(null);

    if (loginChallenge) {
      handleSmsConfirm(verificationCode);
      return;
    }

    const nextErrors: LoginFormErrors = {};

    if (!formValues.loginId.trim()) {
      nextErrors.loginId = '아이디를 확인해주세요.';
    }

    if (!formValues.password.trim()) {
      nextErrors.password = '비밀번호를 확인해주세요.';
    }

    setFormErrors(nextErrors);

    if (nextErrors.loginId) {
      resolvedLoginIdInputRef.current?.focus();
      return;
    }

    if (nextErrors.password) {
      passwordInputRef.current?.focus();
      return;
    }

    loginMutation.mutate({
      loginId: formValues.loginId.trim(),
      password: formValues.password,
    });
  };

  const handleSmsCodeChange = (code: string) => {
    setVerificationCode(code);
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
  };

  const handleSmsConfirm = (code: string) => {
    const trimmedCode = code.trim();
    if (trimmedCode.length !== SMS_CODE_LENGTH || !loginChallenge) {
      setFormErrors((current) => ({
        ...current,
        code: '인증번호를 확인해주세요.',
      }));
      return;
    }

    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
    verifyMutation.mutate({
      challengeToken: loginChallenge.challengeToken,
      code: trimmedCode,
    });
  };

  const resetLoginChallenge = () => {
    setLoginChallenge(null);
    setLoginChallengeOrigin('issued');
    setVerificationCode('');
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
  };

  const handleResendChallenge = () => {
    clearStoredLoginSmsChallenge();
    setLoginChallengeOrigin('issued');
    setVerificationCode('');
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));

    if (!formValues.password.trim()) {
      setLoginChallenge(null);
      setFormErrors((current) => ({
        ...current,
        password: '인증번호를 다시 받으려면 비밀번호를 입력해주세요.',
      }));
      passwordInputRef.current?.focus();
      return;
    }

    loginMutation.mutate({
      loginId: formValues.loginId.trim(),
      password: formValues.password,
    });
  };

  const isLoginChallengeRestored = loginChallengeOrigin === 'restored';

  return (
    <form
      className={classNames(styles['form'], isPageVariant && styles['formPage'], className)}
      noValidate
      onSubmit={handleSubmit}
    >
      {supportText ? <p className={styles['supportText']}>{supportText}</p> : null}

      <div className={styles['fieldGroup']}>
        <TextField
          autoComplete='username'
          className={inputClassName}
          errorClassName={inputErrorClassName}
          errorMessage={formErrors.loginId}
          fieldClassName={inputFieldClassName}
          label='아이디'
          labelClassName={inputLabelClassName}
          name='loginId'
          onChange={handleFieldChange('loginId')}
          placeholder='아이디 또는 이메일을 입력해주세요.'
          ref={resolvedLoginIdInputRef}
          value={formValues.loginId}
        />

        <div className={styles['passwordFieldWrap']}>
          <TextField
            autoComplete='current-password'
            className={classNames(inputClassName, isPageVariant && styles['passwordInput'])}
            errorClassName={inputErrorClassName}
            errorMessage={formErrors.password}
            fieldClassName={inputFieldClassName}
            label='비밀번호'
            labelClassName={inputLabelClassName}
            name='password'
            onChange={handleFieldChange('password')}
            placeholder='비밀번호를 입력해주세요.'
            ref={passwordInputRef}
            type={isPasswordVisible ? 'text' : 'password'}
            value={formValues.password}
          />
          {isPageVariant ? (
            <button
              aria-label={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
              className={styles['passwordVisibilityButton']}
              onClick={() => {
                setIsPasswordVisible((current) => !current);
              }}
              type='button'
            >
              <span
                aria-hidden='true'
                className={styles['passwordVisibilityIcon']}
                style={
                  {
                    '--login-eye-icon': `url("${isPasswordVisible ? eyeIconSrc : eyeOffIconSrc}")`,
                  } as LoginEyeIconStyle
                }
              />
            </button>
          ) : null}
        </div>
      </div>

      {!loginChallenge && (showRememberLoginId || secondaryAction) && isPageVariant ? (
        <div className={styles['utilityRow']}>
          {showRememberLoginId ? (
            <label className={styles['rememberLabel']}>
              <input
                checked={rememberLoginId}
                className={styles['rememberInput']}
                onChange={(event) => {
                  setRememberLoginId(event.currentTarget.checked);
                }}
                type='checkbox'
              />
              <span aria-hidden='true' className={styles['rememberBox']} />
              <span>{rememberLoginIdLabel}</span>
            </label>
          ) : null}
          {secondaryAction}
        </div>
      ) : null}

      {!loginChallenge && isPageVariant ? (
        <p
          aria-hidden={!authErrorMessage}
          className={classNames(
            styles['formErrorText'],
            !authErrorMessage && styles['formErrorTextHidden'],
          )}
          role={authErrorMessage ? 'alert' : undefined}
        >
          {authErrorMessage ?? LOGIN_AUTH_ERROR_MESSAGE}
        </p>
      ) : null}

      <div className={styles['actionGroup']}>
        <Button
          className={classNames(styles['submitButton'], submitButtonClassName)}
          disabled={loginMutation.isPending || verifyMutation.isPending}
          type='submit'
        >
          {loginMutation.isPending ? '로그인 중...' : submitLabel}
        </Button>
        {!isPageVariant ? secondaryAction : null}
      </div>

      {loginChallenge ? (
        <SmsVerificationModal
          activeHint='화면을 닫아도 남은 시간 동안 같은 인증번호를 입력할 수 있습니다.'
          challengeExpiresAt={loginChallenge.challengeExpiresAt}
          code={verificationCode}
          description={
            <>
              새 환경 로그인으로 확인되어 {loginChallenge.maskedPhoneNumber} 번호로 문자 인증이
              필요합니다.
            </>
          }
          errorMessage={formErrors.code ?? null}
          expiredHint='인증 시간이 만료되었습니다. 다시 전송해 주세요.'
          isResending={loginMutation.isPending}
          isSubmitting={verifyMutation.isPending}
          onClose={resetLoginChallenge}
          onCodeChange={handleSmsCodeChange}
          onResend={handleResendChallenge}
          onSubmit={handleSmsConfirm}
          key={loginChallenge.challengeToken}
          secondaryAction={secondaryAction}
          summary={
            isLoginChallengeRestored
              ? '이미 발송된 인증번호가 아직 유효합니다.'
              : '문자로 전송된 6자리 인증번호를 입력해 주세요.'
          }
          title='로그인'
        />
      ) : null}
    </form>
  );
};

export default StudentLoginForm;
