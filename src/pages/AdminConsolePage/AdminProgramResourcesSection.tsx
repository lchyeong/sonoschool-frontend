import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { createAdminResourceUploadTarget, uploadAdminResourceFile } from '@/api/adminResourceMedia';
import {
  createAdminResource,
  deleteAdminResource,
  updateAdminResource,
} from '@/api/adminResources';
import AdminFileDropZone from '@/components/admin/AdminFileDropZone';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { adminCurriculumQueryKey, useAdminCurriculumQuery } from '@/query/useAdminCurriculumQuery';
import { adminProgramDetailLiveQueryKey } from '@/query/useAdminProgramsLiveQuery';
import { adminResourcesQueryKey } from '@/query/useAdminResourcesQuery';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramDocument } from '@/types/adminProgramsLive';
import type { AdminResourceUpsertPayload, AdminResourceVisibility } from '@/types/adminResources';

import styles from './AdminConsolePage.module.scss';
import { formatFileSizeLabel } from './adminConsolePageShared';
import {
  RESOURCE_DOCUMENT_ACCEPT,
  RESOURCE_DOCUMENT_POLICY_HINT,
  validateResourceDocumentPolicy,
} from './resourceDocumentPolicy';

interface AdminProgramResourcesSectionProps {
  enabled: boolean;
  initialDocuments: readonly AdminProgramDocument[];
  programId: number | null;
}

interface ResourceFormState {
  description: string;
  fileName: string;
  fileSize: number;
  mediaAssetId: number | null;
  mimeType: string;
  originalFileName: string;
  sortOrder: string;
  title: string;
  visibility: AdminResourceVisibility;
}

interface LectureOption {
  id: number;
  sectionTitle: string;
  title: string;
}

const createEmptyForm = (sortOrder: number): ResourceFormState => ({
  description: '',
  fileName: '',
  fileSize: 0,
  mediaAssetId: null,
  mimeType: '',
  originalFileName: '',
  sortOrder: String(sortOrder),
  title: '',
  visibility: 'ENROLLED_ONLY',
});

const createFormState = (document: AdminProgramDocument): ResourceFormState => ({
  description: document.description ?? '',
  fileName: document.fileName,
  fileSize: document.fileSize,
  mediaAssetId: null,
  mimeType: document.mimeType ?? '',
  originalFileName: document.fileName,
  sortOrder: String(document.sortOrder),
  title: document.title,
  visibility: document.visibility,
});

const visibilityLabelByValue: Record<AdminResourceVisibility, string> = {
  ENROLLED_ONLY: '수강생 전용',
  HIDDEN: '숨김',
  PUBLIC: '전체 공개',
};

