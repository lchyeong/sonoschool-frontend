/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import {
  approveKcpPcPayment,
  completeFreeCheckoutPayment,
  prepareKcpPcCheckoutPayment,
  registerKcpMobileCheckoutPayment,
} from '@/api/payments';
import checkIconSrc from '@/assets/icons/lucide_check.svg';
import LegalPolicyModal from '@/components/policy/LegalPolicyModal';
import type { LegalPolicyType } from '@/components/policy/LegalPolicyModal';
import {
  myCartQueryKey,
  myEnrollmentsQueryKey,
  myPaymentHistoryQueryKey,
  useMyCartQuery,
  useMyProfileQuery,
} from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import {
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
const defaultCheckoutPaymentMethod: CheckoutPaymentMethod = 'CARD';
const KCP_PAYMENT_VISIBILITY_EVENT = 'sonoschool:kcp-payment-visibility';
const pcPaymentOpenErrorMessage = '결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.';
const pcPaymentIncompleteMessage =
  '결제가 완료되지 않았습니다. 결제 정보를 확인한 뒤 다시 시도해 주세요.';
const pcPaymentApproveErrorMessage = '결제 승인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
const pcPaymentCancelledMessage = '결제가 취소되었습니다. 다시 결제를 진행해 주세요.';
const pcPaymentClosedMessage = '결제창이 닫혀 결제가 완료되지 않았습니다. 다시 시도해 주세요.';
const pcPaymentReturnGraceMs = 1200;
type CheckoutPolicyKey = Extract<LegalPolicyType, 'privacy' | 'refund'>;

let kcpScrollLockSnapshot: {
  bodyOverflow: string;
  bodyTouchAction: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
} | null = null;

const formatCurrency = (value: number) => `${currencyFormatter.format(value)}원`;

const formatCheckoutDate = (value: string | null) => {
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
  const start = formatCheckoutDate(saleStartAt);
  const end = formatCheckoutDate(saleEndAt);

  if (start && end) {
    return `${start}~${end}`;
  }

  return '상시 수강';
};

const getDiscountRate = (originalPrice: number, payablePrice: number) => {
  if (originalPrice <= 0 || payablePrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - payablePrice) / originalPrice) * 100);
};

