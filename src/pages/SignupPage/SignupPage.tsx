import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import checkIconSrc from '@/assets/icons/lucide_check_white_20.svg';
import circleCheckIconSrc from '@/assets/icons/lucide_circle-check.svg';
import eyeOffIconSrc from '@/assets/icons/lucide_eye-off.svg';
import eyeIconSrc from '@/assets/icons/lucide_eye.svg';
import LegalPolicyModal from '@/components/policy/LegalPolicyModal';
import type { LegalPolicyType } from '@/components/policy/LegalPolicyModal';
import Button from '@/components/ui/Button/Button';
import { myCartQueryKey } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { RegistrationTerm } from '@/types/auth';
import { classNames } from '@/utils/classNames';
import { mergeGuestCartIntoServer } from '@/utils/mergeGuestCartIntoServer';

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
  loginId?: string[];
  email?: string[];
  name?: string[];
  nickname?: string[];
  password?: string[];
  passwordConfirm?: string[];
  phoneNumber?: string[];
  smsCode?: string[];
  acceptedTerms?: string[];
}

interface SmsVerificationState {
  sentPhoneNumber: string | null;
  expiresAt: string | null;
  verifiedPhoneNumber: string | null;
  verifiedAt: string | null;
  verificationToken: string | null;
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
  verificationToken: null,
};

const INITIAL_AVAILABILITY_STATE: AvailabilityCheckState = {
  checkedValue: null,
  isAvailable: null,
};

const PHONE_ALREADY_EXISTS_ERROR_MESSAGE = '이미 등록된 휴대폰 번호입니다.';
const SIGNUP_FAILED_TOAST_MESSAGE = '회원가입을 완료하지 못했습니다.\n잠시 후 다시 시도해 주세요.';

const normalizePhoneNumber = (value: string): string => {
  let digits = value.replaceAll(/\D/g, '');
  if (digits.startsWith('82')) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
};

