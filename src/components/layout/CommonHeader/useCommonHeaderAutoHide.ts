import { useEffect, useEffectEvent, useRef, useState } from 'react';

import {
  HEADER_HIDE_START_SCROLL_Y_PX,
  RECENT_SCROLL_INPUT_GRACE_PERIOD_MS,
} from './commonHeaderShared';

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
  const lastTouchClientYRef = useRef<number | null>(null);
  const recentScrollInputTimestampRef = useRef<number | null>(null);

  const isHeaderAutoToggleBlocked = (currentWindowScrollY: number) => {
    return (
      isMobileMenuOpen ||
      isDesktopMenuOpen ||
      isDesktopDropdownVisible ||
      currentWindowScrollY <= HEADER_HIDE_START_SCROLL_Y_PX
    );
  };

  const markRecentScrollInput = () => {
    recentScrollInputTimestampRef.current = performance.now();
  };

  const hasRecentScrollInput = () => {
    return (
      recentScrollInputTimestampRef.current !== null &&
      performance.now() - recentScrollInputTimestampRef.current <=
        RECENT_SCROLL_INPUT_GRACE_PERIOD_MS
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

    if (hasRecentScrollInput()) {
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

  const handleWindowWheel = useEffectEvent((event: WheelEvent) => {
    if (event.deltaY === 0) {
      return;
    }

    markRecentScrollInput();

    if (isHeaderAutoToggleBlocked(window.scrollY)) {
      setIsHeaderHidden(false);
      return;
    }

    setIsHeaderHidden(event.deltaY > 0);
  });

  const handleWindowTouchStart = useEffectEvent((event: TouchEvent) => {
    const touch = event.touches[0];
    lastTouchClientYRef.current = touch.clientY;
  });

  const handleWindowTouchMove = useEffectEvent((event: TouchEvent) => {
    const touch = event.touches[0];
    const previousTouchClientY = lastTouchClientYRef.current;

    lastTouchClientYRef.current = touch.clientY;

    if (previousTouchClientY === null || touch.clientY === previousTouchClientY) {
      return;
    }

    markRecentScrollInput();

    if (isHeaderAutoToggleBlocked(window.scrollY)) {
      setIsHeaderHidden(false);
      return;
    }

    setIsHeaderHidden(touch.clientY < previousTouchClientY);
  });

  const resetWindowTouchTracking = useEffectEvent(() => {
    lastTouchClientYRef.current = null;
  });

  useEffect(() => {
    lastWindowScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      handleWindowScroll();
    };
    const handleWheel = (event: WheelEvent) => {
      handleWindowWheel(event);
    };
    const handleTouchStart = (event: TouchEvent) => {
      handleWindowTouchStart(event);
    };
    const handleTouchMove = (event: TouchEvent) => {
      handleWindowTouchMove(event);
    };
    const handleTouchEnd = () => {
      resetWindowTouchTracking();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return isHeaderHidden;
};