const getCheckoutProgramTypeLabel = (programType: Parameters<typeof getProgramTypeLabel>[0]) => {
  const label = getProgramTypeLabel(programType);
  return label.endsWith('과정') ? label : `${label} 과정`;
};

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
  prepareVersion: number,
) => {
  return JSON.stringify({
    cartItemIds,
    paymentMethod,
    prepareVersion,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPcPreparing, setIsPcPreparing] = useState(false);
  const [isPcPaymentReady, setIsPcPaymentReady] = useState(false);
  const [pcPrepareVersion, setPcPrepareVersion] = useState(0);
  const [isPolicyAgreed, setIsPolicyAgreed] = useState(false);
  const [activePolicyKey, setActivePolicyKey] = useState<CheckoutPolicyKey | null>(null);
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
  const hydrateSelection = useCartSelectionStore((state) => state.hydrate);
  const cartQuery = useMyCartQuery();
  const profileQuery = useMyProfileQuery();

  const cart = cartQuery.data;
  const profile = profileQuery.data;
  const pricing = calculateSelectedCartPricing(cart, selectedItemIds);
  const isMobilePayment = isMobileBrowser();
  const isFreeCheckout = pricing.totalPayablePrice === 0;
  const effectivePaymentMethod: CheckoutPaymentMethod = isFreeCheckout
    ? 'FREE'
    : defaultCheckoutPaymentMethod;
  const selectedCartItemIds = pricing.selectedItems.map((item) => item.id);
  const pcPrepareKey = buildPcPrepareKey(
    selectedCartItemIds,
    effectivePaymentMethod,
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

    hydrateSelection(cart);
  }, [cart, hydrateSelection]);

  useEffect(() => {
    resetPcPreparedPayment();
  }, [pcPrepareKey]);

  useEffect(() => {
    if (isMobilePayment || isFreeCheckout || pricing.itemCount === 0) {
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
          paymentMethod: effectivePaymentMethod,
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
  }, [effectivePaymentMethod, isFreeCheckout, isMobilePayment, pcPrepareKey, pricing.itemCount]);

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

    if (!isPolicyAgreed) {
      showToast({
        message: '주문 내용, 결제 금액, 환불정책 확인에 동의해 주세요.',
        variant: 'error',
      });
      return;
    }

    const checkoutPayload = {
      cartItemIds: selectedCartItemIds,
      paymentMethod: effectivePaymentMethod,
    };

    try {
      if (isFreeCheckout) {
        const payment = await completeFreeCheckoutPayment(checkoutPayload);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: myCartQueryKey(cartScope) }),
          queryClient.invalidateQueries({ queryKey: myEnrollmentsQueryKey }),
          queryClient.invalidateQueries({ queryKey: myPaymentHistoryQueryKey }),
        ]);

        void navigate(
          `${routePaths.paymentResult}?${buildResultSearch({
            paymentId: payment.id,
            status: payment.status,
          })}`,
        );
        return;
      }

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

      if (
        !isPcPaymentReady ||
        !latestPrepareRef.current ||
        !window.jsf__pay ||
        !window.KCP_Pay_Execute_Web
      ) {
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
    <section className={styles['page']}>
      <div className={styles['shell']}>
        <div className={styles['surface']}>
          <header className={styles['header']}>
            <h1 className={styles['title']}>결제</h1>
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

          {cartQuery.isLoading || profileQuery.isLoading ? (
            <p className={styles['stateText']}>결제 정보를 불러오는 중입니다.</p>
          ) : null}

          {cartQuery.isError ? (
            <p className={styles['errorText']}>
              {cartQuery.error instanceof Error
                ? cartQuery.error.message
                : '결제 정보를 불러오지 못했습니다.'}
            </p>
          ) : null}

          {!cartQuery.isLoading && !cartQuery.isError && cart && !cart.items.length ? (
            <section className={styles['emptyPanel']}>
              <h2 className={styles['emptyTitle']}>장바구니가 비어 있습니다.</h2>
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
            <section className={styles['emptyPanel']}>
              <h2 className={styles['emptyTitle']}>선택한 항목이 없습니다.</h2>
              <p className={styles['stateText']}>장바구니에서 결제할 과정을 먼저 선택해 주세요.</p>
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
                <section className={styles['buyerPanel']} aria-label='주문자 정보'>
                  <h2 className={styles['panelTitle']}>주문자 정보</h2>
                  <div className={styles['buyerRows']}>
                    <div className={styles['buyerRow']}>
                      <span>이름</span>
                      <span>{profile?.name || '-'}</span>
                    </div>
                    <div className={styles['buyerRow']}>
                      <span>이메일</span>
                      <span>{profile?.email || '-'}</span>
                    </div>
                    <div className={styles['buyerRow']}>
                      <span>휴대폰 번호</span>
                      <span>{profile?.phoneNumber || '-'}</span>
                    </div>
                  </div>
                </section>

                <section className={styles['itemsPanel']} aria-label='선택한 주문 항목'>
                  <div className={styles['itemsHeader']}>
                    <h2 className={styles['panelTitle']}>선택한 주문 항목</h2>
                    <span className={styles['selectedCountBadge']}>
                      선택 상품 {pricing.itemCount}개
                    </span>
                  </div>
                  <div className={styles['itemList']}>
                    {pricing.selectedItems.map((item) => {
                      const discountAmount = item.originalPrice - item.payablePrice;
                      const discountRate = getDiscountRate(item.originalPrice, item.payablePrice);

                      return (
                        <article className={styles['itemRow']} key={item.id}>
                          {item.thumbnailUrl ? (
                            <img
                              alt={`${item.title} 대표 이미지`}
                              className={styles['itemThumbnailImage']}
                              loading='lazy'
                              src={item.thumbnailUrl}
                            />
                          ) : (
                            <div aria-hidden='true' className={styles['itemThumbnailFallback']} />
                          )}
                          <div className={styles['itemBody']}>
                            <span className={styles['itemTypeChip']}>
                              {getCheckoutProgramTypeLabel(item.programType)}
                            </span>
                            <strong className={styles['itemTitle']}>{item.title}</strong>
                            <p className={styles['itemMeta']}>
                              <span>수강기간</span>
                              <span>{getCoursePeriodLabel(item.saleStartAt, item.saleEndAt)}</span>
                            </p>
                          </div>
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
              </div>

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
                        -{formatCurrency(pricing.itemDiscountAmount)}
                      </span>
                    </div>
                  </div>
                  <div className={styles['summaryTotalRow']}>
                    <span>총 결제 금액</span>
                    <strong>{formatCurrency(pricing.totalPayablePrice)}</strong>
                  </div>

                  <label className={styles['agreementRow']}>
                    <input
                      checked={isPolicyAgreed}
                      onChange={(event) => {
                        setIsPolicyAgreed(event.target.checked);
                      }}
                      type='checkbox'
                    />
                    <span
                      className={classNames(
                        styles['agreementCheckbox'],
                        isPolicyAgreed ? styles['agreementCheckboxChecked'] : null,
                      )}
                      aria-hidden='true'
                    >
                      {isPolicyAgreed ? <img alt='' src={checkIconSrc} /> : null}
                    </span>
                    <span>주문 내용, 결제 금액, 환불정책을 확인했습니다.</span>
                  </label>

                  <div className={styles['policyLinks']} aria-label='결제 약관 링크'>
                    <button
                      onClick={() => {
                        setActivePolicyKey('refund');
                      }}
                      type='button'
                    >
                      환불정책
                    </button>
                    <span aria-hidden='true' />
                    <button
                      onClick={() => {
                        setActivePolicyKey('privacy');
                      }}
                      type='button'
                    >
                      개인정보처리방침
                    </button>
                  </div>

                  <div className={styles['actionRow']}>
                    <button
                      className={styles['primaryActionButton']}
                      disabled={
                        isSubmitting || isPcPreparing || pricing.itemCount === 0 || !isPolicyAgreed
                      }
                      onClick={() => {
                        void handleStartPayment();
                      }}
                      type='button'
                    >
                      {isSubmitting
                        ? isFreeCheckout
                          ? '신청 처리 중...'
                          : '결제창 여는 중...'
                        : isPcPreparing
                          ? '결제창 준비 중...'
                          : isFreeCheckout
                            ? '무료 신청'
                            : '결제하기'}
                    </button>
                  </div>
                  <Link className={styles['cartBackLink']} to={routePaths.cart}>
                    장바구니로 돌아가기
                  </Link>
                </section>
              </aside>
            </div>
          ) : null}

          {activePolicyKey ? (
            <LegalPolicyModal
              onClose={() => {
                setActivePolicyKey(null);
              }}
              type={activePolicyKey}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CheckoutPage;
