import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminPopupLive,
  deleteAdminPopupLive,
  publishAdminPopupLive,
  unpublishAdminPopupLive,
  updateAdminPopupLive,
} from '@/api/notices';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import {
  adminPopupsQueryKey,
  globalPopupsQueryKey,
  useAdminPopupsQuery,
} from '@/query/useNoticeQueries';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminPopupCreatePayload, AdminPopupUpdatePayload, NoticeItem } from '@/types/notice';

import styles from './AdminConsolePage.module.scss';

interface PopupFormState {
  content: string;
  published: boolean;
  title: string;
  visibleEndAt: string;
  visibleStartAt: string;
}

const EMPTY_FORM: PopupFormState = {
  content: '',
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

const createFormState = (popup?: NoticeItem | null): PopupFormState => {
  if (!popup) {
    return EMPTY_FORM;
  }

  return {
    content: popup.content,
    published: popup.published,
    title: popup.title,
    visibleEndAt: formatDateTimeInputValue(popup.visibleEndAt),
    visibleStartAt: formatDateTimeInputValue(popup.visibleStartAt),
  };
};

const getNoticePreview = (content: string): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '본문이 없습니다.';
  }

  return normalized.length > 110 ? `${normalized.slice(0, 110)}...` : normalized;
};

const formatVisibilityWindow = (popup: NoticeItem): string => {
  if (!popup.visibleStartAt && !popup.visibleEndAt) {
    return '상시 노출';
  }

  if (popup.visibleStartAt && popup.visibleEndAt) {
    return `${formatDateTime(popup.visibleStartAt)} ~ ${formatDateTime(popup.visibleEndAt)}`;
  }

  if (popup.visibleStartAt) {
    return `${formatDateTime(popup.visibleStartAt)}부터`;
  }

  return `${formatDateTime(popup.visibleEndAt)}까지`;
};

const AdminPopupsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const popupsQuery = useAdminPopupsQuery();
  const [selectedPopupIdState, setSelectedPopupId] = useState<number | null>(null);
  const [editingPopupIdState, setEditingPopupId] = useState<number | null>(null);
  const [formState, setFormState] = useState<PopupFormState>(EMPTY_FORM);

  const popups = useMemo(() => popupsQuery.data ?? [], [popupsQuery.data]);
  const firstPopup = popups.at(0) ?? null;

  const selectedPopupId =
    selectedPopupIdState !== null && popups.some((popup) => popup.id === selectedPopupIdState)
      ? selectedPopupIdState
      : (firstPopup?.id ?? null);
  const editingPopupId =
    editingPopupIdState !== null && popups.some((popup) => popup.id === editingPopupIdState)
      ? editingPopupIdState
      : null;
  const selectedPopup = popups.find((popup) => popup.id === selectedPopupId) ?? null;

  const refreshPopups = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminPopupsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: globalPopupsQueryKey() }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminPopupCreatePayload) => createAdminPopupLive(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (popup) => {
      await refreshPopups();
      setFormState(EMPTY_FORM);
      setSelectedPopupId(popup.id);
      showToast({
        message: '팝업을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ popupId, payload }: { popupId: number; payload: AdminPopupUpdatePayload }) =>
      updateAdminPopupLive(popupId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 수정에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (popup) => {
      await refreshPopups();
      setEditingPopupId(null);
      setFormState(EMPTY_FORM);
      setSelectedPopupId(popup.id);
      showToast({
        message: '팝업을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (popupId: number) => publishAdminPopupLive(popupId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 게시 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPopups();
      showToast({
        message: '팝업 게시 상태를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (popupId: number) => unpublishAdminPopupLive(popupId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 게시 중지에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshPopups();
      showToast({
        message: '팝업 게시를 중지했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (popupId: number) => deleteAdminPopupLive(popupId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '팝업 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, popupId) => {
      await refreshPopups();

      if (selectedPopupId === popupId) {
        setSelectedPopupId(null);
      }
      if (editingPopupId === popupId) {
        setEditingPopupId(null);
        setFormState(EMPTY_FORM);
      }

      showToast({
        message: '팝업을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const startCreate = () => {
    setEditingPopupId(null);
    setFormState(EMPTY_FORM);
  };

  const startEdit = (popup: NoticeItem) => {
    setSelectedPopupId(popup.id);
    setEditingPopupId(popup.id);
    setFormState(createFormState(popup));
  };

  const handleSubmit = () => {
    const title = formState.title.trim();
    const content = formState.content.trim();
    const visibleStartAt = toIsoStringOrNull(formState.visibleStartAt);
    const visibleEndAt = toIsoStringOrNull(formState.visibleEndAt);

    if (!title) {
      showToast({ message: '팝업 제목을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (!content) {
      showToast({ message: '팝업 본문을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (visibleStartAt && visibleEndAt && new Date(visibleStartAt) > new Date(visibleEndAt)) {
      showToast({ message: '노출 시작은 종료보다 늦을 수 없습니다.', variant: 'error' });
      return;
    }

    if (editingPopupId === null) {
      createMutation.mutate({
        content,
        published: formState.published,
        title,
        visibleEndAt,
        visibleStartAt,
      });
      return;
    }

    updateMutation.mutate({
      popupId: editingPopupId,
      payload: {
        content,
        title,
        visibleEndAt,
        visibleStartAt,
      },
    });
  };

  const summary = {
    publishedCount: popups.filter((popup) => popup.published).length,
    scheduledCount: popups.filter((popup) => popup.visibleStartAt !== null).length,
    totalCount: popups.length,
  };

  if (popupsQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>팝업 목록을 불러오는 중입니다.</h2>
        <p className={styles['stateDescription']}>관리자 팝업 API 응답을 확인하고 있습니다.</p>
      </section>
    );
  }

  if (popupsQuery.isError) {
    return (
      <section className={styles['stateSection']}>
        <h2 className={styles['stateTitle']}>팝업 관리 화면을 불러오지 못했습니다.</h2>
        <p className={styles['stateDescription']}>
          {popupsQuery.error instanceof Error
            ? popupsQuery.error.message
            : '관리자 팝업 API 상태를 확인해 주세요.'}
        </p>
      </section>
    );
  }

  return (
    <section className={styles['workspace']}>
      <section className={styles['summaryGrid']}>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>전체 팝업</p>
          <strong className={styles['summaryValue']}>{String(summary.totalCount)}건</strong>
          <p className={styles['summaryDescription']}>
            홈 진입 시 노출되는 팝업 항목을 따로 관리합니다.
          </p>
        </article>
        <article className={styles['summaryCard']} data-tone='accent'>
          <p className={styles['summaryLabel']}>게시 중</p>
          <strong className={styles['summaryValue']}>{String(summary.publishedCount)}건</strong>
          <p className={styles['summaryDescription']}>홈에서 실제 노출 가능한 팝업 수입니다.</p>
        </article>
        <article className={styles['summaryCard']} data-tone='neutral'>
          <p className={styles['summaryLabel']}>노출 기간 설정</p>
          <strong className={styles['summaryValue']}>{String(summary.scheduledCount)}건</strong>
          <p className={styles['summaryDescription']}>시작/종료 시각이 지정된 팝업 수입니다.</p>
        </article>
      </section>

      <div className={styles['contentGrid']}>
        <article className={styles['panel']}>
          <header className={styles['panelHeader']}>
            <h2 className={styles['panelTitle']}>
              {editingPopupId === null ? '새 팝업 등록' : '팝업 수정'}
            </h2>
          </header>

          <div className={styles['form']}>
            <TextField
              label='팝업 제목'
              name='popupTitle'
              onChange={(event) => {
                setFormState((current) => ({ ...current, title: event.target.value }));
              }}
              placeholder='홈에서 띄울 팝업 제목을 입력해 주세요.'
              value={formState.title}
            />
            <TextAreaField
              label='팝업 본문'
              name='popupContent'
              onChange={(event) => {
                setFormState((current) => ({ ...current, content: event.target.value }));
              }}
              rows={8}
              value={formState.content}
            />
            <div className={styles['compactFieldRow']}>
              <TextField
                label='노출 시작'
                name='popupVisibleStartAt'
                onChange={(event) => {
                  setFormState((current) => ({ ...current, visibleStartAt: event.target.value }));
                }}
                type='datetime-local'
                value={formState.visibleStartAt}
              />
              <TextField
                label='노출 종료'
                name='popupVisibleEndAt'
                onChange={(event) => {
                  setFormState((current) => ({ ...current, visibleEndAt: event.target.value }));
                }}
                type='datetime-local'
                value={formState.visibleEndAt}
              />
            </div>

            {editingPopupId === null ? (
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
                  : editingPopupId === null
                    ? '팝업 등록'
                    : '팝업 수정'}
              </Button>
              <Button onClick={startCreate} type='button' variant='secondary'>
                새 팝업 작성
              </Button>
            </div>
          </div>
        </article>

        <article className={styles['panel']}>
          <header className={styles['panelHeader']}>
            <h2 className={styles['panelTitle']}>선택한 팝업</h2>
          </header>

          {selectedPopup ? (
            <div className={styles['stackList']}>
              <article className={styles['stackItem']}>
                <div className={styles['metaRow']}>
                  {selectedPopup.published ? (
                    <span className={styles['badgeSuccess']}>게시 중</span>
                  ) : (
                    <span className={styles['badgeDanger']}>비공개</span>
                  )}
                  <span className={styles['badgeAccent']}>홈 팝업</span>
                </div>
                <h3 className={styles['itemTitle']}>{selectedPopup.title}</h3>
                <p className={styles['itemDescription']}>
                  {getNoticePreview(selectedPopup.content)}
                </p>
                <p className={styles['metaText']}>
                  노출 기간 {formatVisibilityWindow(selectedPopup)}
                </p>
                <p className={styles['metaText']}>
                  등록일 {formatDateTime(selectedPopup.createdAt)} · 수정일{' '}
                  {formatDateTime(selectedPopup.updatedAt)}
                </p>
                <div className={styles['actionRow']}>
                  <Button
                    onClick={() => {
                      startEdit(selectedPopup);
                    }}
                    type='button'
                    variant='secondary'
                  >
                    팝업 수정
                  </Button>
                  {selectedPopup.published ? (
                    <Button
                      disabled={unpublishMutation.isPending}
                      onClick={() => {
                        unpublishMutation.mutate(selectedPopup.id);
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
                        publishMutation.mutate(selectedPopup.id);
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
              <h3 className={styles['stateTitle']}>등록된 팝업이 없습니다.</h3>
              <p className={styles['stateDescription']}>
                첫 팝업을 등록하면 홈 진입 시 팝업 노출 소스로 바로 연결됩니다.
              </p>
            </section>
          )}
        </article>
      </div>

      <article className={styles['panelWide']}>
        <header className={styles['panelHeader']}>
          <h2 className={styles['panelTitle']}>홈 팝업 목록</h2>
        </header>

        {!popups.length ? (
          <section className={styles['stateSection']}>
            <h3 className={styles['stateTitle']}>표시할 팝업이 없습니다.</h3>
            <p className={styles['stateDescription']}>새 팝업을 등록하면 여기에 바로 반영됩니다.</p>
          </section>
        ) : (
          <div className={styles['tableWrap']}>
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th scope='col'>제목</th>
                  <th scope='col'>게시 상태</th>
                  <th scope='col'>노출 기간</th>
                  <th scope='col'>등록일</th>
                  <th scope='col'>수정일</th>
                  <th scope='col'>관리</th>
                </tr>
              </thead>
              <tbody>
                {popups.map((popup) => {
                  return (
                    <tr key={popup.id}>
                      <td>
                        <div className={styles['cellStack']}>
                          <span className={styles['cellPrimary']}>{popup.title}</span>
                          <span className={styles['cellSecondary']}>
                            {getNoticePreview(popup.content)}
                          </span>
                        </div>
                      </td>
                      <td>{popup.published ? '게시 중' : '비공개'}</td>
                      <td>{formatVisibilityWindow(popup)}</td>
                      <td>{formatDateTime(popup.createdAt)}</td>
                      <td>{formatDateTime(popup.updatedAt)}</td>
                      <td>
                        <div className={styles['tableActionGroup']}>
                          <button
                            className={styles['tableActionButton']}
                            onClick={() => {
                              setSelectedPopupId(popup.id);
                              startEdit(popup);
                            }}
                            type='button'
                          >
                            수정
                          </button>
                          {popup.published ? (
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                unpublishMutation.mutate(popup.id);
                              }}
                              type='button'
                            >
                              중지
                            </button>
                          ) : (
                            <button
                              className={styles['tableActionButton']}
                              onClick={() => {
                                publishMutation.mutate(popup.id);
                              }}
                              type='button'
                            >
                              게시
                            </button>
                          )}
                          <button
                            className={styles['tableActionButtonDanger']}
                            onClick={() => {
                              if (!window.confirm('이 팝업을 삭제하시겠습니까?')) {
                                return;
                              }

                              deleteMutation.mutate(popup.id);
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

export default AdminPopupsSection;
