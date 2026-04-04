import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminPopupMediaUploadTarget,
  uploadAdminPopupMediaFile,
} from '@/api/adminPopupMedia';
import {
  createAdminPopupLive,
  deleteAdminPopupLive,
  publishAdminPopupLive,
  unpublishAdminPopupLive,
  updateAdminPopupLive,
} from '@/api/popups';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import {
  adminPopupsQueryKey,
  globalPopupsQueryKey,
  useAdminPopupsQuery,
} from '@/query/usePopupQueries';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminPopupCreatePayload, AdminPopupUpdatePayload, PopupItem } from '@/types/popup';

import styles from './AdminConsolePage.module.scss';

interface PopupFormState {
  imageAlt: string;
  imageAssetId: number | null;
  imageUrl: string;
  published: boolean;
  sortOrder: number;
  visibleEndAt: string;
  visibleStartAt: string;
}

const createEmptyForm = (sortOrder = 0): PopupFormState => ({
  imageAlt: '',
  imageAssetId: null,
  imageUrl: '',
  published: true,
  sortOrder,
  visibleEndAt: '',
  visibleStartAt: '',
});

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

const buildPopupLabelFromFilename = (filename: string): string => {
  return filename.replace(/\.[^.]+$/, '').trim() || '홈 팝업';
};

const createFormState = (popup?: PopupItem | null): PopupFormState => {
  if (!popup) {
    return createEmptyForm();
  }

  return {
    imageAlt: popup.altText,
    imageAssetId: popup.imageAssetId,
    imageUrl: popup.imageUrl,
    published: popup.published,
    sortOrder: popup.sortOrder,
    visibleEndAt: formatDateTimeInputValue(popup.visibleEndAt),
    visibleStartAt: formatDateTimeInputValue(popup.visibleStartAt),
  };
};

