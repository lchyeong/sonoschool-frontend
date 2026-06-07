import type { ChangeEvent, FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { findLoginId, resetPassword, sendPasswordResetSms } from '@/api/auth';
import { ApiError } from '@/api/errors';
import clockIconSrc from '@/assets/icons/lucide_clock_sono.svg';
import eyeOffIconSrc from '@/assets/icons/lucide_eye-off.svg';
import eyeIconSrc from '@/assets/icons/lucide_eye.svg';
import { routePaths } from '@/routes/routeRegistry';
import { classNames } from '@/utils/classNames';

import styles from './AccountRecoveryPage.module.scss';

type RecoveryMode = 'findId' | 'resetPassword';
type RecoveryStep = 'recover' | 'idResult' | 'passwordReset' | 'passwordDone';

interface RecoveryFormValues {
  findIdName: string;
  findIdPhoneNumber: string;
  findIdCode: string;
  resetPasswordLoginId: string;
  resetPasswordPhoneNumber: string;
  resetPasswordCode: string;
  resetPassword: string;
  resetPasswordConfirm: string;
}

interface RecoveryFormErrors {
  findIdName?: string;
  findIdPhoneNumber?: string;
  findIdCode?: string;
  resetPasswordLoginId?: string;
  resetPasswordPhoneNumber?: string;
  resetPasswordCode?: string;
  resetPassword?: string;
  resetPasswordConfirm?: string;
}

interface FieldRowProps extends InputHTMLAttributes<HTMLInputElement> {
  action?: ReactNode | undefined;
  errorMessage?: string | undefined;
  inputAdornment?: ReactNode | undefined;
  inputClassName?: string | undefined;
  label: string;
  messageAccessory?: ReactNode | undefined;
  name: keyof RecoveryFormValues;
  successMessage?: string | undefined;
}

const INITIAL_FORM_VALUES: RecoveryFormValues = {
  findIdName: '',
  findIdPhoneNumber: '',
  findIdCode: '',
  resetPasswordLoginId: '',
  resetPasswordPhoneNumber: '',
  resetPasswordCode: '',
  resetPassword: '',
  resetPasswordConfirm: '',
};

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9]{4,20}$/;
const PHONE_NUMBER_PATTERN = /^01\d{8,9}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%&*?])[A-Za-z\d!@#$%&*?]{8,32}$/;
const PHONE_NUMBER_CHECK_MESSAGE = '휴대폰 번호를 확인해주세요.';
const FIND_ID_IDENTITY_CHECK_MESSAGE = '이름과 휴대폰 번호를 확인해주세요.';
const PASSWORD_RESET_IDENTITY_CHECK_MESSAGE = '아이디와 휴대폰 번호를 확인해주세요.';
const SMS_COUNTDOWN_SECONDS = 180;

const normalizePhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('82') ? `0${digits.slice(2)}` : digits;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
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

const isPhoneNumberApiError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return false;

  return (
    error.code === 'USER_400_PHONE' ||
    error.code === 'AUTH_400_SMS_PHONE' ||
    error.userMessage.includes('휴대폰')
  );
};

const isSmsCooldownApiError = (error: unknown): boolean => {
  return error instanceof ApiError && error.code === 'AUTH_429_SMS_SEND';
};

const isSmsSendLimitApiError = (error: unknown): boolean => {
  return error instanceof ApiError && error.code === 'AUTH_429_SMS_SEND_LIMIT';
};

const getFindIdApiErrorMessage = (error: unknown): string => {
  if (isSmsCooldownApiError(error) || isSmsSendLimitApiError(error)) {
    return getErrorMessage(error, FIND_ID_IDENTITY_CHECK_MESSAGE);
  }
  if (isPhoneNumberApiError(error)) return PHONE_NUMBER_CHECK_MESSAGE;
  return FIND_ID_IDENTITY_CHECK_MESSAGE;
};

const getPasswordResetApiErrorMessage = (error: unknown): string => {
  if (isSmsCooldownApiError(error) || isSmsSendLimitApiError(error)) {
    return getErrorMessage(error, PASSWORD_RESET_IDENTITY_CHECK_MESSAGE);
  }
  if (isPhoneNumberApiError(error)) return PHONE_NUMBER_CHECK_MESSAGE;
  return PASSWORD_RESET_IDENTITY_CHECK_MESSAGE;
};

const getPasswordResetCodeApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'AUTH_400_SMS_EXPIRED') {
      return '인증번호가 만료되었습니다. 다시 발송해주세요.';
    }
    if (error.code === 'AUTH_429_SMS_ATTEMPTS') {
      return '인증번호 입력 횟수를 초과했습니다. 다시 발송해주세요.';
    }
    if (error.code === 'AUTH_400_SMS_CODE') {
      return '인증번호를 확인해주세요.';
    }
  }

  return getErrorMessage(error, '인증번호 또는 비밀번호를 확인해주세요.');
};

const FieldRow = ({
  action,
  errorMessage,
  inputAdornment,
  inputClassName,
  label,
  messageAccessory,
  name,
  successMessage,
  ...inputProps
}: FieldRowProps) => {
  const message = errorMessage ?? successMessage ?? '\u00a0';

  return (
    <div className={styles['fieldRow']}>
      <label className={styles['fieldLabel']} htmlFor={name}>
        {label}
      </label>
      <div className={styles['fieldControl']}>
        <div
          className={classNames(
            styles['fieldControlLine'],
            action ? styles['fieldControlLineWithAction'] : undefined,
          )}
        >
          <div className={styles['inputWrap']}>
            <input
              {...inputProps}
              className={classNames(
                styles['input'],
                inputClassName,
                inputAdornment ? styles['inputWithAdornment'] : undefined,
                errorMessage ? styles['inputError'] : undefined,
              )}
              id={name}
              name={name}
            />
            {inputAdornment}
          </div>
          {action}
        </div>
        <p
          className={classNames(
            styles['fieldMessage'],
            errorMessage ? styles['fieldMessageError'] : undefined,
            !errorMessage && successMessage ? styles['fieldMessageSuccess'] : undefined,
          )}
        >
          <span>{message}</span>
          {!errorMessage ? messageAccessory : null}
        </p>
      </div>
    </div>
  );
};

const renderCountdownAccessory = (seconds: number): ReactNode => {
  if (seconds <= 0) return null;

  return (
    <span className={styles['fieldMessageTimer']}>
      <img alt='' className={styles['fieldMessageTimerIcon']} src={clockIconSrc} />
      <span>{formatRemainingTimeLabel(seconds)}</span>
    </span>
  );
};

