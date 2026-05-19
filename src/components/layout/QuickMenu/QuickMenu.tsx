import { useEffect, useId, useState } from 'react';

import { Link } from 'react-router-dom';

import quickMenuArrowUpIconSrc from '@/assets/icons/quick-menu-arrow-up.svg';
import quickMenuBlogIconSrc from '@/assets/icons/quick-menu-blog.svg';
import quickMenuKakaoChannelIconSrc from '@/assets/icons/quick-menu-kakao-channel.svg';
import quickMenuLightningIconSrc from '@/assets/icons/quick-menu-lightning.svg';
import quickMenuLocationIconSrc from '@/assets/icons/quick-menu-location.svg';
import { routePaths } from '@/routes/routeRegistry';
import { classNames } from '@/utils/classNames';

import styles from './QuickMenu.module.scss';

interface QuickMenuLinkItem {
  href?: string;
  iconSrc: string;
  label: string;
  to?: string;
}

const quickMenuLinks: QuickMenuLinkItem[] = [
  {
    href: 'https://pf.kakao.com/_xlxlxiqX',
    iconSrc: quickMenuKakaoChannelIconSrc,
    label: '카톡채널',
  },
  {
    href: 'https://blog.naver.com/sonoschool',
    iconSrc: quickMenuBlogIconSrc,
    label: '블로그',
  },
  {
    iconSrc: quickMenuLocationIconSrc,
    label: '위치안내',
    to: routePaths.homeLocation,
  },
];

const QUICK_MENU_VISIBLE_SCROLL_Y = 80;

const getIsQuickMenuVisible = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.scrollY > QUICK_MENU_VISIBLE_SCROLL_Y;
};

const scrollToPageTop = () => {
  try {
    window.scrollTo({
      behavior: 'smooth',
      left: 0,
      top: 0,
    });
  } catch {
    window.scrollTo(0, 0);
  }
};

const QuickMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(getIsQuickMenuVisible);
  const menuId = useId();

  useEffect(() => {
    const handleScroll = () => {
      const nextIsVisible = getIsQuickMenuVisible();

      setIsVisible(nextIsVisible);

      if (!nextIsVisible) {
        setIsOpen(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen((currentIsOpen) => !currentIsOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <aside
      aria-hidden={!isVisible}
      aria-label='빠른 메뉴'
      className={classNames(styles['quickMenu'], isVisible && styles['quickMenuVisible'])}
    >
      <div
        className={classNames(styles['menuPanel'], isOpen && styles['menuPanelOpen'])}
        id={menuId}
      >
        <ul className={styles['menuList']}>
          {quickMenuLinks.map((item) => {
            const content = (
              <>
                <img alt='' aria-hidden='true' className={styles['menuIcon']} src={item.iconSrc} />
                <span className={styles['menuLabel']}>{item.label}</span>
              </>
            );

            return (
              <li key={item.label} className={styles['menuItem']}>
                {item.to ? (
                  <Link
                    aria-label={item.label}
                    className={styles['menuLink']}
                    onClick={closeMenu}
                    to={item.to}
                  >
                    {content}
                  </Link>
                ) : (
                  <a
                    aria-label={item.label}
                    className={styles['menuLink']}
                    href={item.href}
                    onClick={closeMenu}
                    rel='noreferrer'
                    target={item.href?.startsWith('http') ? '_blank' : undefined}
                  >
                    {content}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label={isOpen ? '빠른 메뉴 닫기' : '빠른 메뉴 열기'}
        className={styles['quickMenuButton']}
        onClick={toggleMenu}
        type='button'
      >
        <img
          alt=''
          aria-hidden='true'
          className={styles['quickMenuIcon']}
          src={quickMenuLightningIconSrc}
        />
        <span className={styles['quickMenuLabel']}>퀵메뉴</span>
      </button>

      <button
        aria-label='페이지 상단으로 이동'
        className={styles['topButton']}
        onClick={() => {
          scrollToPageTop();
          closeMenu();
        }}
        type='button'
      >
        <img
          alt=''
          aria-hidden='true'
          className={styles['topIcon']}
          src={quickMenuArrowUpIconSrc}
        />
      </button>
    </aside>
  );
};

export default QuickMenu;
