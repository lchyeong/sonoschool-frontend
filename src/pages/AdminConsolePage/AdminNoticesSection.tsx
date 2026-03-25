import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminNoticeLive,
  deleteAdminNoticeLive,
  publishAdminNoticeLive,
  unpublishAdminNoticeLive,
  updateAdminNoticeLive,
} from '@/api/notices';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import {
  adminNoticesQueryKey,
  globalNoticesQueryKey,
  useAdminNoticesQuery,
} from '@/query/useNoticeQueries';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminNoticeCreatePayload, AdminNoticeUpdatePayload, NoticeItem } from '@/types/notice';

import styles from './AdminConsolePage.module.scss';

interface NoticeFormState {
  content: string;
  pinned: boolean;
  popup: boolean;
  published: boolean;
  title: string;
  visibleEndAt: string;
  visibleStartAt: string;
}

const EMPTY_FORM: NoticeFormState = {
  content: '',
  pinned: false,
  popup: false,
  published: true,
  title: '',
  visibleEndAt: '',
  visibleStartAt: '',
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatDateTimeInputValue = (value: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${String(year)}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const createFormState = (notice?: NoticeItem | null): NoticeFormState => {
  if (!notice) {
    return EMPTY_FORM;
  }

  return {
    content: notice.content,
    pinned: notice.pinned,
    popup: notice.popup,
    published: notice.published,
    title: notice.title,
    visibleEndAt: formatDateTimeInputValue(notice.visibleEndAt),
    visibleStartAt: formatDateTimeInputValue(notice.visibleStartAt),
  };
};

const getNoticePreview = (content: string): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '본문이 없습니다.';
  }

  return normalized.length > 110 ? `${normalized.slice(0, 110)}...` : normalized;
};

const formatVisibilityWindow = (notice: NoticeItem): string => {
  if (!notice.visibleStartAt && !notice.visibleEndAt) {
    return '상시 노출';
  }

  if (notice.visibleStartAt && notice.visibleEndAt) {
    return `${formatDateTime(notice.visibleStartAt)} ~ ${formatDateTime(notice.visibleEndAt)}`;
  }

  if (notice.visibleStartAt) {
    return `${formatDateTime(notice.visibleStartAt)}부터`;
  }

  return `${formatDateTime(notice.visibleEndAt)}까지`;
};

const AdminNoticesSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const noticesQuery = useAdminNoticesQuery();
  const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [formState, setFormState] = useState<NoticeFormState>(EMPTY_FORM);

  const globalNotices = useMemo(() => {
    return (noticesQuery.data ?? []).filter((notice) => notice.scope === 'GLOBAL');
  }, [noticesQuery.data]);

  useEffect(() => {
    const firstNoticeId = globalNotices[0]?.id ?? null;

    setSelectedNoticeId((current) => {
      if (current !== null && globalNotices.some((notice) => notice.id === current)) {
        return current;
      }

      return firstNoticeId;
    });

    setEditingNoticeId((current) => {
      if (current !== null && globalNotices.some((notice) => notice.id === current)) {
        return current;
      }

      return null;
    });
  }, [globalNotices]);

  const selectedNotice =
    globalNotices.find((notice) => notice.id === selectedNoticeId) ?? globalNotices[0] ?? null;

  const refreshNotices = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminNoticesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: globalNoticesQueryKey() }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminNoticeCreatePayload) => createAdminNoticeLive(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지사항 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (notice) => {
      await refreshNotices();
      setFormState(EMPTY_FORM);
      setSelectedNoticeId(notice.id);
      showToast({
        message: '공지사항을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noticeId, payload }: { noticeId: number; payload: AdminNoticeUpdatePayload }) =>
      updateAdminNoticeLive(noticeId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지사항 수정에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (notice) => {
      await refreshNotices();
      setEditingNoticeId(null);
      setFormState(EMPTY_FORM);
      setSelectedNoticeId(notice.id);
      showToast({
        message: '공지사항을 수정했습니다.',
        variant: 'success',
      });
    },
  });

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
    onSuccess: async (_, noticeId) => {
      await refreshNotices();

      if (selectedNoticeId === noticeId) {
        setSelectedNoticeId(null);
      }
      if (editingNoticeId === noticeId) {
        setEditingNoticeId(null);
        setFormState(EMPTY_FORM);
      }

      showToast({
        message: '공지사항을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const startCreate = () => {
    setEditingNoticeId(null);
    setFormState(EMPTY_FORM);
  };

  const startEdit = (notice: NoticeItem) => {
    setSelectedNoticeId(notice.id);
    setEditingNoticeId(notice.id);
    setFormState(createFormState(notice));
  };

  const handleSubmit = () => {
    const title = formState.title.trim();
    const content = formState.content.trim();
    const visibleStartAt = toIsoStringOrNull(formState.visibleStartAt);
    const visibleEndAt = toIsoStringOrNull(formState.visibleEndAt);

    if (!title) {
      showToast({ message: '공지 제목을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (!content) {
      showToast({ message: '공지 본문을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (visibleStartAt && visibleEndAt && new Date(visibleStartAt) > new Date(visibleEndAt)) {
      showToast({ message: '노출 시작은 종료보다 늦을 수 없습니다.', variant: 'error' });
      return;
    }

    if (editingNoticeId === null) {
      createMutation.mutate({
        content,
        pinned: formState.pinned,
        popup: formState.popup,
        programId: null,
        published: formState.published,
        scope: 'GLOBAL',
        title,
        visibleEndAt,
        visibleStartAt,
      });
      return;
    }

    updateMutation.mutate({
      noticeId: editingNoticeId,
      payload: {
        content,
        pinned: formState.pinned,
        popup: formState.popup,
        programId: null,
        scope: 'GLOBAL',
        title,
        visibleEndAt,
        visibleStartAt,
      },
    });
  };

  const summary = {
    pinnedCount: globalNotices.filter((notice) => notice.pinned).length,
    popupCount: globalNotices.filter((notice) => notice.popup).length,
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
          <p className={styles['summaryDescription']}>운영 중인 전역 공지를 같은 계약으로 관리합니다.</p>
        </article>
        <article className={styles['summaryCard']} data-tone='accent'>
          <p className={styles['summaryLabel']}>게시 중</p>
          <strong className={styles['summaryValue']}>{String(summary.publishedCount)}건</strong>
          <p className={styles['summaryDescription']}>공개 페이지에 실제 노출 가능한 공지 수입니다.</p>
        </article>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>고정 공지</p>
          <strong className={styles['summaryValue']}>{String(summary.pinnedCount)}건</strong>
          <p className={styles['summaryDescription']}>목록 상단 우선 배치되는 필독 공지입니다.</p>
        </article>
        <article className={styles['summaryCard']} data-tone='neutral'>
          <p className={styles['summaryLabel']}>팝업 공지</p>
          <strong className={styles['summaryValue']}>{String(summary.popupCount)}건</strong>
          <p className={styles['summaryDescription']}>홈 진입 시 팝업으로도 노출되는 공지입니다.</p>
        </article>
      </section>

      <div className={styles['contentGrid']}>
        <article className={styles['panel']}>
          <header className={styles['panelHeader']}>
            <p className={styles['panelEyebrow']}>{editingNoticeId === null ? 'Create' : 'Edit'}</p>
            <h2 className={styles['panelTitle']}>
              {editingNoticeId === null ? '새 공지 등록' : '공지 수정'}
            </h2>
          </header>

          <div className={styles['form']}>
            <TextField
              label='공지 제목'
              name='noticeTitle'
              onChange={(event) => {
                setFormState((current) => ({ ...current, title: event.target.value }));
              }}
              placeholder='운영 공지 제목을 입력해 주세요.'
              value={formState.title}
            />
            <TextAreaField
              label='공지 본문'
              name='noticeContent'
              onChange={(event) => {
                setFormState((current) => ({ ...current, content: event.target.value }));
              }}
              rows={8}
              value={formState.content}
            />
            <div className={styles['compactFieldRow']}>
              <TextField
                label='노출 시작'
                name='visibleStartAt'
                onChange={(event) => {
                  setFormState((current) => ({ ...current, visibleStartAt: event.target.value }));
                }}
                type='datetime-local'
                value={formState.visibleStartAt}
              />
              <TextField
                label='노출 종료'
                name='visibleEndAt'
                onChange={(event) => {
                  setFormState((current) => ({ ...current, visibleEndAt: event.target.value }));
                }}
                type='datetime-local'
                value={formState.visibleEndAt}
              />
            </div>

            <label className={styles['checkboxRow']}>
              <input
                checked={formState.pinned}
                onChange={(event) => {
                  setFormState((current) => ({ ...current, pinned: event.target.checked }));
                }}
                type='checkbox'
              />
              상단 고정 공지로 노출
            </label>

            <label className={styles['checkboxRow']}>
              <input
                checked={formState.popup}
                onChange={(event) => {
                  setFormState((current) => ({ ...current, popup: event.target.checked }));
                }}
                type='checkbox'
              />
              홈 팝업 공지로도 노출
            </label>

            {editingNoticeId === null ? (
              <label className={styles['checkboxRow']}>
                <input
                  checked={formState.published}
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, published: event.target.checked }));
                  }}
                  type='checkbox'
                />
                등록과 동시에 게시
              </label>
            ) : (
              <p className={styles['fieldHint']}>
                게시 상태는 목록 또는 우측 미리보기의 게시/중지 액션으로 관리합니다.
              </p>
            )}

            <div className={styles['actionRow']}>
              <Button
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={handleSubmit}
                type='button'
              >
                {createMutation.isPending || updateMutation.isPending
                  ? '저장 중...'
                  : editingNoticeId === null
                    ? '공지 등록'
                    : '공지 수정'}
              </Button>
              <Button onClick={startCreate} type='button' variant='secondary'>
                새 공지 작성
              </Button>
            </div>
          </div>
        </article>

        <article className={styles['panel']}>
          <header className={styles['panelHeader']}>
            <p className={styles['panelEyebrow']}>Preview</p>
            <h2 className={styles['panelTitle']}>선택한 공지</h2>
          </header>

          {selectedNotice ? (
            <div className={styles['stackList']}>
              <article className={styles['stackItem']}>
                <div className={styles['metaRow']}>
                  {selectedNotice.published ? (
                    <span className={styles['badgeSuccess']}>게시 중</span>
                  ) : (
                    <span className={styles['badgeDanger']}>비공개</span>
                  )}
                  {selectedNotice.pinned ? <span className={styles['badge']}>고정</span> : null}
                  {selectedNotice.popup ? <span className={styles['badgeAccent']}>팝업</span> : null}
                </div>
                <h3 className={styles['itemTitle']}>{selectedNotice.title}</h3>
                <p className={styles['itemDescription']}>{getNoticePreview(selectedNotice.content)}</p>
                <p className={styles['metaText']}>노출 기간 {formatVisibilityWindow(selectedNotice)}</p>
                <p className={styles['metaText']}>
                  등록일 {formatDateTime(selectedNotice.createdAt)} · 수정일{' '}
                  {formatDateTime(selectedNotice.updatedAt)}
                </p>
                <div className={styles['actionRow']}>
                  <Button
                    onClick={() => {
                      startEdit(selectedNotice);
                    }}
                    type='button'
                    variant='secondary'
                  >
                    공지 수정
                  </Button>
                  {selectedNotice.published ? (
                    <Button
                      disabled={unpublishMutation.isPending}
                      onClick={() => {
                        unpublishMutation.mutate(selectedNotice.id);
                      }}
                      type='button'
                      variant='secondary'
                    >
                      게시 중지
                    </Button>
                  ) : (
                    <Button
                      disabled={publishMutation.isPending}
                      onClick={() => {
                        publishMutation.mutate(selectedNotice.id);
                      }}
                      type='button'
                    >
                      게시하기
                    </Button>
                  )}
                </div>
              </article>
            </div>
          ) : (
            <section className={styles['stateSection']}>
              <h3 className={styles['stateTitle']}>등록된 전역 공지가 없습니다.</h3>
              <p className={styles['stateDescription']}>
                첫 공지를 등록하면 공개 목록, 홈 최신 공지, 팝업 노출까지 같은 데이터로 연결됩니다.
              </p>
            </section>
          )}
        </article>
      </div>

      <article className={styles['panelWide']}>
        <header className={styles['panelHeader']}>
          <p className={styles['panelEyebrow']}>List</p>
          <h2 className={styles['panelTitle']}>전역 공지 목록</h2>
        </header>

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
                  <th scope='col'>팝업</th>
                  <th scope='col'>노출 기간</th>
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
                          <span className={styles['cellSecondary']}>{getNoticePreview(notice.content)}</span>
                        </div>
                      </td>
                      <td>{notice.published ? '게시 중' : '비공개'}</td>
                      <td>{notice.pinned ? '고정' : '-'}</td>
                      <td>{notice.popup ? '노출' : '-'}</td>
                      <td>{formatVisibilityWindow(notice)}</td>
                      <td>{formatDateTime(notice.createdAt)}</td>
                      <td>{formatDateTime(notice.updatedAt)}</td>
                      <td>
                        <div className={styles['tableActionGroup']}>
                          <button
                            className={styles['tableActionButton']}
                            onClick={() => {
                              setSelectedNoticeId(notice.id);
                              startEdit(notice);
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
      </article>
    </section>
  );
};

export default AdminNoticesSection;
