import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import {
  approveKcpPcPayment,
  prepareKcpPcCheckoutPayment,
  registerKcpMobileCheckoutPayment,
} from '@/api/payments';
import {
  myCartQueryKey,
  myCouponsQueryKey,
  myEnrollmentsQueryKey,
  myPaymentHistoryQueryKey,
  useMyCartQuery,
  useMyCouponsQuery,
  useMyProfileQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import sharedStyles from '@/styles/accountPage.module.scss';
import {
  formatPaymentMethodLabel,
  paymentMethodLabels,
  type CheckoutPaymentMethod,
  type KcpMobileRegisterResponse,
  type KcpPcPrepareResponse,
} from '@/types/payment';
import { calculateSelectedCartPricing } from '@/utils/cartPricing';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';
import { classNames } from '@/utils/classNames';
import { getProgramTypeLabel } from '@/utils/programType';

import styles from './CheckoutPage.module.scss';

const currencyFormatter = new Intl.NumberFormat('ko-KR');
const checkoutPaymentMethods: CheckoutPaymentMethod[] = ['CARD'];
const KCP_PAYMENT_VISIBILITY_EVENT = 'sonoschool:kcp-payment-visibility';
const pcPaymentOpenErrorMessage = '결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.';
const pcPaymentIncompleteMessage =
  '결제가 완료되지 않았습니다. 결제 정보를 확인한 뒤 다시 시도해 주세요.';
const pcPaymentApproveErrorMessage = '결제 승인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
const pcPaymentCancelledMessage = '결제가 취소되었습니다. 다시 결제를 진행해 주세요.';
const pcPaymentClosedMessage = '결제창이 닫혀 결제가 완료되지 않았습니다. 다시 시도해 주세요.';
const pcPaymentReturnGraceMs = 1200;
let kcpScrollLockSnapshot:
  | {
      bodyOverflow: string;
      bodyTouchAction: string;
      htmlOverflow: string;
      htmlOverscrollBehavior: string;
    }
  | null = null;

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const isMobileBrowser = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent,
  );
};

const setHiddenFieldValue = (
  form: HTMLFormElement,
  name: string,
  value: number | string | null | undefined,
) => {
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLInputElement)) {
    return;
  }
  field.value = value === null || value === undefined ? '' : String(value);
};

const getHiddenFieldValue = (form: HTMLFormElement, name: string): string => {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value : '';
};

const applyPcPrepareResponse = (form: HTMLFormElement, prepare: KcpPcPrepareResponse) => {
  setHiddenFieldValue(form, 'site_cd', prepare.siteCd);
  setHiddenFieldValue(form, 'site_name', prepare.siteName);
  setHiddenFieldValue(form, 'pay_method', prepare.payMethod);
  setHiddenFieldValue(form, 'currency', prepare.currency);
  setHiddenFieldValue(form, 'ordr_idxx', prepare.ordrIdxx);
  setHiddenFieldValue(form, 'good_mny', prepare.goodMny);
  setHiddenFieldValue(form, 'good_name', prepare.goodName);
  setHiddenFieldValue(form, 'shop_user_id', prepare.shopUserId);
  setHiddenFieldValue(form, 'buyr_name', prepare.buyrName);
  setHiddenFieldValue(form, 'buyr_mail', prepare.buyrMail);
  setHiddenFieldValue(form, 'buyr_tel2', prepare.buyrTel2);
  setHiddenFieldValue(form, 'good_expr', prepare.goodExpr);
};

const applyMobileRegisterResponse = (
  form: HTMLFormElement,
  register: KcpMobileRegisterResponse,
) => {
  form.action = register.payUrl;
  setHiddenFieldValue(form, 'site_cd', register.siteCd);
  setHiddenFieldValue(form, 'pay_method', register.payMethod);
  setHiddenFieldValue(form, 'approval_key', register.approvalKey);
  setHiddenFieldValue(form, 'Ret_URL', register.retUrl);
  setHiddenFieldValue(form, 'PayUrl', register.payUrl);
  setHiddenFieldValue(form, 'currency', register.currency);
  setHiddenFieldValue(form, 'good_mny', register.goodMny);
  setHiddenFieldValue(form, 'ordr_idxx', register.ordrIdxx);
  setHiddenFieldValue(form, 'good_name', register.goodName);
  setHiddenFieldValue(form, 'shop_user_id', register.shopUserId);
  setHiddenFieldValue(form, 'buyr_name', register.buyrName);
  setHiddenFieldValue(form, 'buyr_mail', register.buyrMail);
};

