import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import {
  checkEmailAvailability,
  checkLoginIdAvailability,
  fetchRegistrationTerms,
  registerStudent,
  sendSmsVerification,
  verifySmsCode,
} from '@/api/auth';
import { ApiError } from '@/api/errors';
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

interface AvailabilityCheckState {
  checkedValue: string | null;
  isAvailable: boolean | null;
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

const INITIAL_AVAILABILITY_STATE: AvailabilityCheckState = {
  checkedValue: null,
  isAvailable: null,
};

const PHONE_ALREADY_EXISTS_ERROR_MESSAGE = '이미 등록된 휴대폰 번호입니다.';

const normalizePhoneNumber = (value: string): string => {
  let digits = value.replaceAll(/\D/g, '');
  if (digits.startsWith('82')) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
};

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9]{4,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_ALLOWED_CHARACTER_PATTERN = /^[A-Za-z\d!@#$%&*?]*$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%&*?])[A-Za-z\d!@#$%&*?]{8,32}$/;

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
  const [loginIdAvailability, setLoginIdAvailability] = useState<AvailabilityCheckState>(
    INITIAL_AVAILABILITY_STATE,
  );
  const [emailAvailability, setEmailAvailability] = useState<AvailabilityCheckState>(
    INITIAL_AVAILABILITY_STATE,
  );
  const [smsCountdownSeconds, setSmsCountdownSeconds] = useState(0);

  const registrationTermsQuery = useQuery({
    queryKey: ['registrationTerms'],
    queryFn: fetchRegistrationTerms,
  });
  const registrationTerms = registrationTermsQuery.data ?? [];
  const areAllTermsAccepted =
    registrationTerms.length > 0 &&
    registrationTerms.every((term) => acceptedTermCodes.includes(term.code));
  const isSmsCodeVisible = smsState.sentPhoneNumber !== null;
  const isSmsExpired =
    isSmsCodeVisible &&
    smsState.verifiedAt === null &&
    smsState.expiresAt !== null &&
    smsCountdownSeconds === 0;

  useEffect(() => {
    const nextRemainingSeconds = getRemainingSeconds(smsState.expiresAt);
    setSmsCountdownSeconds(nextRemainingSeconds);

    if (nextRemainingSeconds === 0 || smsState.verifiedAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSmsCountdownSeconds((current) => {
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
  }, [smsState.expiresAt, smsState.verifiedAt]);

  const sendSmsMutation = useMutation({
    mutationFn: sendSmsVerification,
    onError: (error: unknown) => {
      const phoneNumberErrorMessage =
        error instanceof ApiError && error.code === 'USER_400_PHONE'
          ? PHONE_ALREADY_EXISTS_ERROR_MESSAGE
          : null;

      if (phoneNumberErrorMessage) {
        setFormErrors((current) => ({
          ...current,
          phoneNumber: phoneNumberErrorMessage,
        }));
      }

      showToast({
        message:
          phoneNumberErrorMessage ??
          (error instanceof Error ? error.message : '인증번호 발송에 실패했습니다. 다시 시도해 주세요.'),
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      setFormValues((current) => ({
        ...current,
        smsCode: '',
      }));
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
      const phoneNumberErrorMessage =
        error instanceof ApiError && error.code === 'USER_400_PHONE'
          ? PHONE_ALREADY_EXISTS_ERROR_MESSAGE
          : null;

      if (phoneNumberErrorMessage) {
        setFormErrors((current) => ({
          ...current,
          phoneNumber: phoneNumberErrorMessage,
        }));
      }

      showToast({
        message:
          phoneNumberErrorMessage ??
          (error instanceof Error ? error.message : '인증번호 확인에 실패했습니다. 다시 시도해 주세요.'),
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

  const checkLoginIdMutation = useMutation({
    mutationFn: checkLoginIdAvailability,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '아이디 중복 확인에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (response, submittedLoginId) => {
      const trimmedLoginId = submittedLoginId.trim();
      setLoginIdAvailability({
        checkedValue: trimmedLoginId,
        isAvailable: response.available,
      });
      setFormErrors((current) => omitSignupFormError(current, 'loginId'));
      showToast({
        message: response.available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.',
        variant: response.available ? 'success' : 'error',
      });
    },
  });

  const checkEmailMutation = useMutation({
    mutationFn: checkEmailAvailability,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '이메일 중복 확인에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: (response, submittedEmail) => {
      const trimmedEmail = submittedEmail.trim();
      setEmailAvailability({
        checkedValue: trimmedEmail,
        isAvailable: response.available,
      });
      setFormErrors((current) => omitSignupFormError(current, 'email'));
      showToast({
        message: response.available ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.',
        variant: response.available ? 'success' : 'error',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerStudent,
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.code === 'USER_400_LOGIN_ID') {
          setFormErrors((current) => ({
            ...current,
            loginId: '이미 사용 중인 아이디입니다.',
          }));
        }

        if (error.code === 'USER_400_EMAIL') {
          setFormErrors((current) => ({
            ...current,
            email: '이미 사용 중인 이메일입니다.',
          }));
        }

        if (error.code === 'USER_400_PHONE') {
          setFormErrors((current) => ({
            ...current,
            phoneNumber: PHONE_ALREADY_EXISTS_ERROR_MESSAGE,
          }));
        }
      }

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
      const nextFormValues = {
        ...formValues,
        [fieldName]: nextValue,
      } as SignupFormValues;

      if (
        fieldName === 'phoneNumber' &&
        normalizePhoneNumber(formValues.phoneNumber) !== normalizePhoneNumber(nextValue)
      ) {
        setSmsState(INITIAL_SMS_STATE);
      }

      if (fieldName === 'loginId' && formValues.loginId !== nextValue) {
        setLoginIdAvailability(INITIAL_AVAILABILITY_STATE);
      }

      if (fieldName === 'email' && formValues.email !== nextValue) {
        setEmailAvailability(INITIAL_AVAILABILITY_STATE);
      }

      setFormValues(nextFormValues);

      setFormErrors((current) => {
        const nextErrors = omitSignupFormError(current, fieldName);
        const shouldShowPasswordConfirmError =
          nextFormValues.passwordConfirm.trim().length > 0 &&
          nextFormValues.passwordConfirm !== nextFormValues.password;

        if (fieldName === 'password' && !PASSWORD_ALLOWED_CHARACTER_PATTERN.test(nextValue)) {
          return {
            ...nextErrors,
            password: '허용되지 않는 문자가 포함되어 있습니다.',
            ...(shouldShowPasswordConfirmError
              ? {
                  passwordConfirm: '비밀번호 확인이 일치하지 않습니다.',
                }
              : {}),
          };
        }

        if (fieldName === 'password' || fieldName === 'passwordConfirm') {
          if (shouldShowPasswordConfirmError) {
            return {
              ...nextErrors,
              passwordConfirm: '비밀번호 확인이 일치하지 않습니다.',
            };
          }

          return omitSignupFormError(nextErrors, 'passwordConfirm');
        }

        return nextErrors;
      });
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
    } else if (isSmsExpired) {
      nextErrors.smsCode = '인증 시간이 만료되었습니다. 다시 발송해 주세요.';
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

    const trimmedLoginId = formValues.loginId.trim();
    const trimmedEmail = formValues.email.trim();
    const normalizedPhoneNumber = normalizePhoneNumber(formValues.phoneNumber);
    const nextErrors: SignupFormErrors = {};
    const requiredTerms = (registrationTermsQuery.data ?? []).filter((term) => term.required);

    if (!LOGIN_ID_PATTERN.test(trimmedLoginId)) {
      nextErrors.loginId = '아이디는 4~20자의 영문, 숫자만 사용할 수 있습니다.';
    } else if (loginIdAvailability.checkedValue !== trimmedLoginId) {
      nextErrors.loginId = '아이디 중복 확인을 진행해 주세요.';
    } else if (loginIdAvailability.isAvailable === false) {
      nextErrors.loginId = '이미 사용 중인 아이디입니다.';
    }

    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = '이메일 형식을 확인해 주세요.';
    } else if (trimmedEmail && emailAvailability.checkedValue !== trimmedEmail) {
      nextErrors.email = '이메일 중복 확인을 진행해 주세요.';
    } else if (trimmedEmail && emailAvailability.isAvailable === false) {
      nextErrors.email = '이미 사용 중인 이메일입니다.';
    }

    if (!formValues.name.trim()) {
      nextErrors.name = '이름을 입력해 주세요.';
    }

    if (!PASSWORD_ALLOWED_CHARACTER_PATTERN.test(formValues.password)) {
      nextErrors.password = '허용되지 않는 문자가 포함되어 있습니다.';
    } else if (formValues.password.length > 32) {
      nextErrors.password = '비밀번호가 너무 깁니다.';
    } else if (formValues.password && !PASSWORD_PATTERN.test(formValues.password)) {
      nextErrors.password = '특수문자, 영문, 숫자를 포함해 8자 이상 입력해 주세요.';
    }

    if (formValues.passwordConfirm !== formValues.password) {
      nextErrors.passwordConfirm = '비밀번호 확인이 일치하지 않습니다.';
    }

    if (!isValidPhoneNumber(formValues.phoneNumber)) {
      nextErrors.phoneNumber = '휴대폰 번호를 정확히 입력해 주세요.';
    }

    if (smsState.verifiedPhoneNumber !== normalizedPhoneNumber) {
      if (isSmsCodeVisible) {
        nextErrors.smsCode = '휴대폰 인증을 먼저 완료해 주세요.';
      } else {
        nextErrors.phoneNumber = '휴대폰 인증을 먼저 완료해 주세요.';
      }
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
      loginId: trimmedLoginId,
      email: trimmedEmail || null,
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

  const handleToggleAllTerms = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;

    setAcceptedTermCodes(isChecked ? registrationTerms.map((term) => term.code) : []);
    setFormErrors((current) => omitSignupFormError(current, 'acceptedTermCodes'));
  };

  const handleCheckLoginId = () => {
    const trimmedLoginId = formValues.loginId.trim();

    if (!LOGIN_ID_PATTERN.test(trimmedLoginId)) {
      setFormErrors((current) => ({
        ...current,
        loginId: '아이디는 4~20자의 영문, 숫자만 사용할 수 있습니다.',
      }));
      return;
    }

    checkLoginIdMutation.mutate(trimmedLoginId);
  };

  const handleCheckEmail = () => {
    const trimmedEmail = formValues.email.trim();

    if (!trimmedEmail) {
      setFormErrors((current) => ({
        ...current,
        email: '이메일을 입력한 경우에만 중복 확인이 가능합니다.',
      }));
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFormErrors((current) => ({
        ...current,
        email: '이메일 형식을 확인해 주세요.',
      }));
      return;
    }

    checkEmailMutation.mutate(trimmedEmail);
  };

  return (
    <section className={sharedStyles['page']}>
      <div className={classNames(sharedStyles['shell'], sharedStyles['shellNarrow'])}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>회원가입</h1>
          </header>

          <form className={styles['form']} noValidate onSubmit={handleSubmit}>
            <section className={sharedStyles['section']}>
              <div className={styles['fieldGrid']}>
                <div className={styles['checkFieldGroup']}>
                  <div className={styles['checkFieldRow']}>
                    <TextField
                      errorMessage={formErrors.loginId}
                      label='아이디 *'
                      name='loginId'
                      onChange={handleFieldChange('loginId')}
                      ref={firstInvalidInputRef}
                      value={formValues.loginId}
                    />
                    <div className={styles['fieldAction']}>
                      <Button
                        className={styles['checkButton']}
                        disabled={checkLoginIdMutation.isPending}
                        onClick={handleCheckLoginId}
                        type='button'
                      >
                        {checkLoginIdMutation.isPending ? '확인 중...' : '중복확인'}
                      </Button>
                    </div>
                  </div>
                  {loginIdAvailability.checkedValue === formValues.loginId.trim() &&
                  loginIdAvailability.isAvailable !== null ? (
                    <p
                      className={classNames(
                        styles['availabilityText'],
                        loginIdAvailability.isAvailable
                          ? styles['availabilityTextSuccess']
                          : styles['availabilityTextError'],
                      )}
                    >
                      {loginIdAvailability.isAvailable
                        ? '사용 가능한 아이디입니다.'
                        : '이미 사용 중인 아이디입니다.'}
                    </p>
                  ) : null}
                </div>

                <div className={styles['checkFieldGroup']}>
                  <div className={styles['checkFieldRow']}>
                    <TextField
                      autoComplete='email'
                      errorMessage={formErrors.email}
                      label='이메일'
                      name='email'
                      onChange={handleFieldChange('email')}
                      type='email'
                      value={formValues.email}
                    />
                    <div className={styles['fieldAction']}>
                      <Button
                        className={styles['checkButton']}
                        disabled={checkEmailMutation.isPending || !formValues.email.trim()}
                        onClick={handleCheckEmail}
                        type='button'
                      >
                        {checkEmailMutation.isPending ? '확인 중...' : '중복확인'}
                      </Button>
                    </div>
                  </div>
                  {emailAvailability.checkedValue === formValues.email.trim() &&
                  emailAvailability.isAvailable !== null ? (
                    <p
                      className={classNames(
                        styles['availabilityText'],
                        emailAvailability.isAvailable
                          ? styles['availabilityTextSuccess']
                          : styles['availabilityTextError'],
                      )}
                    >
                      {emailAvailability.isAvailable
                        ? '사용 가능한 이메일입니다.'
                        : '이미 사용 중인 이메일입니다.'}
                    </p>
                  ) : null}
                </div>

                <div className={styles['pairFieldRow']}>
                  <TextField
                    errorMessage={formErrors.name}
                    label='이름 *'
                    name='name'
                    onChange={handleFieldChange('name')}
                    value={formValues.name}
                  />

                  <TextField
                    label='닉네임'
                    name='nickname'
                    onChange={handleFieldChange('nickname')}
                    value={formValues.nickname}
                  />
                </div>

                <div className={styles['pairFieldRow']}>
                  <TextField
                    autoComplete='new-password'
                    errorMessage={formErrors.password}
                    label='비밀번호 *'
                    name='password'
                    onChange={handleFieldChange('password')}
                    placeholder='특수문자 영문 숫자 포함 8자 이상'
                    type='password'
                    value={formValues.password}
                  />

                  <TextField
                    autoComplete='new-password'
                    errorMessage={formErrors.passwordConfirm}
                    label='비밀번호 확인 *'
                    name='passwordConfirm'
                    onChange={handleFieldChange('passwordConfirm')}
                    type='password'
                    value={formValues.passwordConfirm}
                  />
                </div>
              </div>
            </section>

            <section className={sharedStyles['section']}>
              <div className={styles['smsFieldRow']}>
                <TextField
                  errorMessage={formErrors.phoneNumber}
                  label='휴대폰 번호 *'
                  name='phoneNumber'
                  onChange={handleFieldChange('phoneNumber')}
                  value={formValues.phoneNumber}
                />

                <div className={styles['fieldAction']}>
                  <Button
                    className={styles['smsButton']}
                    disabled={
                      sendSmsMutation.isPending ||
                      smsState.verifiedAt !== null ||
                      (isSmsCodeVisible && !isSmsExpired)
                    }
                    onClick={handleSendSms}
                    type='button'
                  >
                    {sendSmsMutation.isPending
                      ? '발송 중...'
                      : smsState.verifiedAt
                        ? '발송 완료'
                        : isSmsCodeVisible && !isSmsExpired
                          ? formatRemainingTimeLabel(smsCountdownSeconds)
                          : '인증번호 발송'}
                  </Button>
                </div>
              </div>

              {isSmsCodeVisible ? (
                <div className={styles['smsFieldRow']}>
                  <TextField
                    errorMessage={formErrors.smsCode}
                    label='인증번호 *'
                    name='smsCode'
                    onChange={handleFieldChange('smsCode')}
                    value={formValues.smsCode}
                  />

                  <div className={styles['fieldAction']}>
                    <Button
                      className={styles['smsButton']}
                      disabled={
                        verifySmsMutation.isPending || isSmsExpired || smsState.verifiedAt !== null
                      }
                      onClick={handleVerifySms}
                      type='button'
                    >
                      {verifySmsMutation.isPending ? '확인 중...' : '인증번호 확인'}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className={styles['statusInline']}>
                {isSmsCodeVisible && !smsState.verifiedAt && smsCountdownSeconds > 0 ? (
                  <p className={sharedStyles['mutedText']}>
                    남은 시간 {formatRemainingTimeLabel(smsCountdownSeconds)}
                  </p>
                ) : null}
                {isSmsExpired ? (
                  <p
                    className={classNames(
                      styles['availabilityText'],
                      styles['availabilityTextError'],
                    )}
                  >
                    인증 시간이 만료되었습니다. 다시 발송해 주세요.
                  </p>
                ) : null}
                {smsState.verifiedAt ? (
                  <p className={sharedStyles['mutedText']}>인증 완료</p>
                ) : null}
              </div>
            </section>

            <section className={sharedStyles['section']}>
              <div className={styles['consentGroup']}>
                {registrationTermsQuery.isLoading ? (
                  <p className={sharedStyles['mutedText']}>약관 정보를 불러오는 중입니다.</p>
                ) : null}
                {registrationTermsQuery.isError ? (
                  <p className={styles['errorText']}>회원가입 약관을 불러오지 못했습니다.</p>
                ) : null}

                {registrationTerms.length > 0 ? (
                  <label className={classNames(styles['checkboxRow'], styles['checkboxRowAll'])}>
                    <input
                      checked={areAllTermsAccepted}
                      onChange={handleToggleAllTerms}
                      type='checkbox'
                    />
                    <span>전체 동의</span>
                  </label>
                ) : null}

                {registrationTerms.map((term: RegistrationTerm) => (
                  <label className={styles['checkboxRow']} key={term.code}>
                    <input
                      checked={acceptedTermCodes.includes(term.code)}
                      name={term.code}
                      onChange={handleToggleTerm(term.code)}
                      type='checkbox'
                    />
                    <span>
                      [{term.required ? '필수' : '선택'}] {term.title}
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
