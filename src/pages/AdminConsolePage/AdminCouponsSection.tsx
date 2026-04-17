import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  activateAdminCoupon,
  createAdminCoupon,
  deactivateAdminCoupon,
  updateAdminCoupon,
} from '@/api/adminCoupons';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { adminCouponsQueryKey, useAdminCouponsQuery } from '@/query/useAdminCouponsQuery';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminCoupon,
  AdminCouponCreatePayload,
  AdminCouponDiscountType,
  AdminCouponUpdatePayload,
} from '@/types/adminCoupons';

import styles from './AdminConsolePage.module.scss';

interface CouponFormState {
  code: string;
  discountType: AdminCouponDiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  name: string;
  validFrom: string;
  validUntil: string;
}

type EditorTab = 'create' | 'edit';

const COUPONS_PAGE_SIZE = 8;

const EMPTY_FORM: CouponFormState = {
  code: '',
  discountType: 'FIXED_AMOUNT',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  name: '',
  validFrom: '',
  validUntil: '',
};

const discountTypeOptions = [
  { label: '정액 할인', value: 'FIXED_AMOUNT' },
  { label: '정률 할인', value: 'PERCENTAGE' },
] as const;

const discountTypeLabelByValue: Record<AdminCouponDiscountType, string> = {
  FIXED_AMOUNT: '정액 할인',
  PERCENTAGE: '정률 할인',
};

const formatCurrency = (value: number | null): string => {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('ko-KR').format(value);
};

const formatDateRange = (coupon: AdminCoupon): string => {
  if (!coupon.validFrom && !coupon.validUntil) {
    return '기간 제한 없음';
  }

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const validFrom = coupon.validFrom ? formatter.format(new Date(coupon.validFrom)) : '즉시';
  const validUntil = coupon.validUntil
    ? formatter.format(new Date(coupon.validUntil))
    : '제한 없음';

  return `${validFrom} ~ ${validUntil}`;
};

const formatDateTimeInputValue = (value: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${String(year)}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const createFormState = (coupon?: AdminCoupon | null): CouponFormState => {
  if (!coupon) {
    return EMPTY_FORM;
  }

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    maxDiscountAmount: coupon.maxDiscountAmount === null ? '' : String(coupon.maxDiscountAmount),
    minOrderAmount: coupon.minOrderAmount === null ? '' : String(coupon.minOrderAmount),
    name: coupon.name,
    validFrom: formatDateTimeInputValue(coupon.validFrom),
    validUntil: formatDateTimeInputValue(coupon.validUntil),
  };
};

const validateForm = (formState: CouponFormState, editorTab: EditorTab): string | null => {
  if (editorTab === 'create' && !formState.code.trim()) {
    return '쿠폰 코드를 입력해 주세요.';
  }

  if (!formState.name.trim()) {
    return '쿠폰명을 입력해 주세요.';
  }

  if (!formState.discountValue.trim() || Number.isNaN(Number(formState.discountValue))) {
    return '할인값을 숫자로 입력해 주세요.';
  }

  if (Number(formState.discountValue) < 1) {
    return '할인값은 1 이상이어야 합니다.';
  }

  if (formState.minOrderAmount.trim()) {
    const minOrderAmount = Number(formState.minOrderAmount);

    if (Number.isNaN(minOrderAmount) || minOrderAmount < 0) {
      return '최소 주문 금액은 0 이상의 숫자로 입력해 주세요.';
    }
  }

  if (formState.maxDiscountAmount.trim()) {
    const maxDiscountAmount = Number(formState.maxDiscountAmount);

    if (Number.isNaN(maxDiscountAmount) || maxDiscountAmount < 1) {
      return '최대 할인 금액은 1 이상의 숫자로 입력해 주세요.';
    }
  }

  const validFrom = toIsoStringOrNull(formState.validFrom);
  const validUntil = toIsoStringOrNull(formState.validUntil);

  if (formState.validFrom.trim() && validFrom === null) {
    return '사용 시작 일시를 확인해 주세요.';
  }

  if (formState.validUntil.trim() && validUntil === null) {
    return '사용 종료 일시를 확인해 주세요.';
  }

  if (validFrom && validUntil && new Date(validFrom) > new Date(validUntil)) {
    return '사용 시작 일시는 사용 종료 일시보다 늦을 수 없습니다.';
  }

  return null;
};

