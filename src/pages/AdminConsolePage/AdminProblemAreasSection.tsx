import { useMemo, useState, type CSSProperties } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminProblemArea,
  deleteAdminProblemArea,
  updateAdminProblemArea,
} from '@/api/adminProblemAreas';
import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import checkIconSrc from '@/assets/icons/lucide_check.svg';
import AdminHierarchyPath from '@/components/admin/AdminHierarchyPath/AdminHierarchyPath';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import {
  adminProblemAreasQueryKey,
  useAdminProblemAreasQuery,
} from '@/query/useAdminProblemAreasQuery';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProblemArea } from '@/types/adminProblemAreas';
import { classNames } from '@/utils/classNames';

import styles from './AdminConsolePage.module.scss';
import menuStyles from './AdminProgramMenuSection.module.scss';

interface ProblemAreaFormState {
  active: boolean;
  description: string;
  name: string;
}

type DetailTab = 'edit' | 'createRoot' | 'createChild';

const INITIAL_FORM_STATE: ProblemAreaFormState = {
  active: true,
  description: '',
  name: '',
};

const sortProblemAreas = (areas: readonly AdminProblemArea[]): AdminProblemArea[] => {
  return [...areas].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id - right.id;
  });
};

const toFormState = (area: AdminProblemArea | null): ProblemAreaFormState => {
  if (!area) {
    return INITIAL_FORM_STATE;
  }

  return {
    active: area.active,
    description: area.description ?? '',
    name: area.name,
  };
};

const getProblemAreaPathLabel = (area: AdminProblemArea | null): string => {
  if (!area) {
    return '문제영역 선택';
  }

  return area.parentName ? `${area.parentName} > ${area.name}` : area.name;
};

const buildChildrenByParent = (
  areas: readonly AdminProblemArea[],
): Map<number, AdminProblemArea[]> => {
  const childrenByParent = new Map<number, AdminProblemArea[]>();

  areas.forEach((area) => {
    if (area.parentId === null) {
      return;
    }

    const children = childrenByParent.get(area.parentId) ?? [];
    children.push(area);
    childrenByParent.set(area.parentId, children);
  });

  return childrenByParent;
};

const toUpdatePayload = (area: AdminProblemArea, sortOrder: number) => ({
  active: area.active,
  description: area.description,
  name: area.name,
  parentId: area.parentId,
  sortOrder,
});

