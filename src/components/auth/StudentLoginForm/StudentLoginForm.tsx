import type { ChangeEvent, FormEvent, ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { loginStudent, verifyStudentLoginSms } from '@/api/auth';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { StudentLoginChallenge } from '@/types/auth';

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

interface StudentLoginFormProps {
  secondaryAction?: ReactNode;
  submitLabel?: string;
  supportText?: string;
  onSuccess?: () => void;
  loginIdInputRef?: RefObject<HTMLInputElement | null>;
  initialValues?: Partial<LoginFormValues> | undefined;
}

const INITIAL_FORM_VALUES: LoginFormValues = {
  loginId: '',
  password: '',
};
const MOCK_SMS_CODE = '123456';

const StudentLoginForm = ({
  secondaryAction,
  submitLabel = '로그인',
  supportText,
  onSuccess,
  loginIdInputRef,
  initialValues,
}: StudentLoginFormProps) => {
  const internalLoginIdInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useToastStore((state) => state.showToast);

  const [formValues, setFormValues] = useState<LoginFormValues>(() => ({
    ...INITIAL_FORM_VALUES,
    ...initialValues,
  }));
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [loginChallenge, setLoginChallenge] = useState<StudentLoginChallenge | null>(null);

  const loginMutation = useMutation({
    mutationFn: loginStudent,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: (session) => {
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

      setSession(session);
      showToast({
        message: `${session.displayName}님으로 로그인했습니다.`,
        variant: 'success',
      });

      if (onSuccess) {
        onSuccess();
        return;
      }

      void navigate(routePaths.mypage);
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
    onSuccess: (session) => {
      setSession(session);
      setLoginChallenge(null);
      setVerificationCode('');
      showToast({
        message: `${session.displayName}님으로 로그인했습니다.`,
        variant: 'success',
      });

      if (onSuccess) {
        onSuccess();
        return;
      }

      void navigate(routePaths.mypage);
    },
  });

  const handleFieldChange =
    (fieldName: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

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
    <form className={styles['form']} noValidate onSubmit={handleSubmit}>
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
              errorMessage={formErrors.loginId}
              label='아이디'
              name='loginId'
              onChange={handleFieldChange('loginId')}
              placeholder='student01'
              ref={resolvedLoginIdInputRef}
              value={formValues.loginId}
            />

            <TextField
              autoComplete='current-password'
              errorMessage={formErrors.password}
              label='비밀번호'
              name='password'
              onChange={handleFieldChange('password')}
              placeholder='비밀번호를 입력해 주세요'
              ref={passwordInputRef}
              type='password'
              value={formValues.password}
            />
          </>
        )}
      </div>

      <div className={styles['actionGroup']}>
        <Button
          className={styles['submitButton']}
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
        {secondaryAction}
      </div>
    </form>
  );
};

export default StudentLoginForm;