const applyKcpCompletionValues = (form: HTMLFormElement, values: unknown) => {
  if (!values || typeof values !== 'object') {
    return;
  }

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'number') {
      setHiddenFieldValue(form, key, value);
      continue;
    }
    setHiddenFieldValue(form, key, null);
  }
};

const ensureKcpWindowHelpers = () => {
  if (!window.chkAvailablePostMessage) {
    window.chkAvailablePostMessage = () => {
      return typeof window.postMessage === 'function' || typeof window.postMessage === 'object';
    };
  }
};

const waitForKcpPaymentScript = async (timeoutMs = 3000): Promise<void> => {
  if (window.KCP_Pay_Execute_Web) {
    return;
  }

  const startedAt = Date.now();

  await new Promise<void>((resolve, reject) => {
    const pollTimer = window.setInterval(() => {
      if (window.KCP_Pay_Execute_Web) {
        window.clearInterval(pollTimer);
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(pollTimer);
        reject(new Error('KCP 결제 스크립트를 준비하지 못했습니다.'));
      }
    }, 50);
  });
};

const loadKcpScript = async (jsUrl: string): Promise<void> => {
  ensureKcpWindowHelpers();

  if (window.KCP_Pay_Execute_Web) {
    return;
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${jsUrl}"]`);
  if (existing) {
    if (existing.dataset['loaded'] === 'true') {
      await waitForKcpPaymentScript();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const handleLoad = () => {
        existing.dataset['loaded'] = 'true';
        resolve();
      };
      const handleError = () => {
        reject(new Error('KCP 스크립트를 불러오지 못했습니다.'));
      };

      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
    });

    await waitForKcpPaymentScript();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = jsUrl;
    script.async = true;
    script.onload = () => {
      script.dataset['loaded'] = 'true';
      resolve();
    };
    script.onerror = () => {
      reject(new Error('KCP 스크립트를 불러오지 못했습니다.'));
    };
    document.head.append(script);
  });

  await waitForKcpPaymentScript();
};

const buildResultSearch = (params: Record<string, number | string | null | undefined>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    searchParams.set(key, String(value));
  }

  return searchParams.toString();
};

const isUserCancelledPcPayment = (resCd: string, resMsg: string | null) => {
  if (!resCd || resCd === '0000') {
    return false;
  }

  const normalizedMessage = (resMsg ?? '').trim().toLowerCase();
  return (
    normalizedMessage.includes('취소') ||
    normalizedMessage.includes('cancel') ||
    normalizedMessage.includes('닫') ||
    normalizedMessage.includes('close')
  );
};

const buildPcPrepareKey = (
  cartItemIds: number[],
  paymentMethod: CheckoutPaymentMethod,
  selectedCouponId: number | null,
  prepareVersion: number,
) => {
  return JSON.stringify({
    cartItemIds,
    paymentMethod,
    prepareVersion,
    selectedCouponId,
  });
};

const setKcpPaymentVisibility = (visible: boolean) => {
  if (typeof document !== 'undefined') {
    if (visible) {
      if (!kcpScrollLockSnapshot) {
        kcpScrollLockSnapshot = {
          bodyOverflow: document.body.style.overflow,
          bodyTouchAction: document.body.style.touchAction,
          htmlOverflow: document.documentElement.style.overflow,
          htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,
        };
      }

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
    } else if (kcpScrollLockSnapshot) {
      document.body.style.overflow = kcpScrollLockSnapshot.bodyOverflow;
      document.body.style.touchAction = kcpScrollLockSnapshot.bodyTouchAction;
      document.documentElement.style.overflow = kcpScrollLockSnapshot.htmlOverflow;
      document.documentElement.style.overscrollBehavior =
        kcpScrollLockSnapshot.htmlOverscrollBehavior;
      kcpScrollLockSnapshot = null;
    }
  }

  window.dispatchEvent(
    new CustomEvent(KCP_PAYMENT_VISIBILITY_EVENT, {
      detail: { visible },
    }),
  );
};

