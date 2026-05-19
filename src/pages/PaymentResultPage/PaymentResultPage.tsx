import { Link, useSearchParams } from 'react-router-dom';

import checkIconSrc from '@/assets/icons/lucide_check.svg';
import clockFadingIconSrc from '@/assets/icons/lucide_clock-fading.svg';
import { LoadingSpinner } from '@/components/feedback/Loading/LoadingSpinner';
import { usePaymentResultQuery } from '@/query/usePaymentResultQuery';
import { routePaths } from '@/routes/routeRegistry';
import {
  formatPaymentMethodLabel,
  paymentStatusLabels,
  type PaymentResult,
  type PaymentStatus,
} from '@/types/payment';
import { getProgramTypeLabel } from '@/utils/programType';

import styles from './PaymentResultPage.module.scss';

const knownStatuses = new Set<PaymentStatus>([
  'PENDING',
  'REGISTERED',
  'COMPLETED',
  'APPROVED_PENDING_FULFILLMENT',
  'FAILED',
  'CANCELLED',
]);
const statusCheckStatuses = new Set<PaymentStatus>([
  'PENDING',
  'REGISTERED',
  'APPROVED_PENDING_FULFILLMENT',
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
        title: '결제가 완료되었습니다',
        description:
          fallbackMessage ??
          '결제가 정상 승인되었습니다. 내 강의실과 결제 내역에서 이어서 확인할 수 있습니다.',
      };
    case 'APPROVED_PENDING_FULFILLMENT':
      return {
        title: '수강 등록을 확인 중입니다',
        description:
          fallbackMessage ??
          '결제 승인은 완료됐고 수강 등록을 처리 중입니다. 잠시 후 내 강의실을 확인해 주세요.',
      };
    case 'FAILED':
      return {
        title: '결제가 완료되지 않았습니다.',
        description: fallbackMessage ?? '결제 승인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      };
    case 'CANCELLED':
      return {
        title: '결제 상태를 확인해 주세요',
        description:
          fallbackMessage ??
          '결제가 중단되었거나 승인 결과를 확인하는 중입니다. 다시 시도하거나 장바구니로 돌아가 진행을 이어갈 수 있습니다.',
      };
    case 'PENDING':
    case 'REGISTERED':
      return {
        title: '결제 상태를 확인해 주세요',
        description:
          fallbackMessage ??
          '결제가 중단되었거나 승인 결과를 확인하는 중입니다. 다시 시도하거나 장바구니로 돌아가 진행을 이어갈 수 있습니다.',
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

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);

  return `${String(year)}.${month}.${day} (${weekday}) ${hours}:${minutes}:${seconds}`;
};

const getPurchasedCourseTypeLabel = (
  item: NonNullable<PaymentResult['purchasedItems']>[number] | null,
) => {
  if (item?.programType) {
    return `${getProgramTypeLabel(item.programType)} 과정`;
  }

  const title = item?.title ?? '';

  if (title.includes('문제풀이')) {
    return '문제풀이 과정';
  }
  if (title.includes('하이브리드')) {
    return '하이브리드 과정';
  }
  if (title.includes('오프라인') || title.includes('현장') || title.includes('실습')) {
    return '오프라인 과정';
  }

  return '온라인 과정';
};

const getPurchasedCourses = (payment: PaymentResult) => {
  if (payment.purchasedItems?.length) {
    return payment.purchasedItems;
  }

  return [
    {
      id: payment.id,
      payablePrice: payment.approvedAmount ?? payment.amount,
      programType: null,
      thumbnailUrl: null,
      title: payment.orderName,
    },
  ];
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
    case 'APPROVED_PENDING_FULFILLMENT':
    case 'PENDING':
      return payment.requestedAt;
    default:
      return fallbackStatus ? payment.requestedAt : null;
  }
};

