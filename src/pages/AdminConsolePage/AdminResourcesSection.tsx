import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminResource,
  deleteAdminResource,
  updateAdminResource,
} from '@/api/adminResources';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { useAdminProgramsLiveQuery } from '@/query/useAdminProgramsLiveQuery';
import { adminResourcesQueryKey, useAdminResourcesQuery } from '@/query/useAdminResourcesQuery';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminResourceItem,
  AdminResourceScope,
  AdminResourceUpsertPayload,
  AdminResourceVisibility,
} from '@/types/adminResources';

import styles from './AdminConsolePage.module.scss';
import { formatFileSizeLabel } from './adminConsolePageShared';
import {
  RESOURCE_DOCUMENT_POLICY_HINT,
  validateResourceDocumentPolicy,
} from './resourceDocumentPolicy';

interface ResourceFormState {
  description: string;
  fileName: string;
  fileSize: string;
  fileUrl: string;
  mimeType: string;
  programId: string;
  scope: AdminResourceScope;
  sortOrder: string;
  title: string;
  visibility: AdminResourceVisibility;
}

type EditorTab = 'create' | 'edit';

const RESOURCES_PAGE_SIZE = 8;

const EMPTY_FORM: ResourceFormState = {
  description: '',
  fileName: '',
  fileSize: '0',
  fileUrl: '',
  mimeType: '',
  programId: '',
  scope: 'GLOBAL',
  sortOrder: '0',
  title: '',
  visibility: 'PUBLIC',
};

const scopeOptions = [
  { label: '전체 자료실', value: 'GLOBAL' },
  { label: '프로그램 자료', value: 'PROGRAM' },
] as const;

const visibilityOptions = [
  { label: '전체 공개', value: 'PUBLIC' },
  { label: '수강생 전용', value: 'ENROLLED_ONLY' },
] as const;