const CheckoutPage = () => {
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('CARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPcPreparing, setIsPcPreparing] = useState(false);
  const [isPcPaymentReady, setIsPcPaymentReady] = useState(false);
  const [pcPrepareVersion, setPcPrepareVersion] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const cartScope = resolveCartQueryScope(true);

  const kcpFormRef = useRef<HTMLFormElement | null>(null);
  const kcpMobileFormRef = useRef<HTMLFormElement | null>(null);
  const latestPrepareRef = useRef<KcpPcPrepareResponse | null>(null);
  const isPcAttemptPendingRef = useRef(false);
  const pcAttemptRecoveryTimerRef = useRef<number | null>(null);

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
  const isMobilePayment = isMobileBrowser();
  const selectedCartItemIds = pricing.selectedItems.map((item) => item.id);
  const pcPrepareKey = buildPcPrepareKey(
    selectedCartItemIds,
    paymentMethod,
    selectedCouponId,
    pcPrepareVersion,
  );

  const clearPcAttemptRecoveryTimer = () => {
    if (pcAttemptRecoveryTimerRef.current !== null) {
      window.clearTimeout(pcAttemptRecoveryTimerRef.current);
      pcAttemptRecoveryTimerRef.current = null;
    }
  };

  const resetPcPreparedPayment = () => {
    latestPrepareRef.current = null;
    setIsPcPaymentReady(false);
  };

  const requestPcReprepare = () => {
    resetPcPreparedPayment();
    setPcPrepareVersion((current) => current + 1);
  };

  const completePcAttempt = () => {
    isPcAttemptPendingRef.current = false;
    clearPcAttemptRecoveryTimer();
    setIsSubmitting(false);
    setKcpPaymentVisibility(false);
  };

  useEffect(() => {
    if (!cart) {
      return;
    }

    hydrateSelection(cart, coupons ?? []);
  }, [cart, coupons, hydrateSelection]);

  useEffect(() => {
    resetPcPreparedPayment();
  }, [pcPrepareKey]);

  useEffect(() => {
    if (isMobilePayment || pricing.itemCount === 0) {
      resetPcPreparedPayment();
      setIsPcPreparing(false);
      return;
    }

    const form = kcpFormRef.current;
    if (!form) {
      return;
    }

    let cancelled = false;

    const primePcPayment = async () => {
      setIsPcPreparing(true);

      try {
        const prepare = await prepareKcpPcCheckoutPayment({
          cartItemIds: selectedCartItemIds,
          paymentMethod,
          selectedCouponId,
        });

        if (cancelled) {
          return;
        }

        latestPrepareRef.current = prepare;
        applyPcPrepareResponse(form, prepare);
        await loadKcpScript(prepare.jsUrl);

        if (cancelled) {
          return;
        }

        setIsPcPaymentReady(true);
      } catch {
        if (cancelled) {
          return;
        }

        latestPrepareRef.current = null;
        setIsPcPaymentReady(false);
      } finally {
        if (!cancelled) {
          setIsPcPreparing(false);
        }
      }
    };

    void primePcPayment();

    return () => {
      cancelled = true;
    };
  }, [isMobilePayment, pcPrepareKey, pricing.itemCount]);

  useEffect(() => {
    const recoverPendingPcAttempt = () => {
      if (!isPcAttemptPendingRef.current) {
        return;
      }

      completePcAttempt();
      requestPcReprepare();
      showToast({
        message: pcPaymentClosedMessage,
        variant: 'error',
      });
    };

    const schedulePcAttemptRecovery = () => {
      if (!isPcAttemptPendingRef.current) {
        return;
      }
      clearPcAttemptRecoveryTimer();
      pcAttemptRecoveryTimerRef.current = window.setTimeout(() => {
        if (isPcAttemptPendingRef.current) {
          recoverPendingPcAttempt();
        }
      }, pcPaymentReturnGraceMs);
    };

    const handlePageHide = () => {
      clearPcAttemptRecoveryTimer();
      setKcpPaymentVisibility(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        schedulePcAttemptRecovery();
      }
    };

    window.addEventListener('focus', schedulePcAttemptRecovery);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearPcAttemptRecoveryTimer();
      window.removeEventListener('focus', schedulePcAttemptRecovery);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showToast]);

  useEffect(() => {
    window.jsf__pay = (form: HTMLFormElement) => {
      if (!window.KCP_Pay_Execute_Web) {
        throw new Error(pcPaymentOpenErrorMessage);
      }

      window.KCP_Pay_Execute_Web(form);
    };

    window.m_Completepayment = async (formOrJson, closeEvent) => {
      const form = kcpFormRef.current;
      const latestPrepare = latestPrepareRef.current;

      if (!form || !latestPrepare) {
        closeEvent?.();
        return;
      }

      try {
        if (window.GetField) {
          window.GetField(form, formOrJson);
        } else {
          applyKcpCompletionValues(form, formOrJson);
        }

        const resCd = getHiddenFieldValue(form, 'res_cd');
        const resMsg = getHiddenFieldValue(form, 'res_msg') || null;

        if (isUserCancelledPcPayment(resCd, resMsg)) {
          completePcAttempt();
          requestPcReprepare();
          showToast({
            message: pcPaymentCancelledMessage,
            variant: 'info',
          });
          return;
        }

        if (resCd !== '0000') {
          showToast({
            message: pcPaymentIncompleteMessage,
            variant: 'error',
          });
          void navigate(
            `${routePaths.paymentResult}?${buildResultSearch({
              code: resCd,
              message: pcPaymentIncompleteMessage,
              paymentId: latestPrepare.paymentId,
              status: 'FAILED',
            })}`,
          );
          return;
        }

        const payment = await approveKcpPcPayment({
          orderReference: latestPrepare.orderReference,
          paymentId: latestPrepare.paymentId,
          encData: getHiddenFieldValue(form, 'enc_data'),
          encInfo: getHiddenFieldValue(form, 'enc_info'),
          tranCd: getHiddenFieldValue(form, 'tran_cd'),
          resCd,
          resMsg,
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: myCartQueryKey(cartScope) }),
          queryClient.invalidateQueries({ queryKey: myCouponsQueryKey(cartScope) }),
          queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey }),
          queryClient.invalidateQueries({ queryKey: myPaymentHistoryQueryKey }),
        ]);

        void navigate(
          `${routePaths.paymentResult}?${buildResultSearch({
            paymentId: payment.id,
            status: payment.status,
          })}`,
        );
      } catch {
        showToast({
          message: pcPaymentApproveErrorMessage,
          variant: 'error',
        });
        void navigate(
          `${routePaths.paymentResult}?${buildResultSearch({
            message: pcPaymentApproveErrorMessage,
            paymentId: latestPrepare.paymentId,
            status: 'FAILED',
          })}`,
        );
      } finally {
        resetPcPreparedPayment();
        completePcAttempt();
        closeEvent?.();
      }
    };

    return () => {
      isPcAttemptPendingRef.current = false;
      clearPcAttemptRecoveryTimer();
      setKcpPaymentVisibility(false);
      delete window.jsf__pay;
      delete window.m_Completepayment;
    };
  }, [cartScope, navigate, queryClient, showToast]);

  const handleStartPayment = async () => {
    if (!pricing.itemCount) {
      showToast({
        message: '결제 가능한 항목을 먼저 선택해 주세요.',
        variant: 'error',
      });
      return;
    }

    const checkoutPayload = {
      cartItemIds: selectedCartItemIds,
      paymentMethod,
      selectedCouponId,
    };

    try {
      if (isMobileBrowser()) {
        const mobileForm = kcpMobileFormRef.current;
        if (!mobileForm) {
          throw new Error('모바일 결제 폼을 초기화하지 못했습니다.');
        }

        const register = await registerKcpMobileCheckoutPayment(checkoutPayload);

        applyMobileRegisterResponse(mobileForm, register);
        mobileForm.submit();
        return;
      }

      const form = kcpFormRef.current;
      if (!form) {
        throw new Error(pcPaymentOpenErrorMessage);
      }

      if (!isPcPaymentReady || !latestPrepareRef.current || !window.jsf__pay || !window.KCP_Pay_Execute_Web) {
        throw new Error(pcPaymentOpenErrorMessage);
      }

      clearPcAttemptRecoveryTimer();
      isPcAttemptPendingRef.current = true;
      setIsSubmitting(true);
      setKcpPaymentVisibility(true);
      window.jsf__pay(form);
    } catch (error: unknown) {
      completePcAttempt();
      requestPcReprepare();
      showToast({
        message: error instanceof Error ? error.message : pcPaymentOpenErrorMessage,
        variant: 'error',
      });
    }
  };

  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div className={classNames(sharedStyles['surface'], styles['surface'])}>
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>결제하기</h1>
            <p className={sharedStyles['description']}>
              장바구니에서 선택한 항목을 확인하고 실제 KCP 결제를 진행합니다.
            </p>
          </header>

          <form ref={kcpFormRef} acceptCharset='UTF-8' method='post' name='order_info'>
            <input name='site_cd' type='hidden' />
            <input name='site_name' type='hidden' />
            <input name='pay_method' type='hidden' />
            <input name='currency' type='hidden' />
            <input name='ordr_idxx' type='hidden' />
            <input name='good_mny' type='hidden' />
            <input name='good_name' type='hidden' />
            <input name='shop_user_id' type='hidden' />
            <input name='buyr_name' type='hidden' />
            <input name='buyr_mail' type='hidden' />
            <input name='buyr_tel2' type='hidden' />
            <input name='good_expr' type='hidden' />
            <input name='res_cd' type='hidden' />
            <input name='res_msg' type='hidden' />
            <input name='enc_data' type='hidden' />
            <input name='enc_info' type='hidden' />
            <input name='tran_cd' type='hidden' />
          </form>

          <form ref={kcpMobileFormRef} acceptCharset='UTF-8' method='post'>
            <input name='site_cd' type='hidden' />
            <input name='pay_method' type='hidden' />
            <input name='approval_key' type='hidden' />
            <input name='Ret_URL' type='hidden' />
            <input name='PayUrl' type='hidden' />
            <input name='currency' type='hidden' />
            <input name='good_mny' type='hidden' />
            <input name='ordr_idxx' type='hidden' />
            <input name='good_name' type='hidden' />
            <input name='shop_user_id' type='hidden' />
            <input name='buyr_name' type='hidden' />
            <input name='buyr_mail' type='hidden' />
          </form>

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
                  장바구니에서 결제할 과정을 먼저 선택해 주세요.
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
                      현재는 카드 결제를 지원하며, 선택한 장바구니 항목 전체가 한 번에 결제됩니다.
                    </p>
                  </div>
                  <div className={styles['methodList']}>
                    {checkoutPaymentMethods.map((value) => (
                      <label className={styles['methodOption']} key={value}>
                        <input
                          checked={paymentMethod === value}
                          name='paymentMethod'
                          onChange={() => {
                            setPaymentMethod(value);
                          }}
                          type='radio'
                        />
                        <span>{paymentMethodLabels[value]}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className={sharedStyles['section']}>
                  <div className={sharedStyles['sectionHeader']}>
                    <h2 className={sharedStyles['sectionTitle']}>선택한 주문 항목</h2>
                    <p className={sharedStyles['sectionDescription']}>
                      모바일에서는 KCP 결제창으로 이동하며, 서버가 선택 항목과 쿠폰 기준 최종 금액을
                      확정합니다.
                    </p>
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
                    <button
                      className={styles['primaryActionButton']}
                      disabled={isSubmitting || isPcPreparing || pricing.itemCount === 0}
                      onClick={() => {
                        void handleStartPayment();
                      }}
                      type='button'
                    >
                      {isSubmitting
                        ? '결제창 여는 중...'
                        : isPcPreparing
                          ? '결제창 준비 중...'
                          : '실결제 진행'}
                    </button>
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
