import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import {
  createAdminResource,
  deleteAdminResource,
  updateAdminResource,
} from '@/api/adminResources';
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
  fileSize: string;
  fileUrl: string;
  mimeType: string;
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
  fileSize: '0',
  fileUrl: '',
  mimeType: '',
  sortOrder: String(sortOrder),
  title: '',
  visibility: 'ENROLLED_ONLY',
});

const createFormState = (document: AdminProgramDocument): ResourceFormState => ({
  description: document.description ?? '',
  fileName: document.fileName,
  fileSize: String(document.fileSize),
  fileUrl: document.fileUrl,
  mimeType: document.mimeType ?? '',
  sortOrder: String(document.sortOrder),
  title: document.title,
  visibility: document.visibility,
});

const visibilityLabelByValue: Record<AdminResourceVisibility, string> = {
  ENROLLED_ONLY: '수강생 전용',
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

const validateForm = (formState: ResourceFormState): string | null => {
  if (!formState.title.trim()) {
    return '자료 제목을 입력해 주세요.';
  }
  if (!formState.fileName.trim()) {
    return '파일명을 입력해 주세요.';
  }
  if (!formState.fileUrl.trim()) {
    return '파일 주소를 입력해 주세요.';
  }
  if (
    !formState.fileSize.trim() ||
    Number.isNaN(Number(formState.fileSize)) ||
    Number(formState.fileSize) < 0
  ) {
    return '파일 크기를 숫자로 입력해 주세요.';
  }
  if (!formState.sortOrder.trim() || Number.isNaN(Number(formState.sortOrder))) {
    return '정렬 순서를 숫자로 입력해 주세요.';
  }

  return validateResourceDocumentPolicy({
    fileName: formState.fileName,
    fileSize: Number(formState.fileSize),
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
  const requestedLectureParam = searchParams.get('lectureId');
  const requestedLectureId = requestedLectureParam === null ? null : Number(requestedLectureParam);

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
    fileSize: Number(formState.fileSize),
    fileUrl: formState.fileUrl.trim(),
    lectureId,
    mimeType: formState.mimeType.trim() || null,
    programId,
    scope: 'PROGRAM',
    sortOrder: Number(formState.sortOrder),
    title: formState.title.trim(),
    visibility: formState.visibility,
  });

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
                              label='자료 제목'
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

                          <div className={styles['inlineFieldGrid']}>
                            <TextField
                              label='파일명'
                              name={`resource-file-name-${String(document.id)}`}
                              onChange={(event) => {
                                updateEditForm(document.id, (current) => ({
                                  ...current,
                                  fileName: event.target.value,
                                }));
                              }}
                              value={formState.fileName}
                            />
                            <TextField
                              label='파일 크기(bytes)'
                              name={`resource-file-size-${String(document.id)}`}
                              onChange={(event) => {
                                updateEditForm(document.id, (current) => ({
                                  ...current,
                                  fileSize: event.target.value,
                                }));
                              }}
                              value={formState.fileSize}
                            />
                          </div>

                          <div className={styles['inlineFieldGrid']}>
                            <TextField
                              label='파일 주소'
                              name={`resource-file-url-${String(document.id)}`}
                              onChange={(event) => {
                                updateEditForm(document.id, (current) => ({
                                  ...current,
                                  fileUrl: event.target.value,
                                }));
                              }}
                              value={formState.fileUrl}
                            />
                            <TextField
                              label='MIME 타입'
                              name={`resource-mime-type-${String(document.id)}`}
                              onChange={(event) => {
                                updateEditForm(document.id, (current) => ({
                                  ...current,
                                  mimeType: event.target.value,
                                }));
                              }}
                              value={formState.mimeType}
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
                        label='자료 제목'
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

                    <div className={styles['inlineFieldGrid']}>
                      <TextField
                        label='파일명'
                        name={`resource-create-file-name-${String(lecture.id)}`}
                        onChange={(event) => {
                          updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                            ...current,
                            fileName: event.target.value,
                          }));
                        }}
                        value={createForm.fileName}
                      />
                      <TextField
                        label='파일 크기(bytes)'
                        name={`resource-create-file-size-${String(lecture.id)}`}
                        onChange={(event) => {
                          updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                            ...current,
                            fileSize: event.target.value,
                          }));
                        }}
                        value={createForm.fileSize}
                      />
                    </div>

                    <div className={styles['inlineFieldGrid']}>
                      <TextField
                        label='파일 주소'
                        name={`resource-create-file-url-${String(lecture.id)}`}
                        onChange={(event) => {
                          updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                            ...current,
                            fileUrl: event.target.value,
                          }));
                        }}
                        value={createForm.fileUrl}
                      />
                      <TextField
                        label='MIME 타입'
                        name={`resource-create-mime-type-${String(lecture.id)}`}
                        onChange={(event) => {
                          updateCreateForm(lecture.id, lectureDocuments.length, (current) => ({
                            ...current,
                            mimeType: event.target.value,
                          }));
                        }}
                        value={createForm.mimeType}
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
