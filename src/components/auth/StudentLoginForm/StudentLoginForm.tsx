import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  RefObject,
} from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { loginStudent, verifyStudentLoginSms } from '@/api/auth';
import { ApiError } from '@/api/errors';
import clockIconSrc from '@/assets/icons/lucide_clock_sono.svg';
import eyeOffIconSrc from '@/assets/icons/lucide_eye-off.svg';
import eyeIconSrc from '@/assets/icons/lucide_eye.svg';
import closeIconSrc from '@/assets/icons/lucide_x.svg';
import Modal from '@/components/overlay/Modal/Modal';
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

const formatRemainingTimeLabel = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
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
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const codeBoxRefs = useRef<Array<HTMLInputElement | null>>([]);
  const authDeviceIdRef = useRef<string | null>(null);
  const initialLoginIdRef = useRef((initialValues?.loginId ?? '').trim());
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
  const [challengeCountdownSeconds, setChallengeCountdownSeconds] = useState(0);
  const [rememberLoginId, setRememberLoginId] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const isPageVariant = variant === 'page';
  const codeDigits = useMemo(
    () => Array.from({ length: SMS_CODE_LENGTH }, (_, index) => verificationCode[index] ?? ''),
    [verificationCode],
  );

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
          setChallengeCountdownSeconds(getRemainingSeconds(storedChallenge.challengeExpiresAt));
          showToast({
            message: '이미 발송된 인증번호가 아직 유효합니다. 문자함을 확인해 주세요.',
            variant: 'info',
          });
          window.setTimeout(() => {
            codeBoxRefs.current[0]?.focus();
          }, 0);
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
        setChallengeCountdownSeconds(getRemainingSeconds(session.challengeExpiresAt));
        saveLoginSmsChallenge(session, authDeviceId);
        showToast({
          message: isStoredChallengeReused
            ? '이미 발송된 인증번호가 아직 유효합니다. 문자함을 확인해 주세요.'
            : `${session.maskedPhoneNumber} 번호로 인증번호를 보냈습니다.`,
          variant: isStoredChallengeReused ? 'info' : 'success',
        });
        window.setTimeout(() => {
          codeBoxRefs.current[0]?.focus();
        }, 0);
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
      setChallengeCountdownSeconds(0);
      await finalizeAuthenticatedLogin(session);
    },
  });

  useEffect(() => {
    const storedChallenge = readStoredLoginSmsChallenge(getAuthDeviceId());
    if (!storedChallenge) {
      return;
    }

    const currentLoginId = initialLoginIdRef.current;
    if (currentLoginId && currentLoginId !== storedChallenge.loginId) {
      clearStoredLoginSmsChallenge();
      return;
    }

    setLoginChallenge(storedChallenge);
    setLoginChallengeOrigin('restored');
    setVerificationCode('');
    setChallengeCountdownSeconds(getRemainingSeconds(storedChallenge.challengeExpiresAt));
    setFormValues((current) => ({
      ...current,
      loginId: storedChallenge.loginId,
    }));
    window.setTimeout(() => {
      codeBoxRefs.current[0]?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!loginChallenge || challengeCountdownSeconds === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setChallengeCountdownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [challengeCountdownSeconds, loginChallenge]);

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
      const trimmedCode = verificationCode.trim();
      if (!trimmedCode) {
        setFormErrors((current) => ({
          ...current,
          code: '인증번호를 확인해주세요.',
        }));
        codeInputRef.current?.focus();
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

  const handleSmsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    handleSubmit(event);
  };

  const handleCodeBoxChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextDigits = event.target.value.replace(/\D/g, '').slice(0, SMS_CODE_LENGTH);
    if (!nextDigits) {
      const currentDigits = codeDigits.slice();
      currentDigits[index] = '';
      setVerificationCode(currentDigits.join('').slice(0, SMS_CODE_LENGTH));
      return;
    }

    const currentDigits = codeDigits.slice();
    nextDigits.split('').forEach((digit, digitIndex) => {
      const targetIndex = index + digitIndex;
      if (targetIndex < SMS_CODE_LENGTH) {
        currentDigits[targetIndex] = digit;
      }
    });

    const nextCode = currentDigits.join('').slice(0, SMS_CODE_LENGTH);
    const nextFocusIndex = Math.min(index + nextDigits.length, SMS_CODE_LENGTH - 1);
    setVerificationCode(nextCode);
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
    window.setTimeout(() => {
      codeBoxRefs.current[nextFocusIndex]?.focus();
    }, 0);
  };

  const handleCodeBoxKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      event.preventDefault();
      codeBoxRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      codeBoxRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < SMS_CODE_LENGTH - 1) {
      event.preventDefault();
      codeBoxRefs.current[index + 1]?.focus();
    }
  };

  const resetLoginChallenge = () => {
    setLoginChallenge(null);
    setLoginChallengeOrigin('issued');
    setVerificationCode('');
    setChallengeCountdownSeconds(0);
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
  };

  const handleResendChallenge = () => {
    if (challengeCountdownSeconds > 0) {
      return;
    }

    clearStoredLoginSmsChallenge();
    setLoginChallengeOrigin('issued');
    setVerificationCode('');
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));

    if (!formValues.password.trim()) {
      setLoginChallenge(null);
      setChallengeCountdownSeconds(0);
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
  const isChallengeActive = loginChallenge !== null && challengeCountdownSeconds > 0;

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
        <Modal
          bodyClassName={styles['smsModalBody']}
          closeButtonClassName={styles['smsModalCloseButton']}
          closeButtonContent={
            <span
              aria-hidden='true'
              className={styles['smsModalCloseIcon']}
              style={{ '--login-eye-icon': `url("${closeIconSrc}")` } as LoginEyeIconStyle}
            />
          }
          headerClassName={styles['smsModalHeader']}
          onClose={resetLoginChallenge}
          panelClassName={styles['smsModalPanel']}
          title='로그인'
          titleClassName={styles['smsModalTitle']}
        >
          <form className={styles['smsModalForm']} noValidate onSubmit={handleSmsSubmit}>
            <p className={styles['smsModalDescription']}>
              새 환경 로그인으로 확인되어 {loginChallenge.maskedPhoneNumber} 번호로 문자 인증이
              필요합니다.
            </p>
            <p className={styles['challengeSummary']}>
              {isLoginChallengeRestored
                ? '이미 발송된 인증번호가 아직 유효합니다.'
                : '문자로 전송된 6자리 인증번호를 입력해 주세요.'}
            </p>
            <p className={styles['challengeHint']}>
              {isChallengeActive
                ? '화면을 닫아도 남은 시간 동안 같은 인증번호를 입력할 수 있습니다.'
                : '인증 시간이 만료되었습니다. 다시 전송해 주세요.'}
            </p>
            <div className={styles['smsModalCodeHeader']}>
              <label className={styles['smsModalCodeLabel']} htmlFor='login_sms_code_0'>
                인증번호
              </label>
              <div className={styles['smsModalTimerGroup']}>
                <span aria-hidden='true' className={styles['smsModalTimerIconSlot']}>
                  <img alt='' className={styles['smsModalTimerIcon']} src={clockIconSrc} />
                </span>
                <span className={styles['smsModalTimerText']}>
                  {formatRemainingTimeLabel(challengeCountdownSeconds)}
                </span>
                <span aria-hidden='true' className={styles['smsModalDivider']} />
                <button
                  className={styles['smsModalResendButton']}
                  disabled={loginMutation.isPending || challengeCountdownSeconds > 0}
                  onClick={handleResendChallenge}
                  type='button'
                >
                  {challengeCountdownSeconds > 0 ? '재전송 대기' : '재전송'}
                </button>
              </div>
            </div>
            <div className={styles['smsModalCodeGrid']}>
              {codeDigits.map((digit, index) => (
                <input
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className={classNames(
                    styles['smsModalCodeInput'],
                    digit && styles['smsModalCodeInputFilled'],
                    formErrors.code && styles['smsModalCodeInputError'],
                  )}
                  id={`login_sms_code_${String(index)}`}
                  inputMode='numeric'
                  key={index}
                  maxLength={1}
                  onChange={handleCodeBoxChange(index)}
                  onKeyDown={handleCodeBoxKeyDown(index)}
                  ref={(element) => {
                    codeBoxRefs.current[index] = element;
                    if (index === 0) {
                      codeInputRef.current = element;
                    }
                  }}
                  type='text'
                  value={digit}
                />
              ))}
            </div>
            <p
              aria-hidden={!formErrors.code}
              className={classNames(
                styles['smsModalError'],
                !formErrors.code && styles['smsModalErrorHidden'],
              )}
              role={formErrors.code ? 'alert' : undefined}
            >
              {formErrors.code ?? '인증번호를 확인해주세요.'}
            </p>
            <Button
              className={styles['smsModalSubmitButton']}
              disabled={
                verifyMutation.isPending ||
                verificationCode.length !== SMS_CODE_LENGTH ||
                challengeCountdownSeconds === 0
              }
              type='submit'
            >
              {verifyMutation.isPending ? '확인 중...' : '문자 인증 확인'}
            </Button>
            <Button
              className={styles['smsModalResetButton']}
              onClick={resetLoginChallenge}
              type='button'
              variant='secondary'
            >
              다시 입력
            </Button>
            {secondaryAction ? (
              <div className={styles['smsModalSecondaryAction']}>{secondaryAction}</div>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </form>
  );
};

export default StudentLoginForm;
