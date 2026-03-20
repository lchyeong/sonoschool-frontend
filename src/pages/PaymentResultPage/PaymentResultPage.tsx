import { useSearchParams } from 'react-router-dom';

import congraturationIconSrc from '@/assets/icons/icon_congraturation.png';
import { LoadingSpinner } from '@/components/feedback/Loading/LoadingSpinner';
import { usePaymentResultQuery } from '@/query/usePaymentResultQuery';
import sharedStyles from '@/styles/accountPage.module.scss';
import { type PaymentStatus } from '@/types/payment';
import { classNames } from '@/utils/classNames';

import styles from './PaymentResultPage.module.scss';

const knownStatuses = new Set<PaymentStatus>([
  'PENDING',
  'REGISTERED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

const parsePaymentId = (value: string | null): number | null => {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeStatus = (value: string | null): PaymentStatus | null => {
  if (!value || !knownStatuses.has(value as PaymentStatus)) {
    return null;
  }

  return value as PaymentStatus;
};

const getStatusCopy = (status: PaymentStatus | null, fallbackMessage: string | null) => {
  switch (status) {
    case 'COMPLETED':
      return {
        title: '결제가 완료되었습니다.',
        description:
          fallbackMessage ??
          '결제가 정상 승인되었습니다. 내 강의실과 결제 내역에서 이어서 확인할 수 있습니다.',
      };
    case 'FAILED':
      return {
        title: '결제가 완료되지 않았습니다.',
        description:
          fallbackMessage ?? '결제 승인에 실패했습니다. 결제 정보를 확인한 뒤 다시 시도해 주세요.',
      };
    case 'CANCELLED':
      return {
        title: '결제가 취소되었습니다.',
        description:
          fallbackMessage ?? '취소 처리된 결제입니다. 필요하면 다시 결제를 진행해 주세요.',
      };
    case 'PENDING':
    case 'REGISTERED':
      return {
        title: '결제 결과를 확인하고 있습니다.',
        description:
          fallbackMessage ?? '결제 상태가 아직 확정되지 않았습니다. 잠시 후 다시 확인해 주세요.',
      };
    default:
      return {
        title: '결제 결과를 확인하는 중입니다.',
        description:
          fallbackMessage ?? '결제 결과 정보를 읽지 못했습니다. 잠시 후 다시 접속해 주세요.',
      };
  }
};

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const paymentId = parsePaymentId(searchParams.get('paymentId'));
  const resultToken = searchParams.get('resultToken')?.trim() || null;
  const fallbackStatus = normalizeStatus(searchParams.get('status'));
  const fallbackMessage = searchParams.get('message')?.trim() || null;

  const paymentQuery = usePaymentResultQuery(paymentId, resultToken);
  const payment = paymentQuery.data ?? null;
  const resolvedStatus = payment?.status ?? fallbackStatus;
  const statusCopy = getStatusCopy(resolvedStatus, fallbackMessage);
  const errorMessage =
    paymentQuery.error instanceof Error
      ? paymentQuery.error.message
      : '결제 상세 조회에 실패했습니다.';

  return (
    <section className={sharedStyles['page']}>
      <div className={classNames(sharedStyles['shell'], sharedStyles['shellNarrow'])}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={classNames(sharedStyles['header'], styles['hero'])}>
            {resolvedStatus === 'COMPLETED' ? (
              <img
                alt=''
                aria-hidden='true'
                className={styles['heroIcon']}
                src={congraturationIconSrc}
              />
            ) : null}
            <h1 className={sharedStyles['title']}>{statusCopy.title}</h1>
            <p className={sharedStyles['description']}>{statusCopy.description}</p>
            {(paymentId !== null || resultToken !== null) && paymentQuery.isPending ? (
              <div aria-live='polite'>
                <LoadingSpinner />
              </div>
            ) : null}
            {(paymentId !== null || resultToken !== null) && paymentQuery.isError ? (
              <p className={styles['helperText']}>
                상세 조회는 실패했지만 현재 전달받은 결과 기준으로 화면을 표시합니다. {errorMessage}
              </p>
            ) : null}
          </header>
        </div>
      </div>
    </section>
  );
};

export default PaymentResultPage;
