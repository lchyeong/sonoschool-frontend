import type { ChangeEvent, FormEvent } from 'react';
import { useRef, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import {
  fetchRegistrationTerms,
  registerStudent,
  sendSmsVerification,
  verifySmsCode,
} from '@/api/auth';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import type { RegistrationTerm } from '@/types/auth';
import { classNames } from '@/utils/classNames';

import styles from './SignupPage.module.scss';

interface SignupFormValues {
  loginId: string;
  email: string;
  name: string;
  nickname: string;
  password: string;
  passwordConfirm: string;
  phoneNumber: string;
  smsCode: string;
}

interface SignupFormErrors {
  loginId?: string;
  email?: string;
  name?: string;
  nickname?: string;
  password?: string;
  passwordConfirm?: string;
  phoneNumber?: string;
  smsCode?: string;
  acceptedTermCodes?: string;
}

interface SmsVerificationState {
  sentPhoneNumber: string | null;
  expiresAt: string | null;
  verifiedPhoneNumber: string | null;
  verifiedAt: string | null;
}

const INITIAL_FORM_VALUES: SignupFormValues = {
  loginId: '',
  email: '',
  name: '',
  nickname: '',
  password: '',
  passwordConfirm: '',
  phoneNumber: '',
  smsCode: '',
};

const INITIAL_SMS_STATE: SmsVerificationState = {
  sentPhoneNumber: null,
  expiresAt: null,
  verifiedPhoneNumber: null,
  verifiedAt: null,
};

const normalizePhoneNumber = (value: string): string => {
  let digits = value.replaceAll(/\D/g, '');
  if (digits.startsWith('82')) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
};

const isValidPhoneNumber = (value: string): boolean => {
  return /^01\d{8,9}$/.test(normalizePhoneNumber(value));
};

const formatPhoneNumberLabel = (value: string): string => {
  const digits = normalizePhoneNumber(value);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
};

const formatDateTimeLabel = (value: string | null): string | null => {
  if (!value) return null;

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const omitSignupFormError = (
  errors: SignupFormErrors,
  fieldName: keyof SignupFormErrors,
): SignupFormErrors => {
  const { [fieldName]: omittedField, ...nextErrors } = errors;
  void omittedField;
  return nextErrors;
};

const SignupPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useToastStore((state) => state.showToast);
  const firstInvalidInputRef = useRef<HTMLInputElement | null>(null);

  const [formValues, setFormValues] = useState<SignupFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<SignupFormErrors>({});
  const [smsState, setSmsState] = useState<SmsVerificationState>(INITIAL_SMS_STATE);
  const [acceptedTermCodes, setAcceptedTermCodes] = useState<string[]>([]);

  const registrationTermsQuery = useQuery({
    queryKey: ['registrationTerms'],
    queryFn: fetchRegistrationTerms,
  });

  const sendSmsMutation = useMutation({
    mutationFn: sendSmsVerification,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '인증번호 발송에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      setSmsState({
        sentPhoneNumber: response.phoneNumber,
        expiresAt: response.expiresAt,
        verifiedPhoneNumber: null,
        verifiedAt: null,
      });
      showToast({
        message: `${formatPhoneNumberLabel(response.phoneNumber)} 번호로 인증번호를 보냈습니다.`,
        variant: 'success',
      });
    },
  });

  const verifySmsMutation = useMutation({
    mutationFn: verifySmsCode,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '인증번호 확인에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      setSmsState((current) => ({
        ...current,
        verifiedPhoneNumber: response.phoneNumber,
        verifiedAt: response.verifiedAt,
      }));
      showToast({
        message: '휴대폰 인증이 완료되었습니다.',
        variant: 'success',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerStudent,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '회원가입에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: (session) => {
      setSession(session);
      showToast({
        message: `${session.displayName}님, 회원가입이 완료되었습니다.`,
        variant: 'success',
      });
      void navigate(routePaths.mypage);
    },
  });

  const handleFieldChange =
    (fieldName: keyof SignupFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;

      setFormValues((current) => {
        const nextFormValues = {
          ...current,
          [fieldName]: nextValue,
        } as SignupFormValues;

        if (
          fieldName === 'phoneNumber' &&
          normalizePhoneNumber(current.phoneNumber) !== normalizePhoneNumber(nextValue)
        ) {
          setSmsState(INITIAL_SMS_STATE);
        }

        return nextFormValues;
      });

      setFormErrors((current) => omitSignupFormError(current, fieldName));
    };

  const handleSendSms = () => {
    if (!isValidPhoneNumber(formValues.phoneNumber)) {
      setFormErrors((current) => ({
        ...current,
        phoneNumber: '휴대폰 번호를 정확히 입력해 주세요.',
      }));
      firstInvalidInputRef.current?.focus();
      return;
    }

    sendSmsMutation.mutate({
      phoneNumber: formValues.phoneNumber,
    });
  };

  const handleVerifySms = () => {
    const nextErrors: SignupFormErrors = {};

    if (!isValidPhoneNumber(formValues.phoneNumber)) {
      nextErrors.phoneNumber = '휴대폰 번호를 정확히 입력해 주세요.';
    }

    if (!formValues.smsCode.trim()) {
      nextErrors.smsCode = '인증번호를 입력해 주세요.';
    }

    setFormErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    verifySmsMutation.mutate({
      phoneNumber: formValues.phoneNumber,
      code: formValues.smsCode.trim(),
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhoneNumber = normalizePhoneNumber(formValues.phoneNumber);
    const nextErrors: SignupFormErrors = {};
    const requiredTerms = (registrationTermsQuery.data ?? []).filter((term) => term.required);

    if (!/^[a-zA-Z0-9._-]{4,30}$/.test(formValues.loginId.trim())) {
      nextErrors.loginId = '아이디는 4~30자의 영문, 숫자, ._- 만 사용할 수 있습니다.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
      nextErrors.email = '이메일 형식을 확인해 주세요.';
    }

    if (!formValues.name.trim()) {
      nextErrors.name = '이름을 입력해 주세요.';
    }

    if (formValues.password.length < 8 || formValues.password.length > 100) {
      nextErrors.password = '비밀번호는 8자 이상 100자 이하로 입력해 주세요.';
    }

    if (formValues.passwordConfirm !== formValues.password) {
      nextErrors.passwordConfirm = '비밀번호 확인이 일치하지 않습니다.';
    }

    if (!isValidPhoneNumber(formValues.phoneNumber)) {
      nextErrors.phoneNumber = '휴대폰 번호를 정확히 입력해 주세요.';
    }

    if (smsState.verifiedPhoneNumber !== normalizedPhoneNumber) {
      nextErrors.smsCode = '휴대폰 인증을 먼저 완료해 주세요.';
    }

    if (requiredTerms.some((term) => !acceptedTermCodes.includes(term.code))) {
      nextErrors.acceptedTermCodes = '필수 약관 동의가 필요합니다.';
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      firstInvalidInputRef.current?.focus();
      return;
    }

    registerMutation.mutate({
      loginId: formValues.loginId.trim(),
      email: formValues.email.trim(),
      name: formValues.name.trim(),
      nickname: formValues.nickname.trim(),
      password: formValues.password,
      phoneNumber: normalizedPhoneNumber,
      acceptedTermCodes,
    });
  };

  const handleToggleTerm = (termCode: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setAcceptedTermCodes((current) => {
      if (isChecked) {
        return current.includes(termCode) ? current : [...current, termCode];
      }
      return current.filter((code) => code !== termCode);
    });
    setFormErrors((current) => omitSignupFormError(current, 'acceptedTermCodes'));
  };

  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>회원가입</h1>
          </header>

          <form className={styles['form']} noValidate onSubmit={handleSubmit}>
            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>기본 정보</h2>
              </div>

              <div className={styles['fieldGrid']}>
                <TextField
                  errorMessage={formErrors.loginId}
                  label='아이디'
                  name='loginId'
                  onChange={handleFieldChange('loginId')}
                  placeholder='student01'
                  ref={firstInvalidInputRef}
                  value={formValues.loginId}
                />

                <TextField
                  autoComplete='email'
                  errorMessage={formErrors.email}
                  label='이메일'
                  name='email'
                  onChange={handleFieldChange('email')}
                  placeholder='student@sono.test'
                  type='email'
                  value={formValues.email}
                />

                <TextField
                  errorMessage={formErrors.name}
                  label='이름'
                  name='name'
                  onChange={handleFieldChange('name')}
                  placeholder='홍길동'
                  value={formValues.name}
                />

                <TextField
                  label='닉네임'
                  name='nickname'
                  onChange={handleFieldChange('nickname')}
                  placeholder='길동'
                  value={formValues.nickname}
                />

                <TextField
                  autoComplete='new-password'
                  errorMessage={formErrors.password}
                  label='비밀번호'
                  name='password'
                  onChange={handleFieldChange('password')}
                  placeholder='8자 이상 입력해 주세요'
                  type='password'
                  value={formValues.password}
                />

                <TextField
                  autoComplete='new-password'
                  errorMessage={formErrors.passwordConfirm}
                  label='비밀번호 확인'
                  name='passwordConfirm'
                  onChange={handleFieldChange('passwordConfirm')}
                  placeholder='비밀번호를 다시 입력해 주세요'
                  type='password'
                  value={formValues.passwordConfirm}
                />
              </div>
            </section>

            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>휴대폰 인증</h2>
                <p className={sharedStyles['sectionDescription']}>
                  인증번호를 받은 뒤 확인을 완료해 주세요.
                </p>
              </div>

              <div className={styles['smsFieldRow']}>
                <TextField
                  errorMessage={formErrors.phoneNumber}
                  label='휴대폰 번호'
                  name='phoneNumber'
                  onChange={handleFieldChange('phoneNumber')}
                  placeholder='010-1234-5678'
                  value={formValues.phoneNumber}
                />

                <Button
                  className={styles['smsButton']}
                  disabled={sendSmsMutation.isPending}
                  onClick={handleSendSms}
                  type='button'
                  variant='secondary'
                >
                  {sendSmsMutation.isPending ? '발송 중...' : '인증번호 발송'}
                </Button>
              </div>

              <div className={styles['smsFieldRow']}>
                <TextField
                  errorMessage={formErrors.smsCode}
                  label='인증번호'
                  name='smsCode'
                  onChange={handleFieldChange('smsCode')}
                  placeholder='6자리 숫자'
                  value={formValues.smsCode}
                />

                <Button
                  className={styles['smsButton']}
                  disabled={verifySmsMutation.isPending || smsState.sentPhoneNumber === null}
                  onClick={handleVerifySms}
                  type='button'
                >
                  {verifySmsMutation.isPending ? '확인 중...' : '인증번호 확인'}
                </Button>
              </div>

              <div className={styles['statusInline']}>
                {smsState.expiresAt ? (
                  <p className={sharedStyles['mutedText']}>
                    인증 만료: {formatDateTimeLabel(smsState.expiresAt)}
                  </p>
                ) : null}
                {smsState.verifiedAt ? (
                  <p className={sharedStyles['mutedText']}>
                    인증 완료: {formatDateTimeLabel(smsState.verifiedAt)}
                  </p>
                ) : null}
              </div>
            </section>

            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>약관 동의</h2>
              </div>

              <div className={styles['consentGroup']}>
                {registrationTermsQuery.isLoading ? (
                  <p className={sharedStyles['mutedText']}>약관 정보를 불러오는 중입니다.</p>
                ) : null}
                {registrationTermsQuery.isError ? (
                  <p className={styles['errorText']}>회원가입 약관을 불러오지 못했습니다.</p>
                ) : null}
                {(registrationTermsQuery.data ?? []).map((term: RegistrationTerm) => (
                  <label className={styles['checkboxRow']} key={term.code}>
                    <input
                      checked={acceptedTermCodes.includes(term.code)}
                      name={term.code}
                      onChange={handleToggleTerm(term.code)}
                      type='checkbox'
                    />
                    <span>
                      [{term.required ? '필수' : '선택'}] {term.title}
                      <span className={styles['termMeta']}> v{term.version}</span>
                    </span>
                  </label>
                ))}
                {formErrors.acceptedTermCodes ? (
                  <p className={styles['errorText']}>{formErrors.acceptedTermCodes}</p>
                ) : null}
              </div>
            </section>

            <div className={styles['actionGroup']}>
              <Button
                className={styles['submitButton']}
                disabled={
                  registerMutation.isPending ||
                  registrationTermsQuery.isLoading ||
                  registrationTermsQuery.isError
                }
                type='submit'
              >
                {registerMutation.isPending ? '가입 처리 중...' : '회원가입'}
              </Button>

              <Link className={sharedStyles['textLink']} to={routePaths.login}>
                이미 계정이 있다면 로그인
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignupPage;
