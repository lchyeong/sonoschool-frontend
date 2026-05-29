import { useMemo, useState, type CSSProperties } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import {
  createAdminCategory,
  deleteAdminCategory,
  reorderAdminCategories,
  updateAdminCategory,
} from '@/api/adminCategories';
import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import AdminHierarchyPath from '@/components/admin/AdminHierarchyPath/AdminHierarchyPath';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import {
  adminCategoriesTreeQueryKey,
  useAdminCategoriesTreeQuery,
} from '@/query/useAdminCategoriesQuery';
import {
  adminProgramCategoriesQueryKey,
  adminProgramsLiveQueryKey,
  useAdminProgramsLiveQuery,
} from '@/query/useAdminProgramsLiveQuery';
import { siteNavigationQueryKey } from '@/query/useSiteNavigationQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminCategoryReorderItem, AdminCategoryTreeItem } from '@/types/adminCategories';
import { classNames } from '@/utils/classNames';

import styles from './AdminProgramMenuSection.module.scss';

interface CategoryFormState {
  name: string;
}

interface CategoryEditDraftState {
  categoryId: number;
  values: CategoryFormState;
}

interface FlatCategoryItem extends AdminCategoryTreeItem {
  parentId: number | null;
  pathIds: number[];
  pathLabel: string;
  isLeaf: boolean;
}

const INITIAL_FORM_STATE: CategoryFormState = {
  name: '',
};

const MAX_DEPTH = 3;

const sortCategoryTree = (items: readonly AdminCategoryTreeItem[]): AdminCategoryTreeItem[] => {
  return [...items]
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.id - right.id;
    })
    .map((item) => ({
      ...item,
      children: sortCategoryTree(item.children),
    }));
};

const flattenCategoryTree = (
  items: readonly AdminCategoryTreeItem[],
  parentId: number | null = null,
  pathIds: readonly number[] = [],
  pathNames: readonly string[] = [],
): FlatCategoryItem[] => {
  return items.flatMap((item) => {
    const nextPathIds = [...pathIds, item.id];
    const nextPathNames = [...pathNames, item.name];
    const current: FlatCategoryItem = {
      ...item,
      isLeaf: item.children.length === 0,
      parentId,
      pathIds: nextPathIds,
      pathLabel: nextPathNames.join(' > '),
    };

    return [current, ...flattenCategoryTree(item.children, item.id, nextPathIds, nextPathNames)];
  });
};

const buildCategoryColumns = (
  tree: readonly AdminCategoryTreeItem[],
  pathIds: readonly number[],
): [AdminCategoryTreeItem[], AdminCategoryTreeItem[], AdminCategoryTreeItem[]] => {
  const firstColumn = [...tree];
  const secondColumn =
    pathIds.length >= 1
      ? [...(firstColumn.find((item) => item.id === pathIds[0])?.children ?? [])]
      : [];
  const thirdColumn =
    pathIds.length >= 2
      ? [...(secondColumn.find((item) => item.id === pathIds[1])?.children ?? [])]
      : [];

  return [firstColumn, secondColumn, thirdColumn];
};

const getSiblingCategories = (
  tree: readonly AdminCategoryTreeItem[],
  categoryMap: ReadonlyMap<number, FlatCategoryItem>,
  parentId: number | null,
): FlatCategoryItem[] => {
  const source = parentId === null ? tree : (categoryMap.get(parentId)?.children ?? []);

  return source
    .map((item) => categoryMap.get(item.id) ?? null)
    .filter((item): item is FlatCategoryItem => item !== null);
};

