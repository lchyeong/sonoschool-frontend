import type { ReactNode } from 'react';

import myPageIconSrc from '@/assets/icons/icon_my.svg';
import cartIconSrc from '@/assets/icons/shopping-cart.svg';
import ChevronDownIcon from '@/components/ui/icons/ChevronDownIcon';
import CloseIcon from '@/components/ui/icons/CloseIcon';
import { routePaths } from '@/routes/routeRegistry';
import type { HeaderNavigationItem } from '@/utils/buildHeaderNavigation';
import { classNames } from '@/utils/classNames';

import styles from './CommonHeader.module.scss';
import type { CommonHeaderLinkComponent, CommonHeaderLogoConfig } from './CommonHeader.types';
import { hasNavigationChildren } from './commonHeaderShared';

interface CommonHeaderMobileDrawerProps {
  isAuthenticated: boolean;
  isError: boolean;
  logo: CommonHeaderLogoConfig;
  LinkComponent: CommonHeaderLinkComponent;
  navigationItems: HeaderNavigationItem[];
  expandedMobileItemIds: string[];
  onCloseMenu: () => void;
  onCloseMenuAndRestoreFocus: () => void;
  onToggleMobileItem: (itemId: string) => void;
}

const getMobileNavigationDepthClassName = (depth: number): string => {
  switch (depth) {
    case 1:
      return styles['mobileNavListDepth1'];
    case 2:
      return styles['mobileNavListDepth2'];
    default:
      return styles['mobileNavListDepth3'];
  }
};

const CommonHeaderMobileDrawer = ({
  expandedMobileItemIds,
  isAuthenticated,
  isError,
  LinkComponent,
  logo,
  navigationItems,
  onCloseMenu,
  onCloseMenuAndRestoreFocus,
  onToggleMobileItem,
}: CommonHeaderMobileDrawerProps) => {
  const renderMobileNavigation = (items: HeaderNavigationItem[], depth: number): ReactNode => {
    return (
      <ul className={classNames(styles['mobileNavList'], getMobileNavigationDepthClassName(depth))}>
        {items.map((item) => {
          const isExpanded = expandedMobileItemIds.includes(item.id);
          const isExpandable = hasNavigationChildren(item);

          return (
            <li className={styles['mobileNavItem']} key={item.id}>
              <div className={styles['mobileNavRow']}>
                <LinkComponent
                  className={classNames(
                    styles['mobileNavLink'],
                    depth === 1 && styles['mobileNavLinkPrimary'],
                    depth === 2 && styles['mobileNavLinkSecondary'],
                    depth === 3 && styles['mobileNavLinkTertiary'],
                  )}
                  onClick={onCloseMenu}
                  to={item.to}
                >
                  {item.label}
                </LinkComponent>
                {isExpandable ? (
                  <button
                    aria-expanded={isExpanded}
                    aria-label={`${item.label} 하위 메뉴 ${isExpanded ? '닫기' : '열기'}`}
                    className={classNames(
                      styles['mobileNavToggle'],
                      isExpanded && styles['mobileNavToggleExpanded'],
                    )}
                    onClick={() => {
                      onToggleMobileItem(item.id);
                    }}
                    type='button'
                  >
                    <ChevronDownIcon aria-hidden='true' />
                  </button>
                ) : null}
              </div>
              {isExpandable && isExpanded && item.children?.length
                ? renderMobileNavigation(item.children, depth + 1)
                : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      className={styles['mobileDrawerOverlay']}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;

        onCloseMenuAndRestoreFocus();
      }}
    >
      <div
        aria-label='모바일 메뉴'
        aria-modal='true'
        className={styles['mobileDrawer']}
        role='dialog'
      >
        <div className={styles['mobileDrawerHeader']}>
          <div className={styles['mobileDrawerBrand']}>{logo.label}</div>

          <button
            aria-label='모바일 메뉴 닫기'
            className={styles['iconButton']}
            onClick={onCloseMenuAndRestoreFocus}
            type='button'
          >
            <CloseIcon aria-hidden='true' />
          </button>
        </div>
        <div className={styles['mobileActionGroup']}>
          {isAuthenticated ? (
            <LinkComponent
              className={classNames(styles['mobileActionLink'], styles['mobileActionLinkPrimary'])}
              onClick={onCloseMenu}
              to={routePaths.mypage}
            >
              <img
                alt=''
                aria-hidden='true'
                className={styles['textActionIcon']}
                src={myPageIconSrc}
              />
              <span>마이페이지</span>
            </LinkComponent>
          ) : (
            <LinkComponent
              className={classNames(styles['mobileActionLink'], styles['mobileActionLinkPrimary'])}
              onClick={onCloseMenu}
              to={routePaths.login}
            >
              로그인
            </LinkComponent>
          )}
          <LinkComponent
            className={classNames(styles['mobileActionLink'], styles['mobileActionLinkSecondary'])}
            onClick={onCloseMenu}
            to={routePaths.cart}
          >
            <img alt='' aria-hidden='true' className={styles['textActionIcon']} src={cartIconSrc} />
            <span>장바구니</span>
          </LinkComponent>
        </div>
        {isError ? (
          <p className={styles['mobileErrorText']}>
            일부 메뉴를 불러오지 못했습니다. 기본 메뉴만 표시됩니다.
          </p>
        ) : null}
        <nav aria-label='Mobile primary' className={styles['mobileNav']}>
          {renderMobileNavigation(navigationItems, 1)}
        </nav>
      </div>
    </div>
  );
};

export default CommonHeaderMobileDrawer;
