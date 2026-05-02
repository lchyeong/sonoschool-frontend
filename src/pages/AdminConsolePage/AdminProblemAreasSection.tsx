import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminProblemArea,
  deleteAdminProblemArea,
  updateAdminProblemArea,
} from '@/api/adminProblemAreas';
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

interface ProblemAreaFormState {
  active: boolean;
  description: string;
  name: string;
  sortOrder: string;
}

const INITIAL_FORM_STATE: ProblemAreaFormState = {
  active: true,
  description: '',
  name: '',
  sortOrder: '0',
};

const toFormState = (area: AdminProblemArea | null): ProblemAreaFormState => {
  if (!area) {
    return INITIAL_FORM_STATE;
  }

  return {
    active: area.active,
    description: area.description ?? '',
    name: area.name,
    sortOrder: String(area.sortOrder),
  };
};

const parseSortOrder = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
};

const AdminProblemAreasSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const areasQuery = useAdminProblemAreasQuery(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [createFormState, setCreateFormState] = useState<ProblemAreaFormState>(INITIAL_FORM_STATE);
  const [editDraftState, setEditDraftState] = useState<ProblemAreaFormState | null>(null);

  const areas = useMemo(() => {
    return [...(areasQuery.data ?? [])].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.id - right.id;
    });
  }, [areasQuery.data]);
  const selectedArea =
    selectedAreaId !== null ? (areas.find((area) => area.id === selectedAreaId) ?? null) : null;
  const editFormState = editDraftState ?? toFormState(selectedArea);

  const invalidateAreas = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProblemAreasQueryKey(false) }),
      queryClient.invalidateQueries({ queryKey: adminProblemAreasQueryKey(true) }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (state: ProblemAreaFormState) => {
      const name = state.name.trim();
      if (!name) {
        throw new Error('문제 영역명을 입력해 주세요.');
      }

      return createAdminProblemArea({
        description: state.description,
        name,
        sortOrder: parseSortOrder(state.sortOrder),
      });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 영역을 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (area) => {
      await invalidateAreas();
      setSelectedAreaId(area.id);
      setCreateFormState(INITIAL_FORM_STATE);
      setEditDraftState(null);
      showToast({ message: '문제 영역을 추가했습니다.', variant: 'success' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (state: ProblemAreaFormState) => {
      if (!selectedArea) {
        throw new Error('수정할 문제 영역을 선택해 주세요.');
      }

      const name = state.name.trim();
      if (!name) {
        throw new Error('문제 영역명을 입력해 주세요.');
      }

      return updateAdminProblemArea(selectedArea.id, {
        active: state.active,
        description: state.description,
        name,
        sortOrder: parseSortOrder(state.sortOrder),
      });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 영역을 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (area) => {
      await invalidateAreas();
      setSelectedAreaId(area.id);
      setEditDraftState(null);
      showToast({ message: '문제 영역을 수정했습니다.', variant: 'success' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedArea) {
        throw new Error('삭제할 문제 영역을 선택해 주세요.');
      }
      await deleteAdminProblemArea(selectedArea.id);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제 영역을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateAreas();
      setSelectedAreaId(null);
      setEditDraftState(null);
      showToast({ message: '문제 영역을 삭제했습니다.', variant: 'success' });
    },
  });

  return (
    <section className={styles['workspace']}>
      <div className={styles['panelToolbar']}>
        <div>
          <h2 className={styles['panelTitle']}>문제 영역 관리</h2>
          <p className={styles['metaText']}>
            문제 문항에 연결할 영역을 생성하고 노출 여부를 관리합니다.
          </p>
        </div>
      </div>

      <div className={styles['contentGrid']}>
        <section className={styles['panel']}>
          <div className={styles['panelToolbar']}>
            <div>
              <h3 className={styles['itemTitle']}>영역 목록</h3>
              <p className={styles['metaText']}>정렬 순서가 낮을수록 먼저 표시됩니다.</p>
            </div>
          </div>

          {areasQuery.isPending ? <p className={styles['helperText']}>불러오는 중입니다.</p> : null}
          {areasQuery.isError ? (
            <p className={styles['helperText']}>
              {areasQuery.error instanceof Error
                ? areasQuery.error.message
                : '문제 영역을 불러오지 못했습니다.'}
            </p>
          ) : null}
          {!areasQuery.isPending && !areasQuery.isError ? (
            areas.length ? (
              <div className={styles['tableWrap']}>
                <table className={styles['table']}>
                  <thead>
                    <tr>
                      <th scope='col'>영역명</th>
                      <th scope='col'>설명</th>
                      <th scope='col'>정렬</th>
                      <th scope='col'>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areas.map((area) => (
                      <tr
                        className={classNames(
                          selectedArea?.id === area.id && styles['selectedTableRow'],
                        )}
                        key={area.id}
                        onClick={() => {
                          setSelectedAreaId(area.id);
                          setEditDraftState(null);
                        }}
                      >
                        <td>
                          <strong className={styles['cellPrimary']}>{area.name}</strong>
                        </td>
                        <td>{area.description || '-'}</td>
                        <td>{String(area.sortOrder)}</td>
                        <td>
                          <span className={area.active ? styles['badgeSuccess'] : styles['badge']}>
                            {area.active ? '사용' : '비활성'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles['helperText']}>등록된 문제 영역이 없습니다.</p>
            )
          ) : null}
        </section>

        <section className={styles['panel']}>
          <div className={styles['panelToolbar']}>
            <div>
              <h3 className={styles['itemTitle']}>새 영역 추가</h3>
            </div>
          </div>
          <div className={styles['stackList']}>
            <TextField
              label='영역명'
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
            <TextField
              label='정렬 순서'
              name='problem-area-create-sort-order'
              onChange={(event) => {
                setCreateFormState((current) => ({ ...current, sortOrder: event.target.value }));
              }}
              value={createFormState.sortOrder}
            />
            <div className={styles['actionRow']}>
              <Button
                disabled={createMutation.isPending}
                onClick={() => {
                  createMutation.mutate(createFormState);
                }}
                type='button'
              >
                {createMutation.isPending ? '저장 중...' : '새 영역 저장'}
              </Button>
            </div>
          </div>
        </section>

        <section className={classNames(styles['panel'], styles['panelWide'])}>
          <div className={styles['panelToolbar']}>
            <div>
              <h3 className={styles['itemTitle']}>선택 영역 수정</h3>
              <p className={styles['metaText']}>이미 문항에 사용 중인 영역은 삭제가 제한됩니다.</p>
            </div>
          </div>

          {selectedArea ? (
            <div className={styles['stackList']}>
              <div className={styles['compactFieldRow']}>
                <div className={styles['compactTextField']}>
                  <TextField
                    label='영역명'
                    name='problem-area-edit-name'
                    onChange={(event) => {
                      setEditDraftState((current) => ({
                        ...(current ?? toFormState(selectedArea)),
                        name: event.target.value,
                      }));
                    }}
                    value={editFormState.name}
                  />
                </div>
                <div className={styles['compactTextField']}>
                  <TextField
                    label='정렬 순서'
                    name='problem-area-edit-sort-order'
                    onChange={(event) => {
                      setEditDraftState((current) => ({
                        ...(current ?? toFormState(selectedArea)),
                        sortOrder: event.target.value,
                      }));
                    }}
                    value={editFormState.sortOrder}
                  />
                </div>
              </div>
              <TextAreaField
                label='설명'
                name='problem-area-edit-description'
                onChange={(event) => {
                  setEditDraftState((current) => ({
                    ...(current ?? toFormState(selectedArea)),
                    description: event.target.value,
                  }));
                }}
                rows={3}
                value={editFormState.description}
              />
              <label className={styles['checkboxRow']}>
                <input
                  checked={editFormState.active}
                  onChange={(event) => {
                    setEditDraftState((current) => ({
                      ...(current ?? toFormState(selectedArea)),
                      active: event.target.checked,
                    }));
                  }}
                  type='checkbox'
                />
                사용 중
              </label>
              <div className={styles['actionRow']}>
                <Button
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    updateMutation.mutate(editFormState);
                  }}
                  type='button'
                >
                  {updateMutation.isPending ? '저장 중...' : '수정 저장'}
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
          ) : (
            <p className={styles['helperText']}>수정할 문제 영역을 선택해 주세요.</p>
          )}
        </section>
      </div>
    </section>
  );
};

export default AdminProblemAreasSection;