const getStatusCheckLabel = (status: PaymentStatus | null) => {
  if (!status) {
    return '결제 결과 확인 중';
  }

  if (status === 'APPROVED_PENDING_FULFILLMENT') {
    return paymentStatusLabels[status];
  }

  if (statusCheckStatuses.has(status)) {
    return '결제 취소 또는 승인 대기';
  }

  return paymentStatusLabels[status];
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
  const isCompletedResult = resolvedStatus === 'COMPLETED';
  const isFulfillmentPendingResult = resolvedStatus === 'APPROVED_PENDING_FULFILLMENT';
  const isStatusCheckResult = resolvedStatus !== null && !isCompletedResult;
  const statusCopy = getStatusCopy(resolvedStatus, fallbackMessage);
  const processedAt = resolveProcessedAt(payment, resolvedStatus);
  const purchasedCourses = payment ? getPurchasedCourses(payment) : [];
  const statusDescriptionLines = isStatusCheckResult
    ? statusCopy.description.split(/(?<=입니다\.)\s+/u)
    : [];

  return (
    <section className={styles['page']}>
      <div className={styles['shell']}>
        <div className={styles['surface']}>
          <header
            className={`${styles['hero']} ${isStatusCheckResult ? styles['statusHero'] : ''}`}
          >
            {isCompletedResult ? (
              <span className={styles['heroIcon']} aria-hidden='true'>
                <img alt='' src={checkIconSrc} />
              </span>
            ) : null}
            {isStatusCheckResult ? (
              <span className={styles['heroIcon']} aria-hidden='true'>
                <img alt='' src={clockFadingIconSrc} />
              </span>
            ) : null}
            <h1 className={styles['heroTitle']}>{statusCopy.title}</h1>
            <p className={styles['heroDescription']}>
              {isCompletedResult ? '수강 중인 강의는 내 강의에서 바로 확인하실 수 있습니다.' : null}
              {isStatusCheckResult
                ? statusDescriptionLines.map((line) => (
                    <span key={line} className={styles['heroDescriptionLine']}>
                      {line}
                    </span>
                  ))
                : null}
              {!isCompletedResult && !isStatusCheckResult ? statusCopy.description : null}
            </p>
            {isCompletedResult ? (
              <Link className={styles['primaryHeroAction']} to={routePaths.mypage}>
                내 강의로 이동
              </Link>
            ) : null}
            {(paymentId !== null || resultToken !== null) && paymentQuery.isPending ? (
              <div className={styles['resultLoadingState']} aria-live='polite'>
                <LoadingSpinner />
                <span>결제 승인과 수강 등록 결과를 확인 중입니다. 잠시만 기다려 주세요.</span>
              </div>
            ) : null}
            {(paymentId !== null || resultToken !== null) && paymentQuery.isError ? (
              <p className={styles['helperText']}>
                결제 결과를 바로 확인하지 못했습니다. 내 결제 내역에서 다시 확인해 주세요.
              </p>
            ) : null}
          </header>

          {isStatusCheckResult ? (
            <section className={styles['statusPanel']} aria-label='결제 상태'>
              <div className={styles['statusPanelRow']}>
                <span>결제 상태</span>
                <strong>{getStatusCheckLabel(resolvedStatus)}</strong>
              </div>
              <div className={styles['statusPanelRow']}>
                <span>주문번호</span>
                <strong>{payment?.orderNumber ?? '-'}</strong>
              </div>
              <div className={styles['statusPanelRow']}>
                <span>시도 일시</span>
                <strong>{formatDateTime(processedAt ?? payment?.requestedAt)}</strong>
              </div>
              {payment?.cancelReason ? (
                <p className={styles['statusPanelHelper']}>취소 사유: {payment.cancelReason}</p>
              ) : null}
            </section>
          ) : null}

          {isCompletedResult ? (
            <section className={styles['paymentPanel']} aria-label='결제 정보'>
              <h2 className={styles['panelTitle']}>결제 정보</h2>
              <div className={styles['paymentInfoGrid']}>
                <div className={styles['paymentInfoItem']}>
                  <span>주문번호</span>
                  <strong>{payment?.orderNumber ?? '-'}</strong>
                </div>
                <div className={styles['paymentInfoItem']}>
                  <span>결제일시</span>
                  <strong>{formatDateTime(processedAt)}</strong>
                </div>
                <div className={styles['paymentInfoItem']}>
                  <span>결제수단</span>
                  <strong>
                    {payment?.paymentMethod ? formatPaymentMethodLabel(payment.paymentMethod) : '-'}
                  </strong>
                </div>
                <div className={styles['paymentInfoItem']}>
                  <span>결제금액</span>
                  <strong className={styles['paymentAmount']}>
                    {formatCurrency(payment?.approvedAmount ?? payment?.amount)}
                  </strong>
                </div>
                <div className={styles['paymentInfoItem']}>
                  <span>결제상태</span>
                  <strong className={styles['statusPill']}>
                    {paymentStatusLabels['COMPLETED']}
                  </strong>
                </div>
              </div>
            </section>
          ) : null}

          {isCompletedResult && payment ? (
            <section className={styles['coursesPanel']} aria-label='구매한 강의'>
              <h2 className={styles['panelTitle']}>구매한 강의</h2>
              <div className={styles['courseList']}>
                {purchasedCourses.map((course) => (
                  <article className={styles['courseRow']} key={course.id}>
                    {course.thumbnailUrl ? (
                      <img
                        alt={`${course.title} 대표 이미지`}
                        className={styles['courseThumbnail']}
                        src={course.thumbnailUrl}
                      />
                    ) : (
                      <div aria-hidden='true' className={styles['courseThumbnail']} />
                    )}
                    <div className={styles['courseBody']}>
                      <span className={styles['courseTypeChip']}>
                        {getPurchasedCourseTypeLabel(course)}
                      </span>
                      <strong className={styles['courseTitle']}>{course.title}</strong>
                      <p className={styles['courseMeta']}>
                        <span>수강기간</span>
                        <span>상시 수강</span>
                      </p>
                    </div>
                    <strong className={styles['coursePrice']}>
                      {formatCurrency(course.payablePrice)}
                    </strong>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className={isStatusCheckResult ? styles['statusActions'] : styles['actions']}>
            {isStatusCheckResult ? (
              <Link
                className={styles['statusPrimaryAction']}
                to={isFulfillmentPendingResult ? routePaths.mypage : routePaths.checkout}
              >
                {isFulfillmentPendingResult ? '내 강의로 이동' : '결제 다시 시도'}
              </Link>
            ) : null}
            {isStatusCheckResult && !isFulfillmentPendingResult ? (
              <Link className={styles['statusSecondaryAction']} to={routePaths.cart}>
                장바구니로 돌아가기
              </Link>
            ) : null}
            {isCompletedResult && payment?.receiptUrl ? (
              <a
                className={styles['receiptAction']}
                href={payment.receiptUrl}
                rel='noreferrer'
                target='_blank'
              >
                영수증 보기
              </a>
            ) : null}
            {!isStatusCheckResult ? <Link to={routePaths.home}>홈으로 이동</Link> : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentResultPage;
