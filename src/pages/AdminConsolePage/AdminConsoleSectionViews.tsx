import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { cancelAdminPayment } from '@/api/adminPayments';
import Button from '@/components/ui/Button/Button';
import { TextAreaField } from '@/components/ui/TextField/TextField';
import {
  adminPaymentDetailQueryKey,
  adminPaymentsQueryKey,
  useAdminPaymentDetailQuery,
  useAdminPaymentsQuery,
} from '@/query/useAdminPaymentsQuery';
import { useAdminProgramsLiveQuery } from '@/query/useAdminProgramsLiveQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import { formatPaymentMethodLabel, paymentStatusLabels } from '@/types/payment';

import styles from './AdminConsolePage.module.scss';
import { sectionContent, type AdminConsoleSection } from './adminConsolePageShared';

interface AdminConsolePageHeaderProps {
  section: AdminConsoleSection;
}

interface DeferredSectionProps {
  section: Extract<AdminConsoleSection, 'reviews'>;
}

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    currency: 'KRW',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
};

const formatOrderTypeLabel = (value: string): string => {
  switch (value) {
    case 'PROGRAM':
      return '단일 강의';
    case 'CART_CHECKOUT':
      return '장바구니 결제';
    default:
      return value;
  }
};

const getDeferredDescription = (_section: DeferredSectionProps['section']): string => {
  return '교육후기 운영 화면은 게시 정책과 공개 구조를 정리한 뒤 별도 관리자 페이지로 연결합니다.';
};

export const AdminConsolePageHeader = ({ section }: AdminConsolePageHeaderProps) => {
  const sectionMeta = sectionContent[section];

  return (
    <header className={styles['pageHeader']}>
      <h1 className={styles['pageTitle']}>{sectionMeta.title}</h1>
    </header>
  );
};

