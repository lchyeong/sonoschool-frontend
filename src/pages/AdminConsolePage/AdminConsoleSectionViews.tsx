import { useEffect, useMemo, useState } from 'react';

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
  section: Extract<AdminConsoleSection, 'notices' | 'qna' | 'resources' | 'reviews'>;
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

const getDeferredDescription = (section: DeferredSectionProps['section']): string => {
  switch (section) {
    case 'notices':
      return '공지사항은 공개 범위와 게시 정책을 운영 기준으로 다시 정리한 뒤 2차로 연결합니다.';
    case 'qna':
      return '문의 답변은 공개 페이지 정책과 관리자 응답 흐름을 확정한 뒤 실제 API를 추가합니다.';
    case 'resources':
      return '자료실은 파일 업로드 정책과 다운로드 권한 구조를 정리한 뒤 연결합니다.';
    case 'reviews':
      return '교육후기 운영 화면은 게시 정책과 공개 구조를 정리한 뒤 후속 연동합니다.';
    default:
      return '후속 구현 예정 메뉴입니다.';
  }
};

export const AdminConsolePageHeader = ({ section }: AdminConsolePageHeaderProps) => {
  const sectionMeta = sectionContent[section];

  return (
    <header className={styles['pageHeader']}>
      {sectionMeta.eyebrow ? <p className={styles['pageEyebrow']}>{sectionMeta.eyebrow}</p> : null}
      <h1 className={styles['pageTitle']}>{sectionMeta.title}</h1>
      {sectionMeta.description ? (
        <p className={styles['pageDescription']}>{sectionMeta.description}</p>
      ) : null}
    </header>
  );
};

export const AdminDashboardSection = () => {
  const programsQuery = useAdminProgramsLiveQuery();
  const paymentsQuery = useAdminPaymentsQuery();

  const summaryCards = [
    {
      description: '실제 관리자 강의 목록과 편집 화면을 기준으로 운영합니다.',
      id: 'programs',
      label: '강의 관리',
      tone: 'brand',
      value: programsQuery.data ? `${String(programsQuery.data.length)}개` : '확인 중',
    },
    {
      description: '결제 상태, 취소 이력, 영수증 확인에 필요한 최소 정보만 노출합니다.',
      id: 'payments',
      label: '결제 관리',
      tone: 'accent',
      value: paymentsQuery.data ? `${String(paymentsQuery.data.length)}건` : '확인 중',
    },
    {
      description: 'S3 업로드와 인코딩 시작, 강의 연결 작업을 실제 흐름으로 점검합니다.',
      id: 'videos',
      label: '영상 업로드',
      tone: 'brand',
      value: '실연동',
    },
    {
      description: '공지사항, Q&A, 자료실은 보안과 운영 정책을 정리한 뒤 이어서 구현합니다.',
      id: 'deferred',
      label: '후속 구현',
      tone: 'neutral',
      value: '3개 메뉴',
    },
  ] as const;

  const dashboardShortcutItems = [
    {
      countLabel: programsQuery.data ? `${String(programsQuery.data.length)}개 강의` : '확인 중',
      description: '강의 등록, 수정, 공개 상태를 실제 데이터로 관리합니다.',
      title: '강의 관리',
      to: routePaths.adminPrograms,
    },
    {
      countLabel: '구조 관리',
      description: '공개 카테고리 구조와 강의 배치를 같은 데이터로 관리합니다.',
      title: '강의 카테고리 관리',
      to: routePaths.adminProgramMenus,
    },
    {
      countLabel: '업로드 가능',
      description: '실제 영상 업로드 세션 생성과 인코딩 상태를 확인합니다.',
      title: '영상 업로드',
      to: routePaths.adminVideos,
    },
    {
      countLabel: paymentsQuery.data ? `${String(paymentsQuery.data.length)}건` : '확인 중',
      description: '결제 상태와 취소 처리 내역을 운영자 기준으로 확인합니다.',
      title: '결제 관리',
      to: routePaths.adminPayments,
    },
    {
      countLabel: '후속 구현',
      description: '공지사항 등록과 공지 공개 정책을 실제 운영 흐름에 맞춰 후속 구현합니다.',
      title: '공지사항 관리',
      to: routePaths.adminNotices,
    },
    {
      countLabel: '후속 구현',
      description: '문의 응답과 자료실은 운영 정책을 정리한 뒤 실제 연동합니다.',
      title: 'Q&A / 자료실',
      to: routePaths.adminQna,
    },
  ] as const;

  return (
    <>
      <header className={styles['hero']}>
        <div className={styles['heroCopy']}>
          <h1 className={styles['title']}>운영 개요</h1>
          <p className={styles['description']}>
            실제 연동된 강의, 영상, 결제 관리 흐름을 기준으로 운영 상태를 확인합니다.
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

  useEffect(() => {
    const nextPaymentId = paymentsQuery.data?.[0]?.paymentId ?? null;

    if (selectedPaymentId !== null && paymentsQuery.data?.some((item) => item.paymentId === selectedPaymentId)) {
      return;
    }

    setSelectedPaymentId(nextPaymentId);
  }, [paymentsQuery.data, selectedPaymentId]);

  const detailQuery = useAdminPaymentDetailQuery(selectedPaymentId);

  const paymentSummary = useMemo(() => {
    const items = paymentsQuery.data ?? [];

    return {
      cancelledCount: items.filter((item) => item.status === 'CANCELLED').length,
      completedCount: items.filter((item) => item.status === 'COMPLETED').length,
      failedCount: items.filter((item) => item.status === 'FAILED').length,
      totalCount: items.length,
    };
  }, [paymentsQuery.data]);

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
        queryClient.invalidateQueries({ queryKey: adminPaymentDetailQueryKey(variables.paymentId) }),
      ]);
      showToast({
        message: '결제 취소 처리를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const handleCancel = () => {
    if (selectedPaymentId === null) {
      return;
    }

    if (!cancelReason.trim()) {
      showToast({
        message: '취소 사유를 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    cancelMutation.mutate({
      paymentId: selectedPaymentId,
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

  if (!paymentsQuery.data?.length) {
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
            {paymentsQuery.data.map((payment) => {
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

      {selectedPaymentId !== null ? (
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
                <span className={styles['badge']}>{formatOrderTypeLabel(selectedPayment.orderType)}</span>
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
                <p className={styles['itemDescription']}>
                  취소 사유: {selectedPayment.cancelReason}
                </p>
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
      ) : null}
    </section>
  );
};
