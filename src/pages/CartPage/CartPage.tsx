import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { applyMyCartCoupon, clearMyCartCoupon, removeMyCartItem } from '@/api/mypage';
import downIconSrc from '@/assets/icons/icons_down.png';
import {
  myCartQueryKey,
  myCouponsQueryKey,
  useMyCartQuery,
  useMyCouponsQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import { calculateSelectedCartPricing, evaluateCouponForItems } from '@/utils/cartPricing';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';
import { classNames } from '@/utils/classNames';
import { getProgramTypeLabel } from '@/utils/programType';

import styles from './CartPage.module.scss';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const CartPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const couponDropdownRef = useRef<HTMLDivElement | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const cartScope = resolveCartQueryScope(isAuthenticated);
  const showToast = useToastStore((state) => state.showToast);
  const [isCouponDropdownOpen, setIsCouponDropdownOpen] = useState(false);
  const selectedItemIds = useCartSelectionStore((state) => state.selectedItemIds);
  const selectedCouponId = useCartSelectionStore((state) => state.selectedCouponId);
  const hydrateSelection = useCartSelectionStore((state) => state.hydrate);
  const setSelectedCouponId = useCartSelectionStore((state) => state.setSelectedCouponId);
  const toggleAllItems = useCartSelectionStore((state) => state.toggleAllItems);
  const toggleItem = useCartSelectionStore((state) => state.toggleItem);
  const cartQuery = useMyCartQuery();
  const couponsQuery = useMyCouponsQuery();

  const cart = cartQuery.data;
  const coupons = couponsQuery.data;
  const isEmpty = !cart?.items.length;
  const pricing = calculateSelectedCartPricing(
    cart,
    selectedItemIds,
    coupons ?? [],
    selectedCouponId,
  );
  const couponOptions = useMemo(() => {
    return (coupons ?? []).map((coupon) => {
      const evaluation = evaluateCouponForItems(coupon, pricing.selectedItems);
      const discountText =
        coupon.discountType === 'PERCENTAGE'
          ? `${String(coupon.discountValue)}%`
          : formatCurrency(coupon.discountValue);

      return {
        coupon,
        discountText,
        evaluation,
      };
    });
  }, [coupons, pricing.selectedItems]);
  const selectedCouponOption =
    couponOptions.find((option) => option.coupon.id === selectedCouponId) ?? null;
  const areAllItemsSelected =
    (cart?.items.length ?? 0) > 0 &&
    (cart?.items ?? []).every((item) => selectedItemIds.includes(item.id));

  useEffect(() => {
    if (!cart) {
      return;
    }

    hydrateSelection(cart, coupons ?? []);
  }, [cart, coupons, hydrateSelection]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!couponDropdownRef.current?.contains(event.target as Node)) {
        setIsCouponDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCouponDropdownOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const removeCartItemMutation = useMutation({
    mutationFn: removeMyCartItem,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '장바구니에서 제거하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myCartQueryKey(cartScope) }),
        queryClient.invalidateQueries({ queryKey: myCouponsQueryKey(cartScope) }),
      ]);
      showToast({
        message: '장바구니에서 제거했습니다.',
        variant: 'success',
      });
    },
  });

  const applyCouponMutation = useMutation({
    mutationFn: async (couponCode: string | null) => {
      if (couponCode) {
        return applyMyCartCoupon(couponCode);
      }
      return clearMyCartCoupon();
    },
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '쿠폰 적용을 변경하지 못했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: async (nextCart, couponCode) => {
      queryClient.setQueryData(myCartQueryKey(cartScope), nextCart);
      setSelectedCouponId(nextCart.appliedCoupon?.id ?? null);
      setIsCouponDropdownOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myCartQueryKey(cartScope) }),
        queryClient.invalidateQueries({ queryKey: myCouponsQueryKey(cartScope) }),
      ]);
      showToast({
        message: couponCode ? '쿠폰을 적용했습니다.' : '쿠폰 적용을 해제했습니다.',
        variant: 'success',
      });
    },
  });

  const handleSelectCoupon = (couponCode: string | null, couponId: number | null) => {
    if (!isAuthenticated) {
      setSelectedCouponId(couponId);
      setIsCouponDropdownOpen(false);
      return;
    }

    applyCouponMutation.mutate(couponCode);
  };

  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>장바구니</h1>
            <p className={sharedStyles['description']}>
              담은 항목을 선택하고 쿠폰을 적용해 결제 금액을 바로 확인합니다.
            </p>
          </header>

          {cartQuery.isLoading ? (
            <p className={sharedStyles['mutedText']}>장바구니를 불러오는 중입니다.</p>
          ) : null}

          {cartQuery.isError ? (
            <p className={styles['errorText']}>
              {cartQuery.error instanceof Error
                ? cartQuery.error.message
                : '장바구니를 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && isEmpty ? (
            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>담긴 강의가 없습니다.</h2>
              </div>
              <div className={styles['actionRow']}>
                <Link className={styles['secondaryActionLink']} to={routePaths.programs}>
                  강의 둘러보기
                </Link>
              </div>
            </section>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && cart ? (
            <div className={styles['layout']}>
              <section className={sharedStyles['section']}>
                <div className={sharedStyles['sectionHeader']}>
                  <h2 className={sharedStyles['sectionTitle']}>담은 강의</h2>
                </div>

                <label className={styles['selectAllRow']}>
                  <input
                    checked={areAllItemsSelected}
                    onChange={() => {
                      toggleAllItems(cart.items.map((item) => item.id));
                    }}
                    type='checkbox'
                  />
                  <span>전체 선택</span>
                </label>

                <div className={styles['itemList']}>
                  {cart.items.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);

                    return (
                      <article className={styles['itemCard']} key={item.id}>
                        <label className={styles['itemCheckboxLabel']}>
                          <input
                            aria-label={`${item.title} 선택`}
                            checked={isSelected}
                            onChange={() => {
                              toggleItem(item.id);
                            }}
                            type='checkbox'
                          />
                        </label>
                        <Link className={styles['itemThumbnailLink']} to={item.detailPath}>
                          {item.thumbnailUrl ? (
                            <img
                              alt={`${item.title} 대표 이미지`}
                              className={styles['itemThumbnailImage']}
                              loading='lazy'
                              src={item.thumbnailUrl}
                            />
                          ) : (
                            <div aria-hidden='true' className={styles['itemThumbnailFallback']}>
                              <span>SS</span>
                            </div>
                          )}
                        </Link>
                        <div className={styles['itemBody']}>
                          <div className={styles['itemHeader']}>
                            <Link className={styles['itemTitleLink']} to={item.detailPath}>
                              <strong className={styles['itemTitle']}>{item.title}</strong>
                            </Link>
                            <div className={styles['itemHeaderActions']}>
                              <span className={styles['itemTypeChip']}>
                                {getProgramTypeLabel(item.programType)}
                              </span>
                              <button
                                className={styles['removeButton']}
                                disabled={removeCartItemMutation.isPending}
                                onClick={() => {
                                  removeCartItemMutation.mutate(item.id);
                                }}
                                type='button'
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                          <div className={styles['itemFooter']}>
                            <p className={styles['itemMeta']}>강사 {item.instructorName || '-'}</p>
                            <p className={styles['itemPrice']}>
                              {formatCurrency(item.payablePrice)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <aside className={styles['summaryPanel']}>
                <section className={sharedStyles['section']}>
                  <div className={sharedStyles['sectionHeader']}>
                    <h2 className={sharedStyles['sectionTitle']}>선택 합계</h2>
                  </div>
                  <div className={sharedStyles['metaList']}>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>선택 상품 수</span>
                      <span className={sharedStyles['metaValue']}>{pricing.itemCount}개</span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>상품 금액</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(pricing.totalOriginalPrice)}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>강의 할인</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(pricing.itemDiscountAmount)}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>쿠폰 할인</span>
                      <div className={styles['couponDiscountRow']}>
                        <span className={sharedStyles['metaValue']}>
                          {formatCurrency(pricing.couponDiscountAmount)}
                        </span>
                        {!couponsQuery.isLoading && !couponsQuery.isError ? (
                          <div className={styles['couponDropdown']} ref={couponDropdownRef}>
                            <button
                              aria-label='쿠폰 선택'
                              aria-expanded={isCouponDropdownOpen}
                              aria-haspopup='listbox'
                              className={styles['couponDropdownTrigger']}
                              disabled={applyCouponMutation.isPending}
                              onClick={() => {
                                setIsCouponDropdownOpen((current) => !current);
                              }}
                              type='button'
                            >
                              <span className={styles['couponDropdownLabel']}>
                                {selectedCouponOption?.coupon.name ?? '쿠폰 선택'}
                              </span>
                              <span className={styles['couponDropdownCaret']}>
                                <img
                                  alt=''
                                  aria-hidden='true'
                                  className={styles['couponDropdownCaretIcon']}
                                  src={downIconSrc}
                                />
                              </span>
                            </button>

                            {isCouponDropdownOpen ? (
                              <div
                                aria-label='쿠폰 목록'
                                className={styles['couponDropdownMenu']}
                                role='listbox'
                              >
                                <button
                                  aria-selected={selectedCouponId === null}
                                  className={classNames(
                                    styles['couponDropdownOption'],
                                    selectedCouponId === null &&
                                      styles['couponDropdownOptionSelected'],
                                  )}
                                  onClick={() => {
                                    handleSelectCoupon(null, null);
                                  }}
                                  role='option'
                                  type='button'
                                >
                                  <span className={styles['couponDropdownOptionTitle']}>
                                    쿠폰 적용 안 함
                                  </span>
                                </button>

                                {couponOptions.map((option) => (
                                  <button
                                    aria-selected={selectedCouponId === option.coupon.id}
                                    className={classNames(
                                      styles['couponDropdownOption'],
                                      selectedCouponId === option.coupon.id &&
                                        styles['couponDropdownOptionSelected'],
                                      !option.evaluation.isApplicable &&
                                        styles['couponDropdownOptionDisabled'],
                                    )}
                                    disabled={!option.evaluation.isApplicable}
                                    key={option.coupon.id}
                                    onClick={() => {
                                      handleSelectCoupon(option.coupon.code, option.coupon.id);
                                    }}
                                    role='option'
                                    type='button'
                                  >
                                    <div className={styles['couponDropdownOptionHeader']}>
                                      <span className={styles['couponDropdownOptionTitle']}>
                                        {option.coupon.name}
                                      </span>
                                      <span className={styles['couponDropdownOptionValue']}>
                                        {option.discountText}
                                      </span>
                                    </div>
                                    {option.evaluation.reason ? (
                                      <span className={styles['couponDropdownOptionMeta']}>
                                        {option.evaluation.reason}
                                      </span>
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className={styles['couponHintRow']}>
                        {couponsQuery.isLoading ? (
                          <p className={styles['couponInlineText']}>
                            쿠폰 목록을 불러오는 중입니다.
                          </p>
                        ) : null}

                        {couponsQuery.isError ? (
                          <p className={styles['couponInlineText']}>
                            {couponsQuery.error instanceof Error
                              ? couponsQuery.error.message
                              : '쿠폰 목록을 불러오지 못했습니다.'}
                          </p>
                        ) : null}

                        {!couponsQuery.isLoading && !couponsQuery.isError ? (
                          <p className={styles['couponInlineText']}>
                            {isAuthenticated
                              ? '쿠폰 선택 시 서버 장바구니에 실제로 적용됩니다.'
                              : '쿠폰은 로그인 후 서버 장바구니에서 적용할 수 있습니다.'}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>총 결제 금액</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(pricing.totalPayablePrice)}
                      </span>
                    </div>
                  </div>

                  <div className={styles['actionRow']}>
                    <Link className={styles['secondaryActionLink']} to={routePaths.programs}>
                      강의 더 담기
                    </Link>
                    <button
                      className={styles['primaryActionButton']}
                      disabled={pricing.itemCount === 0}
                      onClick={() => {
                        if (!pricing.itemCount) {
                          return;
                        }

                        void navigate(routePaths.checkout);
                      }}
                      type='button'
                    >
                      결제하기
                    </button>
                  </div>

                  {!pricing.itemCount ? (
                    <p className={sharedStyles['mutedText']}>결제할 항목을 먼저 선택해 주세요.</p>
                  ) : null}

                  {!isAuthenticated ? (
                    <p className={sharedStyles['mutedText']}>
                      결제 단계에서는 로그인 확인 후 진행됩니다.
                    </p>
                  ) : null}
                </section>
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CartPage;
