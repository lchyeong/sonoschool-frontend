import { Link, useSearchParams } from 'react-router-dom';

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

const formatDateTime = (value: string | null): string | null => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatPrice = (amount: number): string => {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
};

const getStatusCopy = (status: PaymentStatus | null, fallbackMessage: string | null) => {
  switch (status) {
    case 'COMPLETED':
      return {
        badgeTone: 'success' as const,
        badgeText: 'Completed',
        title: '결제가 완료되었습니다.',
        description:
          fallbackMessage ??
          '결제가 정상 승인되었습니다. 내 강의실과 결제 내역에서 이어서 확인할 수 있습니다.',
      };
    case 'FAILED':
      return {
        badgeTone: 'danger' as const,
        badgeText: 'Failed',
        title: '결제가 완료되지 않았습니다.',
        description:
          fallbackMessage ?? '결제 승인에 실패했습니다. 결제 정보를 확인한 뒤 다시 시도해 주세요.',
      };
    case 'CANCELLED':
      return {
        badgeTone: 'danger' as const,
        badgeText: 'Cancelled',
        title: '결제가 취소되었습니다.',
        description:
          fallbackMessage ?? '취소 처리된 결제입니다. 필요하면 다시 결제를 진행해 주세요.',
      };
    case 'PENDING':
    case 'REGISTERED':
      return {
        badgeTone: 'neutral' as const,
        badgeText: 'Pending',
        title: '결제 결과를 확인하고 있습니다.',
        description:
          fallbackMessage ?? '결제 상태가 아직 확정되지 않았습니다. 잠시 후 다시 확인해 주세요.',
      };
    default:
      return {
        badgeTone: 'neutral' as const,
        badgeText: 'Unknown',
        title: '결제 결과를 확인하는 중입니다.',
        description:
          fallbackMessage ?? '결제 결과 정보를 읽지 못했습니다. 잠시 후 다시 접속해 주세요.',
      };
  }
};

const buildDetailItems = (
  payment: PaymentResult | null,
  fallbackStatus: PaymentStatus | null,
  fallbackGatewayOrderId: string | null,
  fallbackCode: string | null,
) => {
  const resolvedStatus = payment?.status ?? fallbackStatus;
  const gatewayOrderId = payment === null ? fallbackGatewayOrderId : payment.gatewayOrderId;
  const gatewayTid = payment === null ? null : payment.gatewayTid;
  const gatewayResponseCode =
    payment === null ? fallbackCode : (payment.gatewayResponseCode ?? fallbackCode);
  const approvedAt =
    formatDateTime(payment?.paidAt ?? null) ??
    formatDateTime(payment?.failedAt ?? null) ??
    formatDateTime(payment?.cancelledAt ?? null) ??
    formatDateTime(payment?.registeredAt ?? null) ??
    formatDateTime(payment?.requestedAt ?? null);

  return [
    {
      label: '결제 상태',
      value: resolvedStatus ? paymentStatusLabels[resolvedStatus] : '확인 필요',
      muted: resolvedStatus === null,
    },
    {
      label: '주문명',
      value: payment?.orderName ?? '프론트 결과 페이지에서 상세를 불러오는 중입니다.',
      muted: payment === null,
    },
    {
      label: '주문 번호',
      value: gatewayOrderId ?? '-',
      muted: gatewayOrderId === null,
    },
    {
      label: '결제 번호',
      value: gatewayTid ?? '-',
      muted: gatewayTid === null,
    },
    {
      label: '결제 수단',
      value: payment ? formatPaymentMethodLabel(payment.paymentMethod) : '-',
      muted: payment === null,
    },
    {
      label: '결제 금액',
      value: payment ? formatPrice(payment.amount) : '-',
      muted: payment === null,
    },
    {
      label: '응답 코드',
      value: gatewayResponseCode ?? '-',
      muted: gatewayResponseCode === null,
    },
    {
      label: '처리 시각',
      value: approvedAt ?? '-',
      muted: approvedAt === null,
    },
  ];
};

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const paymentId = parsePaymentId(searchParams.get('paymentId'));
  const resultToken = searchParams.get('resultToken')?.trim() || null;
  const fallbackStatus = normalizeStatus(searchParams.get('status'));
  const fallbackMessage = searchParams.get('message')?.trim() || null;
  const fallbackGatewayOrderId = searchParams.get('gatewayOrderId')?.trim() || null;
  const fallbackCode = searchParams.get('code')?.trim() || null;

  const paymentQuery = usePaymentResultQuery(paymentId, resultToken);
  const payment = paymentQuery.data ?? null;
  const resolvedStatus = payment?.status ?? fallbackStatus;
  const statusCopy = getStatusCopy(resolvedStatus, fallbackMessage);
  const detailItems = buildDetailItems(
    payment,
    fallbackStatus,
    fallbackGatewayOrderId,
    fallbackCode,
  );
  const receiptUrl = payment?.receiptUrl ?? null;
  const errorMessage =
    paymentQuery.error instanceof Error
      ? paymentQuery.error.message
      : '결제 상세 조회에 실패했습니다.';

  return (
    <section className={sharedStyles['page']}>
      <div className={classNames(sharedStyles['shell'], sharedStyles['shellNarrow'])}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={classNames(sharedStyles['header'], styles['hero'])}>
            <span
              className={classNames(
                styles['statusBadge'],
                statusCopy.badgeTone === 'success' && styles['statusSuccess'],
                statusCopy.badgeTone === 'danger' && styles['statusDanger'],
                statusCopy.badgeTone === 'neutral' && styles['statusNeutral'],
              )}
            >
              {statusCopy.badgeText}
            </span>
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

          <section className={sharedStyles['section']}>
            <div className={sharedStyles['sectionHeader']}>
              <h2 className={sharedStyles['sectionTitle']}>결제 정보</h2>
              <p className={sharedStyles['sectionDescription']}>
                모바일 KCP 리턴 이후 받은 상태를 기준으로 결과를 표시합니다.
              </p>
            </div>
            <div className={styles['detailGrid']}>
              {detailItems.map((item) => {
                return (
                  <div className={styles['detailItem']} key={item.label}>
                    <span className={styles['detailLabel']}>{item.label}</span>
                    <span
                      className={classNames(
                        styles['detailValue'],
                        item.muted && styles['detailValueMuted'],
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className={styles['actions']}>
            <Link to={routePaths.home}>홈으로 이동</Link>
            <Link to={routePaths.programs}>강의 둘러보기</Link>
            <Link to={routePaths.mypage}>마이페이지</Link>
            {receiptUrl ? (
              <a href={receiptUrl} rel='noreferrer' target='_blank'>
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