const formatVisibilityWindow = (popup: PopupItem): string => {
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

const getNextSortOrder = (popups: PopupItem[]): number => {
  if (!popups.length) {
    return 0;
  }

  return Math.max(...popups.map((popup) => popup.sortOrder)) + 1;
};

const AdminPopupsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const popupsQuery = useAdminPopupsQuery();
  const [selectedPopupIdState, setSelectedPopupId] = useState<number | null>(null);
  const [editingPopupIdState, setEditingPopupId] = useState<number | null>(null);
  const [formState, setFormState] = useState<PopupFormState>(createEmptyForm());
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
      setEditingPopupId(null);
      setFormState(createEmptyForm(popup.sortOrder + 1));
      setSelectedPopupId(popup.id);
      showToast({
        message: '팝업을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ payload, popupId }: { payload: AdminPopupUpdatePayload; popupId: number }) =>
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
      setFormState(createEmptyForm(getNextSortOrder(popups)));
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
        setFormState(createEmptyForm(getNextSortOrder(popups)));
      }

      showToast({
        message: '팝업을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const startCreate = () => {
    setEditingPopupId(null);
    setFormState(createEmptyForm(getNextSortOrder(popups)));
  };

  const startEdit = (popup: PopupItem) => {
    setSelectedPopupId(popup.id);
    setEditingPopupId(popup.id);
    setFormState(createFormState(popup));
  };

  const handleImageFileChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsUploadingImage(true);

    try {
      const uploadTarget = await createAdminPopupMediaUploadTarget({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
      });

      await uploadAdminPopupMediaFile(uploadTarget.uploadUrl, file);

      setFormState((current) => ({
        ...current,
        imageAlt: current.imageAlt.trim()
          ? current.imageAlt
          : buildPopupLabelFromFilename(file.name),
        imageAssetId: uploadTarget.assetId,
        imageUrl: uploadTarget.previewUrl,
      }));

      showToast({
        message: '팝업 이미지를 업로드했습니다.',
        variant: 'success',
      });
    } catch (error: unknown) {
      showToast({
        message: error instanceof Error ? error.message : '팝업 이미지 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    const imageAlt = formState.imageAlt.trim();
    const visibleStartAt = toIsoStringOrNull(formState.visibleStartAt);
    const visibleEndAt = toIsoStringOrNull(formState.visibleEndAt);

    if (formState.imageAssetId === null || !formState.imageUrl.trim()) {
      showToast({ message: '팝업 이미지를 첨부해 주세요.', variant: 'error' });
      return;
    }

    if (!imageAlt) {
      showToast({ message: '이미지 설명을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (formState.sortOrder < 0) {
      showToast({ message: '정렬 순서는 0 이상이어야 합니다.', variant: 'error' });
      return;
    }

    if (visibleStartAt && visibleEndAt && new Date(visibleStartAt) > new Date(visibleEndAt)) {
      showToast({ message: '노출 시작은 종료보다 늦을 수 없습니다.', variant: 'error' });
      return;
    }

    const payload = {
      altText: imageAlt,
      imageAssetId: formState.imageAssetId,
      sortOrder: formState.sortOrder,
      visibleEndAt,
      visibleStartAt,
    };

    if (editingPopupId === null) {
      createMutation.mutate({
        ...payload,
        published: formState.published,
      });
      return;
    }

    updateMutation.mutate({
      payload,
      popupId: editingPopupId,
    });
  };

  const summary = {
    publishedCount: popups.filter((popup) => popup.published).length,
    scheduledCount: popups.filter(
      (popup) => popup.visibleStartAt !== null || popup.visibleEndAt !== null,
    ).length,
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
            홈 진입 시 순차 노출할 이미지 팝업 목록입니다.
          </p>
        </article>
        <article className={styles['summaryCard']} data-tone='accent'>
          <p className={styles['summaryLabel']}>게시 중</p>
          <strong className={styles['summaryValue']}>{String(summary.publishedCount)}건</strong>
          <p className={styles['summaryDescription']}>게시 상태인 팝업 수입니다.</p>
        </article>
        <article className={styles['summaryCard']} data-tone='neutral'>
          <p className={styles['summaryLabel']}>노출 기간 설정</p>
          <strong className={styles['summaryValue']}>{String(summary.scheduledCount)}건</strong>
          <p className={styles['summaryDescription']}>
            시작 또는 종료 시각이 지정된 팝업 수입니다.
          </p>
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
            <div className={styles['mediaField']}>
              <div className={styles['mediaFieldHeader']}>
                <div className={styles['mediaFieldCopy']}>
                  <p className={styles['fieldLabel']}>팝업 이미지</p>
                  <p className={styles['fieldHint']}>
                    텍스트 없이 이미지 한 장만 팝업으로 노출합니다.
                  </p>
                </div>
              </div>

              <TextField
                accept='image/*'
                disabled={isUploadingImage}
                label={isUploadingImage ? '팝업 이미지 업로드 중' : '팝업 이미지 파일'}
                name='popupImageFile'
                onChange={(event) => {
                  void handleImageFileChange(event.target.files?.[0] ?? null);
                  event.currentTarget.value = '';
                }}
                type='file'
              />

              {formState.imageUrl ? (
                <div className={styles['thumbnailPreview']}>
                  <img
                    alt={formState.imageAlt || '팝업 이미지 미리보기'}
                    className={styles['thumbnailPreviewImage']}
                    src={formState.imageUrl}
                  />
                </div>
              ) : (
                <div className={styles['thumbnailEmptyState']}>
                  업로드한 이미지가 여기에 미리보기로 표시됩니다.
                </div>
              )}
            </div>

            <TextField
              label='이미지 설명'
              name='popupImageAlt'
              onChange={(event) => {
                setFormState((current) => ({ ...current, imageAlt: event.target.value }));
              }}
              placeholder='접근성용 설명입니다. 비워 두지 않는 편이 좋습니다.'
              value={formState.imageAlt}
            />

            <div className={styles['compactFieldRow']}>
              <TextField
                label='정렬 순서'
                min={0}
                name='popupSortOrder'
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setFormState((current) => ({
                    ...current,
                    sortOrder: Number.isFinite(nextValue) ? nextValue : 0,
                  }));
                }}
                type='number'
                value={String(formState.sortOrder)}
              />
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
                disabled={createMutation.isPending || updateMutation.isPending || isUploadingImage}
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
              {formState.imageUrl ? (
                <Button
                  onClick={() => {
                    setFormState((current) => ({
                      ...current,
                      imageAlt: '',
                      imageAssetId: null,
                      imageUrl: '',
                    }));
                  }}
                  type='button'
                  variant='secondary'
                >
                  이미지 제거
                </Button>
              ) : null}
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
                  <span className={styles['badgeAccent']}>
                    정렬 {String(selectedPopup.sortOrder)}
                  </span>
                </div>

                <div className={styles['thumbnailPreview']}>
                  <img
                    alt={selectedPopup.altText || '팝업 이미지'}
                    className={styles['thumbnailPreviewImage']}
                    src={selectedPopup.imageUrl}
                  />
                </div>

                <p className={styles['metaText']}>이미지 설명 {selectedPopup.altText}</p>
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
                첫 팝업을 등록하면 홈 진입 시 노출 순서대로 바로 연결됩니다.
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
                  <th scope='col'>이미지 설명</th>
                  <th scope='col'>정렬</th>
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
                          <span className={styles['cellPrimary']}>
                            {popup.altText || '홈 팝업'}
                          </span>
                          <span className={styles['cellSecondary']}>이미지 팝업</span>
                        </div>
                      </td>
                      <td>{String(popup.sortOrder)}</td>
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