const renderPasswordVisibilityButton = ({
  isVisible,
  onToggle,
}: {
  isVisible: boolean;
  onToggle: () => void;
}): ReactNode => {
  return (
    <button
      aria-label={isVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
      className={styles['passwordVisibilityButton']}
      onClick={onToggle}
      type='button'
    >
      <img
        alt=''
        className={styles['passwordVisibilityIcon']}
        src={isVisible ? eyeIconSrc : eyeOffIconSrc}
      />
    </button>
  );
};

const AccountRecoveryPage = () => {
  const [mode, setMode] = useState<RecoveryMode>('findId');
  const [step, setStep] = useState<RecoveryStep>('recover');
  const [formValues, setFormValues] = useState<RecoveryFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<RecoveryFormErrors>({});
  const [foundLoginId, setFoundLoginId] = useState<string | null>(null);
  const [findIdSmsSent, setFindIdSmsSent] = useState(false);
  const [findIdCodeVerified, setFindIdCodeVerified] = useState(false);
  const [findIdCandidate, setFindIdCandidate] = useState<string | null>(null);
  const [findIdCountdownSeconds, setFindIdCountdownSeconds] = useState(0);
  const [passwordResetSmsSent, setPasswordResetSmsSent] = useState(false);
  const [passwordResetCodeVerified, setPasswordResetCodeVerified] = useState(false);
  const [passwordResetCountdownSeconds, setPasswordResetCountdownSeconds] = useState(0);
  const [isResetPasswordVisible, setIsResetPasswordVisible] = useState(false);
  const [isResetPasswordConfirmVisible, setIsResetPasswordConfirmVisible] = useState(false);

  const clearResultState = () => {
    setFoundLoginId(null);
  };

  useEffect(() => {
    if (!findIdSmsSent || findIdCountdownSeconds === 0) return undefined;

    const intervalId = window.setInterval(() => {
      setFindIdCountdownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setFindIdSmsSent(false);
          setFindIdCodeVerified(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [findIdCountdownSeconds, findIdSmsSent]);

  useEffect(() => {
    if (!passwordResetSmsSent || passwordResetCountdownSeconds === 0) return undefined;

    const intervalId = window.setInterval(() => {
      setPasswordResetCountdownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setPasswordResetSmsSent(false);
          setPasswordResetCodeVerified(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [passwordResetCountdownSeconds, passwordResetSmsSent]);

  const handleModeChange = (nextMode: RecoveryMode) => {
    setMode(nextMode);
    setStep('recover');
    setFormErrors({});
    clearResultState();
  };

  const handleFieldChange =
    (fieldName: keyof RecoveryFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setFormValues((current) => ({
        ...current,
        [fieldName]: nextValue,
      }));
      setFormErrors((current) => {
        const { [fieldName]: _omitted, ...nextErrors } = current;
        void _omitted;
        return nextErrors;
      });
      clearResultState();

      if (fieldName === 'findIdName' || fieldName === 'findIdPhoneNumber') {
        setFindIdSmsSent(false);
        setFindIdCodeVerified(false);
        setFindIdCandidate(null);
        setFindIdCountdownSeconds(0);
      }
      if (fieldName === 'findIdCode') {
        setFindIdCodeVerified(false);
      }
      if (fieldName === 'resetPasswordLoginId' || fieldName === 'resetPasswordPhoneNumber') {
        setPasswordResetSmsSent(false);
        setPasswordResetCodeVerified(false);
        setPasswordResetCountdownSeconds(0);
      }
      if (fieldName === 'resetPasswordCode') {
        setPasswordResetCodeVerified(false);
      }
    };

  const sendFindIdSmsMutation = useMutation({
    mutationFn: findLoginId,
    onError: (error: unknown) => {
      setFindIdSmsSent(false);
      setFindIdCodeVerified(false);
      setFindIdCandidate(null);
      setFindIdCountdownSeconds(0);
      setFormErrors({
        findIdPhoneNumber: getFindIdApiErrorMessage(error),
      });
    },
    onSuccess: (response) => {
      setFindIdCandidate(response.loginId);
      setFindIdSmsSent(true);
      setFindIdCodeVerified(false);
      setFindIdCountdownSeconds(SMS_COUNTDOWN_SECONDS);
      setFormErrors({});
    },
  });

  const findLoginIdMutation = useMutation({
    mutationFn: findLoginId,
    onError: (error: unknown) => {
      setFoundLoginId(null);
      setFormErrors({
        findIdPhoneNumber: getFindIdApiErrorMessage(error),
      });
    },
    onSuccess: (response) => {
      setFoundLoginId(response.loginId);
      setFormErrors({});
    },
  });

  const sendPasswordResetSmsMutation = useMutation({
    mutationFn: sendPasswordResetSms,
    onError: (error: unknown) => {
      setPasswordResetSmsSent(false);
      setPasswordResetCountdownSeconds(0);
      setFormErrors({
        resetPasswordPhoneNumber: getPasswordResetApiErrorMessage(error),
      });
    },
    onSuccess: (response) => {
      setPasswordResetSmsSent(true);
      setPasswordResetCodeVerified(false);
      setPasswordResetCountdownSeconds(
        Math.min(SMS_COUNTDOWN_SECONDS, getRemainingSeconds(response.expiresAt)),
      );
      setFormErrors({});
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    onError: (error: unknown) => {
      if (
        error instanceof ApiError &&
        error.code !== null &&
        ['AUTH_400_SMS_CODE', 'AUTH_400_SMS_EXPIRED', 'AUTH_429_SMS_ATTEMPTS'].includes(error.code)
      ) {
        setStep('recover');
        setMode('resetPassword');
        setPasswordResetCodeVerified(false);
      }
      setFormErrors({
        resetPasswordCode: getPasswordResetCodeApiErrorMessage(error),
      });
    },
    onSuccess: () => {
      setPasswordResetSmsSent(false);
      setPasswordResetCodeVerified(false);
      setPasswordResetCountdownSeconds(0);
      setStep('passwordDone');
      setFormErrors({});
      setFormValues((current) => ({
        ...current,
        resetPasswordCode: '',
        resetPassword: '',
        resetPasswordConfirm: '',
      }));
    },
  });

  const validateFindLoginIdIdentity = (): boolean => {
    const phoneNumber = normalizePhoneNumber(formValues.findIdPhoneNumber);
    const nextErrors: RecoveryFormErrors = {};

    if (!formValues.findIdName.trim()) {
      nextErrors.findIdName = '이름을 확인해주세요.';
    }
    if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
      nextErrors.findIdPhoneNumber = PHONE_NUMBER_CHECK_MESSAGE;
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateFindLoginId = (): boolean => {
    const identityValid = validateFindLoginIdIdentity();
    const nextErrors: RecoveryFormErrors = {};

    if (!identityValid) {
      return false;
    }
    if (!findIdSmsSent) {
      nextErrors.findIdCode = '인증번호를 확인해주세요.';
    } else if (!findIdCodeVerified) {
      nextErrors.findIdCode = '인증번호를 확인해주세요.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePasswordResetIdentity = (): boolean => {
    const phoneNumber = normalizePhoneNumber(formValues.resetPasswordPhoneNumber);
    const nextErrors: RecoveryFormErrors = {};

    if (!LOGIN_ID_PATTERN.test(formValues.resetPasswordLoginId.trim())) {
      nextErrors.resetPasswordLoginId = '아이디를 확인해주세요.';
    }
    if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
      nextErrors.resetPasswordPhoneNumber = PHONE_NUMBER_CHECK_MESSAGE;
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePasswordResetReady = (): boolean => {
    const identityValid = validatePasswordResetIdentity();
    const nextErrors: RecoveryFormErrors = {};

    if (!identityValid) {
      return false;
    }
    if (!/^\d{6}$/.test(formValues.resetPasswordCode.trim())) {
      nextErrors.resetPasswordCode = '인증번호를 확인해주세요.';
    } else if (!passwordResetCodeVerified) {
      nextErrors.resetPasswordCode = '인증번호를 확인해주세요.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFindLoginIdSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateFindLoginId()) return;

    if (findIdCandidate) {
      setFoundLoginId(findIdCandidate);
      setStep('idResult');
      return;
    }

    findLoginIdMutation.mutate({
      name: formValues.findIdName.trim(),
      phoneNumber: normalizePhoneNumber(formValues.findIdPhoneNumber),
    });
  };

  const handleSendFindIdSms = () => {
    if (!validateFindLoginIdIdentity()) return;

    sendFindIdSmsMutation.mutate({
      name: formValues.findIdName.trim(),
      phoneNumber: normalizePhoneNumber(formValues.findIdPhoneNumber),
    });
  };

  const handleVerifyFindIdCode = () => {
    if (!findIdSmsSent) {
      setFormErrors((current) => ({
        ...current,
        findIdCode: '인증번호를 확인해주세요.',
      }));
      return;
    }
    if (formValues.findIdCode.trim() !== '123456') {
      setFindIdCodeVerified(false);
      setFormErrors((current) => ({
        ...current,
        findIdCode: '인증번호를 확인해주세요.',
      }));
      return;
    }

    setFindIdCodeVerified(true);
    if (findIdCandidate) {
      setFoundLoginId(findIdCandidate);
      setStep('idResult');
    }
    setFormErrors((current) => {
      const { findIdCode: _omitted, ...nextErrors } = current;
      void _omitted;
      return nextErrors;
    });
  };

  const handleSendPasswordResetSms = () => {
    if (!validatePasswordResetIdentity()) return;

    sendPasswordResetSmsMutation.mutate({
      loginId: formValues.resetPasswordLoginId.trim(),
      phoneNumber: normalizePhoneNumber(formValues.resetPasswordPhoneNumber),
    });
  };

  const handleVerifyPasswordResetCode = () => {
    if (!passwordResetSmsSent) {
      setFormErrors((current) => ({
        ...current,
        resetPasswordCode: '인증번호를 확인해주세요.',
      }));
      return;
    }
    if (!/^\d{6}$/.test(formValues.resetPasswordCode.trim())) {
      setPasswordResetCodeVerified(false);
      setFormErrors((current) => ({
        ...current,
        resetPasswordCode: '인증번호를 확인해주세요.',
      }));
      return;
    }

    setPasswordResetCodeVerified(true);
    setStep('passwordReset');
    setFormErrors((current) => {
      const { resetPasswordCode: _omitted, ...nextErrors } = current;
      void _omitted;
      return nextErrors;
    });
  };

  const handlePasswordResetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validatePasswordResetReady()) return;

    setStep('passwordReset');
  };

  const validatePasswordChange = (): boolean => {
    const nextErrors: RecoveryFormErrors = {};

    if (!PASSWORD_PATTERN.test(formValues.resetPassword)) {
      nextErrors.resetPassword = '비밀번호를 확인해주세요.';
    }
    if (formValues.resetPasswordConfirm !== formValues.resetPassword) {
      nextErrors.resetPasswordConfirm = '비밀번호를 확인해주세요.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePasswordChangeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validatePasswordChange()) return;

    resetPasswordMutation.mutate({
      loginId: formValues.resetPasswordLoginId.trim(),
      phoneNumber: normalizePhoneNumber(formValues.resetPasswordPhoneNumber),
      code: formValues.resetPasswordCode.trim(),
      password: formValues.resetPassword,
      passwordConfirm: formValues.resetPasswordConfirm,
    });
  };

  const handleGoPasswordResetFromIdResult = () => {
    const resolvedLoginId = foundLoginId ?? findIdCandidate ?? '';
    const resolvedPhoneNumber = normalizePhoneNumber(formValues.findIdPhoneNumber);

    sendPasswordResetSmsMutation.mutate(
      {
        loginId: resolvedLoginId,
        phoneNumber: resolvedPhoneNumber,
      },
      {
        onSuccess: (response) => {
          setMode('resetPassword');
          setFormValues((current) => ({
            ...current,
            resetPasswordLoginId: resolvedLoginId,
            resetPasswordPhoneNumber: resolvedPhoneNumber,
            resetPasswordCode: '',
            resetPassword: '',
            resetPasswordConfirm: '',
          }));
          setPasswordResetSmsSent(true);
          setPasswordResetCodeVerified(false);
          setPasswordResetCountdownSeconds(
            Math.min(SMS_COUNTDOWN_SECONDS, getRemainingSeconds(response.expiresAt)),
          );
          setStep('recover');
          setFormErrors({});
          clearResultState();
        },
        onError: (error: unknown) => {
          setFormErrors({
            findIdPhoneNumber: getPasswordResetApiErrorMessage(error),
          });
        },
      },
    );
  };

  if (step === 'idResult') {
    return (
      <section className={styles['page']}>
        <div className={styles['shell']}>
          <h1 className={styles['title']}>아이디/비밀번호 찾기</h1>

          <div className={styles['tabList']} role='tablist' aria-label='계정 찾기 유형'>
            <button
              aria-selected
              className={classNames(styles['tabButton'], styles['tabButtonActive'])}
              onClick={() => {
                handleModeChange('findId');
              }}
              role='tab'
              type='button'
            >
              아이디 찾기
            </button>
            <button
              aria-selected={false}
              className={styles['tabButton']}
              onClick={() => {
                handleModeChange('resetPassword');
              }}
              role='tab'
              type='button'
            >
              비밀번호 찾기
            </button>
          </div>

          <p className={styles['statusText']}>본인 인증이 완료되었습니다.</p>

          <div className={styles['idResultCard']}>
            <span className={styles['idResultLabel']}>아이디</span>
            <span aria-hidden='true' className={styles['idResultDivider']} />
            <strong className={styles['idResultValue']}>{foundLoginId ?? findIdCandidate}</strong>
          </div>

          <div className={styles['resultActions']}>
            <Link className={styles['primaryLinkButton']} to={routePaths.login}>
              로그인 하기
            </Link>
            <button
              className={styles['secondaryButtonLarge']}
              disabled={sendPasswordResetSmsMutation.isPending}
              onClick={handleGoPasswordResetFromIdResult}
              type='button'
            >
              {sendPasswordResetSmsMutation.isPending ? '준비 중' : '비밀번호 재설정'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === 'passwordReset') {
    return (
      <section className={styles['page']}>
        <div className={styles['shell']}>
          <h1 className={styles['title']}>비밀번호 재설정</h1>
          <p className={styles['statusText']}>본인 인증이 완료되었습니다.</p>

          <form
            className={classNames(styles['form'], styles['passwordChangeForm'])}
            onSubmit={handlePasswordChangeSubmit}
          >
            <FieldRow
              autoComplete='new-password'
              errorMessage={formErrors.resetPassword}
              inputAdornment={renderPasswordVisibilityButton({
                isVisible: isResetPasswordVisible,
                onToggle: () => {
                  setIsResetPasswordVisible((current) => !current);
                },
              })}
              label='새 비밀번호'
              name='resetPassword'
              onChange={handleFieldChange('resetPassword')}
              placeholder='특수문자, 영문, 숫자 포함 8자 이상 입력해주세요.'
              type={isResetPasswordVisible ? 'text' : 'password'}
              value={formValues.resetPassword}
            />
            <FieldRow
              autoComplete='new-password'
              errorMessage={formErrors.resetPasswordConfirm}
              inputAdornment={renderPasswordVisibilityButton({
                isVisible: isResetPasswordConfirmVisible,
                onToggle: () => {
                  setIsResetPasswordConfirmVisible((current) => !current);
                },
              })}
              label='비밀번호 확인'
              name='resetPasswordConfirm'
              onChange={handleFieldChange('resetPasswordConfirm')}
              placeholder='비밀번호를 한 번 더 입력해주세요.'
              type={isResetPasswordConfirmVisible ? 'text' : 'password'}
              value={formValues.resetPasswordConfirm}
            />

            <button
              className={styles['submitButton']}
              disabled={resetPasswordMutation.isPending}
              type='submit'
            >
              {resetPasswordMutation.isPending ? '변경 중' : '비밀번호 변경'}
            </button>
          </form>

          <div className={styles['linkRow']}>
            <Link className={styles['textLink']} to={routePaths.signup}>
              회원가입
            </Link>
            <span aria-hidden='true' className={styles['linkDivider']} />
            <Link className={styles['textLink']} to={routePaths.login}>
              로그인
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (step === 'passwordDone') {
    return (
      <section className={styles['page']}>
        <div className={styles['shell']}>
          <h1 className={styles['title']}>비밀번호 재설정 완료</h1>

          <div className={styles['completionCard']}>
            <span className={styles['completionIcon']} aria-hidden='true'>
              ✓
            </span>
            <strong className={styles['completionTitle']}>비밀번호가 변경되었습니다.</strong>
            <p className={styles['completionDescription']}>
              이제 새 비밀번호로 계정에 로그인할 수 있습니다.
            </p>
          </div>

          <div className={styles['resultActions']}>
            <Link className={styles['primaryLinkButton']} to={routePaths.login}>
              로그인하기
            </Link>
            <Link className={styles['secondaryLinkButton']} to={routePaths.home}>
              메인으로 가기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles['page']}>
      <div className={styles['shell']}>
        <h1 className={styles['title']}>아이디/비밀번호 찾기</h1>

        <div className={styles['tabList']} role='tablist' aria-label='계정 찾기 유형'>
          <button
            aria-selected={mode === 'findId'}
            className={classNames(
              styles['tabButton'],
              mode === 'findId' && styles['tabButtonActive'],
            )}
            onClick={() => {
              handleModeChange('findId');
            }}
            role='tab'
            type='button'
          >
            아이디 찾기
          </button>
          <button
            aria-selected={mode === 'resetPassword'}
            className={classNames(
              styles['tabButton'],
              mode === 'resetPassword' && styles['tabButtonActive'],
            )}
            onClick={() => {
              handleModeChange('resetPassword');
            }}
            role='tab'
            type='button'
          >
            비밀번호 찾기
          </button>
        </div>

        {mode === 'findId' ? (
          <form className={styles['form']} onSubmit={handleFindLoginIdSubmit}>
            <FieldRow
              errorMessage={formErrors.findIdName}
              label='이름'
              name='findIdName'
              onChange={handleFieldChange('findIdName')}
              placeholder='이름을 입력해주세요.'
              value={formValues.findIdName}
            />
            <FieldRow
              action={
                <button
                  className={styles['sideButton']}
                  disabled={sendFindIdSmsMutation.isPending}
                  onClick={handleSendFindIdSms}
                  type='button'
                >
                  {sendFindIdSmsMutation.isPending ? '확인 중' : '인증번호 받기'}
                </button>
              }
              errorMessage={formErrors.findIdPhoneNumber}
              inputClassName={styles['inputCompact']}
              inputMode='tel'
              label='휴대폰번호'
              messageAccessory={
                findIdSmsSent ? renderCountdownAccessory(findIdCountdownSeconds) : undefined
              }
              name='findIdPhoneNumber'
              onChange={handleFieldChange('findIdPhoneNumber')}
              placeholder='- 없이 숫자만 입력해주세요.'
              successMessage={findIdSmsSent ? '인증번호를 발송했습니다.' : undefined}
              type='tel'
              value={formValues.findIdPhoneNumber}
            />
            <FieldRow
              action={
                <button
                  className={classNames(
                    styles['sideButton'],
                    !findIdSmsSent && styles['sideButtonDisabled'],
                    findIdCodeVerified && styles['sideButtonConfirmed'],
                  )}
                  disabled={!findIdSmsSent}
                  onClick={handleVerifyFindIdCode}
                  type='button'
                >
                  {findIdCodeVerified ? '인증 완료' : '인증 확인'}
                </button>
              }
              errorMessage={formErrors.findIdCode}
              inputClassName={styles['inputCompact']}
              inputMode='numeric'
              label='인증번호'
              maxLength={6}
              name='findIdCode'
              onChange={handleFieldChange('findIdCode')}
              placeholder='인증번호 6자리를입력해주세요.'
              successMessage={findIdCodeVerified ? '인증이 완료되었습니다.' : undefined}
              value={formValues.findIdCode}
            />

            {foundLoginId ? (
              <p className={styles['resultText']}>회원님의 아이디는 {foundLoginId} 입니다.</p>
            ) : null}

            <button
              className={styles['submitButton']}
              disabled={findLoginIdMutation.isPending || sendFindIdSmsMutation.isPending}
              type='submit'
            >
              {findLoginIdMutation.isPending ? '확인 중' : '아이디 확인'}
            </button>
          </form>
        ) : (
          <form className={styles['form']} onSubmit={handlePasswordResetSubmit}>
            <FieldRow
              errorMessage={formErrors.resetPasswordLoginId}
              label='아이디'
              name='resetPasswordLoginId'
              onChange={handleFieldChange('resetPasswordLoginId')}
              placeholder='아이디를 입력해주세요.'
              value={formValues.resetPasswordLoginId}
            />
            <FieldRow
              action={
                <button
                  className={styles['sideButton']}
                  disabled={sendPasswordResetSmsMutation.isPending}
                  onClick={handleSendPasswordResetSms}
                  type='button'
                >
                  {sendPasswordResetSmsMutation.isPending ? '발송 중' : '인증번호 받기'}
                </button>
              }
              errorMessage={formErrors.resetPasswordPhoneNumber}
              inputClassName={styles['inputCompact']}
              inputMode='tel'
              label='휴대폰번호'
              messageAccessory={
                passwordResetSmsSent
                  ? renderCountdownAccessory(passwordResetCountdownSeconds)
                  : undefined
              }
              name='resetPasswordPhoneNumber'
              onChange={handleFieldChange('resetPasswordPhoneNumber')}
              placeholder='- 없이 숫자만 입력해주세요.'
              successMessage={passwordResetSmsSent ? '인증번호를 발송했습니다.' : undefined}
              type='tel'
              value={formValues.resetPasswordPhoneNumber}
            />
            <FieldRow
              action={
                <button
                  className={classNames(
                    styles['sideButton'],
                    !passwordResetSmsSent && styles['sideButtonDisabled'],
                    passwordResetCodeVerified && styles['sideButtonConfirmed'],
                  )}
                  disabled={!passwordResetSmsSent}
                  onClick={handleVerifyPasswordResetCode}
                  type='button'
                >
                  {passwordResetCodeVerified ? '인증 완료' : '인증 확인'}
                </button>
              }
              errorMessage={formErrors.resetPasswordCode}
              inputClassName={styles['inputCompact']}
              inputMode='numeric'
              label='인증번호'
              maxLength={6}
              name='resetPasswordCode'
              onChange={handleFieldChange('resetPasswordCode')}
              placeholder='인증번호 6자리를입력해주세요.'
              successMessage={passwordResetCodeVerified ? '인증이 완료되었습니다.' : undefined}
              value={formValues.resetPasswordCode}
            />

            <button
              className={styles['submitButton']}
              disabled={sendPasswordResetSmsMutation.isPending}
              type='submit'
            >
              비밀번호 재설정
            </button>
          </form>
        )}

        <div className={styles['linkRow']}>
          <Link className={styles['textLink']} to={routePaths.signup}>
            회원가입
          </Link>
          <span aria-hidden='true' className={styles['linkDivider']} />
          <Link className={styles['textLink']} to={routePaths.login}>
            로그인
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AccountRecoveryPage;
