import type { ChangeEvent, CSSProperties, FormEvent, ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { loginStudent, verifyStudentLoginSms } from '@/api/auth';
import eyeOffIconSrc from '@/assets/icons/lucide_eye-off.svg';
import eyeIconSrc from '@/assets/icons/lucide_eye.svg';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { myCartQueryKey } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { StudentLoginChallenge } from '@/types/auth';
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
const MOCK_SMS_CODE = '123456';
const LOGIN_AUTH_ERROR_MESSAGE = '아이디 및 비밀번호를 확인해주세요.';

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
  const [rememberLoginId, setRememberLoginId] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const isPageVariant = variant === 'page';

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
      if (isPageVariant) {
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
        setLoginChallenge(session);
        setVerificationCode(MOCK_SMS_CODE);
        showToast({
          message: `${session.maskedPhoneNumber} 번호로 인증번호를 보냈습니다.`,
          variant: 'success',
        });
        window.setTimeout(() => {
          codeInputRef.current?.focus();
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
      setLoginChallenge(null);
      setVerificationCode('');
      await finalizeAuthenticatedLogin(session);
    },
  });

  const handleFieldChange =
    (fieldName: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

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
          code: '인증번호를 입력해 주세요.',
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
      nextErrors.loginId = '아이디를 입력해 주세요.';
    }

    if (!formValues.password.trim()) {
      nextErrors.password = '비밀번호를 입력해 주세요.';
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

  const handleCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(event.target.value);
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
  };

  const resetLoginChallenge = () => {
    setLoginChallenge(null);
    setVerificationCode('');
    setFormErrors((current) => ({
      ...current,
      code: '',
    }));
  };

  return (
    <form
      className={classNames(styles['form'], isPageVariant && styles['formPage'], className)}
      noValidate
      onSubmit={handleSubmit}
    >
      {supportText ? <p className={styles['supportText']}>{supportText}</p> : null}

      <div className={styles['fieldGroup']}>
        {loginChallenge ? (
          <>
            <p className={styles['challengeSummary']}>
              새 환경 로그인으로 확인되어 {loginChallenge.maskedPhoneNumber} 번호로 문자 인증이
              필요합니다.
            </p>
            <p className={styles['challengeHint']}>
              개발환경에서는 인증번호가 `123456`으로 고정됩니다.
            </p>
            <TextField
              autoComplete='one-time-code'
              errorMessage={formErrors.code}
              label='인증번호'
              name='verificationCode'
              onChange={handleCodeChange}
              placeholder='123456'
              ref={codeInputRef}
              value={verificationCode}
            />
          </>
        ) : (
          <>
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
                        '--login-eye-icon': `url("${
                          isPasswordVisible ? eyeIconSrc : eyeOffIconSrc
                        }")`,
                      } as LoginEyeIconStyle
                    }
                  />
                </button>
              ) : null}
            </div>
          </>
        )}
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
          {loginChallenge
            ? verifyMutation.isPending
              ? '인증 확인 중...'
              : '문자 인증 확인'
            : loginMutation.isPending
              ? '로그인 중...'
              : submitLabel}
        </Button>
        {loginChallenge ? (
          <Button onClick={resetLoginChallenge} type='button' variant='secondary'>
            다시 입력
          </Button>
        ) : null}
        {!isPageVariant ? secondaryAction : null}
      </div>
    </form>
  );
};

export default StudentLoginForm;
