import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  deleteAdminNoticeLive,
  publishAdminNoticeLive,
  unpublishAdminNoticeLive,
} from '@/api/notices';
import Button from '@/components/ui/Button/Button';
import SectionTabs from '@/components/ui/SectionTabs/SectionTabs';
import {
  adminNoticesQueryKey,
  globalNoticesQueryKey,
  useAdminNoticesQuery,
} from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import { summarizeHtmlContent } from '@/utils/htmlContent';

import styles from './AdminConsolePage.module.scss';

type NoticeFilter = 'all' | 'published' | 'private' | 'pinned';

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

const AdminNoticesSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const noticesQuery = useAdminNoticesQuery();
  const [noticeFilter, setNoticeFilter] = useState<NoticeFilter>('all');

  const globalNotices = useMemo(() => {
    return (noticesQuery.data ?? []).filter((notice) => notice.scope === 'GLOBAL');
  }, [noticesQuery.data]);

  const filteredNotices = useMemo(() => {
    if (noticeFilter === 'published') {
      return globalNotices.filter((notice) => notice.published);
    }

    if (noticeFilter === 'private') {
      return globalNotices.filter((notice) => !notice.published);
    }

    if (noticeFilter === 'pinned') {
      return globalNotices.filter((notice) => notice.pinned);
    }

    return globalNotices;
  }, [globalNotices, noticeFilter]);

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
    privateCount: globalNotices.filter((notice) => !notice.published).length,
    pinnedCount: globalNotices.filter((notice) => notice.pinned).length,
    publishedCount: globalNotices.filter((notice) => notice.published).length,
    totalCount: globalNotices.length,
  };

  const noticeTabs = [
    { count: summary.totalCount, label: '전체', value: 'all' },
    { count: summary.publishedCount, label: '게시 중', value: 'published' },
    { count: summary.privateCount, label: '비공개', value: 'private' },
    { count: summary.pinnedCount, label: '필독', value: 'pinned' },
  ] satisfies Array<{ count: number; label: string; value: NoticeFilter }>;

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
      <SectionTabs
        ariaLabel='공지 상태'
        items={noticeTabs}
        onChange={setNoticeFilter}
        value={noticeFilter}
      />

      <section className={styles['panelWide']}>
        <div className={styles['panelToolbar']}>
          <p className={styles['metaText']}>총 {filteredNotices.length}개</p>
          <Button
            onClick={() => {
              void navigate(routePaths.adminNoticeCreate);
            }}
            type='button'
          >
            새 공지 등록
          </Button>
        </div>

        {!filteredNotices.length ? (
          <section className={styles['stateSection']}>
            <h3 className={styles['stateTitle']}>표시할 공지가 없습니다.</h3>
          </section>
        ) : (
          <div className={styles['tableWrap']}>
            <table className={`${styles['table']} ${styles['noticeTable']}`}>
              <thead>
                <tr>
                  <th scope='col'>제목</th>
                  <th scope='col'>일시</th>
                  <th scope='col'>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotices.map((notice) => {
                  return (
                    <tr key={notice.id}>
                      <td>
                        <div className={styles['cellStack']}>
                          <span className={styles['noticeTitleRow']}>
                            <span className={styles['cellPrimary']}>{notice.title}</span>
                            <span
                              className={
                                notice.published ? styles['badgeSuccess'] : styles['badge']
                              }
                            >
                              {notice.published ? '게시 중' : '비공개'}
                            </span>
                            {notice.pinned ? (
                              <span className={styles['badgeAccent']}>필독</span>
                            ) : null}
                          </span>
                          <span className={styles['cellSecondary']}>
                            {summarizeHtmlContent(notice.content, 110)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles['cellStack']}>
                          <span className={styles['cellSecondary']}>
                            등록 {formatDateTime(notice.createdAt)}
                          </span>
                          <span className={styles['cellSecondary']}>
                            수정 {formatDateTime(notice.updatedAt)}
                          </span>
                        </div>
                      </td>
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
