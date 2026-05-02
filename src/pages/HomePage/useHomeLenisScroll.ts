import { useEffect } from 'react';

import Lenis from 'lenis';

export const useHomeLenisScroll = () => {
  useEffect(() => {
    const previousBehavior = document.documentElement.style.scrollBehavior;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.documentElement.style.scrollBehavior = 'auto';

    if (prefersReducedMotion) {
      return () => {
        document.documentElement.style.scrollBehavior = previousBehavior;
      };
    }

    const lenis = new Lenis({
      duration: 1.6,
      gestureOrientation: 'vertical',
      infinite: false,
      orientation: 'vertical',
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: 0.9,
    });

    let animationFrameId = 0;

    const updateScroll = (time: number) => {
      lenis.raf(time);
      animationFrameId = window.requestAnimationFrame(updateScroll);
    };

    animationFrameId = window.requestAnimationFrame(updateScroll);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      document.documentElement.style.scrollBehavior = previousBehavior;
    };
  }, []);
};
