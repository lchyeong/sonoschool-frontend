import { Link, Navigate, useSearchParams } from 'react-router-dom';

import congraturationIconSrc from '@/assets/icons/icon_congraturation.png';
import { LoadingSpinner } from '@/components/feedback/Loading/LoadingSpinner';
import { usePaymentResultQuery } from '@/query/usePaymentResultQuery';
import { routePaths } from '@/routes/routeRegistry';
import sharedStyles from '@/styles/accountPage.module.scss';
import {
  formatPaymentMethodLabel,
  paymentStatusLabels,
  type PaymentResult,
  type PaymentStatus,
} from '@/types/payment';
import { classNames } from '@/utils/classNames';

import styles from './PaymentResultPage.module.scss';

const knownStatuses = new Set<PaymentStatus>([
  'PENDING',
  'REGISTERED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
const pendingStatuses = new Set<PaymentStatus>(['PENDING', 'REGISTERED']);
const retryRedirectStatuses = new Set<PaymentStatus>(['PENDING', 'REGISTERED', 'CANCELLED']);

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
        description: fallbackMessage ?? '결제 승인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
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
        title: '결제가 완료되지 않았습니다.',
        description:
          fallbackMessage ??
          '결제창이 닫혔거나 승인 절차가 끝나지 않았습니다. 장바구니로 돌아가 다시 결제를 진행해 주세요.',
      };
    default:
      return {
        title: '결제 결과를 확인하는 중입니다.',
        description:
          fallbackMessage ?? '결제 결과 정보를 읽지 못했습니다. 잠시 후 다시 접속해 주세요.',
      };
  }
};

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const formatCurrency = (value: number | null | undefined) => {
  if (typeof value !== 'number') {
    return '-';
  }
  return `${currencyFormatter.format(value)}원`;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('ko-KR');
};

const formatOrderTypeLabel = (value: PaymentResult['orderType'] | null) => {
  if (value === 'CART_CHECKOUT') {
    return '장바구니 결제';
  }
  if (value === 'PROGRAM') {
    return '단일 강의 결제';
  }
  return '-';
};

const resolveProcessedAt = (
  payment: PaymentResult | null,
  fallbackStatus: PaymentStatus | null,
) => {
  if (!payment) {
    return null;
  }

  switch (payment.status) {
    case 'COMPLETED':
      return payment.paidAt ?? payment.registeredAt ?? payment.requestedAt;
    case 'CANCELLED':
      return payment.cancelledAt ?? payment.paidAt ?? payment.requestedAt;
    case 'FAILED':
      return payment.failedAt ?? payment.requestedAt;
    case 'REGISTERED':
      return payment.registeredAt ?? payment.requestedAt;
    case 'PENDING':
      return payment.requestedAt;
    default:
      return fallbackStatus ? payment.requestedAt : null;
  }
};

const buildDetailItems = (
  payment: PaymentResult | null,
  resolvedStatus: PaymentStatus | null,
) => {
  if (resolvedStatus && pendingStatuses.has(resolvedStatus)) {
    return [];
  }

  if (!payment && !resolvedStatus) {
    return [];
  }

  const detailItems: Array<{ key: string; label: string; value: string; muted?: boolean }> = [];

  if (payment?.orderName) {
    detailItems.push({
      key: 'order-name',
      label: '주문명',
      value: payment.orderName,
    });
  }

  if (payment?.orderType) {
    detailItems.push({
      key: 'order-type',
      label: '주문 유형',
      value: formatOrderTypeLabel(payment.orderType),
    });
  }

  if (payment?.paymentMethod) {
    detailItems.push({
      key: 'payment-method',
      label: '결제 수단',
      value: formatPaymentMethodLabel(payment.paymentMethod),
    });
  }

  if (payment) {
    detailItems.push({
      key: 'payment-amount',
      label: payment.status === 'CANCELLED' ? '취소 금액' : '결제 금액',
      value: formatCurrency(payment.approvedAmount ?? payment.amount),
    });
  }

  if (payment?.status || resolvedStatus) {
    detailItems.push({
      key: 'status',
      label: '상태',
      value: paymentStatusLabels[payment?.status ?? resolvedStatus ?? 'PENDING'],
    });
  }

  const processedAt = resolveProcessedAt(payment, resolvedStatus);
  if (processedAt) {
    detailItems.push({
      key: 'processed-at',
      label: '처리 시각',
      value: formatDateTime(processedAt),
    });
  }

  if (payment?.cancelReason) {
    detailItems.push({
      key: 'cancel-reason',
      label: '취소 사유',
      value: payment.cancelReason,
      muted: true,
    });
  }

  return detailItems;
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
  const isPendingResult = resolvedStatus ? pendingStatuses.has(resolvedStatus) : false;
  const statusCopy = getStatusCopy(resolvedStatus, fallbackMessage);
  const detailItems = buildDetailItems(payment, resolvedStatus);
  const shouldRedirectToCheckout =
    payment === null &&
    resolvedStatus !== null &&
    retryRedirectStatuses.has(resolvedStatus);

  if (shouldRedirectToCheckout) {
    return <Navigate replace to={routePaths.checkout} />;
  }

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
                결제 결과를 바로 확인하지 못했습니다. 내 결제 내역에서 다시 확인해 주세요.
              </p>
            ) : null}
          </header>

          {detailItems.length ? (
            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>결제 정보</h2>
                <p className={sharedStyles['sectionDescription']}>
                  결제 상태와 주문 정보를 다시 확인할 수 있습니다.
                </p>
              </div>
              <div className={styles['detailGrid']}>
                {detailItems.map((item) => (
                  <div className={styles['detailItem']} key={item.key}>
                    <span className={styles['detailLabel']}>{item.label}</span>
                    <strong
                      className={classNames(
                        styles['detailValue'],
                        item.muted && styles['detailValueMuted'],
                      )}
                    >
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className={styles['actions']}>
            {resolvedStatus === 'COMPLETED' ? (
              <Link to={routePaths.mypage}>내 강의로 이동</Link>
            ) : null}
            {isPendingResult ? <Link to={routePaths.checkout}>결제 다시 시도</Link> : null}
            {isPendingResult ? <Link to={routePaths.cart}>장바구니로 돌아가기</Link> : null}
            <Link to={routePaths.home}>홈으로 이동</Link>
            {resolvedStatus === 'COMPLETED' && payment?.receiptUrl ? (
              <a href={payment.receiptUrl} rel='noreferrer' target='_blank'>
                영수증 보기
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentResultPage;
