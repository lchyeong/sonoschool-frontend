import type { ChangeEvent, FormEvent } from 'react';
import { useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { loginAdmin } from '@/api/adminConsole';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { env } from '@/config/env';
import { routePaths } from '@/routes/routeRegistry';
import { useAdminAuthStore } from '@/stores/useAdminAuthStore';
import { useToastStore } from '@/stores/useToastStore';

import styles from './AdminLoginPage.module.scss';

interface AdminLoginFormValues {
  identifier: string;
  password: string;
}

interface AdminLoginFormErrors {
  identifier?: string;
  password?: string;
}

const INITIAL_FORM_VALUES: AdminLoginFormValues = {
  identifier: '',
  password: '',
};

const AdminLoginPage = () => {
  const identifierInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const login = useAdminAuthStore((state) => state.login);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const showToast = useToastStore((state) => state.showToast);

  const [formValues, setFormValues] = useState<AdminLoginFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<AdminLoginFormErrors>({});

  const loginMutation = useMutation({
    mutationFn: (values: AdminLoginFormValues) => {
      return loginAdmin(env.siteKey, values);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : '관리자 로그인에 실패했습니다. 다시 시도해 주세요.';

      showToast({
        message,
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      login(response.adminDisplayName);
      showToast({
        message: `${response.adminDisplayName} 계정으로 로그인했습니다.`,
        variant: 'success',
      });
      void navigate(routePaths.admin);
    },
  });

  const handleFieldChange =
    (fieldName: keyof AdminLoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: AdminLoginFormErrors = {};

    if (!formValues.identifier.trim()) {
      nextErrors.identifier = '관리자 아이디를 입력해 주세요.';
    }

    if (!formValues.password.trim()) {
      nextErrors.password = '비밀번호를 입력해 주세요.';
    }

    setFormErrors(nextErrors);

    if (nextErrors.identifier) {
      identifierInputRef.current?.focus();
      return;
    }

    if (nextErrors.password) {
      passwordInputRef.current?.focus();
      return;
    }

    loginMutation.mutate(formValues);
  };

  if (isAuthenticated) {
    return <Navigate replace to={routePaths.admin} />;
  }

  return (
    <section className={styles['page']}>
      <div className={styles['shell']}>
        <div className={styles['introBlock']}>
          <p className={styles['eyebrow']}>Admin Access</p>
          <h1 className={styles['title']}>관리자 로그인</h1>
        </div>

        <div className={styles['card']}>
          <form className={styles['form']} noValidate onSubmit={handleSubmit}>
            <div className={styles['cardHeader']}>
              <p className={styles['cardEyebrow']}>Hidden Admin Route</p>
              <h2 className={styles['cardTitle']}>관리자 인증</h2>
            </div>

            <div className={styles['fieldGroup']}>
              <TextField
                autoComplete='username'
                errorMessage={formErrors.identifier}
                label='관리자 아이디'
                name='identifier'
                onChange={handleFieldChange('identifier')}
                placeholder='admin_id'
                ref={identifierInputRef}
                value={formValues.identifier}
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

            <div className={styles['actionRow']}>
              <Button
                className={styles['submitButton']}
                disabled={loginMutation.isPending}
                type='submit'
              >
                {loginMutation.isPending ? '로그인 중...' : '관리자 로그인'}
              </Button>

              <Link className={styles['secondaryLink']} to={routePaths.home}>
                메인 페이지로 돌아가기
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AdminLoginPage;
