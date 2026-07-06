import type { ChangeEvent, CSSProperties, FormEvent, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import clockIconSrc from '@/assets/icons/lucide_clock_sono.svg';
import closeIconSrc from '@/assets/icons/lucide_x.svg';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { classNames } from '@/utils/classNames';

import styles from './SmsVerificationModal.module.scss';

const SMS_CODE_LENGTH = 6;

type SmsModalIconStyle = CSSProperties & {
  '--sms-modal-close-icon': string;
};

interface SmsVerificationModalProps {
  activeHint: ReactNode;
  challengeExpiresAt: string;
  code: string;
  description: ReactNode;
  errorMessage?: string | null;
  expiredHint: ReactNode;
  isResending?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onCodeChange: (code: string) => void;
  onResend: () => void;
  onSubmit: (code: string) => void;
  resetLabel?: string;
  secondaryAction?: ReactNode;
  submitLabel?: string;
  submittingLabel?: string;
  summary: ReactNode;
  title: string;
}

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

const SmsVerificationModal = ({
  activeHint,
  challengeExpiresAt,
  code,
  description,
  errorMessage = null,
  expiredHint,
  isResending = false,
  isSubmitting = false,
  onClose,
  onCodeChange,
  onResend,
  onSubmit,
  resetLabel = '다시 입력',
  secondaryAction,
  submitLabel = '문자 인증 확인',
  submittingLabel = '확인 중...',
  summary,
  title,
}: SmsVerificationModalProps) => {
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const codeBoxRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [challengeCountdownSeconds, setChallengeCountdownSeconds] = useState(() =>
    getRemainingSeconds(challengeExpiresAt),
  );
  const codeDigits = useMemo(
    () => Array.from({ length: SMS_CODE_LENGTH }, (_, index) => code[index] ?? ''),
    [code],
  );
  const isChallengeActive = challengeCountdownSeconds > 0;

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      codeBoxRefs.current[0]?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [challengeExpiresAt]);

  useEffect(() => {
    if (challengeCountdownSeconds === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setChallengeCountdownSeconds((current) => {
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
  }, [challengeCountdownSeconds]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (code.length !== SMS_CODE_LENGTH || !isChallengeActive || isSubmitting) {
      return;
    }

    onSubmit(code);
  };

  const handleCodeBoxChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextDigits = event.target.value.replace(/\D/g, '').slice(0, SMS_CODE_LENGTH);
    if (!nextDigits) {
      const currentDigits = codeDigits.slice();
      currentDigits[index] = '';
      onCodeChange(currentDigits.join('').slice(0, SMS_CODE_LENGTH));
      return;
    }

    const currentDigits = codeDigits.slice();
    nextDigits.split('').forEach((digit, digitIndex) => {
      const targetIndex = index + digitIndex;
      if (targetIndex < SMS_CODE_LENGTH) {
        currentDigits[targetIndex] = digit;
      }
    });

    const nextCode = currentDigits.join('').slice(0, SMS_CODE_LENGTH);
    const nextFocusIndex = Math.min(index + nextDigits.length, SMS_CODE_LENGTH - 1);
    onCodeChange(nextCode);
    window.setTimeout(() => {
      codeBoxRefs.current[nextFocusIndex]?.focus();
    }, 0);
  };

  const handleCodeBoxKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      event.preventDefault();
      codeBoxRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      codeBoxRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < SMS_CODE_LENGTH - 1) {
      event.preventDefault();
      codeBoxRefs.current[index + 1]?.focus();
    }
  };

  return (
    <Modal
      bodyClassName={styles['smsModalBody']}
      closeButtonClassName={styles['smsModalCloseButton']}
      closeButtonContent={
        <span
          aria-hidden='true'
          className={styles['smsModalCloseIcon']}
          style={{ '--sms-modal-close-icon': `url("${closeIconSrc}")` } as SmsModalIconStyle}
        />
      }
      headerClassName={styles['smsModalHeader']}
      onClose={onClose}
      panelClassName={styles['smsModalPanel']}
      title={title}
      titleClassName={styles['smsModalTitle']}
    >
      <form className={styles['smsModalForm']} noValidate onSubmit={handleSubmit}>
        <p className={styles['smsModalDescription']}>{description}</p>
        <p className={styles['challengeSummary']}>{summary}</p>
        <p className={styles['challengeHint']}>{isChallengeActive ? activeHint : expiredHint}</p>
        <div className={styles['smsModalCodeHeader']}>
          <label className={styles['smsModalCodeLabel']} htmlFor='sms_verification_code_0'>
            인증번호
          </label>
          <div className={styles['smsModalTimerGroup']}>
            <span aria-hidden='true' className={styles['smsModalTimerIconSlot']}>
              <img alt='' className={styles['smsModalTimerIcon']} src={clockIconSrc} />
            </span>
            <span className={styles['smsModalTimerText']}>
              {formatRemainingTimeLabel(challengeCountdownSeconds)}
            </span>
            <span aria-hidden='true' className={styles['smsModalDivider']} />
            <button
              className={styles['smsModalResendButton']}
              disabled={isResending || challengeCountdownSeconds > 0}
              onClick={onResend}
              type='button'
            >
              {challengeCountdownSeconds > 0 ? '재전송 대기' : '재전송'}
            </button>
          </div>
        </div>
        <div className={styles['smsModalCodeGrid']}>
          {codeDigits.map((digit, index) => (
            <input
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              className={classNames(
                styles['smsModalCodeInput'],
                digit && styles['smsModalCodeInputFilled'],
                errorMessage && styles['smsModalCodeInputError'],
              )}
              id={`sms_verification_code_${String(index)}`}
              inputMode='numeric'
              key={index}
              maxLength={1}
              onChange={handleCodeBoxChange(index)}
              onKeyDown={handleCodeBoxKeyDown(index)}
              ref={(element) => {
                codeBoxRefs.current[index] = element;
                if (index === 0) {
                  codeInputRef.current = element;
                }
              }}
              type='text'
              value={digit}
            />
          ))}
        </div>
        <p
          aria-hidden={!errorMessage}
          className={classNames(
            styles['smsModalError'],
            !errorMessage && styles['smsModalErrorHidden'],
          )}
          role={errorMessage ? 'alert' : undefined}
        >
          {errorMessage ?? '인증번호를 확인해주세요.'}
        </p>
        <Button
          className={styles['smsModalSubmitButton']}
          disabled={isSubmitting || code.length !== SMS_CODE_LENGTH || !isChallengeActive}
          type='submit'
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        <Button
          className={styles['smsModalResetButton']}
          onClick={onClose}
          type='button'
          variant='secondary'
        >
          {resetLabel}
        </Button>
        {secondaryAction ? (
          <div className={styles['smsModalSecondaryAction']}>{secondaryAction}</div>
        ) : null}
      </form>
    </Modal>
  );
};

export default SmsVerificationModal;
