import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import {
  createAdminProgramMenu,
  deleteAdminProgramMenu,
  moveAdminProgram,
  moveAdminProgramMenu,
  reorderAdminProgramMenu,
  updateAdminProgramMenu,
} from '@/api/adminConsole';
import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { adminConsoleQueryKey } from '@/query/useAdminConsoleQuery';
import {
  adminProgramMenuDetailQueryKey,
  adminProgramMenuTreeQueryKey,
  useAdminProgramMenuDetailQuery,
  useAdminProgramMenuTreeQuery,
} from '@/query/useAdminProgramMenuQuery';
import { programSearchIndexQueryKey } from '@/query/useProgramSearchIndexQuery';
import { programsOverviewQueryKey } from '@/query/useProgramsOverviewQuery';
import { siteNavigationQueryKey } from '@/query/useSiteNavigationQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminProgramCollectionOption,
  AdminProgramStatus,
  AdminProgramMenuStatus,
  AdminProgramMenuTreeItem,
} from '@/types/adminConsole';
import { classNames } from '@/utils/classNames';

import styles from './AdminProgramMenuSection.module.scss';

interface AdminProgramMenuSectionProps {
  programCollectionOptions: AdminProgramCollectionOption[];
}

interface ProgramMenuFormState {
  description: string;
  label: string;
  slug: string;
  status: AdminProgramMenuStatus;
}

interface MenuTreeBranch extends AdminProgramMenuTreeItem {
  children: MenuTreeBranch[];
}

const INITIAL_FORM_STATE: ProgramMenuFormState = {
  description: '',
  label: '',
  slug: '',
  status: 'published',
};

const slugifyProgramMenu = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const buildMenuTree = (items: AdminProgramMenuTreeItem[]): MenuTreeBranch[] => {
  const itemMap = new Map<string, MenuTreeBranch>();

  items.forEach((item) => {
    itemMap.set(item.id, {
      ...item,
      children: [],
    });
  });

  const roots: MenuTreeBranch[] = [];

  itemMap.forEach((item) => {
    if (!item.parentId) {
      roots.push(item);
      return;
    }

    const parent = itemMap.get(item.parentId);

    if (!parent) {
      roots.push(item);
      return;
    }

    parent.children.push(item);
  });

  return roots;
};

const countTreeItems = (branches: readonly MenuTreeBranch[]): number => {
  return branches.reduce((total, branch) => total + 1 + countTreeItems(branch.children), 0);
};

const collectVisibleMenuIds = (branches: readonly MenuTreeBranch[]): string[] => {
  return branches.flatMap((branch) => [branch.id, ...collectVisibleMenuIds(branch.children)]);
};

const matchesMenuKeyword = (item: AdminProgramMenuTreeItem, keyword: string): boolean => {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  return [item.label, item.labelPath, item.path, item.slug]
    .join(' ')
    .toLowerCase()
    .includes(normalizedKeyword);
};

const filterMenuTree = (
  branches: readonly MenuTreeBranch[],
  keyword: string,
  publishedOnly: boolean,
  leafOnly: boolean,
): MenuTreeBranch[] => {
  const visit = (nodes: readonly MenuTreeBranch[]): MenuTreeBranch[] => {
    return nodes.flatMap((branch) => {
      const filteredChildren = visit(branch.children);
      const isKeywordMatch = matchesMenuKeyword(branch, keyword);
      const isPublishedMatch = !publishedOnly || branch.effectiveStatus === 'published';
      const isLeafMatch = !leafOnly || branch.isLeafMenu;
      const shouldIncludeSelf = isKeywordMatch && isPublishedMatch && isLeafMatch;

      if (!shouldIncludeSelf && filteredChildren.length === 0) {
        return [];
      }

      return [
        {
          ...branch,
          children: filteredChildren,
        },
      ];
    });
  };

  return visit(branches);
};

const flattenMenuTree = (branches: readonly MenuTreeBranch[]): AdminProgramMenuTreeItem[] => {
  return branches.flatMap((branch) => [branch, ...flattenMenuTree(branch.children)]);
};

const buildMenuPathIds = (
  selectedMenuId: string | null,
  itemMap: ReadonlyMap<string, AdminProgramMenuTreeItem>,
): string[] => {
  if (!selectedMenuId) {
    return [];
  }

  const pathIds: string[] = [];
  let current: AdminProgramMenuTreeItem | undefined = itemMap.get(selectedMenuId);

  while (current) {
    pathIds.unshift(current.id);
    current = current.parentId ? itemMap.get(current.parentId) : undefined;
  }

  return pathIds;
};

