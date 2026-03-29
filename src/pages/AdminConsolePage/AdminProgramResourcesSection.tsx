import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminResource,
  deleteAdminResource,
  updateAdminResource,
} from '@/api/adminResources';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
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

type EditorTab = 'create' | 'edit';

const EMPTY_FORM: ResourceFormState = {
  description: '',
  fileName: '',
  fileSize: '0',
  fileUrl: '',
  mimeType: '',
  sortOrder: '0',
  title: '',
  visibility: 'ENROLLED_ONLY',
};

const visibilityLabelByValue: Record<AdminResourceVisibility, string> = {
  ENROLLED_ONLY: '수강생 전용',
  PUBLIC: '전체 공개',
};

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const createFormState = (document?: AdminProgramDocument | null): ResourceFormState => {
  if (!document) {
    return EMPTY_FORM;
  }

  return {
    description: document.description ?? '',
    fileName: document.fileName,
    fileSize: String(document.fileSize),
    fileUrl: document.fileUrl,
    mimeType: document.mimeType ?? '',
    sortOrder: String(document.sortOrder),
    title: document.title,
    visibility: document.visibility,
  };
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
  return window.confirm('프로그램 자료를 삭제하면 되돌릴 수 없습니다. 계속하시겠습니까?');
};

const AdminProgramResourcesSection = ({
  enabled,
  initialDocuments,
  programId,
}: AdminProgramResourcesSectionProps) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [documents, setDocuments] = useState<readonly AdminProgramDocument[]>(initialDocuments);
  const [editorTab, setEditorTab] = useState<EditorTab>('create');
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [formState, setFormState] = useState<ResourceFormState>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const editingDocument = documents.find((document) => document.id === editingDocumentId) ?? null;

  const filteredDocuments = useMemo(() => {
    if (!deferredSearchTerm) {
      return documents;
    }

    return documents.filter((document) => {
      return [document.title, document.fileName, visibilityLabelByValue[document.visibility]].some(
        (value) => value.toLowerCase().includes(deferredSearchTerm),
      );
    });
  }, [deferredSearchTerm, documents]);

  const refreshProgram = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProgramDetailLiveQueryKey(programId) }),
      queryClient.invalidateQueries({ queryKey: adminResourcesQueryKey() }),
    ]);
  };

  const resetCreateForm = () => {
    setEditorTab('create');
    setEditingDocumentId(null);
    setFormState(EMPTY_FORM);
  };

  const openEditTab = (document: AdminProgramDocument) => {
    setEditingDocumentId(document.id);
    setEditorTab('edit');
    setFormState(createFormState(document));
  };

  const toPayload = (): AdminResourceUpsertPayload => {
    return {
      description: formState.description.trim() || null,
      fileName: formState.fileName.trim(),
      fileSize: Number(formState.fileSize),
      fileUrl: formState.fileUrl.trim(),
      mimeType: formState.mimeType.trim() || null,
      programId,
      scope: 'PROGRAM',
      sortOrder: Number(formState.sortOrder),
      title: formState.title.trim(),
      visibility: formState.visibility,
    };
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminResourceUpsertPayload) => createAdminResource(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 자료를 등록하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshProgram();
      resetCreateForm();
      showToast({
        message: '프로그램 자료를 등록했습니다.',
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
        message: error instanceof Error ? error.message : '프로그램 자료를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshProgram();
      showToast({
        message: '프로그램 자료를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => deleteAdminResource(documentId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 자료를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, documentId) => {
      await refreshProgram();
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      if (editingDocumentId === documentId) {
        resetCreateForm();
      }
      showToast({
        message: '프로그램 자료를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  if (!enabled || programId === null) {
    return (
      <p className={styles['helperText']}>자료는 프로그램을 먼저 저장한 뒤 관리할 수 있습니다.</p>
    );
  }

  const handleSubmit = () => {
    const validationMessage = validateForm(formState);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    const payload = toPayload();

    if (editorTab === 'edit' && editingDocumentId !== null) {
      updateMutation.mutate({ documentId: editingDocumentId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={styles['stackList']}>
      <section className={styles['panel']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h2 className={styles['panelTitle']}>프로그램 자료 목록</h2>
            <p className={styles['metaText']}>총 {filteredDocuments.length}개</p>
          </div>

          <label className={styles['searchField']}>
            <span className={styles['searchLabel']}>검색</span>
            <input
              aria-label='프로그램 자료 검색'
              className={styles['searchInput']}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
              placeholder='자료명, 파일명 검색'
              type='search'
              value={searchTerm}
            />
          </label>
        </div>

        <div className={styles['tableWrap']}>
          <table className={`${styles['table']} ${styles['resourceTable']}`}>
            <thead>
              <tr>
                <th scope='col'>자료명</th>
                <th scope='col'>공개 범위</th>
                <th scope='col'>파일</th>
                <th scope='col'>정렬</th>
                <th scope='col'>등록일</th>
                <th scope='col'>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((document) => (
                  <tr
                    className={
                      document.id === editingDocumentId && editorTab === 'edit'
                        ? styles['resourceTableRowSelected']
                        : undefined
                    }
                    key={document.id}
                  >
                    <td>
                      <button
                        className={styles['resourceTitleButton']}
                        onClick={() => {
                          openEditTab(document);
                        }}
                        type='button'
                      >
                        {document.title}
                      </button>
                    </td>
                    <td>{visibilityLabelByValue[document.visibility]}</td>
                    <td>
                      <div className={styles['stackListCompact']}>
                        <span>{document.fileName}</span>
                        <span className={styles['metaText']}>
                          {formatFileSizeLabel(document.fileSize)}
                        </span>
                      </div>
                    </td>
                    <td>{document.sortOrder}</td>
                    <td>{formatDateTime(document.createdAt)}</td>
                    <td>
                      <div className={styles['tableActionGroup']}>
                        <button
                          className={styles['tableActionButton']}
                          onClick={() => {
                            openEditTab(document);
                          }}
                          type='button'
                        >
                          수정
                        </button>
                        <button
                          className={styles['tableActionButtonDanger']}
                          onClick={() => {
                            if (!confirmResourceDelete()) {
                              return;
                            }
                            deleteMutation.mutate(document.id);
                          }}
                          type='button'
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={styles['helperText']} colSpan={6}>
                    등록된 프로그램 자료가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles['panel']}>
        <div className={styles['editorTabs']}>
          <button
            className={editorTab === 'create' ? styles['editorTabActive'] : styles['editorTab']}
            onClick={() => {
              resetCreateForm();
            }}
            type='button'
          >
            새 자료 등록
          </button>
          <button
            className={editorTab === 'edit' ? styles['editorTabActive'] : styles['editorTab']}
            disabled={!editingDocument}
            onClick={() => {
              if (!editingDocument) {
                return;
              }
              setEditorTab('edit');
              setFormState(createFormState(editingDocument));
            }}
            type='button'
          >
            {editingDocument ? `${editingDocument.title} 수정` : '자료 수정'}
          </button>
        </div>

        <div className={styles['editorTabBody']}>
          {editorTab === 'edit' && !editingDocument ? (
            <p className={styles['helperText']}>상단 목록에서 수정할 자료를 선택해 주세요.</p>
          ) : (
            <div className={styles['form']}>
              <div className={styles['compactFieldRow']}>
                <TextField
                  label='자료명'
                  name='programResourceTitle'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, title: event.target.value }));
                  }}
                  value={formState.title}
                />
                <TextField
                  label='정렬 순서'
                  name='programResourceSortOrder'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, sortOrder: event.target.value }));
                  }}
                  value={formState.sortOrder}
                />
              </div>

              <div className={styles['compactFieldRow']}>
                <Button
                  onClick={() => {
                    setFormState((current) => ({ ...current, visibility: 'PUBLIC' }));
                  }}
                  type='button'
                  variant={formState.visibility === 'PUBLIC' ? 'primary' : 'secondary'}
                >
                  전체 공개
                </Button>
                <Button
                  onClick={() => {
                    setFormState((current) => ({ ...current, visibility: 'ENROLLED_ONLY' }));
                  }}
                  type='button'
                  variant={formState.visibility === 'ENROLLED_ONLY' ? 'primary' : 'secondary'}
                >
                  수강생 전용
                </Button>
              </div>

              <TextAreaField
                label='설명'
                name='programResourceDescription'
                onChange={(event) => {
                  setFormState((current) => ({ ...current, description: event.target.value }));
                }}
                value={formState.description}
              />

              <div className={styles['compactFieldRow']}>
                <TextField
                  label='파일명'
                  name='programResourceFileName'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, fileName: event.target.value }));
                  }}
                  value={formState.fileName}
                />
                <TextField
                  label='파일 크기(byte)'
                  name='programResourceFileSize'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, fileSize: event.target.value }));
                  }}
                  value={formState.fileSize}
                />
              </div>

              <TextField
                label='파일 주소'
                name='programResourceFileUrl'
                onChange={(event) => {
                  setFormState((current) => ({ ...current, fileUrl: event.target.value }));
                }}
                value={formState.fileUrl}
              />

              <TextField
                label='MIME 타입'
                name='programResourceMimeType'
                onChange={(event) => {
                  setFormState((current) => ({ ...current, mimeType: event.target.value }));
                }}
                value={formState.mimeType}
              />

              <p className={styles['helperText']}>{RESOURCE_DOCUMENT_POLICY_HINT}</p>

              <div className={styles['actionRow']}>
                <Button disabled={isSubmitting} onClick={handleSubmit} type='button'>
                  {editorTab === 'edit' ? '자료 저장' : '자료 등록'}
                </Button>
                <Button
                  onClick={() => {
                    if (editorTab === 'edit' && editingDocument) {
                      setFormState(createFormState(editingDocument));
                      return;
                    }
                    resetCreateForm();
                  }}
                  type='button'
                  variant='secondary'
                >
                  {editorTab === 'edit' ? '변경 취소' : '초기화'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminProgramResourcesSection;