export const AdminDashboardSection = () => {
  const programsQuery = useAdminProgramsLiveQuery();
  const paymentsQuery = useAdminPaymentsQuery();

  const summaryCards = [
    {
      description: '실제 관리자 프로그램 목록과 편집 화면을 기준으로 운영합니다.',
      id: 'programs',
      label: '프로그램 관리',
      tone: 'brand',
      value: programsQuery.data ? `${String(programsQuery.data.length)}개 프로그램` : '확인 중',
    },
    {
      description: '결제 상태, 취소 이력, 영수증 확인에 필요한 최소 정보만 노출합니다.',
      id: 'payments',
      label: '결제 관리',
      tone: 'accent',
      value: paymentsQuery.data ? `${String(paymentsQuery.data.length)}건` : '확인 중',
    },
    {
      description: '리뷰 운영 화면이 다음 구현 대상으로 남아 있습니다.',
      id: 'gaps',
      label: '추가 구현',
      tone: 'neutral',
      value: '1개 과제',
    },
  ] as const;

  const dashboardShortcutItems = [
    {
      countLabel: programsQuery.data
        ? `${String(programsQuery.data.length)}개 프로그램`
        : '확인 중',
      description:
        '프로그램 등록, 기본정보, 커리큘럼, 퀴즈와 공개 상태를 실제 데이터로 관리합니다.',
      title: '프로그램 관리',
      to: routePaths.adminPrograms,
    },
    {
      countLabel: '구조 관리',
      description: '공개 카테고리 구조와 프로그램 배치를 같은 데이터로 관리합니다.',
      title: '프로그램 카테고리 관리',
      to: routePaths.adminProgramMenus,
    },
    {
      countLabel: '실연동',
      description: '공지 등록, 수정, 게시, 게시중지를 실제 공지 API 기준으로 처리합니다.',
      title: '공지사항 관리',
      to: routePaths.adminNotices,
    },
    {
      countLabel: '실연동',
      description: '홈 팝업 노출용 항목을 공지와 분리해 별도 목록과 게시 흐름으로 관리합니다.',
      title: '팝업 관리',
      to: routePaths.adminPopups,
    },
    {
      countLabel: '실연동',
      description: '질문 확인, 답변 등록, 답변 삭제까지 운영 흐름을 바로 처리합니다.',
      title: 'Q&A 관리',
      to: routePaths.adminQna,
    },
    {
      countLabel: paymentsQuery.data ? `${String(paymentsQuery.data.length)}건` : '확인 중',
      description: '결제 상태와 취소 처리 내역을 운영자 기준으로 확인합니다.',
      title: '결제 관리',
      to: routePaths.adminPayments,
    },
    {
      countLabel: '실연동',
      description: '자료 목록, 범위, 공개 범위를 실제 자료 API 기준으로 관리합니다.',
      title: '자료실 관리',
      to: routePaths.adminResources,
    },
    {
      countLabel: '운영 실행',
      description: '회원과 수강 현황을 확인하고 수동 배정과 만료 정리를 운영합니다.',
      title: '수강관리',
      to: routePaths.adminEnrollments,
    },
    {
      countLabel: '시간 운영',
      description: '하이브리드 실습 예약, 예약 제외 시간, 예약자 상태를 달력 기준으로 운영합니다.',
      title: '실습일정관리',
      to: routePaths.adminPracticum,
    },
  ] as const;

  return (
    <>
      <header className={styles['hero']}>
        <div className={styles['heroCopy']}>
          <h1 className={styles['title']}>운영 개요</h1>
          <p className={styles['description']}>
            공지, 문의, 프로그램, 자료, 수강, 결제 관리의 현재 운영 상태를 한곳에서 확인합니다.
          </p>
        </div>
      </header>

      <section className={styles['summaryGrid']}>
        {summaryCards.map((card) => {
          return (
            <article className={styles['summaryCard']} data-tone={card.tone} key={card.id}>
              <p className={styles['summaryLabel']}>{card.label}</p>
              <strong className={styles['summaryValue']}>{card.value}</strong>
              <p className={styles['summaryDescription']}>{card.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles['shortcutGrid']}>
        {dashboardShortcutItems.map((item) => {
          return (
            <Link className={styles['shortcutCard']} key={item.to} to={item.to}>
              <p className={styles['shortcutMetric']}>{item.countLabel}</p>
              <h2 className={styles['shortcutTitle']}>{item.title}</h2>
              <p className={styles['shortcutDescription']}>{item.description}</p>
            </Link>
          );
        })}
      </section>
    </>
  );
};

export const AdminDeferredSection = ({ section }: DeferredSectionProps) => {
  const sectionMeta = sectionContent[section];

  return (
    <section className={styles['stateSection']}>
      <h2 className={styles['stateTitle']}>{sectionMeta.title} 준비 중</h2>
      <p className={styles['stateDescription']}>{getDeferredDescription(section)}</p>
    </section>
  );
};

export const AdminPaymentsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const paymentsQuery = useAdminPaymentsQuery();
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const paymentItems = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const resolvedSelectedPaymentId = useMemo(() => {
    if (
      selectedPaymentId !== null &&
      paymentItems.some((item) => item.paymentId === selectedPaymentId)
    ) {
      return selectedPaymentId;
    }

    return paymentItems[0]?.paymentId ?? null;
  }, [paymentItems, selectedPaymentId]);
  const detailQuery = useAdminPaymentDetailQuery(resolvedSelectedPaymentId);

  const paymentSummary = useMemo(() => {
    return {
      cancelledCount: paymentItems.filter((item) => item.status === 'CANCELLED').length,
      completedCount: paymentItems.filter((item) => item.status === 'COMPLETED').length,
      failedCount: paymentItems.filter((item) => item.status === 'FAILED').length,
      totalCount: paymentItems.length,
    };
  }, [paymentItems]);

  const cancelMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: number; reason: string }) =>
      cancelAdminPayment(paymentId, { reason }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '결제 취소 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      setCancelReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPaymentsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: adminPaymentDetailQueryKey(variables.paymentId),
        }),
      ]);
      showToast({
        message: '결제 취소 처리를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      showToast({
        message: '취소 사유를 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    cancelMutation.mutate({
      paymentId: resolvedSelectedPaymentId,
      reason: cancelReason.trim(),
    });
  };

  if (paymentsQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>결제 목록을 불러오는 중입니다.</h2>
        <p className={styles['stateDescription']}>
          운영에 필요한 최소 결제 정보만 정리해서 가져오고 있습니다.
        </p>
      </section>
    );
  }

  if (paymentsQuery.isError) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>결제 관리 화면을 불러오지 못했습니다.</h2>
        <p className={styles['stateDescription']}>
          {paymentsQuery.error instanceof Error
            ? paymentsQuery.error.message
            : '관리자 결제 API 상태를 확인해 주세요.'}
        </p>
      </section>
    );
  }

  if (paymentItems.length === 0) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>표시할 결제 내역이 없습니다.</h2>
        <p className={styles['stateDescription']}>
          실제 결제가 생성되면 완료, 취소, 실패 상태를 여기서 관리할 수 있습니다.
        </p>
      </section>
    );
  }

  const selectedPayment = detailQuery.data ?? null;

  return (
    <section className={styles['panel']}>
      <div className={styles['salesSummaryGrid']}>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>전체 결제</p>
          <strong className={styles['salesMetricValue']}>{paymentSummary.totalCount}건</strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>결제 완료</p>
          <strong className={styles['salesMetricValue']}>{paymentSummary.completedCount}건</strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>결제 취소</p>
          <strong className={styles['salesMetricValue']}>{paymentSummary.cancelledCount}건</strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>결제 실패</p>
          <strong className={styles['salesMetricValue']}>{paymentSummary.failedCount}건</strong>
        </article>
      </div>

      <div className={styles['tableWrap']}>
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope='col'>주문명</th>
              <th scope='col'>구매자</th>
              <th scope='col'>결제 수단</th>
              <th scope='col'>상태</th>
              <th scope='col'>결제 금액</th>
              <th scope='col'>요청일</th>
              <th scope='col'>처리일</th>
              <th scope='col'>관리</th>
            </tr>
          </thead>
          <tbody>
            {paymentItems.map((payment) => {
              const processedAt = payment.cancelledAt ?? payment.paidAt ?? null;

              return (
                <tr key={payment.paymentId}>
                  <td>{payment.orderName}</td>
                  <td>
                    {payment.buyerDisplayName}
                    <br />
                    <span className={styles['helperText']}>{payment.buyerLoginId}</span>
                  </td>
                  <td>{formatPaymentMethodLabel(payment.paymentMethod)}</td>
                  <td>{paymentStatusLabels[payment.status]}</td>
                  <td>{formatCurrency(payment.approvedAmount ?? payment.amount)}</td>
                  <td>{formatDateTime(payment.requestedAt)}</td>
                  <td>{formatDateTime(processedAt)}</td>
                  <td>
                    <div className={styles['tableActionGroup']}>
                      <button
                        className={styles['tableActionButton']}
                        onClick={() => {
                          setSelectedPaymentId(payment.paymentId);
                        }}
                        type='button'
                      >
                        상세 보기
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles['replyCard']}>
        <p className={styles['replyLabel']}>결제 상세</p>

        {detailQuery.isPending ? (
          <p className={styles['itemDescription']}>결제 상세를 불러오는 중입니다.</p>
        ) : null}

        {detailQuery.isError ? (
          <p className={styles['itemDescription']}>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : '결제 상세를 불러오지 못했습니다.'}
          </p>
        ) : null}

        {selectedPayment ? (
          <>
            <p className={styles['itemTitle']}>{selectedPayment.orderName}</p>
            <div className={styles['metaRow']}>
              <span className={styles['badge']}>
                {formatOrderTypeLabel(selectedPayment.orderType)}
              </span>
              <span className={styles['badgeAccent']}>
                {paymentStatusLabels[selectedPayment.status]}
              </span>
              <span className={styles['metaText']}>
                {selectedPayment.buyerDisplayName} · {selectedPayment.buyerLoginId}
              </span>
            </div>
            <p className={styles['itemDescription']}>
              결제 수단 {formatPaymentMethodLabel(selectedPayment.paymentMethod)} · 결제 금액{' '}
              {formatCurrency(selectedPayment.approvedAmount ?? selectedPayment.amount)}
            </p>
            <p className={styles['itemDescription']}>
              요청일 {formatDateTime(selectedPayment.requestedAt)} · 완료일{' '}
              {formatDateTime(selectedPayment.paidAt)} · 취소일{' '}
              {formatDateTime(selectedPayment.cancelledAt)}
            </p>
            {selectedPayment.cancelReason ? (
              <p className={styles['itemDescription']}>취소 사유: {selectedPayment.cancelReason}</p>
            ) : null}

            <div className={styles['actionRow']}>
              {selectedPayment.receiptUrl ? (
                <a
                  className={styles['tableActionButton']}
                  href={selectedPayment.receiptUrl}
                  rel='noreferrer'
                  target='_blank'
                >
                  영수증 보기
                </a>
              ) : null}
            </div>

            {selectedPayment.canCancel ? (
              <div className={styles['replyComposer']}>
                <p className={styles['helperText']}>
                  결제 취소를 실행하면 KCP 취소 요청과 내부 수강 취소가 함께 진행됩니다.
                </p>
                <TextAreaField
                  label='취소 사유'
                  name='cancelReason'
                  onChange={(event) => {
                    setCancelReason(event.target.value);
                  }}
                  placeholder='예: 사용자 요청 취소'
                  value={cancelReason}
                />
                <Button disabled={cancelMutation.isPending} onClick={handleCancel} type='button'>
                  {cancelMutation.isPending ? '취소 처리 중...' : '결제 취소 처리'}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
};