const buildMenuColumns = (
  items: readonly AdminProgramMenuTreeItem[],
  activePathIds: readonly string[],
  maxDepth: number,
): AdminProgramMenuTreeItem[][] => {
  const itemsByParentId = new Map<string | null, AdminProgramMenuTreeItem[]>();

  items.forEach((item) => {
    const parentItems = itemsByParentId.get(item.parentId) ?? [];
    parentItems.push(item);
    itemsByParentId.set(item.parentId, parentItems);
  });

  const columns: AdminProgramMenuTreeItem[][] = [];
  let parentId: string | null = null;
  let depthIndex = 0;

  while (depthIndex < maxDepth) {
    const nextColumn: AdminProgramMenuTreeItem[] = itemsByParentId.get(parentId) ?? [];
    columns.push(nextColumn);

    const activeItemId = activePathIds[depthIndex];
    const activeItem: AdminProgramMenuTreeItem | undefined = nextColumn.find(
      (item: AdminProgramMenuTreeItem) => item.id === activeItemId,
    );

    if (!nextColumn.length || !activeItem || activeItem.isLeafMenu) {
      while (columns.length < maxDepth) {
        columns.push([]);
      }

      break;
    }

    parentId = activeItem.id;
    depthIndex += 1;
  }

  return columns;
};

const findPreferredBrowserMenuId = (branches: readonly MenuTreeBranch[]): string | null => {
  for (const branch of branches) {
    const childPreferredId = findPreferredBrowserMenuId(branch.children);

    if (childPreferredId) {
      return childPreferredId;
    }

    return branch.id;
  }

  return null;
};

