import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { createMockCheckoutRedirectPayload } from '@/mocks/data/payments';
import { useMyCartQuery, useMyCouponsQuery, useMyProfileQuery } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import { formatPaymentMethodLabel, paymentMethodLabels, type PaymentMethod } from '@/types/payment';
import { calculateSelectedCartPricing } from '@/utils/cartPricing';
import { classNames } from '@/utils/classNames';
import { getProgramTypeLabel } from '@/utils/programType';

import styles from './CheckoutPage.module.scss';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const CheckoutPage = () => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const selectedItemIds = useCartSelectionStore((state) => state.selectedItemIds);
  const selectedCouponId = useCartSelectionStore((state) => state.selectedCouponId);
  const hydrateSelection = useCartSelectionStore((state) => state.hydrate);
  const cartQuery = useMyCartQuery();
  const couponsQuery = useMyCouponsQuery();
  const profileQuery = useMyProfileQuery();

  const cart = cartQuery.data;
  const coupons = couponsQuery.data;
  const profile = profileQuery.data;
  const pricing = calculateSelectedCartPricing(
    cart,
    selectedItemIds,
    coupons ?? [],
    selectedCouponId,
  );
  const mockCheckoutRedirect = createMockCheckoutRedirectPayload(paymentMethod);
  const resultSearchParams = new URLSearchParams({
    code: mockCheckoutRedirect.code ?? '',
    gatewayOrderId: mockCheckoutRedirect.gatewayOrderId,
    message: mockCheckoutRedirect.message,
    paymentId: String(mockCheckoutRedirect.paymentId),
    resultToken: mockCheckoutRedirect.resultToken,
    status: mockCheckoutRedirect.status,
  }).toString();

  useEffect(() => {
    if (!cart) {
      return;
    }

    hydrateSelection(cart, coupons ?? []);
  }, [cart, coupons, hydrateSelection]);

  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>결제하기</h1>
            <p className={sharedStyles['description']}>
              장바구니에서 선택한 항목과 쿠폰 적용 금액을 확인하고 결제를 진행합니다.
            </p>
          </header>

          {cartQuery.isLoading || couponsQuery.isLoading || profileQuery.isLoading ? (
            <p className={sharedStyles['mutedText']}>결제 정보를 불러오는 중입니다.</p>
          ) : null}

          {cartQuery.isError ? (
            <p className={styles['errorText']}>
              {cartQuery.error instanceof Error
                ? cartQuery.error.message
                : '결제 정보를 불러오지 못했습니다.'}
            </p>
          ) : null}

          {couponsQuery.isError ? (
            <p className={styles['errorText']}>
              {couponsQuery.error instanceof Error
                ? couponsQuery.error.message
                : '쿠폰 정보를 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && cart && !cart.items.length ? (
            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>장바구니가 비어 있습니다.</h2>
              </div>
              <div className={styles['actionRow']}>
                <Link className={styles['secondaryActionLink']} to={routePaths.cart}>
                  장바구니로 돌아가기
                </Link>
              </div>
            </section>
          ) : null}

          {!cartQuery.isLoading &&
          !cartQuery.isError &&
          cart &&
          cart.items.length > 0 &&
          pricing.itemCount === 0 ? (
            <section className={sharedStyles['section']}>
              <div className={sharedStyles['sectionHeader']}>
                <h2 className={sharedStyles['sectionTitle']}>선택한 항목이 없습니다.</h2>
                <p className={sharedStyles['sectionDescription']}>
                  장바구니에서 결제할 강의 또는 실습 과정을 먼저 선택해 주세요.
                </p>
              </div>
              <div className={styles['actionRow']}>
                <Link className={styles['secondaryActionLink']} to={routePaths.cart}>
                  장바구니로 돌아가기
                </Link>
              </div>
            </section>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && cart && pricing.itemCount > 0 ? (
            <div className={styles['layout']}>
              <div className={styles['mainColumn']}>
                <section className={sharedStyles['section']}>
                  <div className={sharedStyles['sectionHeader']}>
                    <h2 className={sharedStyles['sectionTitle']}>주문자 정보</h2>
                  </div>
                  <div className={sharedStyles['metaList']}>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>이름</span>
                      <span className={sharedStyles['metaValue']}>{profile?.name || '-'}</span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>이메일</span>
                      <span className={sharedStyles['metaValue']}>{profile?.email || '-'}</span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>휴대폰 번호</span>
                      <span className={sharedStyles['metaValue']}>
                        {profile?.phoneNumber || '-'}
                      </span>
                    </div>
                  </div>
                </section>

                <section className={sharedStyles['section']}>
                  <div className={sharedStyles['sectionHeader']}>
                    <h2 className={sharedStyles['sectionTitle']}>결제 수단</h2>
                    <p className={sharedStyles['sectionDescription']}>
                      실제 PG 연결 전까지는 목 결제 결과 페이지로 이동합니다.
                    </p>
                  </div>
                  <div className={styles['methodList']}>
                    {(Object.entries(paymentMethodLabels) as Array<[PaymentMethod, string]>).map(
                      ([value, label]) => (
                        <label className={styles['methodOption']} key={value}>
                          <input
                            checked={paymentMethod === value}
                            name='paymentMethod'
                            onChange={() => {
                              setPaymentMethod(value);
                            }}
                            type='radio'
                          />
                          <span>{label}</span>
                        </label>
                      ),
                    )}
                  </div>
                </section>

                <section className={sharedStyles['section']}>
                  <div className={sharedStyles['sectionHeader']}>
                    <h2 className={sharedStyles['sectionTitle']}>선택한 주문 항목</h2>
                  </div>
                  <div className={styles['itemList']}>
                    {pricing.selectedItems.map((item) => (
                      <article className={styles['itemCard']} key={item.id}>
                        <div className={styles['itemInline']}>
                          <strong className={styles['itemTitle']}>{item.title}</strong>
                          <span className={styles['itemMeta']}>
                            강사 {item.instructorName || '-'}
                          </span>
                          <span className={styles['itemTypeChip']}>
                            {getProgramTypeLabel(item.programType)}
                          </span>
                        </div>
                        <p className={classNames(styles['itemMeta'], styles['itemPrice'])}>
                          {formatCurrency(item.payablePrice)}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <aside className={styles['summaryPanel']}>
                <section className={sharedStyles['section']}>
                  <div className={sharedStyles['sectionHeader']}>
                    <h2 className={sharedStyles['sectionTitle']}>최종 결제 금액</h2>
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
                    <div
                      className={classNames(sharedStyles['metaItem'], styles['couponSummaryItem'])}
                    >
                      <span className={sharedStyles['metaLabel']}>쿠폰 할인</span>
                      <div className={styles['couponDiscountRow']}>
                        <span className={sharedStyles['metaValue']}>
                          {formatCurrency(pricing.couponDiscountAmount)}
                        </span>
                        <span className={styles['couponSummaryBox']}>
                          {pricing.appliedCoupon?.name ?? '쿠폰 미적용'}
                        </span>
                      </div>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>결제 수단</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatPaymentMethodLabel(paymentMethod)}
                      </span>
                    </div>
                    <div className={sharedStyles['metaItem']}>
                      <span className={sharedStyles['metaLabel']}>최종 결제 금액</span>
                      <span className={sharedStyles['metaValue']}>
                        {formatCurrency(pricing.totalPayablePrice)}
                      </span>
                    </div>
                  </div>

                  <div className={styles['actionRow']}>
                    <Link className={styles['secondaryActionLink']} to={routePaths.cart}>
                      장바구니로 돌아가기
                    </Link>
                    <Link
                      className={styles['primaryActionLink']}
                      to={`${routePaths.paymentResult}?${resultSearchParams}`}
                    >
                      목 결제 진행
                    </Link>
                  </div>
                </section>
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CheckoutPage;
