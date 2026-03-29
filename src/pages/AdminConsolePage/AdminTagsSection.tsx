import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  activateAdminTag,
  createAdminTag,
  deactivateAdminTag,
  updateAdminTag,
  type AdminTagUpsertPayload,
} from '@/api/adminTags';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { adminTagsQueryKey, useAdminTagsQuery } from '@/query/useAdminTagsQuery';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramTag, AdminProgramTagType } from '@/types/adminProgramsLive';

import styles from './AdminConsolePage.module.scss';

interface TagFormState {
  active: boolean;
  name: string;
  slug: string;
  sortOrder: string;
  type: AdminProgramTagType;
}

type EditorTab = 'create' | 'edit';

const TAGS_PAGE_SIZE = 8;

const EMPTY_FORM: TagFormState = {
  active: true,
  name: '',
  slug: '',
  sortOrder: '0',
  type: 'TOPIC',
};

const tagTypeOptions = [
  { label: '주제', value: 'TOPIC' },
  { label: '추천 대상', value: 'TARGET' },
  { label: '형식', value: 'FORMAT' },
  { label: '난이도', value: 'LEVEL' },
  { label: '특징', value: 'FEATURE' },
] as const;

const tagTypeLabelByValue: Record<AdminProgramTagType, string> = {
  FEATURE: '특징',
  FORMAT: '형식',
  LEVEL: '난이도',
  TARGET: '추천 대상',
  TOPIC: '주제',
};

const createFormState = (tag?: AdminProgramTag | null): TagFormState => {
  if (!tag) {
    return EMPTY_FORM;
  }

  return {
    active: tag.active,
    name: tag.name,
    slug: tag.slug,
    sortOrder: String(tag.sortOrder),
    type: tag.type,
  };
};

const validateForm = (formState: TagFormState): string | null => {
  if (!formState.name.trim()) {
    return '태그명을 입력해 주세요.';
  }

  if (!formState.slug.trim()) {
    return '태그 코드를 입력해 주세요.';
  }

  if (!formState.sortOrder.trim() || Number.isNaN(Number(formState.sortOrder))) {
    return '정렬 순서를 숫자로 입력해 주세요.';
  }

  return null;
};

const toPayload = (formState: TagFormState): AdminTagUpsertPayload => {
  return {
    active: formState.active,
    name: formState.name.trim(),
    slug: formState.slug.trim(),
    sortOrder: Number(formState.sortOrder),
    type: formState.type,
  };
};

const AdminTagsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const tagsQuery = useAdminTagsQuery();
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('create');
  const [formState, setFormState] = useState<TagFormState>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());

  const tags = tagsQuery.data ?? [];
  const editingTag = tags.find((tag) => tag.id === editingTagId) ?? null;

  const filteredTags = useMemo(() => {
    if (!deferredSearchTerm) {
      return tags;
    }

    return tags.filter((tag) => {
      const typeLabel = tagTypeLabelByValue[tag.type].toLowerCase();
      return [tag.name, tag.slug, typeLabel].some((value) =>
        value.toLowerCase().includes(deferredSearchTerm),
      );
    });
  }, [deferredSearchTerm, tags]);

  const totalPages = Math.max(1, Math.ceil(filteredTags.length / TAGS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedTags = filteredTags.slice(
    (safeCurrentPage - 1) * TAGS_PAGE_SIZE,
    safeCurrentPage * TAGS_PAGE_SIZE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const refreshTags = async () => {
    await queryClient.invalidateQueries({ queryKey: adminTagsQueryKey() });
  };

  const resetCreateForm = () => {
    setEditingTagId(null);
    setEditorTab('create');
    setFormState(EMPTY_FORM);
  };

  const openEditTab = (tag: AdminProgramTag) => {
    setEditingTagId(tag.id);
    setEditorTab('edit');
    setFormState(createFormState(tag));
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminTagUpsertPayload) => createAdminTag(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '태그를 등록하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshTags();
      resetCreateForm();
      showToast({
        message: '태그를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      payload,
      tagId,
    }: {
      payload: Omit<AdminTagUpsertPayload, 'active'>;
      tagId: number;
    }) => updateAdminTag(tagId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '태그를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (updatedTag) => {
      await refreshTags();
      setEditingTagId(updatedTag.id);
      setEditorTab('edit');
      setFormState(createFormState(updatedTag));
      showToast({
        message: '태그를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ active, tagId }: { active: boolean; tagId: number }) => {
      if (active) {
        return deactivateAdminTag(tagId);
      }

      return activateAdminTag(tagId);
    },
    onError: (error: unknown, variables) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : variables.active
              ? '태그를 비활성화하지 못했습니다.'
              : '태그를 활성화하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (updatedTag, variables) => {
      await refreshTags();
      if (editingTagId === updatedTag.id) {
        setFormState((current) => ({ ...current, active: updatedTag.active }));
      }
      showToast({
        message: variables.active ? '태그를 비활성화했습니다.' : '태그를 활성화했습니다.',
        variant: 'success',
      });
    },
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
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

    if (editorTab === 'edit' && editingTagId !== null) {
      updateMutation.mutate({
        payload: {
          name: payload.name,
          slug: payload.slug,
          sortOrder: payload.sortOrder,
          type: payload.type,
        },
        tagId: editingTagId,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <section className={styles['workspace']}>
      <div className={styles['stackList']}>
        <section className={styles['panelWide']}>
          <div className={styles['panelToolbar']}>
            <div>
              <h2 className={styles['panelTitle']}>태그 목록</h2>
              <p className={styles['metaText']}>총 {filteredTags.length}개</p>
            </div>

            <label className={styles['searchField']}>
              <span className={styles['searchLabel']}>검색</span>
              <input
                aria-label='태그 검색'
                className={styles['searchInput']}
                onChange={(event) => {
                  handleSearchChange(event.target.value);
                }}
                placeholder='태그명, 태그 코드, 유형 검색'
                type='search'
                value={searchTerm}
              />
            </label>
          </div>

          {tagsQuery.isPending ? (
            <p className={styles['helperText']}>태그 목록을 불러오는 중입니다.</p>
          ) : null}

          {tagsQuery.isError ? (
            <p className={styles['helperText']}>
              {tagsQuery.error instanceof Error
                ? tagsQuery.error.message
                : '태그 목록을 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!tagsQuery.isPending && !tagsQuery.isError ? (
            <>
              <div className={styles['tableWrap']}>
                <table className={`${styles['table']} ${styles['tagTable']}`}>
                  <thead>
                    <tr>
                      <th scope='col'>태그명</th>
                      <th scope='col'>유형</th>
                      <th scope='col'>태그 코드</th>
                      <th scope='col'>정렬</th>
                      <th scope='col'>상태</th>
                      <th scope='col'>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTags.length > 0 ? (
                      pagedTags.map((tag) => {
                        const isSelected = tag.id === editingTagId && editorTab === 'edit';

                        return (
                          <tr
                            className={isSelected ? styles['tagTableRowSelected'] : undefined}
                            key={tag.id}
                          >
                            <td>
                              <button
                                className={styles['tagNameButton']}
                                onClick={() => {
                                  openEditTab(tag);
                                }}
                                type='button'
                              >
                                {tag.name}
                              </button>
                            </td>
                            <td>{tagTypeLabelByValue[tag.type]}</td>
                            <td>
                              <span className={styles['badge']}>{tag.slug}</span>
                            </td>
                            <td>{tag.sortOrder}</td>
                            <td>
                              <span
                                className={
                                  tag.active ? styles['badgeSuccess'] : styles['badgeDanger']
                                }
                              >
                                {tag.active ? '활성' : '비활성'}
                              </span>
                            </td>
                            <td>
                              <div className={styles['tableActionGroup']}>
                                <button
                                  className={styles['tableActionButton']}
                                  onClick={() => {
                                    openEditTab(tag);
                                  }}
                                  type='button'
                                >
                                  수정
                                </button>
                                <button
                                  className={styles['tableActionButton']}
                                  onClick={() => {
                                    toggleMutation.mutate({ active: tag.active, tagId: tag.id });
                                  }}
                                  type='button'
                                >
                                  {tag.active ? '비활성화' : '활성화'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className={styles['helperText']} colSpan={6}>
                          검색 조건에 맞는 태그가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredTags.length > TAGS_PAGE_SIZE ? (
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
              새 태그 등록
            </button>
            <button
              className={editorTab === 'edit' ? styles['editorTabActive'] : styles['editorTab']}
              disabled={!editingTag}
              onClick={() => {
                if (!editingTag) {
                  return;
                }

                setEditorTab('edit');
                setFormState(createFormState(editingTag));
              }}
              type='button'
            >
              {editingTag ? `${editingTag.name} 수정` : '태그 수정'}
            </button>
          </div>

          <div className={styles['editorTabBody']}>
            {editorTab === 'edit' && !editingTag ? (
              <p className={styles['helperText']}>상단 목록에서 수정할 태그를 선택해 주세요.</p>
            ) : (
              <div className={styles['form']}>
                <TextField
                  label='태그명'
                  name='tagName'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, name: event.target.value }));
                  }}
                  value={formState.name}
                />
                <TextField
                  label='태그 코드'
                  name='tagSlug'
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, slug: event.target.value }));
                  }}
                  value={formState.slug}
                />
                <div className={styles['compactFieldRow']}>
                  <AdminDropdownField
                    compact
                    label='태그 유형'
                    onChange={(nextValue) => {
                      setFormState((current) => ({
                        ...current,
                        type: nextValue as AdminProgramTagType,
                      }));
                    }}
                    options={tagTypeOptions}
                    value={formState.type}
                  />
                  <div className={styles['compactTextField']}>
                    <TextField
                      label='정렬 순서'
                      name='tagSortOrder'
                      onChange={(event) => {
                        setFormState((current) => ({ ...current, sortOrder: event.target.value }));
                      }}
                      value={formState.sortOrder}
                    />
                  </div>
                </div>

                {editorTab === 'create' ? (
                  <label className={styles['metaRow']}>
                    <input
                      checked={formState.active}
                      onChange={(event) => {
                        setFormState((current) => ({ ...current, active: event.target.checked }));
                      }}
                      type='checkbox'
                    />
                    <span className={styles['metaText']}>등록 후 바로 활성화</span>
                  </label>
                ) : (
                  <p className={styles['helperText']}>
                    활성 상태는 상단 목록에서 바꿉니다. 현재 상태:{' '}
                    {editingTag?.active ? '활성' : '비활성'}
                  </p>
                )}

                <div className={styles['actionRow']}>
                  <Button disabled={isSubmitting} onClick={handleSubmit} type='button'>
                    {editorTab === 'edit' ? '태그 저장' : '태그 등록'}
                  </Button>
                  <Button
                    onClick={() => {
                      if (editorTab === 'edit' && editingTag) {
                        setFormState(createFormState(editingTag));
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

export default AdminTagsSection;
