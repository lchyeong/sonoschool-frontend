import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type { AdminPaymentCancelPayload, AdminPaymentCancelType } from '@/api/adminPayments';
import checkIconSrc from '@/assets/icons/lucide_check.svg';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';

import styles from './AdminConsolePage.module.scss';

const formatModalCurrency = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    currency: 'KRW',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
};

const formatAmountInput = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 0,
  }).format(value);
};

const parseAmountInput = (value: string): number | null => {
  const normalizedAmount = value.replace(/[^\d]/g, '');
  if (!normalizedAmount) {
    return null;
  }

  const parsedAmount = Number.parseInt(normalizedAmount, 10);
  return Number.isFinite(parsedAmount) ? parsedAmount : null;
};

interface AdminPaymentCancelModalProps {
  approvedAmount: number;
  buyerLabel?: string | undefined;
  detailsLoading?: boolean | undefined;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: AdminPaymentCancelPayload) => void;
  paymentLabel: string;
  remainingAmount: number;
}

export const AdminPaymentCancelModal = ({
  approvedAmount,
  buyerLabel,
  detailsLoading = false,
  loading,
  onClose,
  onSubmit,
  paymentLabel,
  remainingAmount,
}: AdminPaymentCancelModalProps) => {
  const [cancelType, setCancelType] = useState<AdminPaymentCancelType>('FULL');
  const [cancelAmount, setCancelAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const refundableAmount = Math.max(0, remainingAmount);
  const parsedCancelAmount = useMemo(() => parseAmountInput(cancelAmount), [cancelAmount]);
  const halfCancelAmount = useMemo(
    () => Math.floor(refundableAmount / 2 / 1000) * 1000,
    [refundableAmount],
  );
  const selectedQuickRate =
    cancelType === 'FULL'
      ? 'FULL'
      : halfCancelAmount > 0 && parsedCancelAmount === halfCancelAmount
        ? 'HALF'
        : null;

  const selectCancelType = (nextCancelType: AdminPaymentCancelType) => {
    setCancelType(nextCancelType);
    setErrorMessage(null);
    if (nextCancelType === 'FULL') {
      setCancelAmount('');
    }
  };

  const updateCancelAmount = (value: string) => {
    const parsedAmount = parseAmountInput(value);
    setCancelAmount(parsedAmount === null ? '' : formatAmountInput(parsedAmount));
    setErrorMessage(null);
  };

  const applyHalfCancelAmount = () => {
    if (halfCancelAmount <= 0) {
      setErrorMessage('50% 부분취소 금액을 계산할 수 없습니다.');
      return;
    }

    setCancelType('PARTIAL');
    setCancelAmount(formatAmountInput(halfCancelAmount));
    setErrorMessage(null);
  };

  const applyFullCancelAmount = () => {
    selectCancelType('FULL');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('취소 사유를 입력해 주세요.');
      return;
    }

    if (cancelType === 'PARTIAL') {
      if (
        parsedCancelAmount === null ||
        !Number.isFinite(parsedCancelAmount) ||
        parsedCancelAmount <= 0
      ) {
        setErrorMessage('부분취소 금액을 입력해 주세요.');
        return;
      }

      if (parsedCancelAmount >= refundableAmount) {
        setErrorMessage('부분취소 금액은 남은 결제 금액보다 작아야 합니다.');
        return;
      }

      if (parsedCancelAmount % 1000 !== 0) {
        setErrorMessage('부분취소 금액은 1,000원 단위로 입력해 주세요.');
        return;
      }
    }

    setErrorMessage(null);
    onSubmit({
      reason: trimmedReason,
      cancelType,
      ...(cancelType === 'PARTIAL' && parsedCancelAmount !== null
        ? { cancelAmount: parsedCancelAmount }
        : {}),
    });
  };

  return (
    <Modal
      bodyClassName={styles['adminActionModalContent']}
      headerClassName={styles['adminActionModalHeader']}
      onClose={onClose}
      panelClassName={styles['adminActionModalPanel']}
      size='md'
      title='결제 취소'
    >
      <form className={styles['adminActionModalBody']} noValidate onSubmit={handleSubmit}>
        <section className={styles['adminActionTarget']}>
          <strong>{paymentLabel}</strong>
          {buyerLabel ? <span>{buyerLabel}</span> : null}
        </section>

        <dl className={styles['adminActionSummaryGrid']}>
          <div>
            <dt>결제 금액</dt>
            <dd>{formatModalCurrency(approvedAmount)}</dd>
          </div>
          <div>
            <dt>취소 가능 금액</dt>
            <dd>{detailsLoading ? '확인 중' : formatModalCurrency(refundableAmount)}</dd>
          </div>
        </dl>

        <p className={styles['paymentDetailNotice']}>
          결제 취소를 실행하면 KCP 취소 요청과 내부 수강권 회수가 함께 진행됩니다.
        </p>

        <fieldset className={styles['adminActionChoiceGroup']}>
          <legend>취소 방식</legend>
          <label
            className={`${styles['checkboxRow']} ${styles['noticeCheckboxRow']} ${styles['adminActionChoice']}`}
            data-active={cancelType === 'FULL'}
          >
            <input
              checked={cancelType === 'FULL'}
              disabled={loading || detailsLoading}
              onChange={() => {
                selectCancelType('FULL');
              }}
              type='checkbox'
            />
            <span className={styles['noticeCheckboxBox']} aria-hidden='true'>
              {cancelType === 'FULL' ? <img alt='' src={checkIconSrc} /> : null}
            </span>
            <span className={styles['adminActionChoiceText']}>
              <strong>전액 취소</strong>
              <small>남은 결제 금액 전체를 취소합니다.</small>
            </span>
          </label>
          <label
            className={`${styles['checkboxRow']} ${styles['noticeCheckboxRow']} ${styles['adminActionChoice']}`}
            data-active={cancelType === 'PARTIAL'}
          >
            <input
              checked={cancelType === 'PARTIAL'}
              disabled={loading || detailsLoading || refundableAmount <= 0}
              onChange={() => {
                selectCancelType('PARTIAL');
              }}
              type='checkbox'
            />
            <span className={styles['noticeCheckboxBox']} aria-hidden='true'>
              {cancelType === 'PARTIAL' ? <img alt='' src={checkIconSrc} /> : null}
            </span>
            <span className={styles['adminActionChoiceText']}>
              <strong>부분 취소</strong>
              <small>입력한 금액만 취소하고 수강권은 즉시 회수합니다.</small>
            </span>
          </label>
        </fieldset>

        {cancelType === 'PARTIAL' ? (
          <div className={styles['adminActionAmountBlock']}>
            <TextField
              className={styles['adminActionField']}
              errorClassName={styles['adminActionAmountFieldError']}
              fieldClassName={styles['adminActionAmountField']}
              inputMode='numeric'
              label='부분취소 금액'
              name='cancelAmount'
              onChange={(event) => {
                updateCancelAmount(event.target.value);
              }}
              placeholder='1,000'
              type='text'
              value={cancelAmount}
            />
            <div className={styles['adminActionQuickRow']}>
              <label className={styles['adminActionQuickOption']}>
                <input
                  checked={selectedQuickRate === 'HALF'}
                  disabled={loading || detailsLoading || refundableAmount <= 1000}
                  name='paymentCancelQuickRate'
                  onChange={applyHalfCancelAmount}
                  type='radio'
                />
                <span className={styles['adminActionQuickRadioBox']} aria-hidden='true' />
                <span>50%</span>
              </label>
              <label className={styles['adminActionQuickOption']}>
                <input
                  checked={selectedQuickRate === 'FULL'}
                  disabled={loading || detailsLoading || refundableAmount <= 0}
                  name='paymentCancelQuickRate'
                  onChange={applyFullCancelAmount}
                  type='radio'
                />
                <span className={styles['adminActionQuickRadioBox']} aria-hidden='true' />
                <span>100%</span>
              </label>
            </div>
          </div>
        ) : null}

        <TextAreaField
          className={styles['paymentCancelReasonField']}
          label='취소 사유'
          name='paymentCancelReason'
          onChange={(event) => {
            setReason(event.target.value);
            setErrorMessage(null);
          }}
          value={reason}
        />

        {errorMessage ? <p className={styles['adminActionError']}>{errorMessage}</p> : null}

        <div className={styles['adminActionFooter']}>
          <Button disabled={loading} onClick={onClose} type='button' variant='secondary'>
            닫기
          </Button>
          <Button
            disabled={loading || detailsLoading || refundableAmount <= 0}
            type='submit'
            variant='danger'
          >
            {loading ? '취소 처리 중...' : '결제 취소'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface EnrollmentRevokeModalProps {
  description?: string | undefined;
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  targetLabel: string;
}

export const EnrollmentRevokeModal = ({
  description,
  loading,
  onClose,
  onSubmit,
  targetLabel,
}: EnrollmentRevokeModalProps) => {
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('수강권 회수 사유를 입력해 주세요.');
      return;
    }

    setErrorMessage(null);
    onSubmit(trimmedReason);
  };

  return (
    <Modal
      bodyClassName={styles['adminActionModalContent']}
      headerClassName={styles['adminActionModalHeader']}
      onClose={onClose}
      panelClassName={styles['adminActionModalPanel']}
      size='md'
      title='수강권 회수'
    >
      <form className={styles['adminActionModalBody']} noValidate onSubmit={handleSubmit}>
        <section className={styles['adminActionTarget']}>
          <strong>{targetLabel}</strong>
          {description ? <span>{description}</span> : null}
        </section>

        <p className={styles['paymentDetailNotice']}>
          수강권 회수 후 해당 수강생은 강의, 자료실, 수강평 작성 권한을 사용할 수 없습니다.
        </p>

        <TextAreaField
          className={styles['paymentCancelReasonField']}
          label='회수 사유'
          name='enrollmentRevokeReason'
          onChange={(event) => {
            setReason(event.target.value);
            setErrorMessage(null);
          }}
          value={reason}
        />

        {errorMessage ? <p className={styles['adminActionError']}>{errorMessage}</p> : null}

        <div className={styles['adminActionFooter']}>
          <Button disabled={loading} onClick={onClose} type='button' variant='secondary'>
            닫기
          </Button>
          <Button disabled={loading} type='submit' variant='danger'>
            {loading ? '회수 중...' : '수강권 회수'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
