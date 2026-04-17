import { useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { removeMyCartItem } from '@/api/mypage';
import { myCartQueryKey, useMyCartQuery } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import { calculateSelectedCartPricing } from '@/utils/cartPricing';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';
import { classNames } from '@/utils/classNames';
import { getProgramTypeLabel } from '@/utils/programType';

import styles from './CartPage.module.scss';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

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

  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>장바구니</h1>
            <p className={sharedStyles['description']}>
              담은 항목을 선택하고 결제할 과정을 바로 정리합니다.
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
                    {pricing.itemDiscountAmount > 0 ? (
                      <div className={sharedStyles['metaItem']}>
                        <span className={sharedStyles['metaLabel']}>강의 할인</span>
                        <span className={sharedStyles['metaValue']}>
                          {formatCurrency(pricing.itemDiscountAmount)}
                        </span>
                      </div>
                    ) : null}
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>총 결제 금액</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(pricing.totalPayablePrice)}
                      </span>
                    </div>
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
