import type { ChangeEvent, FormEvent, ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { loginStudent } from '@/api/auth';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

import styles from './StudentLoginForm.module.scss';

interface LoginFormValues {
  loginId: string;
  password: string;
}

interface LoginFormErrors {
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
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useToastStore((state) => state.showToast);

  const [formValues, setFormValues] = useState<LoginFormValues>(() => ({
    ...INITIAL_FORM_VALUES,
    ...initialValues,
  }));
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});

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

  return (
    <form className={styles['form']} noValidate onSubmit={handleSubmit}>
      {supportText ? <p className={styles['supportText']}>{supportText}</p> : null}

      <div className={styles['fieldGroup']}>
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
      </div>

      <div className={styles['actionGroup']}>
        <Button className={styles['submitButton']} disabled={loginMutation.isPending} type='submit'>
          {loginMutation.isPending ? '로그인 중...' : submitLabel}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
};

export default StudentLoginForm;
