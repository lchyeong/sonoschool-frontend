import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { removeMyCartItem } from '@/api/mypage';
import {
  myApplicationSummaryQueryKey,
  myCartQueryKey,
  useMyApplicationSummaryQuery,
  useMyCartQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import { classNames } from '@/utils/classNames';

import styles from './CartPage.module.scss';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const CartPage = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const showToast = useToastStore((state) => state.showToast);
  const cartQuery = useMyCartQuery();
  const applicationSummaryQuery = useMyApplicationSummaryQuery();

  const cart = cartQuery.data;
  const isEmpty = !cart?.items.length;
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
        queryClient.invalidateQueries({ queryKey: myCartQueryKey }),
        queryClient.invalidateQueries({ queryKey: myApplicationSummaryQueryKey }),
      ]);
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
              담아둔 강의를 비교하고, 결제 전 옵션과 금액을 마지막으로 확인합니다.
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
                <p className={sharedStyles['sectionDescription']}>
                  현재 `CartPage`는 플레이스홀더가 아니라 실제 목데이터 장바구니와 연결되어
                  있습니다.
                </p>
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
                  <p className={sharedStyles['sectionDescription']}>
                    장바구니에 담긴 강의와 실습 과정을 한 번에 확인할 수 있습니다.
                  </p>
                </div>

                <div className={styles['itemList']}>
                  {cart.items.map((item) => (
                    <article className={styles['itemCard']} key={item.id}>
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
                              {item.programType === 'ONLINE' ? '온라인' : '오프라인'}
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
                          <p className={styles['itemPrice']}>{formatCurrency(item.payablePrice)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className={styles['summaryPanel']}>
                <section className={sharedStyles['section']}>
                  <div className={sharedStyles['sectionHeader']}>
                    <h2 className={sharedStyles['sectionTitle']}>합계</h2>
                  </div>
                  <div className={sharedStyles['metaList']}>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>총 상품 수</span>
                      <span className={sharedStyles['metaValue']}>{cart.itemCount}개</span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>총 상품 금액</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(cart.totalOriginalPrice)}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>총 할인 금액</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(cart.totalDiscountAmount)}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>총 결제 예상 금액</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(cart.totalPayablePrice)}
                      </span>
                    </div>
                  </div>

                  {cart.appliedCoupon ? (
                    <p className={sharedStyles['mutedText']}>
                      적용 쿠폰 {cart.appliedCoupon.name} (
                      {formatCurrency(cart.appliedCoupon.discountAmount)})
                    </p>
                  ) : (
                    <p className={sharedStyles['mutedText']}>적용된 쿠폰이 없습니다.</p>
                  )}

                  {applicationSummaryQuery.data ? (
                    <div className={styles['summaryGrid']}>
                      <div className={styles['summaryItem']}>
                        <span className={styles['summaryLabel']}>결제 가능 항목</span>
                        <strong className={styles['summaryValue']}>
                          {applicationSummaryQuery.data.onlineItems.length}건
                        </strong>
                      </div>
                      <div className={styles['summaryItem']}>
                        <span className={styles['summaryLabel']}>별도 확인 항목</span>
                        <strong className={styles['summaryValue']}>
                          {applicationSummaryQuery.data.offlineItemCount}건
                        </strong>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles['actionRow']}>
                    <Link className={styles['secondaryActionLink']} to={routePaths.programs}>
                      강의 더 담기
                    </Link>
                    <Link className={styles['primaryActionLink']} to={routePaths.checkout}>
                      결제하기
                    </Link>
                  </div>

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