const LOGIN_ID_PATTERN = /^[a-z0-9]{4,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_ALLOWED_PATTERN = /^[가-힣A-Za-z\s]+$/;
const NICKNAME_ALLOWED_PATTERN = /^[가-힣A-Za-z0-9]+$/;
const PASSWORD_ALLOWED_CHARACTER_PATTERN = /^[A-Za-z\d!@#$%&*?]*$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%&*?])[A-Za-z\d!@#$%&*?]{8,32}$/;

const resolveRegistrationTermPolicyType = (term: RegistrationTerm): LegalPolicyType | null => {
  const text = `${term.code} ${term.title}`.toLowerCase();
  if (text.includes('marketing') || text.includes('마케팅') || text.includes('광고성')) {
    return 'marketing';
  }
  if (text.includes('privacy') || text.includes('개인정보')) {
    return text.includes('수집') || text.includes('collection') ? 'privacyCollection' : 'privacy';
  }
  if (text.includes('terms') || text.includes('이용약관') || text.includes('약관')) {
    return 'terms';
  }
  return null;
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

const hasSignupFormErrors = (errors: SignupFormErrors): boolean => {
  return (Object.keys(errors) as Array<keyof SignupFormErrors>).some((fieldName) => {
    const messages = errors[fieldName];
    return Boolean(messages && messages.length > 0);
  });
};

const SignupPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useToastStore((state) => state.showToast);
  const firstInvalidInputRef = useRef<HTMLInputElement | null>(null);

  const [formValues, setFormValues] = useState<SignupFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<SignupFormErrors>({});
  const [smsState, setSmsState] = useState<SmsVerificationState>(INITIAL_SMS_STATE);
  const [acceptedTermKeys, setAcceptedTermKeys] = useState<string[]>([]);
  const [loginIdAvailability, setLoginIdAvailability] = useState<AvailabilityCheckState>(
    INITIAL_AVAILABILITY_STATE,
  );
  const [emailAvailability, setEmailAvailability] = useState<AvailabilityCheckState>(
    INITIAL_AVAILABILITY_STATE,
  );
  const [smsCountdownSeconds, setSmsCountdownSeconds] = useState(0);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmVisible, setIsPasswordConfirmVisible] = useState(false);
  const [activePolicyType, setActivePolicyType] = useState<LegalPolicyType | null>(null);

  const registrationTermsQuery = useQuery({
    queryKey: ['registrationTerms'],
    queryFn: fetchRegistrationTerms,
  });
  const registrationTerms = registrationTermsQuery.data ?? [];
  const areAllTermsAccepted =
    registrationTerms.length > 0 &&
    registrationTerms.every((term) => acceptedTermKeys.includes(term.code));
  const isSmsCodeVisible = smsState.sentPhoneNumber !== null;
  const isSmsExpired =
    isSmsCodeVisible &&
    smsState.verifiedAt === null &&
    smsState.expiresAt !== null &&
    smsCountdownSeconds === 0;
  const trimmedLoginId = formValues.loginId.trim();
  const trimmedEmail = formValues.email.trim();
  const normalizedPhoneNumber = normalizePhoneNumber(formValues.phoneNumber);
  const isLoginIdAvailabilityChecked =
    loginIdAvailability.checkedValue === trimmedLoginId && loginIdAvailability.isAvailable !== null;
  const isEmailAvailabilityChecked =
    emailAvailability.checkedValue === trimmedEmail && emailAvailability.isAvailable !== null;
  const isPasswordValid = PASSWORD_PATTERN.test(formValues.password);
  const isPasswordConfirmValid =
    formValues.passwordConfirm.length > 0 && formValues.passwordConfirm === formValues.password;
  const isPhoneNumberValid = isValidPhoneNumber(formValues.phoneNumber);
  const isPhoneVerified = smsState.verifiedPhoneNumber === normalizedPhoneNumber;
  const hasFieldError = (fieldName: keyof SignupFormErrors): boolean =>
    Boolean(formErrors[fieldName]?.length);
  const renderErrorMessages = (fieldName: keyof SignupFormErrors) => {
    const messages = formErrors[fieldName];

    if (!messages?.length) return null;

    return (
      <div className={styles['errorList']}>
        {messages.map((message) => (
          <p className={styles['errorText']} key={message}>
            {message}
          </p>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (!smsState.expiresAt || smsState.verifiedAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const nextRemainingSeconds = getRemainingSeconds(smsState.expiresAt);

      setSmsCountdownSeconds(() => {
        if (nextRemainingSeconds === 0) {
          window.clearInterval(intervalId);
        }

        return nextRemainingSeconds;
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
          phoneNumber: [phoneNumberErrorMessage],
        }));
      }

      showToast({
        message:
          phoneNumberErrorMessage ??
          (error instanceof Error
            ? error.message
            : '인증번호 발송에 실패했습니다. 다시 시도해 주세요.'),
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
        verificationToken: null,
      });
      setSmsCountdownSeconds(getRemainingSeconds(response.expiresAt));
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
          phoneNumber: [phoneNumberErrorMessage],
        }));
      }

      showToast({
        message:
          phoneNumberErrorMessage ??
          (error instanceof Error
            ? error.message
            : '인증번호 확인에 실패했습니다. 다시 시도해 주세요.'),
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      setSmsState((current) => ({
        ...current,
        verifiedPhoneNumber: response.phoneNumber,
        verifiedAt: response.verifiedAt,
        verificationToken: response.verificationToken,
      }));
      setSmsCountdownSeconds(0);
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
      setFormErrors((current) =>
        response.available
          ? omitSignupFormError(current, 'loginId')
          : {
              ...current,
              loginId: ['이미 사용 중인 아이디입니다.'],
            },
      );
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
      setFormErrors((current) =>
        response.available
          ? omitSignupFormError(current, 'email')
          : {
              ...current,
              email: ['사용할 수 없는 이메일 주소입니다.'],
            },
      );
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
            loginId: ['이미 사용 중인 아이디입니다.'],
          }));
        }

        if (error.code === 'USER_400_EMAIL') {
          setFormErrors((current) => ({
            ...current,
            email: ['이미 사용 중인 이메일입니다.'],
          }));
        }

        if (error.code === 'USER_400_PHONE') {
          setFormErrors((current) => ({
            ...current,
            phoneNumber: [PHONE_ALREADY_EXISTS_ERROR_MESSAGE],
          }));
        }
      }

      showToast({
        message: SIGNUP_FAILED_TOAST_MESSAGE,
        variant: 'error',
        durationMs: null,
      });
    },
    onSuccess: async (session) => {
      setSession(session);

      const mergeResult = await mergeGuestCartIntoServer();

      if (mergeResult.serverCart) {
        queryClient.setQueryData(myCartQueryKey('authenticated'), mergeResult.serverCart);
      }

      if (mergeResult.failedCount > 0) {
        showToast({
          message:
            '일부 비로그인 장바구니 항목은 옮기지 못했습니다. 장바구니에서 다시 확인해 주세요.',
          variant: 'info',
        });
      }

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
        setSmsCountdownSeconds(0);
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
            password: ['특수문자, 영문, 숫자 포함 8자 이상 입력해주세요.'],
            ...(shouldShowPasswordConfirmError
              ? {
                  passwordConfirm: ['비밀번호가 일치하지 않습니다.'],
                }
              : {}),
          };
        }

        if (fieldName === 'password' || fieldName === 'passwordConfirm') {
          if (shouldShowPasswordConfirmError) {
            return {
              ...nextErrors,
              passwordConfirm: ['비밀번호가 일치하지 않습니다.'],
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
        phoneNumber: ['올바른 휴대폰 번호 형식이 아닙니다.'],
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
      nextErrors.phoneNumber = ['올바른 휴대폰 번호 형식이 아닙니다.'];
    }

    if (!formValues.smsCode.trim()) {
      nextErrors.smsCode = ['인증번호가 일치하지 않습니다.'];
    } else if (isSmsExpired) {
      nextErrors.smsCode = ['인증번호가 만료되었습니다. 다시 발송해주세요.'];
    }

    setFormErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    if (hasSignupFormErrors(nextErrors)) {
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

    const loginIdErrors: string[] = [];
    const emailErrors: string[] = [];
    const nameErrors: string[] = [];
    const nicknameErrors: string[] = [];
    const passwordErrors: string[] = [];
    const passwordConfirmErrors: string[] = [];
    const phoneNumberErrors: string[] = [];
    const smsCodeErrors: string[] = [];

    if (!trimmedLoginId || !LOGIN_ID_PATTERN.test(trimmedLoginId)) {
      loginIdErrors.push('영문 소문자, 숫자를 조합해 4~20자로 입력해주세요.');
    }
    if (loginIdAvailability.checkedValue === trimmedLoginId) {
      if (loginIdAvailability.isAvailable === false) {
        loginIdErrors.push('이미 사용 중인 아이디입니다.');
      }
    } else {
      loginIdErrors.push('아이디 중복확인을 완료해주세요.');
    }

    if (trimmedEmail) {
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        emailErrors.push('올바른 이메일 형식이 아닙니다.');
      }
      if (emailAvailability.checkedValue === trimmedEmail) {
        if (emailAvailability.isAvailable === false) {
          emailErrors.push('사용할 수 없는 이메일 주소입니다.');
        }
      } else {
        emailErrors.push('이메일 중복확인을 완료해주세요.');
      }
    }

    const trimmedName = formValues.name.trim();
    if (!trimmedName || !NAME_ALLOWED_PATTERN.test(trimmedName)) {
      nameErrors.push('한글 또는 영문으로 입력해 주세요.');
    }
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      nameErrors.push('2~20자 이내로 입력해주세요.');
    }

    const trimmedNickname = formValues.nickname.trim();
    if (trimmedNickname) {
      if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
        nicknameErrors.push('2~20자 이내로 입력해주세요.');
      }
      if (!NICKNAME_ALLOWED_PATTERN.test(trimmedNickname)) {
        nicknameErrors.push('특수문자를 사용할 수 없습니다.');
      }
    }

    if (
      !PASSWORD_ALLOWED_CHARACTER_PATTERN.test(formValues.password) ||
      !PASSWORD_PATTERN.test(formValues.password)
    ) {
      passwordErrors.push('특수문자, 영문, 숫자 포함 8자 이상 입력해주세요.');
    }

    if (!formValues.passwordConfirm || formValues.passwordConfirm !== formValues.password) {
      passwordConfirmErrors.push('비밀번호가 일치하지 않습니다.');
    }

    if (!isValidPhoneNumber(formValues.phoneNumber)) {
      phoneNumberErrors.push('올바른 휴대폰 번호 형식이 아닙니다.');
    }

    if (smsState.verifiedPhoneNumber !== normalizedPhoneNumber || !smsState.verificationToken) {
      phoneNumberErrors.push('휴대폰 인증을 완료해주세요.');
    }

    if (isSmsCodeVisible && isSmsExpired) {
      smsCodeErrors.push('인증번호가 만료되었습니다. 다시 발송해주세요.');
    } else if (isSmsCodeVisible && !isPhoneVerified) {
      smsCodeErrors.push('인증번호가 일치하지 않습니다.');
    }

    if (loginIdErrors.length) nextErrors.loginId = loginIdErrors;
    if (emailErrors.length) nextErrors.email = emailErrors;
    if (nameErrors.length) nextErrors.name = nameErrors;
    if (nicknameErrors.length) nextErrors.nickname = nicknameErrors;
    if (passwordErrors.length) nextErrors.password = passwordErrors;
    if (passwordConfirmErrors.length) nextErrors.passwordConfirm = passwordConfirmErrors;
    if (phoneNumberErrors.length) nextErrors.phoneNumber = phoneNumberErrors;
    if (smsCodeErrors.length) nextErrors.smsCode = smsCodeErrors;

    if (requiredTerms.some((term) => !acceptedTermKeys.includes(term.code))) {
      nextErrors.acceptedTerms = ['필수 약관에 동의해주세요.'];
    }

    setFormErrors(nextErrors);

    if (hasSignupFormErrors(nextErrors)) {
      showToast({
        message: SIGNUP_FAILED_TOAST_MESSAGE,
        variant: 'error',
        durationMs: null,
      });
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
      phoneVerificationToken: smsState.verificationToken ?? '',
      acceptedTerms: registrationTerms
        .filter((term) => acceptedTermKeys.includes(term.code))
        .map((term) => ({
          code: term.code,
          version: term.version,
        })),
    });
  };

  const handleToggleTerm = (termCode: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setAcceptedTermKeys((current) => {
      if (isChecked) {
        return current.includes(termCode) ? current : [...current, termCode];
      }
      return current.filter((code) => code !== termCode);
    });
    setFormErrors((current) => omitSignupFormError(current, 'acceptedTerms'));
  };

  const handleToggleAllTerms = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;

    setAcceptedTermKeys(isChecked ? registrationTerms.map((term) => term.code) : []);
    setFormErrors((current) => omitSignupFormError(current, 'acceptedTerms'));
  };

  const handleCheckLoginId = () => {
    const trimmedLoginId = formValues.loginId.trim();

    if (!LOGIN_ID_PATTERN.test(trimmedLoginId)) {
      setFormErrors((current) => ({
        ...current,
        loginId: ['영문 소문자, 숫자를 조합해 4~20자로 입력해주세요.'],
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
        email: ['이메일을 입력한 경우에만 중복 확인이 가능합니다.'],
      }));
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFormErrors((current) => ({
        ...current,
        email: ['올바른 이메일 형식이 아닙니다.'],
      }));
      return;
    }

    checkEmailMutation.mutate(trimmedEmail);
  };

  return (
    <section className={styles['page']}>
      <div className={styles['shell']}>
        <h1 className={styles['title']}>회원가입</h1>

        <form className={styles['form']} noValidate onSubmit={handleSubmit}>
          <div className={styles['fieldGrid']}>
            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='loginId'>
                아이디 <span>*</span>
              </label>
              <div className={styles['controlGroup']}>
                <div className={styles['inputStack']}>
                  <div className={styles['inputWrap']}>
                    <input
                      className={classNames(
                        styles['input'],
                        hasFieldError('loginId') && styles['inputError'],
                      )}
                      id='loginId'
                      name='loginId'
                      onChange={handleFieldChange('loginId')}
                      placeholder='아이디를 입력해주세요.'
                      ref={firstInvalidInputRef}
                      value={formValues.loginId}
                    />
                    {hasFieldError('loginId') ? (
                      <span aria-hidden='true' className={styles['errorIcon']}>
                        ×
                      </span>
                    ) : isLoginIdAvailabilityChecked && loginIdAvailability.isAvailable ? (
                      <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                    ) : null}
                  </div>
                  {renderErrorMessages('loginId') ??
                    (isLoginIdAvailabilityChecked ? (
                      <p
                        className={classNames(
                          styles['statusText'],
                          loginIdAvailability.isAvailable
                            ? styles['statusTextSuccess']
                            : styles['statusTextError'],
                        )}
                      >
                        {loginIdAvailability.isAvailable
                          ? '사용 가능한 아이디입니다.'
                          : '이미 사용 중인 아이디입니다.'}
                      </p>
                    ) : null)}
                </div>
                <Button
                  className={styles['checkButton']}
                  disabled={checkLoginIdMutation.isPending}
                  onClick={handleCheckLoginId}
                  type='button'
                  variant='secondary'
                >
                  {checkLoginIdMutation.isPending ? '확인 중...' : '중복 확인'}
                </Button>
              </div>
            </div>

            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='email'>
                이메일
              </label>
              <div className={styles['controlGroup']}>
                <div className={styles['inputStack']}>
                  <div className={styles['inputWrap']}>
                    <input
                      autoComplete='email'
                      className={classNames(
                        styles['input'],
                        hasFieldError('email') && styles['inputError'],
                      )}
                      id='email'
                      name='email'
                      onChange={handleFieldChange('email')}
                      placeholder='이메일을 입력해주세요.'
                      type='email'
                      value={formValues.email}
                    />
                    {hasFieldError('email') ? (
                      <span aria-hidden='true' className={styles['errorIcon']}>
                        ×
                      </span>
                    ) : isEmailAvailabilityChecked && emailAvailability.isAvailable ? (
                      <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                    ) : null}
                  </div>
                  {renderErrorMessages('email') ??
                    (isEmailAvailabilityChecked ? (
                      <p
                        className={classNames(
                          styles['statusText'],
                          emailAvailability.isAvailable
                            ? styles['statusTextSuccess']
                            : styles['statusTextError'],
                        )}
                      >
                        {emailAvailability.isAvailable
                          ? '사용 가능한 이메일입니다.'
                          : '이미 사용 중인 이메일입니다.'}
                      </p>
                    ) : null)}
                </div>
                <Button
                  className={styles['checkButton']}
                  disabled={checkEmailMutation.isPending || !trimmedEmail}
                  onClick={handleCheckEmail}
                  type='button'
                  variant='secondary'
                >
                  {checkEmailMutation.isPending ? '확인 중...' : '중복 확인'}
                </Button>
              </div>
            </div>

            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='name'>
                이름 <span>*</span>
              </label>
              <div className={styles['inputStack']}>
                <div className={styles['inputWrap']}>
                  <input
                    className={classNames(
                      styles['input'],
                      hasFieldError('name') && styles['inputError'],
                    )}
                    id='name'
                    name='name'
                    onChange={handleFieldChange('name')}
                    placeholder='이름을 입력해주세요.'
                    value={formValues.name}
                  />
                  {hasFieldError('name') ? (
                    <span aria-hidden='true' className={styles['errorIcon']}>
                      ×
                    </span>
                  ) : formValues.name.trim() ? (
                    <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                  ) : null}
                </div>
                {renderErrorMessages('name')}
              </div>
            </div>

            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='nickname'>
                닉네임
              </label>
              <div className={styles['inputStack']}>
                <div className={styles['inputWrap']}>
                  <input
                    className={classNames(
                      styles['input'],
                      hasFieldError('nickname') && styles['inputError'],
                    )}
                    id='nickname'
                    name='nickname'
                    onChange={handleFieldChange('nickname')}
                    placeholder='2~20자로 입력해주세요.'
                    value={formValues.nickname}
                  />
                  {hasFieldError('nickname') ? (
                    <span aria-hidden='true' className={styles['errorIcon']}>
                      ×
                    </span>
                  ) : formValues.nickname.trim() ? (
                    <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                  ) : null}
                </div>
                {renderErrorMessages('nickname')}
              </div>
            </div>

            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='password'>
                비밀번호 <span>*</span>
              </label>
              <div className={styles['inputStack']}>
                <div className={styles['inputWrap']}>
                  <input
                    autoComplete='new-password'
                    className={classNames(
                      styles['input'],
                      styles['inputWithIcon'],
                      hasFieldError('password') && styles['inputError'],
                    )}
                    id='password'
                    name='password'
                    onChange={handleFieldChange('password')}
                    placeholder='특수문자, 영문, 숫자 포함 8자 이상 입력해주세요.'
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={formValues.password}
                  />
                  <button
                    aria-label={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                    className={styles['iconButton']}
                    onClick={() => {
                      setIsPasswordVisible((current) => !current);
                    }}
                    type='button'
                  >
                    <img alt='' src={isPasswordVisible ? eyeIconSrc : eyeOffIconSrc} />
                  </button>
                  {hasFieldError('password') ? (
                    <span aria-hidden='true' className={styles['errorIcon']}>
                      ×
                    </span>
                  ) : isPasswordValid ? (
                    <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                  ) : null}
                </div>
                {renderErrorMessages('password')}
              </div>
            </div>

            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='passwordConfirm'>
                비밀번호 확인 <span>*</span>
              </label>
              <div className={styles['inputStack']}>
                <div className={styles['inputWrap']}>
                  <input
                    autoComplete='new-password'
                    className={classNames(
                      styles['input'],
                      styles['inputWithIcon'],
                      hasFieldError('passwordConfirm') && styles['inputError'],
                    )}
                    id='passwordConfirm'
                    name='passwordConfirm'
                    onChange={handleFieldChange('passwordConfirm')}
                    placeholder='비밀번호를 한 번 더 입력해주세요.'
                    type={isPasswordConfirmVisible ? 'text' : 'password'}
                    value={formValues.passwordConfirm}
                  />
                  <button
                    aria-label={
                      isPasswordConfirmVisible ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'
                    }
                    className={styles['iconButton']}
                    onClick={() => {
                      setIsPasswordConfirmVisible((current) => !current);
                    }}
                    type='button'
                  >
                    <img alt='' src={isPasswordConfirmVisible ? eyeIconSrc : eyeOffIconSrc} />
                  </button>
                  {hasFieldError('passwordConfirm') ? (
                    <span aria-hidden='true' className={styles['errorIcon']}>
                      ×
                    </span>
                  ) : isPasswordConfirmValid ? (
                    <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                  ) : null}
                </div>
                {renderErrorMessages('passwordConfirm') ??
                  (isPasswordConfirmValid ? (
                    <p className={classNames(styles['statusText'], styles['statusTextSuccess'])}>
                      비밀번호가 일치합니다.
                    </p>
                  ) : null)}
              </div>
            </div>

            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='phoneNumber'>
                휴대폰 번호 <span>*</span>
              </label>
              <div className={styles['controlGroup']}>
                <div className={styles['inputStack']}>
                  <div className={styles['inputWrap']}>
                    <input
                      className={classNames(
                        styles['input'],
                        hasFieldError('phoneNumber') && styles['inputError'],
                      )}
                      id='phoneNumber'
                      inputMode='numeric'
                      name='phoneNumber'
                      onChange={handleFieldChange('phoneNumber')}
                      placeholder='- 없이 숫자만 입력해주세요.'
                      value={formValues.phoneNumber}
                    />
                    {hasFieldError('phoneNumber') ? (
                      <span aria-hidden='true' className={styles['errorIcon']}>
                        ×
                      </span>
                    ) : isPhoneNumberValid ? (
                      <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                    ) : null}
                  </div>
                  {renderErrorMessages('phoneNumber')}
                </div>
                <Button
                  className={styles['smsButton']}
                  disabled={
                    sendSmsMutation.isPending ||
                    smsState.verifiedAt !== null ||
                    (isSmsCodeVisible && !isSmsExpired)
                  }
                  onClick={handleSendSms}
                  type='button'
                  variant='secondary'
                >
                  {sendSmsMutation.isPending
                    ? '발송 중...'
                    : smsState.verifiedAt
                      ? '발송 완료'
                      : '인증번호 받기'}
                </Button>
              </div>
            </div>

            <div className={styles['fieldRow']}>
              <label className={styles['label']} htmlFor='smsCode'>
                인증번호 입력 <span>*</span>
              </label>
              <div className={styles['controlGroup']}>
                <div className={styles['inputStack']}>
                  <div className={styles['inputWrap']}>
                    <input
                      className={classNames(
                        styles['input'],
                        styles['inputWithTimer'],
                        hasFieldError('smsCode') && styles['inputError'],
                      )}
                      id='smsCode'
                      inputMode='numeric'
                      name='smsCode'
                      onChange={handleFieldChange('smsCode')}
                      placeholder='인증번호 6자리를입력해주세요.'
                      value={formValues.smsCode}
                    />
                    {isSmsCodeVisible &&
                    !isPhoneVerified &&
                    smsCountdownSeconds > 0 &&
                    !hasFieldError('smsCode') ? (
                      <span className={styles['timerText']}>
                        {formatRemainingTimeLabel(smsCountdownSeconds)}
                      </span>
                    ) : null}
                    {hasFieldError('smsCode') ? (
                      <span aria-hidden='true' className={styles['errorIcon']}>
                        ×
                      </span>
                    ) : isPhoneVerified ? (
                      <img alt='' className={styles['successIcon']} src={circleCheckIconSrc} />
                    ) : null}
                  </div>
                  {renderErrorMessages('smsCode') ??
                    (isSmsExpired ? (
                      <p className={classNames(styles['statusText'], styles['statusTextError'])}>
                        인증 시간이 만료되었습니다. 다시 발송해 주세요.
                      </p>
                    ) : isPhoneVerified ? (
                      <p className={classNames(styles['statusText'], styles['statusTextSuccess'])}>
                        휴대폰 인증이 완료되었습니다.
                      </p>
                    ) : null)}
                </div>
                <Button
                  className={styles['smsButton']}
                  disabled={
                    verifySmsMutation.isPending ||
                    !isSmsCodeVisible ||
                    isSmsExpired ||
                    isPhoneVerified
                  }
                  onClick={handleVerifySms}
                  type='button'
                  variant='secondary'
                >
                  {verifySmsMutation.isPending ? '확인 중...' : '인증번호 확인'}
                </Button>
              </div>
            </div>
          </div>

          <section className={styles['consentGroup']}>
            {registrationTermsQuery.isLoading ? (
              <p className={styles['mutedText']}>약관 정보를 불러오는 중입니다.</p>
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
                <span aria-hidden='true' className={styles['checkboxBox']}>
                  {areAllTermsAccepted ? <img alt='' src={checkIconSrc} /> : null}
                </span>
                <strong>전체 동의</strong>
              </label>
            ) : null}

            {registrationTerms.map((term: RegistrationTerm) => {
              const isChecked = acceptedTermKeys.includes(term.code);
              const policyType = resolveRegistrationTermPolicyType(term);

              return (
                <div className={styles['termRow']} key={term.code}>
                  <label className={styles['checkboxRow']}>
                    <input
                      checked={isChecked}
                      name={term.code}
                      onChange={handleToggleTerm(term.code)}
                      type='checkbox'
                    />
                    <span aria-hidden='true' className={styles['checkboxBox']}>
                      {isChecked ? <img alt='' src={checkIconSrc} /> : null}
                    </span>
                    <span>
                      [{term.required ? '필수' : '선택'}] {term.title}
                    </span>
                  </label>
                  {policyType ? (
                    <button
                      className={styles['termViewButton']}
                      onClick={() => {
                        setActivePolicyType(policyType);
                      }}
                      type='button'
                    >
                      보기
                    </button>
                  ) : null}
                </div>
              );
            })}
            {formErrors.acceptedTerms?.map((message) => (
              <p className={styles['termsErrorText']} key={message}>
                {message}
              </p>
            ))}
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

            <Link className={styles['loginLink']} to={routePaths.login}>
              로그인하기
            </Link>
          </div>
        </form>
      </div>
      {activePolicyType ? (
        <LegalPolicyModal
          onClose={() => {
            setActivePolicyType(null);
          }}
          type={activePolicyType}
        />
      ) : null}
    </section>
  );
};

export default SignupPage;
