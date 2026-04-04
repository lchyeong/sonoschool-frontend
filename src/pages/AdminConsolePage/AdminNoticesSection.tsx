import { useMemo } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  deleteAdminNoticeLive,
  publishAdminNoticeLive,
  unpublishAdminNoticeLive,
} from '@/api/notices';
import Button from '@/components/ui/Button/Button';
import {
  adminNoticesQueryKey,
  globalNoticesQueryKey,
  useAdminNoticesQuery,
} from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import { summarizeHtmlContent } from '@/utils/htmlContent';

import styles from './AdminConsolePage.module.scss';

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const AdminNoticesSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const noticesQuery = useAdminNoticesQuery();

  const globalNotices = useMemo(() => {
    return (noticesQuery.data ?? []).filter((notice) => notice.scope === 'GLOBAL');
  }, [noticesQuery.data]);

  const refreshNotices = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminNoticesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: globalNoticesQueryKey() }),
    ]);
  };

  const publishMutation = useMutation({
    mutationFn: (noticeId: number) => publishAdminNoticeLive(noticeId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지 게시 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshNotices();
      showToast({
        message: '공지 게시 상태를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (noticeId: number) => unpublishAdminNoticeLive(noticeId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지 게시 중지에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshNotices();
      showToast({
        message: '공지 게시를 중지했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noticeId: number) => deleteAdminNoticeLive(noticeId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshNotices();
      showToast({
        message: '공지사항을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const summary = {
    pinnedCount: globalNotices.filter((notice) => notice.pinned).length,
    publishedCount: globalNotices.filter((notice) => notice.published).length,
    totalCount: globalNotices.length,
  };

  if (noticesQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>공지 목록을 불러오는 중입니다.</h2>
        <p className={styles['stateDescription']}>관리자 공지 API 응답을 확인하고 있습니다.</p>
      </section>
    );
  }

  if (noticesQuery.isError) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>공지 관리 화면을 불러오지 못했습니다.</h2>
        <p className={styles['stateDescription']}>
          {noticesQuery.error instanceof Error
            ? noticesQuery.error.message
            : '관리자 공지 API 상태를 확인해 주세요.'}
        </p>
      </section>
    );
  }

  return (
    <section className={styles['workspace']}>
      <section className={styles['summaryGrid']}>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>전체 전역 공지</p>
          <strong className={styles['summaryValue']}>{String(summary.totalCount)}건</strong>
          <p className={styles['summaryDescription']}>
            운영 중인 전역 공지를 같은 계약으로 관리합니다.
          </p>
        </article>
        <article className={styles['summaryCard']} data-tone='accent'>
          <p className={styles['summaryLabel']}>게시 중</p>
          <strong className={styles['summaryValue']}>{String(summary.publishedCount)}건</strong>
          <p className={styles['summaryDescription']}>
            공개 페이지에 실제 노출 가능한 공지 수입니다.
          </p>
        </article>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>고정 공지</p>
          <strong className={styles['summaryValue']}>{String(summary.pinnedCount)}건</strong>
          <p className={styles['summaryDescription']}>목록 상단 우선 배치되는 필독 공지입니다.</p>
        </article>
      </section>

      <section className={styles['panelWide']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h2 className={styles['panelTitle']}>전역 공지 목록</h2>
            <p className={styles['metaText']}>작성과 수정은 별도 페이지에서 처리합니다.</p>
          </div>
          <Button
            onClick={() => {
              void navigate(routePaths.adminNoticeCreate);
            }}
            type='button'
          >
            새 공지 등록
          </Button>
        </div>

        {!globalNotices.length ? (
          <section className={styles['stateSection']}>
            <h3 className={styles['stateTitle']}>표시할 공지가 없습니다.</h3>
            <p className={styles['stateDescription']}>새 공지를 등록하면 여기에 바로 반영됩니다.</p>
          </section>
        ) : (
          <div className={styles['tableWrap']}>
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th scope='col'>제목</th>
                  <th scope='col'>게시 상태</th>
                  <th scope='col'>고정</th>
                  <th scope='col'>등록일</th>
                  <th scope='col'>수정일</th>
                  <th scope='col'>관리</th>
                </tr>
              </thead>
              <tbody>
                {globalNotices.map((notice) => {
                  return (
                    <tr key={notice.id}>
                      <td>
                        <div className={styles['cellStack']}>
                          <span className={styles['cellPrimary']}>{notice.title}</span>
                          <span className={styles['cellSecondary']}>
                            {summarizeHtmlContent(notice.content, 110)}
                          </span>
                        </div>
                      </td>
                      <td>{notice.published ? '게시 중' : '비공개'}</td>
                      <td>{notice.pinned ? '고정' : '-'}</td>
                      <td>{formatDateTime(notice.createdAt)}</td>
                      <td>{formatDateTime(notice.updatedAt)}</td>
                      <td>
                        <div className={styles['tableActionGroup']}>
                          <button
                            className={styles['tableActionButton']}
                            onClick={() => {
                              void navigate(routePaths.adminNoticeEdit(String(notice.id)));
                            }}
                            type='button'
                          >
                            수정
                          </button>
                          {notice.published ? (
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                unpublishMutation.mutate(notice.id);
                              }}
                              type='button'
                            >
                              중지
                            </button>
                          ) : (
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                publishMutation.mutate(notice.id);
                              }}
                              type='button'
                            >
                              게시
                            </button>
                          )}
                          <button
                            className={styles['tableActionButtonDanger']}
                            onClick={() => {
                              if (!window.confirm('이 공지를 삭제하시겠습니까?')) {
                                return;
                              }

                              deleteMutation.mutate(notice.id);
                            }}
                            type='button'
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
};

export default AdminNoticesSection;
