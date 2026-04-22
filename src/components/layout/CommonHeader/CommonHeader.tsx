import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { logoutStudent } from '@/api/auth';
import myPageIconSrc from '@/assets/icons/icon_my.svg';
import cartIconSrc from '@/assets/icons/shopping-cart.svg';
import CloseIcon from '@/components/ui/icons/CloseIcon';
import MenuIcon from '@/components/ui/icons/MenuIcon';
import { useMyCartQuery } from '@/query/useMyPageQueries';
import { useSiteNavigationQuery } from '@/query/useSiteNavigationQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { buildHeaderNavigation } from '@/utils/buildHeaderNavigation';
import { classNames } from '@/utils/classNames';

import styles from './CommonHeader.module.scss';
import type { CommonHeaderProps } from './CommonHeader.types';
import CommonHeaderDesktopDropdownPanel from './CommonHeaderDesktopDropdownPanel';
import CommonHeaderMobileDrawer from './CommonHeaderMobileDrawer';
import {
  DEFAULT_HEADER_OFFSET_HEIGHT_PX,
  EMPTY_NAVIGATION_ITEMS,
  hasNavigationChildren,
} from './commonHeaderShared';
import { useCommonHeaderAutoHide } from './useCommonHeaderAutoHide';
import { useCommonHeaderDesktopDropdown } from './useCommonHeaderDesktopDropdown';

const KCP_PAYMENT_VISIBILITY_EVENT = 'sonoschool:kcp-payment-visibility';

interface KcpPaymentVisibilityEventDetail {
  visible: boolean;
}

const isKcpPaymentVisibilityEventDetail = (
  value: unknown,
): value is KcpPaymentVisibilityEventDetail => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'visible' in value &&
    typeof value.visible === 'boolean'
  );
};