const toCreatePayload = (formState: CouponFormState): AdminCouponCreatePayload => {
  return {
    code: formState.code.trim(),
    discountType: formState.discountType,
    discountValue: Number(formState.discountValue),
    maxDiscountAmount: formState.maxDiscountAmount.trim()
      ? Number(formState.maxDiscountAmount)
      : null,
    minOrderAmount: formState.minOrderAmount.trim() ? Number(formState.minOrderAmount) : null,
    name: formState.name.trim(),
    validFrom: toIsoStringOrNull(formState.validFrom),
    validUntil: toIsoStringOrNull(formState.validUntil),
  };
};

const toUpdatePayload = (formState: CouponFormState): AdminCouponUpdatePayload => {
  return {
    discountType: formState.discountType,
    discountValue: Number(formState.discountValue),
    maxDiscountAmount: formState.maxDiscountAmount.trim()
      ? Number(formState.maxDiscountAmount)
      : null,
    minOrderAmount: formState.minOrderAmount.trim() ? Number(formState.minOrderAmount) : null,
    name: formState.name.trim(),
    validFrom: toIsoStringOrNull(formState.validFrom),
    validUntil: toIsoStringOrNull(formState.validUntil),
  };
};

const AdminCouponsSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const couponsQuery = useAdminCouponsQuery();
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('create');
  const [formState, setFormState] = useState<CouponFormState>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());

  const coupons = useMemo(() => couponsQuery.data ?? [], [couponsQuery.data]);
  const filteredCoupons = useMemo(() => {
    if (!deferredSearchTerm) {
      return coupons;
    }

    return coupons.filter((coupon) => {
      const discountTypeLabel = discountTypeLabelByValue[coupon.discountType].toLowerCase();
      return [coupon.code, coupon.name, discountTypeLabel].some((value) =>
        value.toLowerCase().includes(deferredSearchTerm),
      );
    });
  }, [coupons, deferredSearchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / COUPONS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedCoupons = filteredCoupons.slice(
    (safeCurrentPage - 1) * COUPONS_PAGE_SIZE,
    safeCurrentPage * COUPONS_PAGE_SIZE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const refreshCoupons = async () => {
    await queryClient.invalidateQueries({ queryKey: adminCouponsQueryKey() });
  };

  const resetCreateForm = () => {
    setEditingCouponId(null);
    setEditorTab('create');
    setFormState(EMPTY_FORM);
  };

  const openEditTab = (coupon: AdminCoupon) => {
    setEditingCouponId(coupon.id);
    setEditorTab('edit');
    setFormState(createFormState(coupon));
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminCouponCreatePayload) => createAdminCoupon(payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '쿠폰을 등록하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshCoupons();
      resetCreateForm();
      showToast({
        message: '쿠폰을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ couponId, payload }: { couponId: number; payload: AdminCouponUpdatePayload }) =>
      updateAdminCoupon(couponId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '쿠폰을 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (updatedCoupon) => {
      await refreshCoupons();
      setEditingCouponId(updatedCoupon.id);
      setEditorTab('edit');
      setFormState(createFormState(updatedCoupon));
      showToast({
        message: '쿠폰을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ active, couponId }: { active: boolean; couponId: number }) => {
      if (active) {
        return deactivateAdminCoupon(couponId);
      }

      return activateAdminCoupon(couponId);
    },
    onError: (error: unknown, variables) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : variables.active
              ? '쿠폰을 비활성화하지 못했습니다.'
              : '쿠폰을 활성화하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (updatedCoupon, variables) => {
      await refreshCoupons();
      if (editingCouponId === updatedCoupon.id) {
        setFormState(createFormState(updatedCoupon));
      }
      showToast({
        message: variables.active ? '쿠폰을 비활성화했습니다.' : '쿠폰을 활성화했습니다.',
        variant: 'success',
      });
    },
  });

  const handleSubmit = () => {
    const validationMessage = validateForm(formState, editorTab);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    if (editorTab === 'edit' && editingCouponId !== null) {
      updateMutation.mutate({
        couponId: editingCouponId,
        payload: toUpdatePayload(formState),
      });
      return;
    }

    createMutation.mutate(toCreatePayload(formState));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <section className={styles['workspace']}>
      <div className={styles['stackList']}>
        <section className={styles['panelWide']}>
          <div className={styles['panelToolbar']}>
            <div>
              <h2 className={styles['panelTitle']}>쿠폰 목록</h2>
              <p className={styles['metaText']}>총 {filteredCoupons.length}개</p>
            </div>

            <UnifiedSearchBar
              className={styles['adminSearchBar']}
              inputAriaLabel='쿠폰 검색'
              onChange={handleSearchChange}
              onSubmit={() => undefined}
              placeholder='쿠폰명, 쿠폰 코드, 할인 방식 검색'
              value={searchTerm}
            />
          </div>

          {couponsQuery.isPending ? (
            <p className={styles['helperText']}>쿠폰 목록을 불러오는 중입니다.</p>
          ) : null}

          {couponsQuery.isError ? (
            <p className={styles['helperText']}>
              {couponsQuery.error instanceof Error
                ? couponsQuery.error.message
                : '쿠폰 목록을 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!couponsQuery.isPending && !couponsQuery.isError ? (
            <>
              <div className={styles['tableWrap']}>
                <table className={`${styles['table']} ${styles['couponTable']}`}>
                  <thead>
                    <tr>
                      <th scope='col'>쿠폰명</th>
                      <th scope='col'>쿠폰 코드</th>
                      <th scope='col'>할인</th>
                      <th scope='col'>사용 조건</th>
                      <th scope='col'>사용 기간</th>
                      <th scope='col'>상태</th>
                      <th scope='col'>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCoupons.length > 0 ? (
                      pagedCoupons.map((coupon) => {
                        const isSelected = coupon.id === editingCouponId && editorTab === 'edit';

                        return (
                          <tr
                            className={isSelected ? styles['tagTableRowSelected'] : undefined}
                            key={coupon.id}
                          >
                            <td>
                              <button
                                className={styles['tagNameButton']}
                                onClick={() => {
                                  openEditTab(coupon);
                                }}
                                type='button'
                              >
                                {coupon.name}
                              </button>
                            </td>
                            <td>
                              <span className={styles['badge']}>{coupon.code}</span>
                            </td>
                            <td>
                              <div className={styles['cellStack']}>
                                <span className={styles['cellPrimary']}>
                                  {discountTypeLabelByValue[coupon.discountType]}
                                </span>
                                <span className={styles['cellSecondary']}>
                                  {coupon.discountType === 'PERCENTAGE'
                                    ? `${String(coupon.discountValue)}%`
                                    : `${formatCurrency(coupon.discountValue)}원`}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className={styles['cellStack']}>
                                <span className={styles['cellSecondary']}>
                                  최소 주문 {formatCurrency(coupon.minOrderAmount)}원
                                </span>
                                <span className={styles['cellSecondary']}>
                                  최대 할인 {formatCurrency(coupon.maxDiscountAmount)}원
                                </span>
                              </div>
                            </td>
                            <td>{formatDateRange(coupon)}</td>
                            <td>
                              <span
                                className={
                                  coupon.active ? styles['badgeSuccess'] : styles['badgeDanger']
                                }
                              >
                                {coupon.active ? '활성' : '비활성'}
                              </span>
                            </td>
                            <td>
                              <div className={styles['tableActionGroup']}>
                                <button
                                  className={styles['tableActionButton']}
                                  onClick={() => {
                                    openEditTab(coupon);
                                  }}
                                  type='button'
                                >
                                  수정
                                </button>
                                <button
                                  className={styles['tableActionButton']}
                                  onClick={() => {
                                    toggleMutation.mutate({
                                      active: coupon.active,
                                      couponId: coupon.id,
                                    });
                                  }}
                                  type='button'
                                >
                                  {coupon.active ? '비활성화' : '활성화'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          <p className={styles['helperText']}>검색 조건에 맞는 쿠폰이 없습니다.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles['paginationBar']}>
                <button
                  aria-label='이전 페이지'
                  className={styles['paginationArrowButton']}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => {
                    setCurrentPage((current) => Math.max(1, current - 1));
                  }}
                  type='button'
                >
                  <span className={`${styles['paginationArrow']} ${styles['paginationArrowPrev']}`}>
                    ‹
                  </span>
                </button>

                <div className={styles['paginationNumbers']}>
                  {pageNumbers.map((pageNumber) => {
                    if (pageNumber === safeCurrentPage) {
                      return (
                        <span className={styles['paginationButtonActive']} key={pageNumber}>
                          {pageNumber}
                        </span>
                      );
                    }

                    return (
                      <button
                        className={styles['paginationButton']}
                        key={pageNumber}
                        onClick={() => {
                          setCurrentPage(pageNumber);
                        }}
                        type='button'
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  aria-label='다음 페이지'
                  className={styles['paginationArrowButton']}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => {
                    setCurrentPage((current) => Math.min(totalPages, current + 1));
                  }}
                  type='button'
                >
                  <span className={styles['paginationArrow']}>›</span>
                </button>
              </div>
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
              새 쿠폰 등록
            </button>
            <button
              className={editorTab === 'edit' ? styles['editorTabActive'] : styles['editorTab']}
              disabled={editingCouponId === null}
              onClick={() => {
                setEditorTab('edit');
              }}
              type='button'
            >
              {editingCouponId === null ? '쿠폰 수정' : `${formState.name || '선택한 쿠폰'} 수정`}
            </button>
          </div>

          <div className={styles['editorTabBody']}>
            <div className={styles['formGrid']}>
              <TextField
                disabled={editorTab === 'edit'}
                label='쿠폰 코드'
                name='coupon-code'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    code: event.target.value,
                  }));
                }}
                value={formState.code}
              />
              <TextField
                label='쿠폰명'
                name='coupon-name'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }));
                }}
                value={formState.name}
              />
              <AdminDropdownField
                label='할인 방식'
                onChange={(nextValue) => {
                  setFormState((current) => ({
                    ...current,
                    discountType: nextValue as AdminCouponDiscountType,
                  }));
                }}
                options={discountTypeOptions}
                value={formState.discountType}
              />
              <TextField
                label={formState.discountType === 'PERCENTAGE' ? '할인 비율(%)' : '할인 금액(원)'}
                name='coupon-discount-value'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    discountValue: event.target.value,
                  }));
                }}
                value={formState.discountValue}
              />
              <TextField
                label='최소 주문 금액(원)'
                name='coupon-min-order-amount'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    minOrderAmount: event.target.value,
                  }));
                }}
                value={formState.minOrderAmount}
              />
              <TextField
                label='최대 할인 금액(원)'
                name='coupon-max-discount-amount'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    maxDiscountAmount: event.target.value,
                  }));
                }}
                value={formState.maxDiscountAmount}
              />
              <TextField
                label='사용 시작 일시'
                name='coupon-valid-from'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    validFrom: event.target.value,
                  }));
                }}
                type='datetime-local'
                value={formState.validFrom}
              />
              <TextField
                label='사용 종료 일시'
                name='coupon-valid-until'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    validUntil: event.target.value,
                  }));
                }}
                type='datetime-local'
                value={formState.validUntil}
              />
            </div>

            {editorTab === 'edit' ? (
              <p className={styles['helperText']}>쿠폰 코드는 등록 후 변경할 수 없습니다.</p>
            ) : null}

            <div className={styles['actionRow']}>
              <Button disabled={isSubmitting} onClick={handleSubmit} type='button'>
                {isSubmitting
                  ? '저장 중...'
                  : editorTab === 'edit'
                    ? '쿠폰 수정 저장'
                    : '새 쿠폰 등록'}
              </Button>
              <Button
                onClick={() => {
                  if (editorTab === 'edit' && editingCouponId !== null) {
                    const editingCoupon =
                      coupons.find((coupon) => coupon.id === editingCouponId) ?? null;
                    setFormState(createFormState(editingCoupon));
                    return;
                  }

                  setFormState(EMPTY_FORM);
                }}
                type='button'
                variant='secondary'
              >
                입력 초기화
              </Button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AdminCouponsSection;