const scopeLabelByValue: Record<AdminResourceScope, string> = {
  GLOBAL: '전체 자료실',
  PROGRAM: '프로그램 자료',
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

const createFormState = (resource?: AdminResourceItem | null): ResourceFormState => {
  if (!resource) {
    return EMPTY_FORM;
  }

  return {
    description: resource.description ?? '',
    fileName: resource.fileName,
    fileSize: String(resource.fileSize),
    fileUrl: resource.fileUrl,
    mimeType: resource.mimeType ?? '',
    programId: resource.programId !== null ? String(resource.programId) : '',
    scope: resource.scope,
    sortOrder: String(resource.sortOrder),
    title: resource.title,
    visibility: resource.visibility,
  };
};

const toPayload = (formState: ResourceFormState): AdminResourceUpsertPayload => {
  return {
    description: formState.description.trim() || null,
    fileName: formState.fileName.trim(),
    fileSize: Number(formState.fileSize),
    fileUrl: formState.fileUrl.trim(),
    mimeType: formState.mimeType.trim() || null,
    programId: formState.scope === 'PROGRAM' ? Number(formState.programId) : null,
    scope: formState.scope,
    sortOrder: Number(formState.sortOrder),
    title: formState.title.trim(),
    visibility: formState.scope === 'GLOBAL' ? 'PUBLIC' : formState.visibility,
  };
};

const validateForm = (formState: ResourceFormState): string | null => {
  if (!formState.title.trim()) {
    return '자료 제목을 입력해 주세요.';
  }

  if (formState.scope === 'PROGRAM' && !formState.programId.trim()) {
    return '연결할 프로그램을 선택해 주세요.';
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
  return window.confirm('자료를 삭제하면 되돌릴 수 없습니다. 계속하시겠습니까?');
};

const AdminResourcesSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const resourcesQuery = useAdminResourcesQuery();
  const programsQuery = useAdminProgramsLiveQuery();
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('create');
  const [formState, setFormState] = useState<ResourceFormState>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());

  const resources = resourcesQuery.data ?? [];
  const editingResource = resources.find((resource) => resource.id === editingResourceId) ?? null;

  const filteredResources = useMemo(() => {
    if (!deferredSearchTerm) {
      return resources;
    }

    return resources.filter((resource) => {
      const scopeLabel = scopeLabelByValue[resource.scope].toLowerCase();
      const visibilityLabel = visibilityLabelByValue[resource.visibility].toLowerCase();
      return [
        resource.title,
        resource.fileName,
        resource.programTitle ?? '',
        scopeLabel,
        visibilityLabel,
      ].some((value) => value.toLowerCase().includes(deferredSearchTerm));
    });
  }, [deferredSearchTerm, resources]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / RESOURCES_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedResources = filteredResources.slice(
    (safeCurrentPage - 1) * RESOURCES_PAGE_SIZE,
    safeCurrentPage * RESOURCES_PAGE_SIZE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const programOptions = useMemo(() => {
    return (programsQuery.data ?? []).map((program) => ({
      label: program.title,
      meta: program.categoryName,
      value: String(program.id),
    }));
  }, [programsQuery.data]);

  const refreshResources = async () => {
    await queryClient.invalidateQueries({ queryKey: adminResourcesQueryKey() });
  };

  const resetCreateForm = () => {
    setEditingResourceId(null);
    setEditorTab('create');
    setFormState(EMPTY_FORM);
  };

  const openEditTab = (resource: AdminResourceItem) => {
    setEditingResourceId(resource.id);
    setEditorTab('edit');
    setFormState(createFormState(resource));
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminResourceUpsertPayload) => createAdminResource(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료를 등록하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshResources();
      resetCreateForm();
      showToast({
        message: '자료를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      payload,
      resourceId,
    }: {
      payload: AdminResourceUpsertPayload;
      resourceId: number;
    }) => updateAdminResource(resourceId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (updatedResource) => {
      await refreshResources();
      setEditingResourceId(updatedResource.id);
      setEditorTab('edit');
      setFormState(createFormState(updatedResource));
      showToast({
        message: '자료를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (resourceId: number) => deleteAdminResource(resourceId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, resourceId) => {
      await refreshResources();
      if (editingResourceId === resourceId) {
        resetCreateForm();
      }
      showToast({
        message: '자료를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleScopeChange = (nextScope: AdminResourceScope) => {
    setFormState((current) => ({
      ...current,
      programId: nextScope === 'PROGRAM' ? current.programId : '',
      scope: nextScope,
      visibility: nextScope === 'GLOBAL' ? 'PUBLIC' : current.visibility,
    }));
  };

  const handleSubmit = () => {
    const validationMessage = validateForm(formState);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    const payload = toPayload(formState);

    if (editorTab === 'edit' && editingResourceId !== null) {
      updateMutation.mutate({ payload, resourceId: editingResourceId });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <section className={styles['workspace']}>
      <div className={styles['stackList']}>
        <section className={styles['panelWide']}>
          <div className={styles['panelToolbar']}>
            <div>
              <h2 className={styles['panelTitle']}>자료 목록</h2>
              <p className={styles['metaText']}>총 {filteredResources.length}개</p>
            </div>

            <label className={styles['searchField']}>
              <span className={styles['searchLabel']}>검색</span>
              <input
                aria-label='자료 검색'
                className={styles['searchInput']}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder='자료명, 파일명, 프로그램명 검색'
                type='search'
                value={searchTerm}
              />
            </label>
          </div>

          {resourcesQuery.isPending ? (
            <p className={styles['helperText']}>자료 목록을 불러오는 중입니다.</p>
          ) : null}
          {resourcesQuery.isError ? (
            <p className={styles['helperText']}>
              {resourcesQuery.error instanceof Error
                ? resourcesQuery.error.message
                : '자료 목록을 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!resourcesQuery.isPending && !resourcesQuery.isError ? (
            <>
              <div className={styles['tableWrap']}>
                <table className={`${styles['table']} ${styles['resourceTable']}`}>
                  <thead>
                    <tr>
                      <th scope='col'>자료명</th>
                      <th scope='col'>범위</th>
                      <th scope='col'>공개 범위</th>
                      <th scope='col'>연결 프로그램</th>
                      <th scope='col'>파일</th>
                      <th scope='col'>등록일</th>
                      <th scope='col'>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedResources.length > 0 ? (
                      pagedResources.map((resource) => {
                        const isSelected =
                          resource.id === editingResourceId && editorTab === 'edit';

                        return (
                          <tr
                            className={isSelected ? styles['resourceTableRowSelected'] : undefined}
                            key={resource.id}
                          >
                            <td>
                              <button
                                className={styles['resourceTitleButton']}
                                onClick={() => {
                                  openEditTab(resource);
                                }}
                                type='button'
                              >
                                {resource.title}
                              </button>
                            </td>
                            <td>{scopeLabelByValue[resource.scope]}</td>
                            <td>
                              <span
                                className={
                                  resource.visibility === 'PUBLIC'
                                    ? styles['badgeSuccess']
                                    : styles['badge']
                                }
                              >
                                {visibilityLabelByValue[resource.visibility]}
                              </span>
                            </td>
                            <td>{resource.programTitle ?? '-'}</td>
                            <td>
                              <div className={styles['stackListCompact']}>
                                <span>{resource.fileName}</span>
                                <span className={styles['metaText']}>
                                  {formatFileSizeLabel(resource.fileSize)}
                                </span>
                              </div>
                            </td>
                            <td>{formatDateTime(resource.createdAt)}</td>
                            <td>
                              <div className={styles['tableActionGroup']}>
                                <button
                                  className={styles['tableActionButton']}
                                  onClick={() => {
                                    openEditTab(resource);
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

                                    deleteMutation.mutate(resource.id);
                                  }}
                                  type='button'
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className={styles['helperText']} colSpan={7}>
                          검색 조건에 맞는 자료가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredResources.length > RESOURCES_PAGE_SIZE ? (
                <div className={styles['paginationBar']}>
                  <button
                    className={styles['paginationButton']}
                    disabled={safeCurrentPage === 1}
                    onClick={() => {
                      setCurrentPage((page) => Math.max(1, page - 1));
                    }}
                    type='button'
                  >
                    이전
                  </button>

                  <div className={styles['paginationNumbers']}>
                    {pageNumbers.map((pageNumber) => (
                      <button
                        className={
                          pageNumber === safeCurrentPage
                            ? styles['paginationButtonActive']
                            : styles['paginationButton']
                        }
                        key={pageNumber}
                        onClick={() => {
                          setCurrentPage(pageNumber);
                        }}
                        type='button'
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    className={styles['paginationButton']}
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                    }}
                    type='button'
                  >
                    다음
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <section className={styles['panelWide']}>
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
              disabled={!editingResource}
              onClick={() => {
                if (!editingResource) {
                  return;
                }

                setEditorTab('edit');
                setFormState(createFormState(editingResource));
              }}
              type='button'
            >
              {editingResource ? `${editingResource.title} 수정` : '자료 수정'}
            </button>
          </div>

          <div className={styles['editorTabBody']}>
            {editorTab === 'edit' && !editingResource ? (
              <p className={styles['helperText']}>상단 목록에서 수정할 자료를 선택해 주세요.</p>
            ) : (
              <div className={styles['form']}>
                <div className={styles['compactFieldRow']}>
                  <AdminDropdownField
                    compact
                    label='자료 범위'
                    onChange={(nextValue) => {
                      handleScopeChange(nextValue as AdminResourceScope);
                    }}
                    options={scopeOptions}
                    value={formState.scope}
                  />
                  <AdminDropdownField
                    compact
                    disabled={formState.scope === 'GLOBAL'}
                    label='공개 범위'
                    onChange={(nextValue) => {
                      setFormState((current) => ({
                        ...current,
                        visibility: nextValue as AdminResourceVisibility,
                      }));
                    }}
                    options={visibilityOptions}
                    value={formState.scope === 'GLOBAL' ? 'PUBLIC' : formState.visibility}
                  />
                </div>

                {formState.scope === 'PROGRAM' ? (
                  <AdminDropdownField
                    label='연결 프로그램'
                    onChange={(nextValue) => {
                      setFormState((current) => ({
                        ...current,
                        programId: nextValue,
                      }));
                    }}
                    options={programOptions}
                    placeholder={programsQuery.isPending ? '프로그램 불러오는 중' : '프로그램 선택'}
                    value={formState.programId}
                  />
                ) : (
                  <div className={styles['metaNotice']}>
                    <p className={styles['metaNoticeLabel']}>전체 자료실</p>
                    <p className={styles['metaNoticeText']}>
                      전체 자료는 항상 전체 공개로 등록됩니다.
                    </p>
                  </div>
                )}

                <TextField
                  label='자료명'
                  name='resourceTitle'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, title: event.target.value }));
                  }}
                  value={formState.title}
                />

                <TextAreaField
                  label='설명'
                  name='resourceDescription'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, description: event.target.value }));
                  }}
                  value={formState.description}
                />

                <div className={styles['compactFieldRow']}>
                  <TextField
                    label='파일명'
                    name='resourceFileName'
                    onChange={(event) => {
                      setFormState((current) => ({ ...current, fileName: event.target.value }));
                    }}
                    value={formState.fileName}
                  />
                  <TextField
                    label='파일 크기(byte)'
                    name='resourceFileSize'
                    onChange={(event) => {
                      setFormState((current) => ({ ...current, fileSize: event.target.value }));
                    }}
                    value={formState.fileSize}
                  />
                </div>

                <TextField
                  label='파일 주소'
                  name='resourceFileUrl'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, fileUrl: event.target.value }));
                  }}
                  value={formState.fileUrl}
                />

                <div className={styles['compactFieldRow']}>
                  <TextField
                    label='MIME 타입'
                    name='resourceMimeType'
                    onChange={(event) => {
                      setFormState((current) => ({ ...current, mimeType: event.target.value }));
                    }}
                    value={formState.mimeType}
                  />
                  <TextField
                    label='정렬 순서'
                    name='resourceSortOrder'
                    onChange={(event) => {
                      setFormState((current) => ({ ...current, sortOrder: event.target.value }));
                    }}
                    value={formState.sortOrder}
                  />
                </div>

                <p className={styles['helperText']}>{RESOURCE_DOCUMENT_POLICY_HINT}</p>

                <div className={styles['actionRow']}>
                  <Button disabled={isSubmitting} onClick={handleSubmit} type='button'>
                    {editorTab === 'edit' ? '자료 저장' : '자료 등록'}
                  </Button>
                  <Button
                    onClick={() => {
                      if (editorTab === 'edit' && editingResource) {
                        setFormState(createFormState(editingResource));
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
    </section>
  );
};

export default AdminResourcesSection;
