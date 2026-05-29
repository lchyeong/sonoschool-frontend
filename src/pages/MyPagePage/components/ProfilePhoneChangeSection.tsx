import type { CSSProperties, ChangeEvent } from 'react';
import { useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/errors';
import { sendMyPhoneVerification, verifyMyPhoneChange } from '@/api/mypage';
import { myProfileQueryKey } from '@/query/useMyPageQueries';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { SmsSendResponse } from '@/types/auth';

import styles from '../MyPagePage.module.scss';

type PhoneVerificationStep = 'send' | 'verify';

interface PhoneFormErrors {
  phoneNumber?: string;
  code?: string;
}

interface ProfilePhoneChangeSectionProps {
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  verifiedIconStyle: CSSProperties;
}

const PHONE_ALREADY_EXISTS_ERROR_MESSAGE = '이미 등록된 휴대폰 번호입니다.';
const PHONE_UNCHANGED_ERROR_MESSAGE = '현재 사용 중인 휴대폰 번호입니다.';
const PHONE_NUMBER_INVALID_ERROR_MESSAGE = '휴대폰 번호를 확인해주세요.';
const PHONE_CHANGE_REQUEST_INVALID_ERROR_MESSAGE = '휴대폰 인증을 다시 진행해 주세요.';
const PHONE_VERIFICATION_CODE_ERROR_MESSAGE = '인증번호를 확인해주세요.';
const PHONE_VERIFICATION_SEND_COOLDOWN_MESSAGE =
  '인증번호는 3분에 한 번만 요청할 수 있습니다. 잠시 후 다시 시도해 주세요.';
const PHONE_VERIFICATION_SEND_LIMIT_MESSAGE =
  '인증번호 요청 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
const PHONE_VERIFICATION_LIMIT_SECONDS = 180;

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

const omitPhoneFormError = (
  errors: PhoneFormErrors,
  fieldName: keyof PhoneFormErrors,
): PhoneFormErrors => {
  const { [fieldName]: omittedField, ...nextErrors } = errors;
  void omittedField;
  return nextErrors;
};

const normalizePhoneDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('82') ? `0${digits.slice(2)}` : digits;
};

const getPhoneNumberValidationError = (value: string): string | null => {
  return /^01\d{8,9}$/.test(normalizePhoneDigits(value))
    ? null
    : PHONE_NUMBER_INVALID_ERROR_MESSAGE;
};

const getPhoneCodeValidationError = (value: string): string | null => {
  return /^\d{6}$/.test(value.trim()) ? null : PHONE_VERIFICATION_CODE_ERROR_MESSAGE;
};

const resolvePhoneFormApiError = (
  error: unknown,
  step: PhoneVerificationStep,
): {
  message: string;
  fieldErrors: PhoneFormErrors;
} => {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      message: error instanceof Error ? error.message : '휴대폰 번호를 처리하지 못했습니다.',
    };
  }

  switch (error.code) {
    case 'AUTH_400_SMS_PHONE':
      return {
        fieldErrors: { phoneNumber: PHONE_NUMBER_INVALID_ERROR_MESSAGE },
        message: PHONE_NUMBER_INVALID_ERROR_MESSAGE,
      };
    case 'AUTH_429_SMS_SEND':
      return {
        fieldErrors: { phoneNumber: PHONE_VERIFICATION_SEND_COOLDOWN_MESSAGE },
        message: PHONE_VERIFICATION_SEND_COOLDOWN_MESSAGE,
      };
    case 'AUTH_429_SMS_SEND_LIMIT':
      return {
        fieldErrors: { phoneNumber: PHONE_VERIFICATION_SEND_LIMIT_MESSAGE },
        message: PHONE_VERIFICATION_SEND_LIMIT_MESSAGE,
      };
    case 'GLOBAL_400':
      return step === 'send'
        ? {
            fieldErrors: { phoneNumber: PHONE_NUMBER_INVALID_ERROR_MESSAGE },
            message: PHONE_NUMBER_INVALID_ERROR_MESSAGE,
          }
        : {
            fieldErrors: { code: PHONE_VERIFICATION_CODE_ERROR_MESSAGE },
            message: PHONE_VERIFICATION_CODE_ERROR_MESSAGE,
          };
    case 'USER_400_PHONE':
      return {
        fieldErrors: { phoneNumber: PHONE_ALREADY_EXISTS_ERROR_MESSAGE },
        message: PHONE_ALREADY_EXISTS_ERROR_MESSAGE,
      };
    case 'USER_400_PHONE_UNCHANGED':
      return {
        fieldErrors: { phoneNumber: PHONE_UNCHANGED_ERROR_MESSAGE },
        message: PHONE_UNCHANGED_ERROR_MESSAGE,
      };
    case 'USER_400_PHONE_CHANGE_REQUEST':
      return {
        fieldErrors: { phoneNumber: PHONE_CHANGE_REQUEST_INVALID_ERROR_MESSAGE },
        message: PHONE_CHANGE_REQUEST_INVALID_ERROR_MESSAGE,
      };
    case 'AUTH_400_SMS_CODE':
    case 'AUTH_400_SMS_EXPIRED':
    case 'AUTH_429_SMS_ATTEMPTS':
      return {
        fieldErrors: { code: PHONE_VERIFICATION_CODE_ERROR_MESSAGE },
        message: PHONE_VERIFICATION_CODE_ERROR_MESSAGE,
      };
    default:
      return {
        fieldErrors: {},
        message: error.message,
      };
  }
};