const ProgramMenuBrowser = ({
  items,
  maxDepth,
  focusedMenuId,
  selectedMenuId,
  onSelect,
}: {
  items: readonly AdminProgramMenuTreeItem[];
  maxDepth: number;
  focusedMenuId: string | null;
  selectedMenuId: string | null;
  onSelect: (menuId: string) => void;
}) => {
  const visibleItemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const fallbackMenuId = items[0]?.id ?? null;
  const effectiveMenuId =
    focusedMenuId && visibleItemMap.has(focusedMenuId)
      ? focusedMenuId
      : selectedMenuId && visibleItemMap.has(selectedMenuId)
        ? selectedMenuId
        : fallbackMenuId;
  const selectedPathIds = useMemo(
    () => buildMenuPathIds(effectiveMenuId, visibleItemMap),
    [effectiveMenuId, visibleItemMap],
  );
  const [activePathIds, setActivePathIds] = useState<string[]>(selectedPathIds);
  const columns = useMemo(
    () => buildMenuColumns(items, activePathIds, Math.max(maxDepth, 1)),
    [activePathIds, items, maxDepth],
  );
  const arrowStyle = useMemo(
    () =>
      ({
        ['--program-menu-arrow-icon' as string]: `url(${rightArrowIconSrc})`,
      }) as CSSProperties,
    [],
  );

  useEffect(() => {
    setActivePathIds(selectedPathIds);
  }, [selectedPathIds]);

  if (!items.length) {
    return null;
  }

  return (
    <div className={styles['menuBrowser']}>
      {columns.map((columnItems, columnIndex) => (
        <div
          className={styles['menuBrowserColumn']}
          key={`menu-browser-column-${String(columnIndex)}`}
        >
          <div className={styles['menuBrowserColumnList']} role='list'>
            {columnItems.map((item) => {
              const isActive = activePathIds[columnIndex] === item.id;
              const isSelected = effectiveMenuId === item.id;

              return (
                <button
                  aria-label={`${item.label} 메뉴 선택`}
                  className={classNames(
                    styles['menuBrowserOption'],
                    isActive && styles['menuBrowserOptionActive'],
                    isSelected && styles['menuBrowserOptionSelected'],
                  )}
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    setActivePathIds((current) => [...current.slice(0, columnIndex), item.id]);
                  }}
                  onMouseEnter={() => {
                    if (item.isLeafMenu) {
                      return;
                    }

                    setActivePathIds((current) => [...current.slice(0, columnIndex), item.id]);
                  }}
                  title={item.labelPath}
                  type='button'
                >
                  <span className={styles['menuBrowserOptionContent']}>
                    <span className={styles['menuBrowserOptionLabel']}>{item.label}</span>
                    {!item.isLeafMenu ? (
                      <span
                        aria-hidden='true'
                        className={styles['menuBrowserOptionArrow']}
                        style={arrowStyle}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const formatMenuStatus = (status: AdminProgramMenuStatus | AdminProgramStatus): string => {
  if (status === 'published') {
    return '게시중';
  }

  return status === 'draft' ? '초안' : '숨김';
};

const formatEffectiveMenuStatus = (status: AdminProgramMenuStatus): string => {
  return status === 'published' ? '노출중' : '숨김중';
};

const buildProgramCreateLink = (parentCollectionPath: string): string => {
  return `${routePaths.adminProgramCreate}?parentCollectionPath=${encodeURIComponent(parentCollectionPath)}`;
};

const buildProgramEditLink = (programId: string): string => {
  return routePaths.adminProgramEdit(programId);
};

const AdminProgramMenuSection = ({ programCollectionOptions }: AdminProgramMenuSectionProps) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('edit');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [leafOnly, setLeafOnly] = useState(false);
  const [isSlugDirty, setIsSlugDirty] = useState(false);
  const [formState, setFormState] = useState<ProgramMenuFormState>(INITIAL_FORM_STATE);
  const [programMoveTargets, setProgramMoveTargets] = useState<Record<string, string>>({});
  const treeQuery = useAdminProgramMenuTreeQuery();
  const menuItems = useMemo(() => treeQuery.data?.items ?? [], [treeQuery.data?.items]);
  const activeMenuId =
    selectedMenuId && menuItems.some((item) => item.id === selectedMenuId)
      ? selectedMenuId
      : (menuItems[0]?.id ?? null);
  const effectiveEditorMode = menuItems.length === 0 ? 'create' : editorMode;
  const detailQuery = useAdminProgramMenuDetailQuery(
    effectiveEditorMode === 'edit' ? activeMenuId : null,
  );
  const menuTree = useMemo(() => buildMenuTree(menuItems), [menuItems]);
  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
  const isTreeFilterActive = normalizedSearchKeyword.length > 0 || publishedOnly || leafOnly;
  const filteredMenuTree = useMemo(() => {
    if (!isTreeFilterActive) {
      return menuTree;
    }

    return filterMenuTree(menuTree, normalizedSearchKeyword, publishedOnly, leafOnly);
  }, [isTreeFilterActive, leafOnly, menuTree, normalizedSearchKeyword, publishedOnly]);
  const filteredMenuItems = useMemo(() => flattenMenuTree(filteredMenuTree), [filteredMenuTree]);
  const focusedBrowserMenuId = useMemo(() => {
    if (!filteredMenuTree.length) {
      return activeMenuId;
    }

    if (isTreeFilterActive) {
      return findPreferredBrowserMenuId(filteredMenuTree);
    }

    return activeMenuId;
  }, [activeMenuId, filteredMenuTree, isTreeFilterActive]);
  const visibleMenuIds = useMemo(() => collectVisibleMenuIds(filteredMenuTree), [filteredMenuTree]);
  const visibleMenuCount = useMemo(() => countTreeItems(filteredMenuTree), [filteredMenuTree]);
  const activeMenuHiddenByFilters =
    isTreeFilterActive && Boolean(activeMenuId) && !visibleMenuIds.includes(activeMenuId);
  const leafCollectionOptions = programCollectionOptions.filter(
    (option) => option.path !== detailQuery.data?.menu.path,
  );

  useEffect(() => {
    if (effectiveEditorMode !== 'edit' || !detailQuery.data) {
      return;
    }

    queueMicrotask(() => {
      setFormState({
        description: detailQuery.data.menu.description,
        label: detailQuery.data.menu.label,
        slug: detailQuery.data.menu.slug,
        status: detailQuery.data.menu.status,
      });
      setIsSlugDirty(true);
    });
  }, [detailQuery.data, effectiveEditorMode]);

  useEffect(() => {
    if (!detailQuery.data) {
      queueMicrotask(() => {
        setProgramMoveTargets({});
      });
      return;
    }

    queueMicrotask(() => {
      setProgramMoveTargets((current) => {
        const nextTargets = { ...current };

        detailQuery.data.linkedPrograms.forEach((program) => {
          if (!nextTargets[program.id]) {
            nextTargets[program.id] = '';
          }
        });

        return nextTargets;
      });
    });
  }, [detailQuery.data]);

  const invalidateMenuQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminConsoleQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: adminProgramMenuTreeQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: ['adminProgramMenuDetail'],
      }),
      queryClient.invalidateQueries({
        queryKey: siteNavigationQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: programsOverviewQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: ['programPage'],
      }),
      queryClient.invalidateQueries({
        queryKey: programSearchIndexQueryKey(),
      }),
    ]);
  };

  const resetToCreate = (parentId: string | null) => {
    setEditorMode('create');
    setCreateParentId(parentId);
    setIsSlugDirty(false);
    setFormState(INITIAL_FORM_STATE);
  };

  const saveMutation = useMutation({
    mutationFn: async (state: ProgramMenuFormState) => {
      const normalizedPayload = {
        description: state.description.trim(),
        label: state.label.trim(),
        slug: slugifyProgramMenu(state.slug),
        status: state.status,
      };

      if (editorMode === 'create') {
        return createAdminProgramMenu({
          ...normalizedPayload,
          parentId: createParentId,
        });
      }

      if (!activeMenuId) {
        throw new Error('선택한 강의 메뉴를 찾을 수 없습니다.');
      }

      return updateAdminProgramMenu(activeMenuId, normalizedPayload);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 메뉴 저장에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateMenuQueries();
      showToast({
        message:
          editorMode === 'create' ? '강의 메뉴를 추가했습니다.' : '강의 메뉴를 수정했습니다.',
        variant: 'success',
      });

      if (editorMode === 'create' && selectedMenuId) {
        setEditorMode('edit');
      }
    },
  });

  const moveMenuMutation = useMutation({
    mutationFn: (parentId: string | null) => {
      if (!activeMenuId) {
        throw new Error('선택한 강의 메뉴를 찾을 수 없습니다.');
      }

      return moveAdminProgramMenu(activeMenuId, { parentId });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 메뉴 이동에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateMenuQueries();
      showToast({
        message: '강의 메뉴 위치를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const reorderMenuMutation = useMutation({
    mutationFn: (direction: 'down' | 'up') => {
      if (!activeMenuId) {
        throw new Error('선택한 강의 메뉴를 찾을 수 없습니다.');
      }

      return reorderAdminProgramMenu(activeMenuId, { direction });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 메뉴 정렬에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateMenuQueries();
      showToast({
        message: '강의 메뉴 순서를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMenuMutation = useMutation({
    mutationFn: () => {
      if (!activeMenuId) {
        throw new Error('선택한 강의 메뉴를 찾을 수 없습니다.');
      }

      return deleteAdminProgramMenu(activeMenuId);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 메뉴 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      const deletedMenuId = activeMenuId;

      setSelectedMenuId(null);
      setEditorMode('edit');
      await invalidateMenuQueries();
      showToast({
        message: '강의 메뉴를 삭제했습니다.',
        variant: 'success',
      });

      if (deletedMenuId) {
        queryClient.removeQueries({
          queryKey: adminProgramMenuDetailQueryKey(deletedMenuId),
        });
      }
    },
  });

  const moveProgramMutation = useMutation({
    mutationFn: ({
      programId,
      targetCollectionPath,
    }: {
      programId: string;
      targetCollectionPath: string;
    }) => {
      return moveAdminProgram(programId, { targetCollectionPath });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '연결 강의 이동에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateMenuQueries();
      showToast({
        message: '연결 강의 위치를 변경했습니다.',
        variant: 'success',
      });
    },
  });

  const handleLabelChange = (nextLabel: string) => {
    setFormState((current) => ({
      ...current,
      label: nextLabel,
      slug: isSlugDirty ? current.slug : slugifyProgramMenu(nextLabel),
    }));
  };

  const handleSubmit = () => {
    if (!formState.label.trim() || !formState.slug.trim() || !formState.description.trim()) {
      showToast({
        message: '메뉴명, 슬러그, 설명을 모두 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    saveMutation.mutate(formState);
  };

  const handleResetTreeFilters = () => {
    setSearchKeyword('');
    setPublishedOnly(false);
    setLeafOnly(false);
  };

  const selectedParentLabel =
    effectiveEditorMode === 'create'
      ? createParentId
        ? (menuItems.find((item) => item.id === createParentId)?.labelPath ?? '상위 메뉴 없음')
        : '최상위 메뉴'
      : (detailQuery.data?.menu.labelPath ?? '선택된 메뉴 없음');

  const totalLeafMenus = menuItems.filter((item) => item.isLeafMenu).length;
  const publishedMenus = menuItems.filter((item) => item.effectiveStatus === 'published').length;
  const detailSummaryActionLabels = detailQuery.data
    ? [
        detailQuery.data.canCreateChildMenu ? '하위 메뉴 추가 가능' : null,
        detailQuery.data.canCreateProgram ? '강의 생성 가능' : null,
      ].filter((label): label is string => Boolean(label))
    : [];
  const isInheritedHidden =
    detailQuery.data?.menu.status === 'published' &&
    detailQuery.data.menu.effectiveStatus === 'hidden';

  return (
    <div className={styles['workspace']}>
      <section className={styles['summaryPanel']}>
        <div className={styles['summaryHeader']}>
          <div className={styles['summaryCopy']}>
            <p className={styles['eyebrow']}>Shared Program Navigation</p>
            <h2 className={styles['title']}>
              헤더, 교육과정 허브, 강의 연결 구조를 한 화면에서 관리합니다.
            </h2>
            <p className={styles['description']}>
              메뉴를 고르면 우측에서 이름, 공개 상태, 이동 가능 위치와 연결 강의를 함께 다룰 수
              있습니다.
            </p>
          </div>
          <div className={styles['summaryActions']}>
            <Button
              onClick={() => {
                resetToCreate(null);
              }}
              type='button'
            >
              최상위 메뉴 추가
            </Button>
          </div>
        </div>

        <div className={styles['summaryGrid']}>
          <article className={styles['summaryCard']}>
            <span className={styles['summaryLabel']}>전체 메뉴</span>
            <strong className={styles['summaryValue']}>{String(menuItems.length)}개</strong>
          </article>
          <article className={styles['summaryCard']}>
            <span className={styles['summaryLabel']}>강의 허브 메뉴</span>
            <strong className={styles['summaryValue']}>{String(totalLeafMenus)}개</strong>
          </article>
          <article className={styles['summaryCard']}>
            <span className={styles['summaryLabel']}>현재 노출중</span>
            <strong className={styles['summaryValue']}>{String(publishedMenus)}개</strong>
          </article>
        </div>
      </section>

      <div className={styles['mainGrid']}>
        <section className={styles['treePanel']}>
          <div className={styles['panelHeader']}>
            <h3 className={styles['panelTitle']}>현재 강의 메뉴 구조</h3>
            <p className={styles['panelDescription']}>
              최상위는 최대 {String(treeQuery.data?.topLevelLimit ?? 6)}개, 전체 깊이는 최대{' '}
              {String(treeQuery.data?.maxDepth ?? 3)}뎁스입니다. 단계별 컬럼에서 메뉴를 바로 고르고
              우측에서 수정할 수 있습니다.
            </p>
          </div>

          <div className={styles['treeToolbar']}>
            <div className={styles['treeSearchField']}>
              <TextField
                label='메뉴 검색'
                name='program-menu-search'
                onChange={(event) => {
                  setSearchKeyword(event.target.value);
                }}
                placeholder='메뉴명, 슬러그, 경로 검색'
                value={searchKeyword}
              />
            </div>

            <div className={styles['treeToolbarRow']}>
              <div className={styles['treeFilterGroup']}>
                <button
                  aria-pressed={publishedOnly}
                  className={classNames(
                    styles['treeFilterChip'],
                    publishedOnly && styles['treeFilterChipActive'],
                  )}
                  onClick={() => {
                    setPublishedOnly((current) => !current);
                  }}
                  type='button'
                >
                  노출중만
                </button>
                <button
                  aria-pressed={leafOnly}
                  className={classNames(
                    styles['treeFilterChip'],
                    leafOnly && styles['treeFilterChipActive'],
                  )}
                  onClick={() => {
                    setLeafOnly((current) => !current);
                  }}
                  type='button'
                >
                  강의 허브만
                </button>
              </div>

              <div className={styles['treeToolbarActions']}>
                <Button
                  onClick={handleResetTreeFilters}
                  size='sm'
                  type='button'
                  variant='secondary'
                >
                  필터 초기화
                </Button>
              </div>
            </div>

            <p className={styles['treeToolbarSummary']}>
              보이는 메뉴 {String(visibleMenuCount)}개 / 전체 {String(menuItems.length)}개
            </p>

            {activeMenuHiddenByFilters ? (
              <div className={styles['treeNotice']}>
                <p className={styles['treeNoticeText']}>
                  현재 선택 메뉴가 필터 결과에서 숨겨졌습니다.
                </p>
                <Button
                  onClick={handleResetTreeFilters}
                  size='sm'
                  type='button'
                  variant='secondary'
                >
                  초기화
                </Button>
              </div>
            ) : null}
          </div>

          {treeQuery.isPending ? (
            <div className={styles['emptyState']}>
              <p className={styles['emptyTitle']}>강의 메뉴 구조를 불러오는 중입니다.</p>
            </div>
          ) : filteredMenuItems.length ? (
            <div className={styles['browserPanel']}>
              <div className={styles['browserSummary']}>
                <div className={styles['browserSummaryGroup']}>
                  <span className={styles['fieldLabel']}>현재 선택</span>
                  <strong className={styles['browserSummaryValue']}>
                    {detailQuery.data?.menu.labelPath ?? selectedParentLabel}
                  </strong>
                </div>
                {detailQuery.data ? (
                  <div className={styles['browserSummaryStats']}>
                    <span className={styles['browserSummaryStat']}>
                      {`하위 메뉴 ${String(detailQuery.data.menu.childCollectionCount)}개`}
                    </span>
                    <span className={styles['browserSummaryStat']}>
                      {`총 강의 ${String(detailQuery.data.menu.totalProgramCount)}개`}
                    </span>
                  </div>
                ) : null}
              </div>

              <ProgramMenuBrowser
                focusedMenuId={focusedBrowserMenuId}
                items={filteredMenuItems}
                maxDepth={treeQuery.data?.maxDepth ?? 3}
                onSelect={(menuId) => {
                  setSelectedMenuId(menuId);
                  setEditorMode('edit');
                }}
                selectedMenuId={activeMenuId}
              />
            </div>
          ) : (
            <div className={styles['emptyState']}>
              <p className={styles['emptyTitle']}>
                {isTreeFilterActive
                  ? '조건에 맞는 강의 메뉴가 없습니다.'
                  : '아직 강의 메뉴가 없습니다.'}
              </p>
              <p className={styles['emptyDescription']}>
                {isTreeFilterActive
                  ? '검색어나 필터를 조정하면 다른 메뉴를 확인할 수 있습니다.'
                  : '최상위 메뉴를 추가하면 헤더 교육과정과 허브 구조가 함께 만들어집니다.'}
              </p>
            </div>
          )}
        </section>

        <section className={styles['detailPanel']}>
          <div className={styles['panelHeader']}>
            <h3 className={styles['panelTitle']}>
              {effectiveEditorMode === 'create' ? '새 강의 메뉴 만들기' : '선택 메뉴 설정'}
            </h3>
            <p className={styles['panelDescription']}>
              {effectiveEditorMode === 'create'
                ? '선택한 위치에 새 메뉴를 만들고, 이후 강의를 연결할 허브로 사용할 수 있습니다.'
                : '메뉴 정보 수정, 위치 이동, 순서 변경, 연결 강의 이동을 여기서 처리합니다.'}
            </p>
          </div>

          <div className={styles['detailStack']}>
            {editorMode === 'edit' && detailQuery.data ? (
              <article className={styles['card']}>
                <div className={styles['cardHeader']}>
                  <h4 className={styles['cardTitle']}>선택 메뉴 요약</h4>
                  <p className={styles['cardDescription']}>{detailQuery.data.menu.labelPath}</p>
                </div>

                <div className={styles['detailSummaryGrid']}>
                  <div className={styles['summaryMetric']}>
                    <span className={styles['fieldLabel']}>메뉴 타입</span>
                    <strong className={styles['summaryMetricValue']}>
                      {detailQuery.data.menu.isLeafMenu ? '강의 허브' : '브랜치'}
                    </strong>
                  </div>
                  <div className={styles['summaryMetric']}>
                    <span className={styles['fieldLabel']}>직접 공개 상태</span>
                    <strong className={styles['summaryMetricValue']}>
                      {formatMenuStatus(detailQuery.data.menu.status)}
                    </strong>
                  </div>
                  <div className={styles['summaryMetric']}>
                    <span className={styles['fieldLabel']}>실제 노출 상태</span>
                    <strong className={styles['summaryMetricValue']}>
                      {formatEffectiveMenuStatus(detailQuery.data.menu.effectiveStatus)}
                    </strong>
                  </div>
                  <div className={styles['summaryMetric']}>
                    <span className={styles['fieldLabel']}>현재 경로</span>
                    <strong className={styles['summaryMetricValue']}>
                      {detailQuery.data.menu.path}
                    </strong>
                  </div>
                </div>

                {detailSummaryActionLabels.length ? (
                  <div className={styles['summaryMetricBadges']}>
                    {detailSummaryActionLabels.map((label) => (
                      <span className={styles['summaryActionBadge']} key={label}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {isInheritedHidden ? (
                  <p className={styles['detailHint']}>
                    상위 메뉴가 숨김이라 현재 메뉴도 함께 숨겨진 상태입니다.
                  </p>
                ) : null}
              </article>
            ) : null}

            <article className={styles['card']}>
              <div className={styles['cardHeader']}>
                <h4 className={styles['cardTitle']}>메뉴 기본 정보</h4>
                <p className={styles['cardDescription']}>{selectedParentLabel}</p>
              </div>

              <div className={styles['formGrid']}>
                <TextField
                  label='메뉴명'
                  name='program-menu-label'
                  onChange={(event) => {
                    handleLabelChange(event.target.value);
                  }}
                  value={formState.label}
                />

                <TextField
                  label='슬러그'
                  name='program-menu-slug'
                  onChange={(event) => {
                    setIsSlugDirty(true);
                    setFormState((current) => ({
                      ...current,
                      slug: event.target.value,
                    }));
                  }}
                  value={formState.slug}
                />

                <TextAreaField
                  label='메뉴 설명'
                  name='program-menu-description'
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  value={formState.description}
                />

                <label className={styles['field']}>
                  <span className={styles['fieldLabel']}>공개 상태</span>
                  <div className={styles['selectWrap']}>
                    <select
                      className={styles['select']}
                      onChange={(event) => {
                        setFormState((current) => ({
                          ...current,
                          status: event.target.value as AdminProgramMenuStatus,
                        }));
                      }}
                      value={formState.status}
                    >
                      <option value='published'>즉시 공개</option>
                      <option value='hidden'>숨김 저장</option>
                    </select>
                  </div>
                </label>
              </div>

              <div className={styles['actionRow']}>
                <Button disabled={saveMutation.isPending} onClick={handleSubmit} type='button'>
                  {saveMutation.isPending
                    ? '저장 중...'
                    : effectiveEditorMode === 'create'
                      ? '메뉴 생성'
                      : '메뉴 저장'}
                </Button>
                {effectiveEditorMode === 'create' && activeMenuId ? (
                  <Button
                    onClick={() => {
                      setEditorMode('edit');
                    }}
                    type='button'
                    variant='secondary'
                  >
                    선택 메뉴로 돌아가기
                  </Button>
                ) : null}
              </div>
            </article>

            {editorMode === 'edit' && detailQuery.data ? (
              <>
                <article className={styles['card']}>
                  <div className={styles['cardHeader']}>
                    <h4 className={styles['cardTitle']}>메뉴 구조 액션</h4>
                    <p className={styles['cardDescription']}>{detailQuery.data.menu.path}</p>
                  </div>

                  <div className={styles['structureGrid']}>
                    <div className={styles['structureCard']}>
                      <span className={styles['fieldLabel']}>현재 위치</span>
                      <strong className={styles['structureValue']}>
                        {detailQuery.data.menu.labelPath}
                      </strong>
                      <div className={styles['actionRow']}>
                        <Button
                          disabled={!detailQuery.data.canCreateChildMenu}
                          onClick={() => {
                            resetToCreate(detailQuery.data.menu.id);
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          하위 메뉴 추가
                        </Button>
                        {detailQuery.data.canCreateProgram ? (
                          <Link
                            className={styles['inlineLink']}
                            to={buildProgramCreateLink(detailQuery.data.menu.path)}
                          >
                            이 메뉴에 새 강의 만들기
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles['structureCard']}>
                      <label className={styles['field']}>
                        <span className={styles['fieldLabel']}>상위 메뉴 변경</span>
                        <div className={styles['selectWrap']}>
                          <select
                            className={styles['select']}
                            value={detailQuery.data.menu.parentId ?? ''}
                            onChange={(event) => {
                              moveMenuMutation.mutate(event.target.value || null);
                            }}
                          >
                            <option value=''>최상위 메뉴</option>
                            {detailQuery.data.allowedParentOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.labelPath}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                      <div className={styles['actionRow']}>
                        <Button
                          disabled={
                            reorderMenuMutation.isPending || detailQuery.data.siblingIndex === 0
                          }
                          onClick={() => {
                            reorderMenuMutation.mutate('up');
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          위로 이동
                        </Button>
                        <Button
                          disabled={
                            reorderMenuMutation.isPending ||
                            detailQuery.data.siblingIndex >= detailQuery.data.siblingCount - 1
                          }
                          onClick={() => {
                            reorderMenuMutation.mutate('down');
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          아래로 이동
                        </Button>
                        <Button
                          disabled={!detailQuery.data.canDelete || deleteMenuMutation.isPending}
                          onClick={() => {
                            deleteMenuMutation.mutate();
                          }}
                          size='sm'
                          type='button'
                          variant='danger'
                        >
                          메뉴 삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>

                <article className={styles['card']}>
                  <div className={styles['cardHeader']}>
                    <h4 className={styles['cardTitle']}>연결 강의</h4>
                    <p className={styles['cardDescription']}>
                      이 메뉴 바로 아래에 연결된 강의를 확인하고 다른 leaf 메뉴로 이동할 수
                      있습니다.
                    </p>
                  </div>

                  {detailQuery.data.linkedPrograms.length ? (
                    <div className={styles['programList']}>
                      {detailQuery.data.linkedPrograms.map((program) => (
                        <article className={styles['programRow']} key={program.id}>
                          <div className={styles['programIdentity']}>
                            <div className={styles['programTitleRow']}>
                              <strong className={styles['programTitle']}>{program.title}</strong>
                              <span
                                className={
                                  program.status === 'published'
                                    ? styles['statusBadgePublished']
                                    : styles['statusBadgeHidden']
                                }
                              >
                                {formatMenuStatus(program.status)}
                              </span>
                              <span className={styles['programTypeBadge']}>
                                {program.origin === 'managed' ? '관리강의' : '사이트연동'}
                              </span>
                            </div>
                            <p className={styles['programMeta']}>
                              {program.formatLabel} · {program.scheduleLabel} · {program.publicPath}
                            </p>
                          </div>

                          <div className={styles['programActions']}>
                            <label className={styles['fieldInline']}>
                              <span className={styles['fieldLabel']}>이동 대상</span>
                              <div className={styles['selectWrap']}>
                                <select
                                  className={styles['select']}
                                  onChange={(event) => {
                                    const nextValue = event.target.value;

                                    setProgramMoveTargets((current) => ({
                                      ...current,
                                      [program.id]: nextValue,
                                    }));
                                  }}
                                  value={programMoveTargets[program.id] ?? ''}
                                >
                                  <option value=''>이동할 메뉴 선택</option>
                                  {leafCollectionOptions.map((option) => (
                                    <option key={option.id} value={option.path}>
                                      {option.labelPath}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </label>

                            <div className={styles['actionRow']}>
                              <Link
                                className={styles['inlineLink']}
                                to={buildProgramEditLink(program.id)}
                              >
                                강의 수정
                              </Link>
                              <Link
                                className={styles['inlineLink']}
                                target='_blank'
                                to={program.publicPath}
                              >
                                공개 페이지 확인
                              </Link>
                              <Button
                                disabled={
                                  !programMoveTargets[program.id] || moveProgramMutation.isPending
                                }
                                onClick={() => {
                                  const targetCollectionPath = programMoveTargets[program.id];

                                  if (!targetCollectionPath) {
                                    return;
                                  }

                                  moveProgramMutation.mutate({
                                    programId: program.id,
                                    targetCollectionPath,
                                  });
                                }}
                                size='sm'
                                type='button'
                                variant='secondary'
                              >
                                다른 메뉴로 이동
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={styles['emptyState']}>
                      <p className={styles['emptyTitle']}>아직 연결된 강의가 없습니다.</p>
                      <p className={styles['emptyDescription']}>
                        이 메뉴가 leaf 허브라면 새 강의를 만들고, 브랜치로 쓸 메뉴라면 하위 메뉴를
                        추가하세요.
                      </p>
                      {detailQuery.data.canCreateProgram ? (
                        <Link
                          className={styles['inlineLink']}
                          to={buildProgramCreateLink(detailQuery.data.menu.path)}
                        >
                          이 메뉴에 새 강의 만들기
                        </Link>
                      ) : null}
                    </div>
                  )}
                </article>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminProgramMenuSection;
