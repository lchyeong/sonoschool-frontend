import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { HEADER_HIDE_START_SCROLL_Y_PX } from './commonHeaderShared';

interface UseCommonHeaderAutoHideOptions {
  isMobileMenuOpen: boolean;
  isDesktopMenuOpen: boolean;
  isDesktopDropdownVisible: boolean;
}

export const useCommonHeaderAutoHide = ({
  isDesktopDropdownVisible,
  isDesktopMenuOpen,
  isMobileMenuOpen,
}: UseCommonHeaderAutoHideOptions) => {
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  const lastWindowScrollYRef = useRef(0);

  const isHeaderAutoToggleBlocked = (currentWindowScrollY: number) => {
    return (
      isMobileMenuOpen ||
      isDesktopMenuOpen ||
      isDesktopDropdownVisible ||
      currentWindowScrollY <= HEADER_HIDE_START_SCROLL_Y_PX
    );
  };

  const handleWindowScroll = useEffectEvent(() => {
    const currentWindowScrollY = window.scrollY;
    const previousWindowScrollY = lastWindowScrollYRef.current;
    const scrollDeltaY = currentWindowScrollY - previousWindowScrollY;

    lastWindowScrollYRef.current = currentWindowScrollY;

    if (isHeaderAutoToggleBlocked(currentWindowScrollY)) {
      setIsHeaderHidden(false);
      return;
    }

    setIsHeaderHidden((currentIsHeaderHidden) => {
      if (scrollDeltaY > 0) {
        return true;
      }

      if (scrollDeltaY < 0) {
        return false;
      }

      return currentIsHeaderHidden;
    });
  });

  useEffect(() => {
    lastWindowScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      handleWindowScroll();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return isHeaderHidden;
};