const ProblemAreaBrowser = ({
  childrenByParent,
  columns,
  selectedAreaId,
  selectedRootId,
  onSelect,
}: {
  childrenByParent: ReadonlyMap<number, AdminProblemArea[]>;
  columns: readonly [AdminProblemArea[], AdminProblemArea[]];
  selectedAreaId: number | null;
  selectedRootId: number | null;
  onSelect: (area: AdminProblemArea) => void;
}) => {
  const arrowStyle = useMemo(
    () =>
      ({
        ['--program-menu-arrow-icon' as string]: `url(${rightArrowIconSrc})`,
      }) as CSSProperties,
    [],
  );

  return (
    <div className={menuStyles['browserShell']}>
      <div className={classNames(menuStyles['browserGrid'], menuStyles['browserGridTwoColumn'])}>
        {columns.map((columnItems, columnIndex) => {
          const columnLabel = columnIndex === 0 ? '문제영역 카테고리' : '문제영역';

          return (
            <section
              className={menuStyles['browserColumn']}
              key={`problem-area-column-${String(columnIndex)}`}
            >
              <div className={menuStyles['browserColumnHeader']}>{columnLabel}</div>
              {columnItems.length ? (
                <div className={menuStyles['browserList']} role='list'>
                  {columnItems.map((area) => {
                    const isRoot = area.parentId === null;
                    const isActive = isRoot
                      ? selectedRootId === area.id
                      : selectedAreaId === area.id;
                    const isSelected = selectedAreaId === area.id;
                    const hasChildren = isRoot && Boolean(childrenByParent.get(area.id)?.length);

                    return (
                      <button
                        aria-label={`${area.name} 문제영역 선택`}
                        className={classNames(
                          menuStyles['browserOption'],
                          isActive && menuStyles['browserOptionActive'],
                          isSelected && menuStyles['browserOptionSelected'],
                        )}
                        key={area.id}
                        onClick={() => {
                          onSelect(area);
                        }}
                        type='button'
                      >
                        <span className={menuStyles['browserOptionLabel']}>{area.name}</span>
                        {hasChildren ? (
                          <span
                            aria-hidden='true'
                            className={menuStyles['browserOptionArrow']}
                            style={arrowStyle}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={menuStyles['columnEmpty']}>
                  {columnIndex === 0 ? '문제영역 카테고리 없음' : '문제영역 없음'}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

const AdminProblemAreasSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const areasQuery = useAdminProblemAreasQuery(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [createFormState, setCreateFormState] = useState<ProblemAreaFormState>(INITIAL_FORM_STATE);
  const [detailTab, setDetailTab] = useState<DetailTab>('edit');
  const [editDraftState, setEditDraftState] = useState<ProblemAreaFormState | null>(null);

  const areas = useMemo(() => sortProblemAreas(areasQuery.data ?? []), [areasQuery.data]);
  const rootAreas = useMemo(() => areas.filter((area) => area.parentId === null), [areas]);
  const childrenByParent = useMemo(() => buildChildrenByParent(areas), [areas]);
  const areaMap = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
  const resolvedSelectedAreaId = useMemo(() => {
    if (!areas.length) {
      return null;
    }

    if (selectedAreaId !== null && areaMap.has(selectedAreaId)) {
      return selectedAreaId;
    }

    return rootAreas[0]?.id ?? areas[0].id;
  }, [areaMap, areas, rootAreas, selectedAreaId]);
  const selectedArea =
    resolvedSelectedAreaId !== null ? (areaMap.get(resolvedSelectedAreaId) ?? null) : null;
  const selectedRootId = selectedArea ? (selectedArea.parentId ?? selectedArea.id) : null;
  const selectedRoot = selectedRootId !== null ? (areaMap.get(selectedRootId) ?? null) : null;
  const browserColumns: readonly [AdminProblemArea[], AdminProblemArea[]] = [
    rootAreas,
    selectedRootId !== null ? (childrenByParent.get(selectedRootId) ?? []) : [],
  ];
  const resolvedCreateParentId =
    detailTab === 'createChild' && selectedRootId !== null ? selectedRootId : null;
  const createSiblingAreas =
    resolvedCreateParentId === null
      ? rootAreas
      : (childrenByParent.get(resolvedCreateParentId) ?? []);
  const selectedSiblingAreas =
    selectedArea?.parentId === null
      ? rootAreas
      : selectedArea
        ? (childrenByParent.get(selectedArea.parentId) ?? [])
        : [];
  const selectedSiblingIndex = selectedArea
    ? selectedSiblingAreas.findIndex((area) => area.id === selectedArea.id)
    : -1;
  const editFormState = editDraftState ?? toFormState(selectedArea);
  const isCreateTab = detailTab === 'createRoot' || detailTab === 'createChild';
  const createAreaKindLabel = detailTab === 'createChild' ? '문제영역' : '문제영역 카테고리';
  const createAreaObjectParticle = detailTab === 'createChild' ? '을' : '를';
  const createPositionLabel =
    detailTab === 'createChild' && selectedRoot
      ? `${selectedRoot.name} > 문제영역`
      : '문제영역 카테고리 목록';

  const invalidateAreas = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProblemAreasQueryKey(false) }),
      queryClient.invalidateQueries({ queryKey: adminProblemAreasQueryKey(true) }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (state: ProblemAreaFormState) => {
      if (detailTab === 'createChild' && resolvedCreateParentId === null) {
        throw new Error('문제영역을 추가할 문제영역 카테고리를 먼저 선택해 주세요.');
      }

      const name = state.name.trim();
      if (!name) {
        throw new Error(`${createAreaKindLabel}명을 입력해 주세요.`);
      }

      return createAdminProblemArea({
        description: state.description,
        name,
        parentId: resolvedCreateParentId,
        sortOrder: createSiblingAreas.length
          ? createSiblingAreas[createSiblingAreas.length - 1].sortOrder + 1
          : 0,
      });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제영역을 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (area) => {
      await invalidateAreas();
      setSelectedAreaId(area.id);
      setCreateFormState(INITIAL_FORM_STATE);
      setDetailTab('edit');
      setEditDraftState(null);
      showToast({
        message: `${createAreaKindLabel}${createAreaObjectParticle} 추가했습니다.`,
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (state: ProblemAreaFormState) => {
      if (!selectedArea) {
        throw new Error('수정할 문제영역을 선택해 주세요.');
      }

      const name = state.name.trim();
      if (!name) {
        throw new Error('문제영역명을 입력해 주세요.');
      }

      return updateAdminProblemArea(selectedArea.id, {
        active: state.active,
        description: state.description,
        name,
        parentId: selectedArea.parentId,
        sortOrder: selectedArea.sortOrder,
      });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제영역을 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (area) => {
      await invalidateAreas();
      setSelectedAreaId(area.id);
      setEditDraftState(null);
      showToast({ message: '문제영역을 수정했습니다.', variant: 'success' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      if (!selectedArea) {
        throw new Error('이동할 문제영역을 선택해 주세요.');
      }

      const currentIndex = selectedSiblingAreas.findIndex((area) => area.id === selectedArea.id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= selectedSiblingAreas.length) {
        throw new Error('더 이상 이동할 수 없습니다.');
      }

      const nextAreas = [...selectedSiblingAreas];
      const [currentArea] = nextAreas.splice(currentIndex, 1);
      nextAreas.splice(targetIndex, 0, currentArea);

      await Promise.all(
        nextAreas.map((area, index) => {
          if (area.sortOrder === index) {
            return Promise.resolve(area);
          }

          return updateAdminProblemArea(area.id, toUpdatePayload(area, index));
        }),
      );
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제영역 순서를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateAreas();
      setEditDraftState(null);
      showToast({ message: '문제영역 순서를 변경했습니다.', variant: 'success' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedArea) {
        throw new Error('삭제할 문제영역을 선택해 주세요.');
      }

      await deleteAdminProblemArea(selectedArea.id);
      return selectedArea.parentId;
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제영역을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (parentId) => {
      await invalidateAreas();
      setSelectedAreaId(parentId);
      setEditDraftState(null);
      showToast({ message: '문제영역을 삭제했습니다.', variant: 'success' });
    },
  });

  const selectArea = (area: AdminProblemArea) => {
    setSelectedAreaId(area.id);
    setEditDraftState(null);
  };

  const updateEditFormState = (patch: Partial<ProblemAreaFormState>) => {
    if (!selectedArea) {
      return;
    }

    setEditDraftState((current) => ({
      ...(current ?? toFormState(selectedArea)),
      ...patch,
    }));
  };

  const renderBrowserContent = () => {
    if (areasQuery.isPending) {
      return (
        <div className={menuStyles['stateCard']}>
          <p className={menuStyles['stateTitle']}>문제영역을 불러오는 중입니다.</p>
        </div>
      );
    }

    if (areasQuery.isError) {
      return (
        <div className={menuStyles['stateCard']}>
          <p className={menuStyles['stateTitle']}>문제영역을 불러오지 못했습니다.</p>
          <p className={menuStyles['stateDescription']}>서버 응답을 다시 확인해 주세요.</p>
        </div>
      );
    }

    if (!areas.length) {
      return (
        <div className={menuStyles['stateCard']}>
          <p className={menuStyles['stateTitle']}>등록된 문제영역이 없습니다.</p>
          <p className={menuStyles['stateDescription']}>
            문제영역 카테고리 추가 탭에서 먼저 추가해 주세요.
          </p>
        </div>
      );
    }

    return (
      <ProblemAreaBrowser
        childrenByParent={childrenByParent}
        columns={browserColumns}
        onSelect={selectArea}
        selectedAreaId={resolvedSelectedAreaId}
        selectedRootId={selectedRootId}
      />
    );
  };

  return (
    <div className={menuStyles['workspace']}>
      <section className={menuStyles['currentCategoryBar']}>
        <p className={menuStyles['currentCategoryLabel']}>현재 문제영역</p>
        <div className={menuStyles['currentCategoryValue']}>
          <AdminHierarchyPath path={getProblemAreaPathLabel(selectedArea)} />
        </div>
      </section>

      <div className={menuStyles['layout']}>
        <section className={menuStyles['browserPanel']}>{renderBrowserContent()}</section>

        <section className={menuStyles['detailPanel']}>
          <div className={menuStyles['detailTabs']} role='tablist' aria-label='문제영역 작업'>
            <button
              aria-selected={detailTab === 'edit'}
              className={classNames(
                menuStyles['detailTab'],
                detailTab === 'edit' && menuStyles['detailTabActive'],
              )}
              onClick={() => {
                setDetailTab('edit');
              }}
              role='tab'
              type='button'
            >
              문제영역 수정
            </button>
            <button
              aria-selected={detailTab === 'createRoot'}
              className={classNames(
                menuStyles['detailTab'],
                detailTab === 'createRoot' && menuStyles['detailTabActive'],
              )}
              onClick={() => {
                setDetailTab('createRoot');
              }}
              role='tab'
              type='button'
            >
              문제영역 카테고리 추가
            </button>
            <button
              aria-selected={detailTab === 'createChild'}
              className={classNames(
                menuStyles['detailTab'],
                detailTab === 'createChild' && menuStyles['detailTabActive'],
              )}
              disabled={!selectedRoot}
              onClick={() => {
                setDetailTab('createChild');
              }}
              role='tab'
              type='button'
            >
              문제영역 추가
            </button>
          </div>

          {detailTab === 'edit' ? (
            <article className={menuStyles['detailCard']}>
              <div className={menuStyles['cardHeader']}>
                <h3 className={menuStyles['cardTitle']}>선택한 문제영역 수정</h3>
              </div>

              {selectedArea ? (
                <>
                  <div className={menuStyles['selectionSummaryRow']}>
                    <p className={menuStyles['selectionSummaryLabel']}>현재 선택된 문제영역</p>
                    <div className={menuStyles['selectionSummaryValueInline']}>
                      <AdminHierarchyPath path={getProblemAreaPathLabel(selectedArea)} />
                    </div>
                  </div>

                  <div className={menuStyles['formGrid']}>
                    <TextField
                      label='영역명'
                      name='problem-area-edit-name'
                      onChange={(event) => {
                        updateEditFormState({ name: event.target.value });
                      }}
                      value={editFormState.name}
                    />
                    <TextAreaField
                      label='설명'
                      name='problem-area-edit-description'
                      onChange={(event) => {
                        updateEditFormState({ description: event.target.value });
                      }}
                      rows={3}
                      value={editFormState.description}
                    />
                    <label className={`${styles['checkboxRow']} ${styles['noticeCheckboxRow']}`}>
                      <input
                        checked={editFormState.active}
                        onChange={(event) => {
                          updateEditFormState({ active: event.target.checked });
                        }}
                        type='checkbox'
                      />
                      <span className={styles['noticeCheckboxBox']} aria-hidden='true'>
                        {editFormState.active ? <img alt='' src={checkIconSrc} /> : null}
                      </span>
                      <span>사용 중</span>
                    </label>
                  </div>

                  <div className={menuStyles['formActions']}>
                    <div className={menuStyles['actionRow']}>
                      <Button
                        disabled={updateMutation.isPending}
                        onClick={() => {
                          updateMutation.mutate(editFormState);
                        }}
                        type='button'
                      >
                        {updateMutation.isPending ? '저장 중...' : '문제영역 수정 저장'}
                      </Button>
                      <Button
                        disabled={reorderMutation.isPending || selectedSiblingIndex <= 0}
                        onClick={() => {
                          reorderMutation.mutate('up');
                        }}
                        type='button'
                        variant='secondary'
                      >
                        위로 이동
                      </Button>
                      <Button
                        disabled={
                          reorderMutation.isPending ||
                          selectedSiblingIndex < 0 ||
                          selectedSiblingIndex >= selectedSiblingAreas.length - 1
                        }
                        onClick={() => {
                          reorderMutation.mutate('down');
                        }}
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
                        type='button'
                        variant='danger'
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={menuStyles['inlineState']}>수정할 문제영역을 선택해 주세요.</div>
              )}
            </article>
          ) : isCreateTab ? (
            <article className={menuStyles['detailCard']}>
              <div className={menuStyles['cardHeader']}>
                <h3 className={menuStyles['cardTitle']}>{createAreaKindLabel} 추가</h3>
              </div>

              <div className={menuStyles['selectionSummaryRow']}>
                <p className={menuStyles['selectionSummaryLabel']}>생성 위치</p>
                <div className={menuStyles['selectionSummaryValueInline']}>
                  <AdminHierarchyPath path={createPositionLabel} />
                </div>
              </div>

              <div className={menuStyles['createFormGrid']}>
                <TextField
                  label={`${createAreaKindLabel}명`}
                  name='problem-area-create-name'
                  onChange={(event) => {
                    setCreateFormState((current) => ({ ...current, name: event.target.value }));
                  }}
                  value={createFormState.name}
                />
                <TextAreaField
                  label='설명'
                  name='problem-area-create-description'
                  onChange={(event) => {
                    setCreateFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  rows={3}
                  value={createFormState.description}
                />
              </div>

              <div className={menuStyles['formActions']}>
                <div className={menuStyles['actionRow']}>
                  <Button
                    disabled={createMutation.isPending}
                    onClick={() => {
                      createMutation.mutate(createFormState);
                    }}
                    type='button'
                  >
                    {createMutation.isPending ? '저장 중...' : `${createAreaKindLabel} 저장`}
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
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default AdminProblemAreasSection;
