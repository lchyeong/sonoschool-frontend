import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import Button from '@/components/ui/Button/Button';
import ChevronDownIcon from '@/components/ui/icons/ChevronDownIcon';
import { TextField } from '@/components/ui/TextField/TextField';
import { useAdminProgramMenuTreeQuery } from '@/query/useAdminProgramMenuQuery';
import { useAdminProgramsQuery } from '@/query/useAdminProgramsQuery';
import { routePaths } from '@/routes/routeRegistry';
import type {
  AdminProgramFormat,
  AdminProgramMenuTreeItem,
  AdminProgramStatus,
} from '@/types/adminConsole';
import { classNames } from '@/utils/classNames';

import styles from './AdminProgramEditorSection.module.scss';

interface MenuTreeBranch extends AdminProgramMenuTreeItem {
  children: MenuTreeBranch[];
}

interface AdminProgramEditorRouteState {
  returnTo?: string;
}

const DEFAULT_STATUS_FILTER = 'all';
const DEFAULT_FORMAT_FILTER = 'all';

const programStatusLabel: Record<AdminProgramStatus, string> = {
  draft: '초안',
  hidden: '숨김',
  published: '게시중',
};

const programOriginLabel = {
  managed: '관리 강의',
  site: '사이트 연동 강의',
} as const;

const isStatusFilter = (value: string | null): value is 'all' | AdminProgramStatus => {
  return value === 'all' || value === 'draft' || value === 'hidden' || value === 'published';
};

const isFormatFilter = (value: string | null): value is 'all' | AdminProgramFormat => {
  return value === 'all' || value === 'offline' || value === 'hybrid' || value === 'online';
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

const collectExpandableMenuIds = (branches: readonly MenuTreeBranch[]): string[] => {
  return branches.flatMap((branch) => {
    const childIds = collectExpandableMenuIds(branch.children);

    if (branch.children.length === 0) {
      return childIds;
    }

    return [branch.id, ...childIds];
  });
};

const mergeUniqueIds = (current: readonly string[], next: readonly string[]): string[] => {
  return Array.from(new Set([...current, ...next]));
};

const buildExpandedIdsForSelection = (
  selectedMenuId: string | null,
  itemMap: ReadonlyMap<string, AdminProgramMenuTreeItem>,
): string[] => {
  if (!selectedMenuId) {
    return [];
  }

  const pathIds: string[] = [];
  let current: AdminProgramMenuTreeItem | undefined = itemMap.get(selectedMenuId);

  while (current) {
    if (!current.isLeafMenu) {
      pathIds.unshift(current.id);
    }

    current = current.parentId ? itemMap.get(current.parentId) : undefined;
  }

  return pathIds;
};

const filterMenuTreeByKeyword = (
  branches: readonly MenuTreeBranch[],
  keyword: string,
): MenuTreeBranch[] => {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return [...branches];
  }

  const visit = (nodes: readonly MenuTreeBranch[]): MenuTreeBranch[] => {
    return nodes.flatMap((node) => {
      const filteredChildren = visit(node.children);
      const isMatched = [node.label, node.labelPath, node.path]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword);

      if (!isMatched && filteredChildren.length === 0) {
        return [];
      }

      return [
        {
          ...node,
          children: filteredChildren,
        },
      ];
    });
  };

  return visit(branches);
};