export const CommonHeader = ({ logo, LinkComponent }: CommonHeaderProps) => {
  const navigate = useNavigate();
  // 실제 `<header>` DOM 요소를 가리키는 ref입니다.
  // 헤더 높이를 측정하거나, 헤더 바깥 클릭 여부를 판단할 때 사용됩니다.
  const headerRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  // 모바일 메뉴 버튼도 같은 이유로 ref를 따로 보관합니다.
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  // 현재 사용자가 로그인 상태인지 전역 스토어에서 읽습니다.
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const showToast = useToastStore((state) => state.showToast);
  // 단일 사이트 기준의 헤더 메뉴 데이터를 가져옵니다.
  // `isError`는 메뉴 조회 실패 여부를 뜻합니다.
  const { data, isError } = useSiteNavigationQuery();
  const cartQuery = useMyCartQuery();
  const cartItemCount = cartQuery.data?.itemCount ?? 0;
  const cartItemCountLabel = cartItemCount > 99 ? '99+' : String(cartItemCount);

  // 서버에서 받은 원본 메뉴 데이터를 헤더 렌더링에 편한 구조로 변환합니다.
  const navigationItems = useMemo(() => {
    return buildHeaderNavigation(data?.items ?? EMPTY_NAVIGATION_ITEMS);
  }, [data?.items]);

  // 모바일 드로어가 현재 열려 있는지 여부입니다.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isKcpPaymentVisible, setIsKcpPaymentVisible] = useState(false);
  // 모바일에서 펼쳐 둔 메뉴 id 목록입니다.
  // 여러 항목을 동시에 열 수 있으므로 배열로 관리합니다.
  const [expandedMobileItemIds, setExpandedMobileItemIds] = useState<string[]>([]);
  // 실제 헤더 높이를 저장해 아래 offset placeholder 높이와 맞춥니다.
  const [headerOffsetHeightPx, setHeaderOffsetHeightPx] = useState(DEFAULT_HEADER_OFFSET_HEIGHT_PX);

  // 데스크톱 드롭다운과 관련된 상태/함수는 전용 훅에서 받아 옵니다.
  // 메인 파일은 "언제 쓰는지" 중심으로 읽고, 세부 애니메이션 로직은 훅 파일에서 봅니다.
  const {
    closeDesktopMenu,
    isDesktopDropdownVisible,
    openDesktopMenu,
    openedDesktopItemId,
    renderedDesktopDropdownItem,
  } = useCommonHeaderDesktopDropdown({
    // 드롭다운 훅도 헤더 DOM 참조가 필요하므로 ref를 전달합니다.
    headerRef,
  });

  // 헤더 자동 숨김 여부도 전용 훅이 계산해 줍니다.
  // 모바일 메뉴나 데스크톱 드롭다운이 열려 있으면 숨김을 막아야 하므로 관련 상태를 함께 넘깁니다.
  const isHeaderHidden = useCommonHeaderAutoHide({
    isDesktopDropdownVisible,
    isDesktopMenuOpen: openedDesktopItemId !== null,
    isMobileMenuOpen,
  });

  // 실제로 숨김 클래스를 붙여도 되는 최종 조건입니다.
  // 단순히 스크롤만 내려갔다고 숨기지 않고, 메뉴가 모두 닫혀 있을 때만 숨깁니다.
  const shouldHideHeader =
    isHeaderHidden &&
    !isMobileMenuOpen &&
    openedDesktopItemId === null &&
    !isDesktopDropdownVisible;

  // fixed 헤더는 문서 흐름에서 빠지기 때문에,
  // 실제 높이를 측정해 아래쪽에 같은 높이의 빈 공간을 만들어 줘야 본문이 가려지지 않습니다.
  useLayoutEffect(() => {
    const headerElement = headerRef.current;

    // ref가 아직 연결되지 않았다면 높이를 측정할 수 없습니다.
    if (!headerElement) {
      return;
    }

    // 현재 헤더 높이를 읽어 상태에 저장하는 작은 함수입니다.
    const syncHeaderOffsetHeight = () => {
      setHeaderOffsetHeightPx(headerElement.getBoundingClientRect().height);
    };

    // 처음 렌더링된 직후 한 번 즉시 높이를 맞춥니다.
    syncHeaderOffsetHeight();

    // 구형 환경에서 ResizeObserver가 없으면 window resize 이벤트로 대체합니다.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeaderOffsetHeight);

      return () => {
        window.removeEventListener('resize', syncHeaderOffsetHeight);
      };
    }

    // 최신 브라우저에서는 요소 크기 변화를 직접 관찰하는 편이 더 정확합니다.
    const resizeObserver = new ResizeObserver(() => {
      syncHeaderOffsetHeight();
    });

    // 실제 헤더 DOM을 관찰 대상으로 등록합니다.
    resizeObserver.observe(headerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const rootElement = document.documentElement;
    const nextStickyTop = shouldHideHeader ? '0px' : `${String(headerOffsetHeightPx)}px`;

    rootElement.style.setProperty('--common-header-sticky-top', nextStickyTop);

    return () => {
      rootElement.style.removeProperty('--common-header-sticky-top');
    };
  }, [headerOffsetHeightPx, shouldHideHeader]);

  // Escape 키를 누르면 데스크톱/모바일 메뉴를 모두 닫는 공통 동작입니다.
  // `useEffectEvent`를 쓰면 effect 안에서도 최신 상태/함수를 안전하게 참조할 수 있습니다.
  const handleEscapeKeyDown = useEffectEvent(() => {
    closeDesktopMenu();
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    setExpandedMobileItemIds([]);
  });

  // 전역 Escape 키 이벤트를 등록해,
  // 입력 포커스가 어디 있든 열려 있는 헤더 UI를 닫을 수 있게 합니다.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape 키가 아니면 이 effect는 아무 것도 하지 않습니다.
      if (event.key !== 'Escape') return;

      handleEscapeKeyDown();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 모바일 드로어가 열리면 배경 페이지 스크롤을 막습니다.
  // 드로어가 열린 상태에서 뒤 페이지까지 같이 스크롤되면 UX가 어색해지기 때문입니다.
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    // 기존 body overflow 값을 저장해 두었다가 닫힐 때 복구합니다.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKcpPaymentVisibilityChange = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isKcpPaymentVisibilityEventDetail(event.detail)) {
        return;
      }

      setIsKcpPaymentVisible(event.detail.visible);
    };

    window.addEventListener(KCP_PAYMENT_VISIBILITY_EVENT, handleKcpPaymentVisibilityChange);

    return () => {
      window.removeEventListener(KCP_PAYMENT_VISIBILITY_EVENT, handleKcpPaymentVisibilityChange);
    };
  }, []);

  // 모바일 메뉴를 닫을 때 쓰는 공통 함수입니다.
  // 드로어를 닫을 뿐 아니라, 펼쳐 둔 하위 메뉴 상태도 함께 초기화합니다.
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setExpandedMobileItemIds([]);
  };

  const closeAccountMenu = () => {
    setIsAccountMenuOpen(false);
  };

  // 모바일 메뉴를 닫고 다시 "메뉴 열기 버튼"으로 포커스를 돌립니다.
  // 키보드 사용자 접근성을 보완하기 위한 함수입니다.
  const closeMobileMenuAndRestoreFocus = () => {
    closeMobileMenu();
    mobileMenuButtonRef.current?.focus();
  };

  // 모바일 트리 메뉴에서 특정 항목을 펼치거나 접는 토글 함수입니다.
  const handleToggleMobileItem = (itemId: string) => {
    setExpandedMobileItemIds((current) => {
      // 이미 열려 있으면 배열에서 제거해서 닫고,
      // 없으면 배열 끝에 추가해서 엽니다.
      return current.includes(itemId)
        ? current.filter((currentItemId) => currentItemId !== itemId)
        : [...current, itemId];
    });
  };

  // 모바일 햄버거 버튼을 눌렀을 때 호출되는 함수입니다.
  // 모바일 메뉴를 열기 전에 데스크톱 상태를 먼저 정리해 두면 상태 충돌을 줄일 수 있습니다.
  const handleToggleMobileMenu = () => {
    closeDesktopMenu();
    closeAccountMenu();
    setIsMobileMenuOpen((current) => {
      // 닫는 동작일 때는 하위 메뉴 펼침 상태도 함께 정리합니다.
      if (current) {
        setExpandedMobileItemIds([]);
      }

      return !current;
    });
  };

  const logoutMutation = useMutation({
    mutationFn: logoutStudent,
    onError: (error: unknown) => {
      showToast({
        message:
          error instanceof Error ? error.message : '로그아웃에 실패했습니다. 다시 시도해 주세요.',
        variant: 'error',
      });
    },
    onSuccess: () => {
      closeAccountMenu();
      logout();
      showToast({
        message: '로그아웃되었습니다.',
        variant: 'success',
      });
      void navigate(routePaths.home);
    },
  });

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) return;
      if (accountMenuRef.current?.contains(target)) return;

      setIsAccountMenuOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isAccountMenuOpen]);

  return (
    <>
      {/* 실제 고정 헤더 영역입니다. */}
      <header
        // 스크롤 상태에 따라 헤더 숨김 클래스를 조건부로 붙입니다.
        className={classNames(
          styles['header'],
          shouldHideHeader && styles['headerHidden'],
          isKcpPaymentVisible && styles['headerPaymentHidden'],
        )}
        // 마우스가 헤더를 벗어나면 데스크톱 드롭다운을 닫습니다.
        onMouseLeave={() => {
          closeDesktopMenu();
        }}
        ref={headerRef}
      >
        {/* 헤더 내부 최대 너비 래퍼입니다. */}
        <div className={styles['inner']}>
          {/* 왼쪽 로고 영역입니다. */}
          <div className={styles['logoArea']}>
            <LinkComponent className={styles['logoLink']} to={logo.to}>
              {/* 이미지 로고가 있으면 이미지를,
              없으면 텍스트 로고를 렌더링합니다. */}
              {logo.imageSrc ? (
                <img alt={logo.label} className={styles['logoImage']} src={logo.imageSrc} />
              ) : (
                <span className={styles['logoText']}>{logo.label}</span>
              )}
            </LinkComponent>
          </div>

          {/* 데스크톱 1차 내비게이션 영역입니다. */}
          <nav aria-label='Primary' className={styles['desktopNav']}>
            <ul className={styles['desktopNavList']}>
              {navigationItems.map((item) => {
                // 현재 항목이 하위 메뉴를 가지고 있는지 확인합니다.
                const isExpandable = hasNavigationChildren(item);
                // 지금 열려 있는 데스크톱 메뉴가 이 항목인지 확인합니다.
                const isOpened = openedDesktopItemId === item.id;

                return (
                  <li
                    className={styles['desktopNavItem']}
                    key={item.id}
                    onMouseEnter={() => {
                      // 하위 메뉴가 없는 항목에 마우스를 올리면
                      // 기존에 열려 있던 다른 드롭다운만 닫고 끝냅니다.
                      if (!isExpandable) {
                        closeDesktopMenu();
                        closeAccountMenu();
                        return;
                      }

                      // 하위 메뉴가 있으면 해당 메뉴를 엽니다.
                      closeAccountMenu();
                      openDesktopMenu(item);
                    }}
                  >
                    {isExpandable ? (
                      <LinkComponent
                        // 상위 메뉴도 실제 목록 페이지로 이동할 수 있어야 하므로
                        // 버튼 대신 링크로 렌더링합니다.
                        aria-expanded={isOpened}
                        // 이 링크에 하위 메뉴가 연결되어 있다는 뜻을 보조기기에 전달합니다.
                        aria-haspopup='true'
                        className={classNames(
                          styles['desktopNavTrigger'],
                          isOpened && styles['desktopNavTriggerActive'],
                        )}
                        onClick={closeDesktopMenu}
                        onFocus={() => {
                          // 키보드 포커스로 이동했을 때도 드롭다운을 먼저 열어,
                          // 사용자가 하위 메뉴 구조를 바로 인지할 수 있게 합니다.
                          openDesktopMenu(item);
                        }}
                        to={item.to}
                      >
                        <span>{item.label}</span>
                      </LinkComponent>
                    ) : (
                      // 하위 메뉴가 없는 항목은 일반 링크로 렌더링합니다.
                      <LinkComponent
                        className={styles['desktopNavLink']}
                        onClick={closeDesktopMenu}
                        to={item.to}
                      >
                        {item.label}
                      </LinkComponent>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 데스크톱 오른쪽 유틸리티 영역입니다.
          장바구니와 로그인/마이페이지 액션을 표시합니다. */}
          <div className={styles['desktopUtilityArea']}>
            <LinkComponent
              className={classNames(styles['iconLink'], styles['cartIconLink'])}
              onClick={() => {
                closeDesktopMenu();
                closeAccountMenu();
              }}
              to={routePaths.cart}
            >
              {/* 시각적으로는 아이콘만 보여도,
              스크린 리더를 위해 텍스트를 숨겨 둡니다. */}
              <span className={styles['srOnly']}>장바구니</span>
              <img
                alt=''
                aria-hidden='true'
                className={classNames(styles['iconImage'], styles['iconImageCart'])}
                src={cartIconSrc}
              />
              {cartItemCount > 0 ? (
                <span
                  aria-hidden='true'
                  className={styles['cartCountBadge']}
                  data-testid='cart-count-badge'
                >
                  {cartItemCountLabel}
                </span>
              ) : null}
            </LinkComponent>

            <div className={styles['authActionGroup']}>
              {/* 로그인 여부에 따라 마이페이지 링크 또는 로그인 버튼을 분기합니다. */}
              {isAuthenticated ? (
                <div className={styles['accountMenu']} ref={accountMenuRef}>
                  <button
                    aria-expanded={isAccountMenuOpen}
                    aria-haspopup='menu'
                    aria-label='계정 메뉴'
                    className={classNames(styles['iconButton'], styles['accountMenuTrigger'])}
                    onClick={() => {
                      closeDesktopMenu();
                      setIsAccountMenuOpen((current) => !current);
                    }}
                    type='button'
                  >
                    <img
                      alt=''
                      aria-hidden='true'
                      className={classNames(styles['iconImage'], styles['iconImageMy'])}
                      src={myPageIconSrc}
                    />
                  </button>

                  {isAccountMenuOpen ? (
                    <div className={styles['accountMenuPanel']} role='menu'>
                      <LinkComponent
                        className={styles['accountMenuLink']}
                        onClick={() => {
                          closeAccountMenu();
                        }}
                        to={routePaths.mypage}
                      >
                        마이페이지
                      </LinkComponent>
                      <button
                        className={styles['accountMenuButton']}
                        disabled={logoutMutation.isPending}
                        onClick={() => {
                          logoutMutation.mutate();
                        }}
                        type='button'
                      >
                        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <LinkComponent
                  className={classNames(styles['textActionLink'], styles['textActionLinkPrimary'])}
                  onClick={() => {
                    closeDesktopMenu();
                    closeAccountMenu();
                  }}
                  to={routePaths.login}
                >
                  로그인
                </LinkComponent>
              )}
            </div>
          </div>

          {/* 모바일 상단 유틸리티 영역입니다.
          데스크톱과 달리 장바구니와 메뉴 열기/닫기 버튼만 보여 줍니다. */}
          <div className={styles['mobileUtilityArea']}>
            <LinkComponent
              className={classNames(styles['iconLink'], styles['cartIconLink'])}
              onClick={() => {
                closeMobileMenu();
                closeAccountMenu();
              }}
              to={routePaths.cart}
            >
              {/* 모바일 아이콘 링크도 동일하게 접근성 텍스트를 제공합니다. */}
              <span className={styles['srOnly']}>장바구니</span>
              <img
                alt=''
                aria-hidden='true'
                className={classNames(styles['iconImage'], styles['iconImageCart'])}
                src={cartIconSrc}
              />
              {cartItemCount > 0 ? (
                <span
                  aria-hidden='true'
                  className={styles['cartCountBadge']}
                  data-testid='cart-count-badge'
                >
                  {cartItemCountLabel}
                </span>
              ) : null}
            </LinkComponent>

            <button
              // 모바일 드로어가 열려 있는지 여부를 보조기기에 전달합니다.
              aria-expanded={isMobileMenuOpen}
              // 한 버튼이 열기/닫기 두 역할을 하므로 상태에 따라 라벨을 바꿉니다.
              aria-label={isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
              className={styles['iconButton']}
              onClick={handleToggleMobileMenu}
              ref={mobileMenuButtonRef}
              type='button'
            >
              {/* 열려 있으면 닫기 아이콘, 닫혀 있으면 햄버거 아이콘을 보여 줍니다. */}
              {isMobileMenuOpen ? (
                <CloseIcon aria-hidden='true' />
              ) : (
                <MenuIcon aria-hidden='true' />
              )}
            </button>
          </div>
        </div>

        {/* 하위 메뉴가 있는 데스크톱 항목이 열려 있을 때만 드롭다운 패널을 렌더링합니다. */}
        {renderedDesktopDropdownItem ? (
          <CommonHeaderDesktopDropdownPanel
            // 드롭다운 패널 내부에서도 같은 LinkComponent를 계속 재사용할 수 있게 전달합니다.
            isVisible={isDesktopDropdownVisible}
            item={renderedDesktopDropdownItem}
            LinkComponent={LinkComponent}
            onCloseMenu={closeDesktopMenu}
          />
        ) : null}

        {/* 모바일 메뉴가 열려 있을 때만 전체 화면 드로어를 렌더링합니다. */}
        {isMobileMenuOpen ? (
          <CommonHeaderMobileDrawer
            expandedMobileItemIds={expandedMobileItemIds}
            isAuthenticated={isAuthenticated}
            isError={isError}
            LinkComponent={LinkComponent}
            logo={logo}
            navigationItems={navigationItems}
            onCloseMenu={closeMobileMenu}
            onCloseMenuAndRestoreFocus={closeMobileMenuAndRestoreFocus}
            onToggleMobileItem={handleToggleMobileItem}
          />
        ) : null}
      </header>
      {/* fixed 헤더만큼의 빈 공간을 문서 흐름에 넣어,
      아래 본문이 헤더 뒤에 가려지지 않게 합니다. */}
      <div
        aria-hidden='true'
        className={styles['headerOffset']}
        style={{ height: `${String(headerOffsetHeightPx)}px` }}
      />
    </>
  );
};

export default CommonHeader;