const buildReorderItems = (
  siblings: readonly FlatCategoryItem[],
  categoryId: number,
  direction: 'up' | 'down',
): AdminCategoryReorderItem[] | null => {
  const currentIndex = siblings.findIndex((item) => item.id === categoryId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return null;
  }

  const nextItems = [...siblings];
  const [currentItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(targetIndex, 0, currentItem);

  return nextItems.map((item, index) => ({
    id: item.id,
    sortOrder: index,
  }));
};

const CategoryBrowser = ({
  columns,
  focusPathIds,
  selectedCategoryId,
  onSelect,
}: {
  columns: readonly [AdminCategoryTreeItem[], AdminCategoryTreeItem[], AdminCategoryTreeItem[]];
  focusPathIds: readonly number[];
  selectedCategoryId: number | null;
  onSelect: (categoryId: number) => void;
}) => {
  const arrowStyle = useMemo(
    () =>
      ({
        ['--program-menu-arrow-icon' as string]: `url(${rightArrowIconSrc})`,
      }) as CSSProperties,
    [],
  );

  return (
    <div className={styles['browserShell']}>
      <div className={styles['browserGrid']}>
        {columns.map((columnItems, columnIndex) => {
          return (
            <section
              className={styles['browserColumn']}
              key={`category-column-${String(columnIndex)}`}
            >
              <div className={styles['browserColumnHeader']}>
                {`${String(columnIndex + 1)}차 카테고리`}
              </div>
              {columnItems.length ? (
                <div className={styles['browserList']} role='list'>
                  {columnItems.map((item) => {
                    const isActive = focusPathIds[columnIndex] === item.id;
                    const isSelected = selectedCategoryId === item.id;

                    return (
                      <button
                        aria-label={`${item.name} 카테고리 선택`}
                        className={classNames(
                          styles['browserOption'],
                          isActive && styles['browserOptionActive'],
                          isSelected && styles['browserOptionSelected'],
                        )}
                        key={item.id}
                        onClick={() => {
                          onSelect(item.id);
                        }}
                        type='button'
                      >
                        <span className={styles['browserOptionLabel']}>{item.name}</span>
                        {item.children.length ? (
                          <span
                            aria-hidden='true'
                            className={styles['browserOptionArrow']}
                            style={arrowStyle}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles['columnEmpty']}>카테고리 없음</div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

const AdminProgramMenuSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const treeQuery = useAdminCategoriesTreeQuery();
  const programsQuery = useAdminProgramsLiveQuery();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [createFormState, setCreateFormState] = useState<CategoryFormState>(INITIAL_FORM_STATE);
  const [detailTab, setDetailTab] = useState<'create' | 'edit'>('edit');
  const [editDraftState, setEditDraftState] = useState<CategoryEditDraftState | null>(null);

  const sortedTree = useMemo(() => sortCategoryTree(treeQuery.data ?? []), [treeQuery.data]);
  const flatCategories = useMemo(() => flattenCategoryTree(sortedTree), [sortedTree]);
  const categoryMap = useMemo(
    () => new Map(flatCategories.map((item) => [item.id, item])),
    [flatCategories],
  );
  const resolvedSelectedCategoryId = useMemo(() => {
    if (!flatCategories.length) {
      return null;
    }

    if (selectedCategoryId !== null && categoryMap.has(selectedCategoryId)) {
      return selectedCategoryId;
    }

    return flatCategories[0]?.id ?? null;
  }, [categoryMap, flatCategories, selectedCategoryId]);
  const selectedCategory =
    resolvedSelectedCategoryId !== null
      ? (categoryMap.get(resolvedSelectedCategoryId) ?? null)
      : null;
  const resolvedCreateParentId = useMemo(() => {
    if (createParentId === null) {
      return null;
    }

    const candidate = categoryMap.get(createParentId) ?? null;

    if (!candidate || candidate.depth >= MAX_DEPTH) {
      return null;
    }

    return candidate.id;
  }, [categoryMap, createParentId]);
  const browserFocusPathIds = useMemo(() => selectedCategory?.pathIds ?? [], [selectedCategory]);
  const categoryColumns = useMemo(
    () => buildCategoryColumns(sortedTree, browserFocusPathIds),
    [browserFocusPathIds, sortedTree],
  );
  const siblingCategories = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return getSiblingCategories(sortedTree, categoryMap, selectedCategory.parentId);
  }, [categoryMap, selectedCategory, sortedTree]);
  const siblingIndex = selectedCategory
    ? siblingCategories.findIndex((item) => item.id === selectedCategory.id)
    : -1;
  const editFormState = useMemo(() => {
    if (!selectedCategory) {
      return INITIAL_FORM_STATE;
    }

    if (editDraftState?.categoryId === selectedCategory.id) {
      return editDraftState.values;
    }

    return {
      name: selectedCategory.name,
    };
  }, [editDraftState, selectedCategory]);
  const linkedPrograms = useMemo(() => {
    if (!selectedCategory || !programsQuery.data) {
      return [];
    }

    return programsQuery.data.filter((program) => program.categoryId === selectedCategory.id);
  }, [programsQuery.data, selectedCategory]);

  const invalidateQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminCategoriesTreeQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: adminProgramCategoriesQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: adminProgramsLiveQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: siteNavigationQueryKey(),
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (state: CategoryFormState) => {
      const normalizedName = state.name.trim();

      if (!normalizedName) {
        throw new Error('카테고리명을 입력해 주세요.');
      }

      const nextParentId = resolvedCreateParentId;
      const siblings = getSiblingCategories(sortedTree, categoryMap, nextParentId);
      const nextSortOrder = siblings.length ? siblings[siblings.length - 1].sortOrder + 1 : 0;

      return createAdminCategory({
        parentId: nextParentId,
        name: normalizedName,
        sortOrder: nextSortOrder,
      });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '카테고리를 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (category) => {
      await invalidateQueries();
      setSelectedCategoryId(category.id);
      setEditDraftState(null);
      setCreateFormState(INITIAL_FORM_STATE);
      setCreateParentId(null);
      setDetailTab('edit');
      showToast({
        message: '새 카테고리를 추가했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (state: CategoryFormState) => {
      const normalizedName = state.name.trim();

      if (!normalizedName || !selectedCategory) {
        throw new Error('카테고리명을 확인해 주세요.');
      }

      return updateAdminCategory(selectedCategory.id, {
        name: normalizedName,
        sortOrder: selectedCategory.sortOrder,
      });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '카테고리를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (category) => {
      await invalidateQueries();
      setSelectedCategoryId(category.id);
      setEditDraftState(null);
      showToast({
        message: '카테고리를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      if (!selectedCategory) {
        throw new Error('선택한 카테고리를 찾을 수 없습니다.');
      }

      const nextItems = buildReorderItems(siblingCategories, selectedCategory.id, direction);

      if (!nextItems) {
        throw new Error('더 이상 이동할 수 없습니다.');
      }

      await reorderAdminCategories(nextItems);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '카테고리 순서를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateQueries();
      showToast({
        message: '카테고리 순서를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) {
        throw new Error('선택한 카테고리를 찾을 수 없습니다.');
      }

      await deleteAdminCategory(selectedCategory.id);
      return selectedCategory.parentId;
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '카테고리를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (parentId) => {
      await invalidateQueries();
      setSelectedCategoryId(parentId);
      setEditDraftState(null);
      showToast({
        message: '카테고리를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const selectCategory = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setEditDraftState(null);
  };

  const updateEditFormState = (patch: Partial<CategoryFormState>) => {
    if (!selectedCategory) {
      return;
    }

    setEditDraftState((current) => {
      const baseValues =
        current?.categoryId === selectedCategory.id
          ? current.values
          : {
              name: selectedCategory.name,
            };

      return {
        categoryId: selectedCategory.id,
        values: {
          ...baseValues,
          ...patch,
        },
      };
    });
  };

  const handleCreateNameChange = (nextName: string) => {
    setCreateFormState((current) => ({
      ...current,
      name: nextName,
    }));
  };

  const renderBrowserContent = () => {
    if (treeQuery.isPending) {
      return (
        <div className={styles['stateCard']}>
          <p className={styles['stateTitle']}>카테고리를 불러오는 중입니다.</p>
        </div>
      );
    }

    if (treeQuery.isError) {
      return (
        <div className={styles['stateCard']}>
          <p className={styles['stateTitle']}>카테고리를 불러오지 못했습니다.</p>
          <p className={styles['stateDescription']}>서버 응답을 다시 확인해 주세요.</p>
        </div>
      );
    }

    if (!sortedTree.length) {
      return (
        <div className={styles['stateCard']}>
          <p className={styles['stateTitle']}>등록된 카테고리가 없습니다.</p>
          <p className={styles['stateDescription']}>아래에서 새 카테고리를 먼저 추가해 주세요.</p>
        </div>
      );
    }

    return (
      <CategoryBrowser
        columns={categoryColumns}
        focusPathIds={browserFocusPathIds}
        onSelect={(categoryId) => {
          if (detailTab === 'create') {
            const clickedCategory = categoryMap.get(categoryId) ?? null;
            selectCategory(categoryId);
            setCreateParentId(
              clickedCategory && clickedCategory.depth < MAX_DEPTH ? clickedCategory.id : null,
            );
            return;
          }

          selectCategory(categoryId);
        }}
        selectedCategoryId={resolvedSelectedCategoryId}
      />
    );
  };

  const renderLinkedPrograms = () => {
    if (!selectedCategory) {
      return null;
    }

    return (
      <article className={styles['detailCard']}>
        <div className={styles['cardHeader']}>
          <h3 className={styles['cardTitle']}>이 카테고리의 프로그램</h3>
          <p className={styles['cardDescription']}>
            {selectedCategory.isLeaf
              ? `${String(linkedPrograms.length)}개`
              : '하위 카테고리에서 관리'}
          </p>
        </div>

        {programsQuery.isPending ? (
          <div className={styles['inlineState']}>프로그램 목록을 불러오는 중입니다.</div>
        ) : programsQuery.isError ? (
          <div className={styles['inlineState']}>프로그램 연결 정보를 불러오지 못했습니다.</div>
        ) : !selectedCategory.isLeaf ? (
          <div className={styles['inlineState']}>프로그램은 말단 카테고리에 연결됩니다.</div>
        ) : linkedPrograms.length ? (
          <div className={styles['linkedPrograms']}>
            {linkedPrograms.map((program) => {
              return (
                <div className={styles['linkedProgramRow']} key={program.id}>
                  <div className={styles['linkedProgramCopy']}>
                    <strong className={styles['linkedProgramTitle']}>{program.title}</strong>
                    <p className={styles['linkedProgramMeta']}>{program.categoryName}</p>
                  </div>
                  <Link
                    className={styles['inlineLink']}
                    to={routePaths.adminProgramEdit(String(program.id))}
                  >
                    수정
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles['inlineState']}>연결된 프로그램이 없습니다.</div>
        )}
      </article>
    );
  };

  return (
    <div className={styles['workspace']}>
      <section className={styles['currentCategoryBar']}>
        <p className={styles['currentCategoryLabel']}>현재 카테고리</p>
        <div className={styles['currentCategoryValue']}>
          <AdminHierarchyPath path={selectedCategory?.pathLabel ?? '카테고리 선택'} />
        </div>
      </section>

      <div className={styles['layout']}>
        <section className={styles['browserPanel']}>{renderBrowserContent()}</section>

        <section className={styles['detailPanel']}>
          <div className={styles['detailTabs']} role='tablist' aria-label='카테고리 작업'>
            <button
              aria-selected={detailTab === 'edit'}
              className={classNames(
                styles['detailTab'],
                detailTab === 'edit' && styles['detailTabActive'],
              )}
              onClick={() => {
                setDetailTab('edit');
              }}
              role='tab'
              type='button'
            >
              카테고리 수정
            </button>
            <button
              aria-selected={detailTab === 'create'}
              className={classNames(
                styles['detailTab'],
                detailTab === 'create' && styles['detailTabActive'],
              )}
              onClick={() => {
                setCreateParentId(
                  selectedCategory && selectedCategory.depth < MAX_DEPTH
                    ? selectedCategory.id
                    : null,
                );
                setDetailTab('create');
              }}
              role='tab'
              type='button'
            >
              새 카테고리
            </button>
          </div>

          {detailTab === 'edit' ? (
            <article className={styles['detailCard']}>
              <div className={styles['cardHeader']}>
                <h3 className={styles['cardTitle']}>선택한 카테고리 수정</h3>
              </div>

              {selectedCategory ? (
                <>
                  <div className={styles['selectionSummaryRow']}>
                    <p className={styles['selectionSummaryLabel']}>현재 선택된 카테고리</p>
                    <div className={styles['selectionSummaryValueInline']}>
                      <AdminHierarchyPath path={selectedCategory.pathLabel} />
                    </div>
                  </div>

                  <div className={styles['formGrid']}>
                    <TextField
                      label='카테고리명'
                      name='edit-category-name'
                      onChange={(event) => {
                        updateEditFormState({ name: event.target.value });
                      }}
                      value={editFormState.name}
                    />
                  </div>

                  <div className={styles['formActions']}>
                    <div className={styles['actionRow']}>
                      <Button
                        disabled={updateMutation.isPending}
                        onClick={() => {
                          updateMutation.mutate(editFormState);
                        }}
                        type='button'
                      >
                        {updateMutation.isPending ? '저장 중...' : '카테고리 수정 저장'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles['inlineState']}>수정할 카테고리를 선택해 주세요.</div>
              )}
            </article>
          ) : (
            <article className={styles['detailCard']}>
              <div className={styles['cardHeader']}>
                <h3 className={styles['cardTitle']}>새 카테고리 만들기</h3>
              </div>

              <div className={styles['selectionSummaryRow']}>
                <p className={styles['selectionSummaryLabel']}>현재 선택된 카테고리</p>
                <div className={styles['selectionSummaryValueInline']}>
                  <AdminHierarchyPath path={selectedCategory?.pathLabel ?? '없음'} />
                </div>
              </div>

              {selectedCategory ? (
                <div className={styles['createActionRow']}>
                  {selectedCategory.depth < MAX_DEPTH ? (
                    <Button
                      onClick={() => {
                        setCreateParentId(selectedCategory.id);
                      }}
                      size='sm'
                      type='button'
                      variant={
                        resolvedCreateParentId === selectedCategory.id ? 'primary' : 'secondary'
                      }
                    >
                      이 카테고리 하위로 만들기
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => {
                      setCreateParentId(null);
                    }}
                    size='sm'
                    type='button'
                    variant={resolvedCreateParentId === null ? 'primary' : 'secondary'}
                  >
                    최상위 카테고리로 만들기
                  </Button>
                </div>
              ) : null}

              <div className={styles['createFormGrid']}>
                <TextField
                  label='카테고리명'
                  name='create-category-name'
                  onChange={(event) => {
                    handleCreateNameChange(event.target.value);
                  }}
                  value={createFormState.name}
                />
              </div>

              <div className={styles['formActions']}>
                <div className={styles['actionRow']}>
                  <Button
                    disabled={createMutation.isPending}
                    onClick={() => {
                      createMutation.mutate(createFormState);
                    }}
                    type='button'
                  >
                    {createMutation.isPending ? '저장 중...' : '새 카테고리 저장'}
                  </Button>
                  <Button
                    onClick={() => {
                      setCreateFormState(INITIAL_FORM_STATE);
                    }}
                    type='button'
                    variant='secondary'
                  >
                    입력 초기화
                  </Button>
                </div>
              </div>
            </article>
          )}

          {selectedCategory ? (
            <article className={styles['detailCard']}>
              <div className={styles['cardHeader']}>
                <h3 className={styles['cardTitle']}>카테고리 순서와 삭제</h3>
                <p className={styles['cardDescription']}>
                  선택한 카테고리의 위치를 조정하거나 삭제합니다.
                </p>
              </div>

              <div className={styles['actionRow']}>
                <Button
                  disabled={reorderMutation.isPending || siblingIndex <= 0}
                  onClick={() => {
                    reorderMutation.mutate('up');
                  }}
                  size='sm'
                  type='button'
                  variant='secondary'
                >
                  위로 이동
                </Button>
                <Button
                  disabled={
                    reorderMutation.isPending ||
                    siblingIndex < 0 ||
                    siblingIndex >= siblingCategories.length - 1
                  }
                  onClick={() => {
                    reorderMutation.mutate('down');
                  }}
                  size='sm'
                  type='button'
                  variant='secondary'
                >
                  아래로 이동
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.mutate();
                  }}
                  size='sm'
                  type='button'
                  variant='danger'
                >
                  삭제
                </Button>
              </div>
            </article>
          ) : null}

          {renderLinkedPrograms()}
        </section>
      </div>
    </div>
  );
};

export default AdminProgramMenuSection;