const AdminProgramListSection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedMenuIds, setExpandedMenuIds] = useState<string[]>([]);

  const menuTreeQuery = useAdminProgramMenuTreeQuery();
  const menuItems = useMemo(() => menuTreeQuery.data?.items ?? [], [menuTreeQuery.data?.items]);
  const menuItemMap = useMemo(() => new Map(menuItems.map((item) => [item.id, item])), [menuItems]);
  const menuTree = useMemo(() => buildMenuTree(menuItems), [menuItems]);

  const rawMenuPath = searchParams.get('menuPath');
  const rawMenuSearch = searchParams.get('menuSearch') ?? '';
  const rawProgramQuery = searchParams.get('programQuery') ?? '';
  const rawStatusFilter = searchParams.get('status');
  const rawFormatFilter = searchParams.get('format');

  const statusFilter = isStatusFilter(rawStatusFilter) ? rawStatusFilter : DEFAULT_STATUS_FILTER;
  const formatFilter = isFormatFilter(rawFormatFilter) ? rawFormatFilter : DEFAULT_FORMAT_FILTER;
  const deferredProgramSearchKeyword = useDeferredValue(rawProgramQuery.trim());
  const filteredMenuTree = useMemo(
    () => filterMenuTreeByKeyword(menuTree, rawMenuSearch),
    [menuTree, rawMenuSearch],
  );
  const activeMenu = useMemo<AdminProgramMenuTreeItem | null>(() => {
    const matchedMenu = rawMenuPath
      ? menuItems.find((item) => item.path === rawMenuPath)
      : undefined;
    const defaultLeafMenu = menuItems.find((item) => item.isLeafMenu);
    const firstMenu = menuItems.at(0) ?? null;

    return matchedMenu ?? defaultLeafMenu ?? firstMenu;
  }, [menuItems, rawMenuPath]);
  const activeMenuId = activeMenu ? activeMenu.id : null;
  const isLeafMenuSelected = activeMenu ? activeMenu.isLeafMenu : false;

  const programsQuery = useAdminProgramsQuery({
    collectionPath: activeMenu ? activeMenu.path : null,
    enabled: activeMenu !== null,
    format: formatFilter,
    query: deferredProgramSearchKeyword,
    status: statusFilter,
  });
  const programItems = useMemo(() => programsQuery.data?.items || [], [programsQuery.data?.items]);
  const hasDuplicatableProgram = programItems.some((item) => item.canDuplicate);

  const updateSearchState = (
    updates: Partial<{
      format: string | null;
      menuPath: string | null;
      menuSearch: string | null;
      programQuery: string | null;
      status: string | null;
    }>,
    replace = false,
  ) => {
    const nextParams = new URLSearchParams(searchParams);

    (Object.entries(updates) as Array<[keyof typeof updates, string | null | undefined]>).forEach(
      ([key, value]) => {
        if (!value || value === DEFAULT_STATUS_FILTER || value === DEFAULT_FORMAT_FILTER) {
          nextParams.delete(key);
          return;
        }

        nextParams.set(key, value);
      },
    );

    setSearchParams(nextParams, { replace });
  };

  useEffect(() => {
    queueMicrotask(() => {
      setExpandedMenuIds((current) =>
        current.filter((menuId) => menuItems.some((item) => item.id === menuId)),
      );
    });
  }, [menuItems]);

  useEffect(() => {
    const selectionExpandedIds = buildExpandedIdsForSelection(activeMenuId, menuItemMap);

    if (!selectionExpandedIds.length) {
      return;
    }

    queueMicrotask(() => {
      setExpandedMenuIds((current) => mergeUniqueIds(current, selectionExpandedIds));
    });
  }, [activeMenuId, menuItemMap]);

  useEffect(() => {
    if (!rawMenuSearch.trim()) {
      return;
    }

    queueMicrotask(() => {
      setExpandedMenuIds(collectExpandableMenuIds(filteredMenuTree));
    });
  }, [filteredMenuTree, rawMenuSearch]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let hasChanges = false;

    if (activeMenu !== null && rawMenuPath !== activeMenu.path) {
      nextParams.set('menuPath', activeMenu.path);
      hasChanges = true;
    }

    if (rawStatusFilter && !isStatusFilter(rawStatusFilter)) {
      nextParams.delete('status');
      hasChanges = true;
    }

    if (rawFormatFilter && !isFormatFilter(rawFormatFilter)) {
      nextParams.delete('format');
      hasChanges = true;
    }

    if (hasChanges) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeMenu, rawFormatFilter, rawMenuPath, rawStatusFilter, searchParams, setSearchParams]);

  const returnTo = `${location.pathname}${location.search}`;
  const navigationState = {
    returnTo,
  } satisfies AdminProgramEditorRouteState;

  const handleCreate = () => {
    if (!activeMenu || !activeMenu.isLeafMenu) {
      return;
    }

    const nextSearchParams = new URLSearchParams({
      parentCollectionPath: activeMenu.path,
    });

    void navigate(`${routePaths.adminProgramCreate}?${nextSearchParams.toString()}`, {
      state: navigationState,
    });
  };

  const renderMenuBranches = (branches: readonly MenuTreeBranch[]) => {
    return (
      <ul className={styles['menuTreeList']}>
        {branches.map((branch) => {
          const isExpanded = expandedMenuIds.includes(branch.id);
          const isActive = activeMenuId === branch.id;

          return (
            <li className={styles['menuTreeItem']} key={branch.id}>
              <div
                className={classNames(
                  styles['menuTreeRow'],
                  isActive ? styles['menuTreeRowActive'] : undefined,
                )}
              >
                {branch.children.length ? (
                  <button
                    aria-expanded={isExpanded}
                    className={styles['menuToggleButton']}
                    onClick={() => {
                      setExpandedMenuIds((current) =>
                        current.includes(branch.id)
                          ? current.filter((menuId) => menuId !== branch.id)
                          : [...current, branch.id],
                      );
                    }}
                    type='button'
                  >
                    <ChevronDownIcon
                      className={classNames(
                        styles['menuToggleIcon'],
                        isExpanded ? styles['menuToggleIconExpanded'] : undefined,
                      )}
                    />
                  </button>
                ) : (
                  <span className={styles['menuToggleSpacer']} />
                )}

                <button
                  className={styles['menuSelectButton']}
                  onClick={() => {
                    updateSearchState({ menuPath: branch.path });
                  }}
                  type='button'
                >
                  <span className={styles['menuSelectLabel']}>{branch.label}</span>
                  <span className={styles['menuBadges']}>
                    <span className={styles['menuBadge']}>
                      {branch.isLeafMenu ? '강의 허브' : '브랜치'}
                    </span>
                    <span className={styles['menuBadge']}>
                      총 {String(branch.totalProgramCount)}강의
                    </span>
                  </span>
                </button>
              </div>

              {branch.children.length && isExpanded ? renderMenuBranches(branch.children) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={styles['workspace']}>
      <section className={styles['managementLayout']}>
        <aside className={styles['menuPanel']}>
          <div className={styles['panelHeader']}>
            <div>
              <p className={styles['eyebrow']}>Program Menus</p>
              <h3 className={styles['sectionTitle']}>강의메뉴 기준으로 시작</h3>
              <p className={styles['sectionDescription']}>
                브랜치를 선택하면 하위 강의를 한 번에 보고, leaf 메뉴를 선택하면 해당 메뉴에서 바로
                새 강의 등록 페이지로 이동합니다. 브랜치의 강의 수는 하위 메뉴를 포함한 총합
                기준으로 표시합니다.
              </p>
            </div>
          </div>

          <TextField
            label='메뉴 검색'
            name='programMenuSearch'
            onChange={(event) => {
              updateSearchState({ menuSearch: event.target.value || null });
            }}
            placeholder='예: 복부 Basic, 내과과정'
            value={rawMenuSearch}
          />

          {menuTreeQuery.isPending ? (
            <div className={styles['inlineState']}>강의 메뉴를 불러오는 중입니다.</div>
          ) : filteredMenuTree.length ? (
            renderMenuBranches(filteredMenuTree)
          ) : (
            <div className={styles['inlineState']}>검색 결과에 맞는 강의 메뉴가 없습니다.</div>
          )}
        </aside>

        <section className={styles['listPanel']}>
          <div className={styles['panelHeaderRow']}>
            <div className={styles['sectionHeader']}>
              <p className={styles['eyebrow']}>Lectures</p>
              <h3 className={styles['sectionTitle']}>
                {activeMenu ? `${activeMenu.labelPath} 강의 목록` : '강의 목록'}
              </h3>
              <p className={styles['sectionDescription']}>
                새 강의 등록, 복제, 편집은 모두 전용 페이지에서 진행합니다. 목록 상태는 URL에
                유지되어 작업 후 같은 맥락으로 돌아올 수 있습니다.
              </p>
            </div>

            <div className={styles['headerActions']}>
              <Button disabled={!isLeafMenuSelected} onClick={handleCreate} type='button'>
                새 강의 등록
              </Button>
              {hasDuplicatableProgram ? (
                <span className={styles['metaText']}>복제는 각 강의 행에서 시작합니다.</span>
              ) : null}
            </div>
          </div>

          {activeMenu && !isLeafMenuSelected ? (
            <div className={styles['selectionHint']}>
              <strong>현재는 브랜치 메뉴가 선택되어 있습니다.</strong>
              <span>
                하위 강의는 볼 수 있지만 새 강의를 만들려면 강의를 담는 leaf 메뉴를 선택해야 합니다.
              </span>
            </div>
          ) : null}

          <div className={styles['filterRow']}>
            <TextField
              label='강의 검색'
              name='adminProgramSearch'
              onChange={(event) => {
                updateSearchState({ programQuery: event.target.value || null });
              }}
              placeholder='강의명, 공개 경로, 일정으로 검색'
              value={rawProgramQuery}
            />

            <label className={styles['field']}>
              <span className={styles['fieldLabel']}>상태</span>
              <div className={styles['selectWrap']}>
                <select
                  className={styles['select']}
                  onChange={(event) => {
                    updateSearchState({ status: event.target.value });
                  }}
                  value={statusFilter}
                >
                  <option value='all'>전체</option>
                  <option value='draft'>초안</option>
                  <option value='published'>게시중</option>
                  <option value='hidden'>숨김</option>
                </select>
              </div>
            </label>

            <label className={styles['field']}>
              <span className={styles['fieldLabel']}>운영 형식</span>
              <div className={styles['selectWrap']}>
                <select
                  className={styles['select']}
                  onChange={(event) => {
                    updateSearchState({ format: event.target.value });
                  }}
                  value={formatFilter}
                >
                  <option value='all'>전체</option>
                  <option value='offline'>오프라인</option>
                  <option value='hybrid'>하이브리드</option>
                  <option value='online'>온라인</option>
                </select>
              </div>
            </label>
          </div>

          {programsQuery.isPending ? (
            <div className={styles['inlineState']}>강의 목록을 불러오는 중입니다.</div>
          ) : programItems.length ? (
            <div className={styles['programList']}>
              {programItems.map((program) => {
                const duplicateParentCollectionPath =
                  activeMenu && activeMenu.isLeafMenu
                    ? activeMenu.path
                    : program.parentCollectionPath;

                return (
                  <article className={styles['programRow']} key={program.id}>
                    <div className={styles['programRowMain']}>
                      <div className={styles['programRowMeta']}>
                        <span className={styles['statusBadge']} data-status={program.status}>
                          {programStatusLabel[program.status]}
                        </span>
                        <span className={styles['originBadge']}>
                          {programOriginLabel[program.origin]}
                        </span>
                        <span className={styles['metaText']}>{program.parentCollectionLabel}</span>
                      </div>
                      <h4 className={styles['programTitle']}>{program.title}</h4>
                      <dl className={styles['programInfoGrid']}>
                        <div>
                          <dt>운영 방식</dt>
                          <dd>{program.formatLabel}</dd>
                        </div>
                        <div>
                          <dt>운영 일정</dt>
                          <dd>{program.scheduleSummary}</dd>
                        </div>
                        <div>
                          <dt>가격</dt>
                          <dd>{program.priceLabel}</dd>
                        </div>
                        <div>
                          <dt>잔여 좌석</dt>
                          <dd>{program.remainingSeatsLabel}</dd>
                        </div>
                        <div>
                          <dt>공개 경로</dt>
                          <dd>{program.publicPath}</dd>
                        </div>
                        <div>
                          <dt>수정일</dt>
                          <dd>{program.updatedAt}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className={styles['programRowSide']}>
                      <div className={styles['readinessBox']}>
                        <strong>{program.isPublishReady ? '게시 가능' : '추가 입력 필요'}</strong>
                        <span>
                          {program.missingFieldCount
                            ? `누락 항목 ${String(program.missingFieldCount)}개`
                            : '바로 게시할 수 있습니다.'}
                        </span>
                      </div>

                      <div className={styles['rowActions']}>
                        {program.canEdit ? (
                          <Button
                            onClick={() => {
                              void navigate(routePaths.adminProgramEdit(program.id), {
                                state: navigationState,
                              });
                            }}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            편집
                          </Button>
                        ) : null}

                        {program.canDuplicate ? (
                          <Button
                            onClick={() => {
                              const nextSearchParams = new URLSearchParams({
                                parentCollectionPath: duplicateParentCollectionPath,
                              });

                              void navigate(
                                `${routePaths.adminProgramDuplicate(program.id)}?${nextSearchParams.toString()}`,
                                {
                                  state: navigationState,
                                },
                              );
                            }}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            복제
                          </Button>
                        ) : null}

                        <Link
                          className={styles['inlineLink']}
                          target='_blank'
                          to={program.publicPath}
                        >
                          공개 페이지
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles['emptyState']}>
              <p className={styles['emptyStateTitle']}>선택한 메뉴에서 표시할 강의가 없습니다.</p>
              <p className={styles['emptyStateDescription']}>
                leaf 메뉴를 선택한 뒤 새 강의를 등록하거나, 검색과 필터를 조정해 주세요.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
};

export default AdminProgramListSection;