const ProfilePhoneChangeSection = ({
  phoneNumber,
  phoneVerifiedAt,
  verifiedIconStyle,
}: ProfilePhoneChangeSectionProps) => {
  const queryClient = useQueryClient();
  const syncProfileSnapshot = useAuthStore((state) => state.syncProfileSnapshot);
  const showToast = useToastStore((state) => state.showToast);
  const [phoneFormValues, setPhoneFormValues] = useState({
    phoneNumber: '',
    code: '',
  });
  const [phoneFormErrors, setPhoneFormErrors] = useState<PhoneFormErrors>({});
  const [sentVerification, setSentVerification] = useState<SmsSendResponse | null>(null);
  const [phoneCountdownSeconds, setPhoneCountdownSeconds] = useState(0);
  const isPhoneVerificationExpired = sentVerification !== null && phoneCountdownSeconds === 0;

  useEffect(() => {
    if (!sentVerification || phoneCountdownSeconds === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setPhoneCountdownSeconds((current) => {
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
  }, [phoneCountdownSeconds, sentVerification]);

  const sendPhoneVerificationMutation = useMutation({
    mutationFn: sendMyPhoneVerification,
    onError: (error: unknown) => {
      const { fieldErrors, message } = resolvePhoneFormApiError(error, 'send');
      setPhoneFormErrors(fieldErrors);
      setSentVerification(null);
      setPhoneCountdownSeconds(0);
      showToast({
        message,
        variant: 'error',
      });
    },
    onSuccess: (response) => {
      setSentVerification(response);
      setPhoneCountdownSeconds(
        Math.min(PHONE_VERIFICATION_LIMIT_SECONDS, getRemainingSeconds(response.expiresAt)),
      );
      setPhoneFormErrors({});
      showToast({
        message: '인증번호를 발송했습니다.',
        variant: 'success',
      });
    },
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: verifyMyPhoneChange,
    onError: (error: unknown) => {
      const { fieldErrors, message } = resolvePhoneFormApiError(error, 'verify');
      setPhoneFormErrors(fieldErrors);
      showToast({
        message,
        variant: 'error',
      });
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(myProfileQueryKey, updatedProfile);
      syncProfileSnapshot({
        displayName: updatedProfile.displayName,
        loginId: updatedProfile.loginId,
        role: updatedProfile.role,
      });
      setPhoneFormValues({
        code: '',
        phoneNumber: '',
      });
      setPhoneFormErrors({});
      setSentVerification(null);
      setPhoneCountdownSeconds(0);
      showToast({
        message: '휴대폰 번호를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const handlePhoneFieldChange =
    (fieldName: 'phoneNumber' | 'code') => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setPhoneFormValues((currentValues) => ({
        ...currentValues,
        [fieldName]: nextValue,
      }));
      setPhoneFormErrors((currentErrors) => omitPhoneFormError(currentErrors, fieldName));

      if (fieldName === 'phoneNumber') {
        setSentVerification(null);
        setPhoneCountdownSeconds(0);
      }
    };

  const handleSendPhoneVerification = () => {
    const nextPhoneNumber = phoneFormValues.phoneNumber.trim();
    const phoneNumberError = getPhoneNumberValidationError(nextPhoneNumber);

    if (phoneNumberError) {
      setSentVerification(null);
      setPhoneCountdownSeconds(0);
      setPhoneFormErrors((currentErrors) => ({
        ...omitPhoneFormError(currentErrors, 'code'),
        phoneNumber: phoneNumberError,
      }));
      showToast({
        message: phoneNumberError,
        variant: 'error',
      });
      return;
    }

    setSentVerification(null);
    setPhoneCountdownSeconds(0);
    sendPhoneVerificationMutation.mutate({ phoneNumber: nextPhoneNumber });
  };

  const handleVerifyPhoneChange = () => {
    const nextPhoneNumber = phoneFormValues.phoneNumber.trim();
    const code = phoneFormValues.code.trim();
    const phoneNumberError = getPhoneNumberValidationError(nextPhoneNumber);
    const codeError = getPhoneCodeValidationError(code);

    if (phoneNumberError || codeError) {
      setPhoneFormErrors({
        ...(phoneNumberError ? { phoneNumber: phoneNumberError } : {}),
        ...(codeError ? { code: codeError } : {}),
      });
      showToast({
        message: phoneNumberError ?? codeError ?? '입력값을 확인해주세요.',
        variant: 'error',
      });
      return;
    }

    verifyPhoneMutation.mutate({
      code,
      phoneNumber: nextPhoneNumber,
    });
  };

  return (
    <div className={styles['profilePhoneBlock']}>
      <div className={styles['profileFormRows']}>
        <div className={styles['profileStaticRow']}>
          <span className={styles['profileRowLabel']}>현재 휴대폰번호</span>
          <strong className={styles['profileStaticValue']}>{phoneNumber || '-'}</strong>
        </div>

        <div className={styles['profileStaticRow']}>
          <span className={styles['profileRowLabel']}>휴대폰 인증 상태</span>
          {phoneVerifiedAt ? (
            <span aria-label='휴대폰 인증 완료' className={styles['profileVerifiedBadge']}>
              <span
                aria-hidden='true'
                className={styles['profileVerifiedIcon']}
                style={verifiedIconStyle}
              />
              인증 완료
            </span>
          ) : (
            <span className={styles['profileUnverifiedText']}>휴대폰 인증 필요</span>
          )}
        </div>

        <div className={styles['profileFormRow']}>
          <label className={styles['profileRowLabel']} htmlFor='profile_new_phone'>
            새 휴대폰번호
          </label>
          <div className={styles['profilePhoneFieldGroup']}>
            <input
              aria-describedby={phoneFormErrors.phoneNumber ? 'profile_new_phone_error' : undefined}
              aria-invalid={Boolean(phoneFormErrors.phoneNumber)}
              className={styles['profileInlineInput']}
              id='profile_new_phone'
              inputMode='tel'
              name='phoneNumber'
              onChange={handlePhoneFieldChange('phoneNumber')}
              placeholder='- 없이 숫자만 입력해주세요'
              type='tel'
              value={phoneFormValues.phoneNumber}
            />
            {phoneFormErrors.phoneNumber ? (
              <p className={styles['profileFieldErrorText']} id='profile_new_phone_error'>
                {phoneFormErrors.phoneNumber}
              </p>
            ) : null}
          </div>
          <button
            className={styles['profileOutlineButton']}
            disabled={
              sendPhoneVerificationMutation.isPending ||
              phoneFormValues.phoneNumber.trim().length === 0 ||
              (sentVerification !== null && !isPhoneVerificationExpired)
            }
            onClick={handleSendPhoneVerification}
            type='button'
          >
            {sendPhoneVerificationMutation.isPending
              ? '발송 중...'
              : sentVerification && !isPhoneVerificationExpired
                ? '발송 완료'
                : '인증번호 받기'}
          </button>
        </div>

        <div className={styles['profileFormRow']}>
          <label className={styles['profileRowLabel']} htmlFor='profile_phone_code'>
            인증번호 입력
          </label>
          <div className={styles['profilePhoneFieldGroup']}>
            <input
              aria-describedby={
                phoneFormErrors.code || sentVerification ? 'profile_phone_code_status' : undefined
              }
              aria-invalid={Boolean(phoneFormErrors.code)}
              className={styles['profileInlineInput']}
              id='profile_phone_code'
              inputMode='numeric'
              maxLength={6}
              name='code'
              onChange={handlePhoneFieldChange('code')}
              pattern='[0-9]{6}'
              placeholder='인증번호 6자리를입력해주세요'
              value={phoneFormValues.code}
            />
            {phoneFormErrors.code ? (
              <p className={styles['profileFieldErrorText']} id='profile_phone_code_status'>
                {phoneFormErrors.code}
              </p>
            ) : sentVerification ? (
              <p className={styles['profileAssistText']} id='profile_phone_code_status'>
                {isPhoneVerificationExpired
                  ? '인증 시간이 만료되었습니다. 다시 발송해 주세요.'
                  : `남은 시간 ${formatRemainingTimeLabel(phoneCountdownSeconds)}`}
              </p>
            ) : null}
          </div>
          <button
            className={styles['profileDisabledButton']}
            disabled={
              verifyPhoneMutation.isPending ||
              isPhoneVerificationExpired ||
              phoneFormValues.phoneNumber.trim().length === 0 ||
              phoneFormValues.code.trim().length !== 6
            }
            onClick={handleVerifyPhoneChange}
            type='button'
          >
            {verifyPhoneMutation.isPending ? '변경 중...' : '번호 변경'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhoneChangeSection;