const visibilityOptions = [
  { label: '수강생 전용', value: 'ENROLLED_ONLY' },
  { label: '전체 공개', value: 'PUBLIC' },
] as const;

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatFileSizeInMb = (bytes: number): string => {
  if (bytes <= 0) {
    return '-';
  }

  return `${Math.max(0.01, bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getTitleFromFileName = (fileName: string): string => {
  return fileName.replace(/\.[^.]+$/, '');
};

const validateForm = (formState: ResourceFormState): string | null => {
  if (!formState.title.trim()) {
    return '자료 게시글 제목을 입력해 주세요.';
  }
  if (!formState.fileName.trim()) {
    return '다운로드 파일명을 입력해 주세요.';
  }
  if (formState.fileSize < 1) {
    return '자료 파일을 업로드해 주세요.';
  }
  if (!formState.sortOrder.trim() || Number.isNaN(Number(formState.sortOrder))) {
    return '정렬 순서를 숫자로 입력해 주세요.';
  }

  return validateResourceDocumentPolicy({
    fileName: formState.fileName,
    fileSize: formState.fileSize,
    mimeType: formState.mimeType,
  });
};

const confirmResourceDelete = (): boolean => {
  return window.confirm('강의 자료를 삭제하면 되돌릴 수 없습니다. 계속하시겠습니까?');
};

const AdminProgramResourcesSection = ({
  enabled,
  initialDocuments,
  programId,
}: AdminProgramResourcesSectionProps) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [searchParams] = useSearchParams();
  const curriculumQuery = useAdminCurriculumQuery(programId, enabled && programId !== null);
  const [editForms, setEditForms] = useState<Record<number, ResourceFormState>>({});
  const [createForms, setCreateForms] = useState<Record<number, ResourceFormState>>({});
  const [pendingResourceFiles, setPendingResourceFiles] = useState<
    Record<string, File | undefined>
  >({});
  const [uploadingFormKey, setUploadingFormKey] = useState<string | null>(null);
  const requestedLectureParam = searchParams.get('lectureId');
  const requestedLectureId = requestedLectureParam === null ? null : Number(requestedLectureParam);
  const hasUploadedResourcePendingSave =
    Object.values(editForms).some((form) => form.mediaAssetId !== null) ||
    Object.values(createForms).some((form) => form.mediaAssetId !== null);
  const hasSelectedResourcePendingUpload = Object.keys(pendingResourceFiles).length > 0;

  useEffect(() => {
    const shouldWarnBeforeUnload =
      hasSelectedResourcePendingUpload || hasUploadedResourcePendingSave;
    if (!shouldWarnBeforeUnload) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasSelectedResourcePendingUpload, hasUploadedResourcePendingSave]);

  const lectureOptions = useMemo<LectureOption[]>(() => {
    const options = (curriculumQuery.data ?? []).flatMap((section) =>
      section.lectures.map((lecture) => ({
        id: lecture.id,
        sectionTitle: section.title,
        title: lecture.title,
      })),
    );

    if (
      requestedLectureId === null ||
      !options.some((lecture) => lecture.id === requestedLectureId)
    ) {
      return options;
    }

    return [...options].sort((left, right) => {
      if (left.id === requestedLectureId) {
        return -1;
      }
      if (right.id === requestedLectureId) {
        return 1;
      }
      return 0;
    });
  }, [curriculumQuery.data, requestedLectureId]);

  const refreshProgram = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminCurriculumQueryKey(programId) }),
      queryClient.invalidateQueries({ queryKey: adminProgramDetailLiveQueryKey(programId) }),
      queryClient.invalidateQueries({ queryKey: adminResourcesQueryKey() }),
    ]);
  };

  const updateEditForm = (
    documentId: number,
    updater: (current: ResourceFormState) => ResourceFormState,
  ) => {
    setEditForms((current) => {
      const nextCurrent =
        current[documentId] ??
        createFormState(
          initialDocuments.find((document) => document.id === documentId) as AdminProgramDocument,
        );
      return {
        ...current,
        [documentId]: updater(nextCurrent),
      };
    });
  };

  const updateCreateForm = (
    lectureId: number,
    sortOrder: number,
    updater: (current: ResourceFormState) => ResourceFormState,
  ) => {
    setCreateForms((current) => ({
      ...current,
      [lectureId]: updater(current[lectureId] ?? createEmptyForm(sortOrder)),
    }));
  };

  const resetCreateForm = (lectureId: number, sortOrder: number) => {
    setCreateForms((current) => ({
      ...current,
      [lectureId]: createEmptyForm(sortOrder),
    }));
  };

  const toPayload = (
    lectureId: number,
    formState: ResourceFormState,
  ): AdminResourceUpsertPayload => ({
    description: formState.description.trim() || null,
    fileName: formState.fileName.trim(),
    lectureId,
    mediaAssetId: formState.mediaAssetId,
    programId,
    scope: 'PROGRAM',
    sortOrder: Number(formState.sortOrder),
    title: formState.title.trim(),
    visibility: formState.visibility,
  });

  const uploadResourceFile = async (
    file: File | null,
    applyUploadedFile: (file: File, assetId: number) => void,
    formKey: string,
  ) => {
    if (!file) {
      return;
    }

    const validationMessage = validateResourceDocumentPolicy({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (validationMessage) {
      showToast({ message: validationMessage, variant: 'error' });
      return;
    }

    setUploadingFormKey(formKey);
    try {
      const uploadTarget = await createAdminResourceUploadTarget({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
      });
      await uploadAdminResourceFile(uploadTarget.uploadUrl, file);
      applyUploadedFile(file, uploadTarget.assetId);
      setPendingResourceFiles(({ [formKey]: _removed, ...next }) => next);
      showToast({ message: '자료 파일을 업로드했습니다.', variant: 'success' });
    } catch (error: unknown) {
      showToast({
        message: error instanceof Error ? error.message : '자료 파일 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setUploadingFormKey(null);
    }
  };

  const selectResourceFile = (
    file: File | null,
    formKey: string,
    applySelectedFile: (file: File) => void,
  ) => {
    if (!file) {
      return;
    }

    const validationMessage = validateResourceDocumentPolicy({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (validationMessage) {
      showToast({ message: validationMessage, variant: 'error' });
      return;
    }

    setPendingResourceFiles((current) => ({
      ...current,
      [formKey]: file,
    }));
    applySelectedFile(file);
  };

  const clearPendingResourceFile = (formKey: string) => {
    setPendingResourceFiles(({ [formKey]: _removed, ...next }) => next);
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminResourceUpsertPayload) => createAdminResource(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 자료를 등록하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (document) => {
      await refreshProgram();
      resetCreateForm(document.lectureId as number, document.sortOrder + 1);
      showToast({
        message: '강의 자료를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      documentId,
      payload,
    }: {
      documentId: number;
      payload: AdminResourceUpsertPayload;
    }) => updateAdminResource(documentId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 자료를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshProgram();
      showToast({
        message: '강의 자료를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => deleteAdminResource(documentId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 자료를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, documentId) => {
      await refreshProgram();
      setEditForms((current) => {
        const { [documentId]: _removed, ...next } = current;
        return next;
      });
      showToast({
        message: '강의 자료를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  if (!enabled || programId === null) {
    return (
      <p className={styles['helperText']}>
        자료는 프로그램을 먼저 저장한 뒤 강의 단위로 관리할 수 있습니다.
      </p>
    );
  }

  if (curriculumQuery.isPending) {
    return <p className={styles['helperText']}>강의 목록을 불러오는 중입니다.</p>;
  }

  if (curriculumQuery.isError) {
    return (
      <p className={styles['helperText']}>
        {curriculumQuery.error instanceof Error
          ? curriculumQuery.error.message
          : '강의 목록을 불러오지 못했습니다.'}
      </p>
    );
  }

  if (!lectureOptions.length) {
    return <p className={styles['helperText']}>먼저 강의 구성에 강의를 추가해 주세요.</p>;
  }

  return (
    <div className={styles['stackList']}>
      <article className={styles['panel']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h3 className={styles['panelTitle']}>강의 자료</h3>
            <p className={styles['metaText']}>
              강의와 직접 연결되는 자료는 여기에서만 등록, 수정, 삭제합니다.
            </p>
          </div>
        </div>

        <p className={styles['helperText']}>{RESOURCE_DOCUMENT_POLICY_HINT}</p>

        <div className={styles['stackList']}>
          {lectureOptions.map((lecture) => {
            const lectureDocuments = initialDocuments.filter(
              (document) => document.lectureId === lecture.id,
            );
            const createForm = createForms[lecture.id] ?? createEmptyForm(lectureDocuments.length);
            const createFormKey = `create-${String(lecture.id)}`;
            const pendingCreateFile = pendingResourceFiles[createFormKey] ?? null;
            const isRequestedLecture = lecture.id === requestedLectureId;

            return (
              <article
                className={styles['panel']}
                data-selected={isRequestedLecture}
                id={`program-resource-lecture-${String(lecture.id)}`}
                key={`lecture-resource-${String(lecture.id)}`}
              >
                <div className={styles['panelToolbar']}>
                  <div>
                    <h4 className={styles['panelTitle']}>{lecture.title}</h4>
                    <p className={styles['metaText']}>
                      {lecture.sectionTitle}
                      {isRequestedLecture ? ' · 현재 선택한 강의' : ''}
                    </p>
                  </div>
                </div>

                <div className={styles['stackListCompact']}>
                  {lectureDocuments.length ? (
                    lectureDocuments.map((document) => {
                      const formState = editForms[document.id] ?? createFormState(document);
                      const editFormKey = `edit-${String(document.id)}`;
                      const pendingEditFile = pendingResourceFiles[editFormKey] ?? null;

                      return (
                        <article
                          className={styles['panel']}
                          key={`resource-document-${String(document.id)}`}
                        >
                          <div className={styles['panelToolbar']}>
                            <div>
                              <h5 className={styles['panelTitle']}>{document.title}</h5>
                              <p className={styles['metaText']}>
                                {visibilityLabelByValue[document.visibility]} ·{' '}
                                {formatFileSizeLabel(document.fileSize)} ·{' '}
                                {formatDateTime(document.createdAt)}
                              </p>
                            </div>
                            <div className={styles['actionRow']}>
                              <Button
                                onClick={() => {
                                  const validationMessage = validateForm(formState);
                                  if (validationMessage) {
                                    showToast({ message: validationMessage, variant: 'error' });
                                    return;
                                  }
                                  if (pendingEditFile) {
                                    showToast({
                                      message: '선택한 자료 파일은 업로드 시작을 먼저 눌러 주세요.',
                                      variant: 'error',
                                    });
                                    return;
                                  }
                                  updateMutation.mutate({
                                    documentId: document.id,
                                    payload: toPayload(lecture.id, formState),
                                  });
                                }}
                                type='button'
                                variant='secondary'
                              >
                                수정 저장
                              </Button>
                              <Button
                                onClick={() => {
                                  if (!confirmResourceDelete()) {
                                    return;
                                  }
                                  deleteMutation.mutate(document.id);
                                }}
                                type='button'
                                variant='danger'
                              >
                                삭제
                              </Button>
                            </div>
                          </div>

                          <div className={styles['inlineFieldGrid']}>
                            <TextField
                              label='자료 게시글 제목'
                              name={`resource-title-${String(document.id)}`}
                              onChange={(event) => {
                                updateEditForm(document.id, (current) => ({
                                  ...current,
                                  title: event.target.value,
                                }));
                              }}
                              value={formState.title}
                            />
                            <TextField
                              label='정렬 순서'
                              name={`resource-sort-order-${String(document.id)}`}
                              onChange={(event) => {
                                updateEditForm(document.id, (current) => ({
                                  ...current,
                                  sortOrder: event.target.value,
                                }));
                              }}
                              value={formState.sortOrder}
                            />
                          </div>

                          <TextAreaField
                            label='자료 설명'
                            name={`resource-description-${String(document.id)}`}
                            onChange={(event) => {
                              updateEditForm(document.id, (current) => ({
                                ...current,
                                description: event.target.value,
                              }));
                            }}
                            value={formState.description}
                          />

                          <section
                            className={styles['noticeAttachmentPanel']}
                            aria-labelledby={`resource-file-label-${String(document.id)}`}
                          >
                            <div className={styles['noticeAttachmentHeader']}>
                              <div>
                                <h6
                                  className={styles['noticeAttachmentTitle']}
                                  id={`resource-file-label-${String(document.id)}`}
                                >
                                  자료 파일
                                </h6>
                                <p className={styles['noticeAttachmentHint']}>
                                  선택한 파일은 업로드 시작을 누를 때 업로드됩니다.
                                </p>
                              </div>
                            </div>
                            <AdminFileDropZone
                              actions={
                                pendingEditFile ? (
                                  <>
                                    <Button
                                      disabled={uploadingFormKey === editFormKey}
                                      onClick={() => {
                                        void uploadResourceFile(
                                          pendingEditFile,
                                          (file, assetId) => {
                                            updateEditForm(document.id, (current) => ({
                                              ...current,
                                              fileSize: file.size,
                                              mediaAssetId: assetId,
                                              mimeType: file.type || 'application/octet-stream',
                                              originalFileName: file.name,
                                            }));
                                          },
                                          editFormKey,
                                        );
                                      }}
                                      type='button'
                                      variant='secondary'
                                    >
                                      업로드 시작
                                    </Button>
                                    <Button
                                      disabled={uploadingFormKey === editFormKey}
                                      onClick={() => {
                                        clearPendingResourceFile(editFormKey);
                                        updateEditForm(document.id, (current) => ({
                                          ...current,
                                          fileName: document.fileName,
                                          fileSize: document.fileSize,
                                          mediaAssetId: null,
                                          mimeType: document.mimeType ?? '',
                                          originalFileName: document.fileName,
                                        }));
                                      }}
                                      type='button'
                                      variant='secondary'
                                    >
                                      선택 취소
                                    </Button>
                                  </>
                                ) : null
                              }
                              accept={RESOURCE_DOCUMENT_ACCEPT}
                              buttonLabel={
                                uploadingFormKey === editFormKey ? '업로드 중...' : '파일 변경'
                              }
                              disabled={uploadingFormKey === editFormKey}
                              hint='선택한 파일은 업로드 시작을 누를 때 업로드됩니다.'
                              label='자료 파일 업로드'
                              onFilesSelected={(files) => {
                                selectResourceFile(files[0] ?? null, editFormKey, (file) => {
                                  updateEditForm(document.id, (current) => ({
                                    ...current,
                                    fileName:
                                      !current.fileName.trim() ||
                                      current.fileName === current.originalFileName
                                        ? file.name
                                        : current.fileName,
                                    fileSize: file.size,
                                    mediaAssetId: null,
                                    mimeType: file.type || 'application/octet-stream',
                                    originalFileName: file.name,
                                  }));
                                });
                              }}
                              selectedLabel={formState.originalFileName}
                              selectedMeta={
                                formState.fileSize > 0
                                  ? formatFileSizeInMb(formState.fileSize)
                                  : null
                              }
                            />
                          </section>

                          <div className={styles['inlineFieldGrid']}>
                            <TextField
                              label='다운로드 파일명'
                              name={`resource-file-name-${String(document.id)}`}
                              onChange={(event) => {
                                updateEditForm(document.id, (current) => ({
                                  ...current,
                                  fileName: event.target.value,
                                }));
                              }}
                              value={formState.fileName}
                            />
                          </div>

                          <div className={styles['compactFieldRow']}>
                            {visibilityOptions.map((option) => (
                              <label className={styles['checkboxField']} key={option.value}>
                                <input
                                  checked={formState.visibility === option.value}
                                  onChange={() => {
                                    updateEditForm(document.id, (current) => ({
                                      ...current,
                                      visibility: option.value,
                                    }));
                                  }}
                                  type='radio'
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <p className={styles['helperText']}>등록된 강의 자료가 없습니다.</p>
                  )}

                  <article className={styles['panel']}>
                    <div className={styles['panelToolbar']}>
                      <div>
                        <h5 className={styles['panelTitle']}>새 강의 자료 등록</h5>
                        <p className={styles['metaText']}>
                          이 강의에만 연결되는 자료를 추가합니다.
                        </p>
                      </div>
                    </div>

                    <div className={styles['inlineFieldGrid']}>
                      <TextField
                        label='자료 게시글 제목'
                        name={`resource-create-title-${String(lecture.id)}`}
                        onChange={(event) => {
                          updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                            ...current,
                            title: event.target.value,
                          }));
                        }}
                        value={createForm.title}
                      />
                      <TextField
                        label='정렬 순서'
                        name={`resource-create-sort-order-${String(lecture.id)}`}
                        onChange={(event) => {
                          updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                            ...current,
                            sortOrder: event.target.value,
                          }));
                        }}
                        value={createForm.sortOrder}
                      />
                    </div>

                    <TextAreaField
                      label='자료 설명'
                      name={`resource-create-description-${String(lecture.id)}`}
                      onChange={(event) => {
                        updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                          ...current,
                          description: event.target.value,
                        }));
                      }}
                      value={createForm.description}
                    />

                    <section
                      className={styles['noticeAttachmentPanel']}
                      aria-labelledby={`resource-create-file-label-${String(lecture.id)}`}
                    >
                      <div className={styles['noticeAttachmentHeader']}>
                        <div>
                          <h6
                            className={styles['noticeAttachmentTitle']}
                            id={`resource-create-file-label-${String(lecture.id)}`}
                          >
                            자료 파일
                          </h6>
                          <p className={styles['noticeAttachmentHint']}>
                            선택한 파일은 업로드 시작을 누를 때 업로드됩니다.
                          </p>
                        </div>
                      </div>

                      <AdminFileDropZone
                        actions={
                          pendingCreateFile ? (
                            <>
                              <Button
                                disabled={uploadingFormKey === createFormKey}
                                onClick={() => {
                                  void uploadResourceFile(
                                    pendingCreateFile,
                                    (file, assetId) => {
                                      updateCreateForm(
                                        lecture.id,
                                        lectureDocuments.length,
                                        (current) => ({
                                          ...current,
                                          fileSize: file.size,
                                          mediaAssetId: assetId,
                                          mimeType: file.type || 'application/octet-stream',
                                          originalFileName: file.name,
                                        }),
                                      );
                                    },
                                    createFormKey,
                                  );
                                }}
                                type='button'
                                variant='secondary'
                              >
                                업로드 시작
                              </Button>
                              <Button
                                disabled={uploadingFormKey === createFormKey}
                                onClick={() => {
                                  clearPendingResourceFile(createFormKey);
                                  updateCreateForm(
                                    lecture.id,
                                    lectureDocuments.length,
                                    (current) => ({
                                      ...current,
                                      fileName: '',
                                      fileSize: 0,
                                      mediaAssetId: null,
                                      mimeType: '',
                                      originalFileName: '',
                                      title:
                                        current.title ===
                                        getTitleFromFileName(pendingCreateFile.name)
                                          ? ''
                                          : current.title,
                                    }),
                                  );
                                }}
                                type='button'
                                variant='secondary'
                              >
                                선택 취소
                              </Button>
                            </>
                          ) : null
                        }
                        accept={RESOURCE_DOCUMENT_ACCEPT}
                        buttonLabel={
                          uploadingFormKey === createFormKey
                            ? '업로드 중...'
                            : createForm.originalFileName
                              ? '파일 변경'
                              : '파일 선택'
                        }
                        disabled={uploadingFormKey === createFormKey}
                        hint='선택한 파일은 업로드 시작을 누를 때 업로드됩니다.'
                        label='자료 파일 업로드'
                        onFilesSelected={(files) => {
                          selectResourceFile(files[0] ?? null, createFormKey, (file) => {
                            updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                              ...current,
                              fileName: current.fileName.trim() ? current.fileName : file.name,
                              fileSize: file.size,
                              mediaAssetId: null,
                              mimeType: file.type || 'application/octet-stream',
                              originalFileName: file.name,
                              title: current.title.trim()
                                ? current.title
                                : getTitleFromFileName(file.name),
                            }));
                          });
                        }}
                        selectedLabel={createForm.originalFileName || undefined}
                        selectedMeta={
                          createForm.fileSize > 0 ? formatFileSizeInMb(createForm.fileSize) : null
                        }
                      />
                    </section>

                    <div className={styles['inlineFieldGrid']}>
                      <TextField
                        label='다운로드 파일명'
                        name={`resource-create-file-name-${String(lecture.id)}`}
                        onChange={(event) => {
                          updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                            ...current,
                            fileName: event.target.value,
                          }));
                        }}
                        value={createForm.fileName}
                      />
                    </div>

                    <div className={styles['compactFieldRow']}>
                      {visibilityOptions.map((option) => (
                        <label
                          className={styles['checkboxField']}
                          key={`create-${String(lecture.id)}-${option.value}`}
                        >
                          <input
                            checked={createForm.visibility === option.value}
                            onChange={() => {
                              updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                                ...current,
                                visibility: option.value,
                              }));
                            }}
                            type='radio'
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>

                    <div className={styles['actionRow']}>
                      <Button
                        onClick={() => {
                          const validationMessage = validateForm(createForm);
                          if (validationMessage) {
                            showToast({ message: validationMessage, variant: 'error' });
                            return;
                          }
                          if (!createForm.mediaAssetId) {
                            showToast({
                              message: pendingCreateFile
                                ? '선택한 자료 파일은 업로드 시작을 먼저 눌러 주세요.'
                                : '자료 파일을 먼저 업로드해 주세요.',
                              variant: 'error',
                            });
                            return;
                          }
                          createMutation.mutate(toPayload(lecture.id, createForm));
                        }}
                        type='button'
                        variant='secondary'
                      >
                        자료 등록
                      </Button>
                    </div>
                  </article>
                </div>
              </article>
            );
          })}
        </div>
      </article>
    </div>
  );
};

export default AdminProgramResourcesSection;
