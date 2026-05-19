import { useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { removeMyCartItem } from '@/api/mypage';
import checkIconSrc from '@/assets/icons/lucide_check_white_20.svg';
import removeIconSrc from '@/assets/icons/lucide_x.svg';
import { myCartQueryKey, useMyCartQuery } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import { calculateSelectedCartPricing } from '@/utils/cartPricing';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';
import { classNames } from '@/utils/classNames';
import { getProgramImageCropStyle } from '@/utils/programImageCrop';
import { getProgramTypeLabel } from '@/utils/programType';

import styles from './CartPage.module.scss';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const formatCartDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(year)}.${month}.${day}`;
};

const getCoursePeriodLabel = (saleStartAt: string | null, saleEndAt: string | null) => {
  const start = formatCartDate(saleStartAt);
  const end = formatCartDate(saleEndAt);

  if (start && end) {
    return `${start}~${end}`;
  }

  return '상시수강';
};

const getDiscountRate = (originalPrice: number, payablePrice: number) => {
  if (originalPrice <= 0 || payablePrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - payablePrice) / originalPrice) * 100);
};

const CartPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const cartScope = resolveCartQueryScope(isAuthenticated);
  const showToast = useToastStore((state) => state.showToast);
  const selectedItemIds = useCartSelectionStore((state) => state.selectedItemIds);
  const hydrateSelection = useCartSelectionStore((state) => state.hydrate);
  const toggleAllItems = useCartSelectionStore((state) => state.toggleAllItems);
  const toggleItem = useCartSelectionStore((state) => state.toggleItem);
  const cartQuery = useMyCartQuery();

  const cart = cartQuery.data;
  const isEmpty = !cart?.items.length;
  const pricing = calculateSelectedCartPricing(cart, selectedItemIds);
  const areAllItemsSelected =
    (cart?.items.length ?? 0) > 0 &&
    (cart?.items ?? []).every((item) => selectedItemIds.includes(item.id));

  useEffect(() => {
    if (!cart) {
      return;
    }

    hydrateSelection(cart);
  }, [cart, hydrateSelection]);

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
      await queryClient.invalidateQueries({ queryKey: myCartQueryKey(cartScope) });
      showToast({
        message: '장바구니에서 제거했습니다.',
        variant: 'success',
      });
    },
  });

  const handleRemoveSelectedItems = async () => {
    if (!pricing.selectedItems.length || removeCartItemMutation.isPending) {
      return;
    }

    await Promise.all(
      pricing.selectedItems.map((item) => removeCartItemMutation.mutateAsync(item.id)),
    );
  };

  return (
    <section className={styles['page']}>
      <div className={styles['shell']}>
        <div className={styles['surface']}>
          <header className={styles['header']}>
            <h1 className={styles['title']}>장바구니</h1>
          </header>

          {cartQuery.isLoading ? (
            <p className={styles['stateText']}>장바구니를 불러오는 중입니다.</p>
          ) : null}

          {cartQuery.isError ? (
            <p className={styles['errorText']}>
              {cartQuery.error instanceof Error
                ? cartQuery.error.message
                : '장바구니를 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && isEmpty ? (
            <section className={styles['emptyPanel']}>
              <h2 className={styles['emptyTitle']}>담긴 강의가 없습니다.</h2>
              <p className={styles['stateText']}>수강할 강의를 장바구니에 담아 주세요.</p>
            </section>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && cart ? (
            <div className={styles['layout']}>
              <section className={styles['cartPanel']} aria-label='장바구니 상품 목록'>
                <div className={styles['cartToolbar']}>
                  <label className={styles['selectAllRow']}>
                    <input
                      checked={areAllItemsSelected}
                      onChange={() => {
                        toggleAllItems(cart.items.map((item) => item.id));
                      }}
                      type='checkbox'
                    />
                    <span
                      className={classNames(
                        styles['checkboxVisual'],
                        areAllItemsSelected ? styles['checkboxVisualChecked'] : null,
                      )}
                      aria-hidden='true'
                    >
                      {areAllItemsSelected ? <img alt='' src={checkIconSrc} /> : null}
                    </span>
                    <span>전체 선택</span>
                    <span className={styles['selectionCount']}>
                      ({pricing.itemCount}/{cart.items.length})
                    </span>
                  </label>
                  <button
                    className={styles['removeSelectedButton']}
                    disabled={!pricing.itemCount || removeCartItemMutation.isPending}
                    onClick={() => {
                      void handleRemoveSelectedItems();
                    }}
                    type='button'
                  >
                    <span>선택 삭제</span>
                    <span aria-hidden='true' className={styles['removeSelectedIcon']} />
                  </button>
                </div>

                <div className={styles['itemList']}>
                  {cart.items.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    const discountAmount = item.originalPrice - item.payablePrice;
                    const discountRate = getDiscountRate(item.originalPrice, item.payablePrice);
                    const thumbnailCropStyle = getProgramImageCropStyle({
                      offsetX: item.thumbnailCropOffsetX,
                      offsetY: item.thumbnailCropOffsetY,
                      zoom: item.thumbnailCropZoom,
                    });

                    return (
                      <article className={styles['itemRow']} key={item.id}>
                        <label className={styles['itemCheckboxLabel']}>
                          <input
                            aria-label={`${item.title} 선택`}
                            checked={isSelected}
                            onChange={() => {
                              toggleItem(item.id);
                            }}
                            type='checkbox'
                          />
                          <span
                            className={classNames(
                              styles['checkboxVisual'],
                              isSelected ? styles['checkboxVisualChecked'] : null,
                            )}
                            aria-hidden='true'
                          >
                            {isSelected ? <img alt='' src={checkIconSrc} /> : null}
                          </span>
                        </label>
                        <Link className={styles['itemThumbnailLink']} to={item.detailPath}>
                          {item.thumbnailUrl ? (
                            <img
                              alt={`${item.title} 대표 이미지`}
                              className={styles['itemThumbnailImage']}
                              loading='lazy'
                              src={item.thumbnailUrl}
                              style={thumbnailCropStyle}
                            />
                          ) : (
                            <div aria-hidden='true' className={styles['itemThumbnailFallback']}>
                              <span>SS</span>
                            </div>
                          )}
                        </Link>
                        <div className={styles['itemBody']}>
                          <span className={styles['itemTypeChip']}>
                            {getProgramTypeLabel(item.programType)} 과정
                          </span>
                          <Link className={styles['itemTitleLink']} to={item.detailPath}>
                            <strong className={styles['itemTitle']}>{item.title}</strong>
                          </Link>
                          <p className={styles['itemMeta']}>
                            <span>수강기간</span>
                            <span>{getCoursePeriodLabel(item.saleStartAt, item.saleEndAt)}</span>
                          </p>
                        </div>
                        <button
                          className={styles['removeButton']}
                          disabled={removeCartItemMutation.isPending}
                          onClick={() => {
                            removeCartItemMutation.mutate(item.id);
                          }}
                          type='button'
                          aria-label={`${item.title} 삭제`}
                        >
                          <img alt='' aria-hidden='true' src={removeIconSrc} />
                        </button>
                        <div className={styles['itemPriceBlock']}>
                          <p className={styles['itemPrice']}>
                            {formatCurrency(item.originalPrice)}
                          </p>
                          {discountAmount > 0 ? (
                            <p className={styles['itemDiscount']}>
                              - {formatCurrency(discountAmount)} ({discountRate}%)
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <aside className={styles['summaryPanel']}>
                <section className={styles['summaryCard']} aria-label='주문 요약'>
                  <h2 className={styles['summaryTitle']}>주문 요약</h2>
                  <div className={styles['summaryRows']}>
                    <div className={styles['summaryRow']}>
                      <span>선택 상품 수</span>
                      <span>{pricing.itemCount}개</span>
                    </div>
                    <div className={styles['summaryRow']}>
                      <span>상품 금액</span>
                      <span>{formatCurrency(pricing.totalOriginalPrice)}</span>
                    </div>
                    <div className={styles['summaryRow']}>
                      <span>강의 할인</span>
                      <span className={styles['summaryDiscount']}>
                        {pricing.itemDiscountAmount > 0
                          ? `-${formatCurrency(pricing.itemDiscountAmount)}`
                          : formatCurrency(0)}
                      </span>
                    </div>
                  </div>
                  <div className={styles['summaryTotalRow']}>
                    <span>총 결제 금액</span>
                    <strong>{formatCurrency(pricing.totalPayablePrice)}</strong>
                  </div>

                  <div className={styles['actionRow']}>
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
                      선택 항목 결제하기
                    </button>
                  </div>

                  {!pricing.itemCount ? (
                    <p className={styles['summaryNotice']}>결제할 항목을 먼저 선택해 주세요.</p>
                  ) : null}

                  {!isAuthenticated ? (
                    <p className={styles['summaryNotice']}>
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
