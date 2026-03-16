import type { ChangeEvent, FormEvent, RefObject } from 'react';
import { useRef, useState } from 'react';

import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { useAuthStore } from '@/stores/useAuthStore';
import { useModalStore } from '@/stores/useModalStore';

import styles from './LoginModalContent.module.scss';

interface LoginFormValues {
  identifier: string;
  password: string;
}

interface LoginFormErrors {
  identifier?: string;
  password?: string;
}

interface LoginModalContentProps {
  identifierInputRef: RefObject<HTMLInputElement | null>;
}

const INITIAL_FORM_VALUES: LoginFormValues = {
  identifier: '',
  password: '',
};

const LoginModalContent = ({ identifierInputRef }: LoginModalContentProps) => {
  const login = useAuthStore((state) => state.login);
  const closeModal = useModalStore((state) => state.closeModal);

  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [formValues, setFormValues] = useState<LoginFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<LoginFormErrors>({});

  const handleFieldChange =
    (fieldName: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setFormValues((current) => ({
        ...current,
        [fieldName]: nextValue,
      }));

      setFormErrors((current) => {
        if (fieldName === 'identifier') {
          return current.password ? { password: current.password } : {};
        }

        return current.identifier ? { identifier: current.identifier } : {};
      });
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: LoginFormErrors = {};

    if (!formValues.identifier.trim()) {
      nextErrors.identifier = '이메일 또는 아이디를 입력해 주세요.';
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

    login();
    closeModal();
  };

  return (
    <form className={styles['form']} noValidate onSubmit={handleSubmit}>
      <p className={styles['supportText']}>
        실제 인증 API 연동 전까지는 입력값 유효성만 확인한 뒤 로그인 상태로 전환합니다.
      </p>

      <div className={styles['fieldGroup']}>
        <TextField
          autoComplete='username'
          errorMessage={formErrors.identifier}
          label='이메일 또는 아이디'
          name='identifier'
          onChange={handleFieldChange('identifier')}
          ref={identifierInputRef}
          value={formValues.identifier}
        />

        <TextField
          autoComplete='current-password'
          errorMessage={formErrors.password}
          label='비밀번호'
          name='password'
          onChange={handleFieldChange('password')}
          ref={passwordInputRef}
          type='password'
          value={formValues.password}
        />
      </div>

      <div className={styles['actionGroup']}>
        <Button className={styles['actionButton']} type='submit'>
          로그인
        </Button>
        <Button className={styles['actionButton']} onClick={closeModal} variant='secondary'>
          닫기
        </Button>
      </div>
    </form>
  );
};

export default LoginModalContent;
