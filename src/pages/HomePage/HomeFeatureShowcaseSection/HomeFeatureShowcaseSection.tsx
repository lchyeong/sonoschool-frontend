import { useEffect, useRef, type CSSProperties } from 'react';

import { routePaths } from '@/routes/routeRegistry';
import { classNames } from '@/utils/classNames';

import styles from './HomeFeatureShowcaseSection.module.scss';

const homeFeatureShowcaseCards = [
  {
    category: 'Hands-on Class',
    id: 'home-feature-showcase-card-1',
    imageAlt: '내과 의국에서 진행된 현장 중심 초음파 실습 교육',
    imageSrc: '/images/home/feature-showcase/showcase-card-1.png',
    titleLines: ['내과 의국에서 진행된', '현장 중심 초음파 실습 교육'],
  },
  {
    category: 'Hands-on Class',
    id: 'home-feature-showcase-card-2',
    imageAlt: '대학병원 교수진과 함께한 실전 초음파 교육',
    imageSrc: '/images/home/feature-showcase/showcase-card-2.png',
    titleLines: ['대학병원 교수진과 함께한', '실전 초음파 교육'],
  },
  {
    category: 'Hands-on Class',
    id: 'home-feature-showcase-card-3',
    imageAlt: '전문의를 대상으로 진행한 장초음파 강의 현장',
    imageSrc: '/images/home/feature-showcase/intestine-ultrasound-lecture.png',
    titleLines: ['전문의를 대상으로 진행한', '장초음파 강의 현장'],
  },
  {
    category: 'Hands-on Class',
    id: 'home-feature-showcase-card-4',
    imageAlt: '지역의사회와 함께한 Head & Neck 초음파 강의',
    imageSrc: '/images/home/feature-showcase/showcase-card-4.png',
    titleLines: ['지역의사회와 함께한', 'Head & Neck 초음파 강의'],
  },
  {
    category: 'Hands-on Class',
    id: 'home-feature-showcase-card-5',
    imageAlt: '임상 질환 중심의 실전 초음파 교육 현장',
    imageSrc: '/images/home/feature-showcase/showcase-card-5.png',
    titleLines: ['임상 질환 중심의', '실전 초음파 교육 현장'],
  },
] as const;

const clamp = (value: number, min = 0, max = 1) => {
  return Math.min(Math.max(value, min), max);
};

const easeInOutProgress = (value: number) => {
  return value * value * (3 - 2 * value);
};

const HOME_HERO_SELECTOR = "section[aria-labelledby='home-hero-heading']";
const HERO_FADE_START_RATIO = 0.38;
const HERO_FADE_END_RATIO = 0.9;
const INTRO_APPEAR_DELAY_PROGRESS = 0.18;
const HOME_BACKGROUND_RGB = {
  from: [255, 255, 255],
  to: [55, 186, 167],
} as const;
const SHOWCASE_BACKGROUND_ENTER_START_RATIO = 0.86;
const SHOWCASE_BACKGROUND_ENTER_END_RATIO = -0.24;
const COURSES_BACKGROUND_EXIT_START_RATIO = 0.82;
const COURSES_BACKGROUND_EXIT_END_RATIO = -0.14;

const getViewportRangeProgress = (
  targetTop: number,
  viewportHeight: number,
  startRatio: number,
  endRatio: number,
) => {
  return clamp(
    (viewportHeight * startRatio - targetTop) / (viewportHeight * (startRatio - endRatio)),
  );
};

const getShowcaseStep = (progress: number) => {
  if (progress >= 0.98) {
    return 8;
  }

  if (progress >= 0.9) {
    return 7;
  }

  if (progress >= 0.74) {
    return 6;
  }

  if (progress >= 0.62) {
    return 5;
  }

  if (progress >= 0.5) {
    return 4;
  }

  if (progress >= 0.38) {
    return 3;
  }

  if (progress >= 0.26) {
    return 2;
  }

  if (progress >= 0.08) {
    return 1;
  }

  return 0;
};

const getHomeBackgroundColor = (progress: number) => {
  const [fromRed, fromGreen, fromBlue] = HOME_BACKGROUND_RGB.from;
  const [toRed, toGreen, toBlue] = HOME_BACKGROUND_RGB.to;
  const red = Math.round(fromRed + (toRed - fromRed) * progress);
  const green = Math.round(fromGreen + (toGreen - fromGreen) * progress);
  const blue = Math.round(fromBlue + (toBlue - fromBlue) * progress);

  return `rgb(${String(red)} ${String(green)} ${String(blue)})`;
};

type IntroRevealStyle = CSSProperties & {
  '--intro-heading-blur': string;
  '--intro-heading-exit-opacity': number;
  '--intro-heading-exit-y': string;
  '--intro-heading-line-1-position': string;
  '--intro-heading-line-2-position': string;
  '--intro-heading-line-3-position': string;
  '--intro-heading-line-4-position': string;
  '--intro-heading-progress': number;
  '--intro-heading-y': string;
};

const HomeFeatureShowcaseSection = () => {
  const introSceneRef = useRef<HTMLDivElement>(null);
  const showcasePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const introSceneElement = introSceneRef.current;

    if (!introSceneElement) {
      return undefined;
    }

    let animationFrameId = 0;

    const updateIntroRevealProgress = () => {
      animationFrameId = 0;

      const rect = introSceneElement.getBoundingClientRect();
      const homeHeroElement = document.querySelector<HTMLElement>(HOME_HERO_SELECTOR);
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const scrollableDistance = Math.max(rect.height - viewportHeight, 1);
      const heroRect = homeHeroElement?.getBoundingClientRect();
      const heroTop = heroRect ? heroRect.top + window.scrollY : 0;
      const heroHeight = heroRect?.height ?? viewportHeight;
      const heroFadeStart = heroTop + heroHeight * HERO_FADE_START_RATIO;
      const heroFadeEnd = heroTop + heroHeight * HERO_FADE_END_RATIO;
      const heroFadeDistance = Math.max(heroFadeEnd - heroFadeStart, 1);
      const heroFadeProgress = clamp((window.scrollY - heroFadeStart) / heroFadeDistance);
      const rawProgress = clamp(
        (heroFadeProgress - INTRO_APPEAR_DELAY_PROGRESS) / (1 - INTRO_APPEAR_DELAY_PROGRESS),
      );
      const fillProgress = clamp(-rect.top / scrollableDistance);
      const appearProgress = rawProgress;
      const easedAppearProgress = easeInOutProgress(appearProgress);
      const exitProgress = easeInOutProgress(
        clamp((viewportHeight * 0.82 - rect.bottom) / (viewportHeight * 0.42)),
      );
      const line1Progress = easeInOutProgress(clamp(fillProgress * 4));
      const line2Progress = easeInOutProgress(clamp(fillProgress * 4 - 1));
      const line3Progress = easeInOutProgress(clamp(fillProgress * 4 - 2));
      const line4Progress = easeInOutProgress(clamp(fillProgress * 4 - 3));
      const translateY = (1 - easedAppearProgress) * 34;

      introSceneElement.style.setProperty('--intro-heading-blur', '0px');
      introSceneElement.style.setProperty(
        '--intro-heading-exit-opacity',
        (1 - exitProgress).toFixed(4),
      );
      introSceneElement.style.setProperty(
        '--intro-heading-exit-y',
        `${(-42 * exitProgress).toFixed(2)}px`,
      );
      introSceneElement.style.setProperty(
        '--intro-heading-line-1-position',
        `${(100 - line1Progress * 100).toFixed(2)}%`,
      );
      introSceneElement.style.setProperty(
        '--intro-heading-line-2-position',
        `${(100 - line2Progress * 100).toFixed(2)}%`,
      );
      introSceneElement.style.setProperty(
        '--intro-heading-line-3-position',
        `${(100 - line3Progress * 100).toFixed(2)}%`,
      );
      introSceneElement.style.setProperty(
        '--intro-heading-line-4-position',
        `${(100 - line4Progress * 100).toFixed(2)}%`,
      );
      introSceneElement.style.setProperty(
        '--intro-heading-progress',
        easedAppearProgress.toFixed(4),
      );
      introSceneElement.style.setProperty('--intro-heading-y', `${translateY.toFixed(2)}px`);
    };

    const requestIntroRevealProgressUpdate = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateIntroRevealProgress);
    };

    updateIntroRevealProgress();

    window.addEventListener('scroll', requestIntroRevealProgressUpdate, { passive: true });
    window.addEventListener('resize', requestIntroRevealProgressUpdate);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('scroll', requestIntroRevealProgressUpdate);
      window.removeEventListener('resize', requestIntroRevealProgressUpdate);
    };
  }, []);

  useEffect(() => {
    const showcasePanelElement = showcasePanelRef.current;
    const introSceneElement = introSceneRef.current;
    const featuredCoursesElement = document.querySelector<HTMLElement>(
      '[data-home-featured-courses-section]',
    );

    if (!showcasePanelElement) {
      return undefined;
    }

    let animationFrameId = 0;
    let lastBackgroundColor = '';
    let lastCopyOpacity = '';
    let lastCopyToneProgress = '';
    let lastCopyY = '';
    let lastCardScale = '';
    let lastCardScrollY = '';
    let lastFeaturedCoursesTone = '';

    const updateShowcaseStep = () => {
      animationFrameId = 0;

      const rect = showcasePanelElement.getBoundingClientRect();
      const introRect = introSceneElement?.getBoundingClientRect();
      const featuredCoursesRect = featuredCoursesElement?.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isStackedLayout = window.innerWidth < 960;
      const isMobileCardStackLayout = window.innerWidth < 768;
      const stickyDistance = Math.max(rect.height - viewportHeight, 1);
      const revealStart = viewportHeight * (isStackedLayout ? 0.92 : 0.78);
      const revealDistance = isStackedLayout
        ? Math.max(viewportHeight * 0.9, rect.height * 0.42)
        : Math.max(viewportHeight * 1.8, rect.height * 0.82);
      const progress = clamp((revealStart - rect.top) / revealDistance);
      const cardProgress = clamp(-rect.top / stickyDistance);
      const backgroundEnterProgress = introRect
        ? easeInOutProgress(
            getViewportRangeProgress(
              introRect.bottom,
              viewportHeight,
              SHOWCASE_BACKGROUND_ENTER_START_RATIO,
              SHOWCASE_BACKGROUND_ENTER_END_RATIO,
            ),
          )
        : 0;
      const backgroundExitProgress = featuredCoursesRect
        ? easeInOutProgress(
            getViewportRangeProgress(
              featuredCoursesRect.top,
              viewportHeight,
              COURSES_BACKGROUND_EXIT_START_RATIO,
              COURSES_BACKGROUND_EXIT_END_RATIO,
            ),
          )
        : 0;
      const backgroundProgress = backgroundEnterProgress * (1 - backgroundExitProgress);
      const hasSettledShowcaseCopy = introRect ? introRect.bottom <= viewportHeight * 0.43 : false;
      const copyRevealProgress = isStackedLayout
        ? easeInOutProgress(clamp((progress - 0.02) / 0.16))
        : easeInOutProgress(clamp((progress - 0.02) / 0.14));
      const cardRevealProgress = isStackedLayout ? progress : clamp((progress - 0.18) / 0.82);
      const cardScrollProgress = isStackedLayout
        ? cardProgress
        : clamp((cardProgress - 0.02) / 0.86);
      const cardMotionProgress = isStackedLayout
        ? cardScrollProgress
        : clamp((cardProgress - 0.02) / 0.98);
      const cardScaleProgress = isStackedLayout
        ? 1
        : easeInOutProgress(clamp((cardProgress - 0.1) / 0.38));
      const desktopCardStartY = viewportHeight * 0.86;
      const cardListElement = showcasePanelElement.querySelector<HTMLElement>(
        '[data-showcase-card-list]',
      );
      const cardListHeight = cardListElement?.offsetHeight ?? viewportHeight * 2;
      const cardListOffsetTop = cardListElement?.offsetTop ?? viewportHeight * 0.05;
      const desktopCardEndY = Math.min(
        viewportHeight * -0.78,
        viewportHeight * 0.16 - cardListOffsetTop - cardListHeight,
      );
      const cardScrollY = isStackedLayout
        ? isMobileCardStackLayout
          ? 0
          : viewportHeight * 0.36 - cardMotionProgress * viewportHeight * 1.06
        : desktopCardStartY - cardMotionProgress * (desktopCardStartY - desktopCardEndY);
      const mobileStackPhase = isMobileCardStackLayout
        ? clamp((cardProgress - 0.08) / 0.82) * (homeFeatureShowcaseCards.length - 1)
        : 0;
      const nextStep = getShowcaseStep(cardRevealProgress);
      const currentStep = Number(showcasePanelElement.dataset['showcaseStep'] ?? 0);
      const nextBackgroundColor = getHomeBackgroundColor(backgroundProgress);
      const nextCopyOpacity =
        copyRevealProgress === 0 ? '0' : (0.25 + copyRevealProgress * 0.75).toFixed(4);
      const copyToneProgress = easeInOutProgress(
        isStackedLayout ? clamp((progress - 0.04) / 0.18) : clamp((cardProgress - 0.01) / 0.07),
      );
      const nextCopyY = isStackedLayout
        ? `${(24 * (1 - copyRevealProgress)).toFixed(2)}px`
        : hasSettledShowcaseCopy || copyRevealProgress > 0
          ? '0vh'
          : '15vh';
      const nextCopyToneProgress = copyToneProgress.toFixed(4);
      const nextCardScale = isStackedLayout ? '1' : (0.965 + cardScaleProgress * 0.035).toFixed(4);
      const nextCardScrollY = `${cardScrollY.toFixed(2)}px`;
      const nextFeaturedCoursesTone = backgroundExitProgress >= 0.72 ? 'light' : 'contrast';

      if (lastBackgroundColor !== nextBackgroundColor) {
        document.documentElement.style.setProperty('--home-page-background', nextBackgroundColor);
        lastBackgroundColor = nextBackgroundColor;
      }

      if (lastCopyOpacity !== nextCopyOpacity) {
        showcasePanelElement.style.setProperty('--showcase-copy-opacity', nextCopyOpacity);
        lastCopyOpacity = nextCopyOpacity;
      }

      if (lastCopyToneProgress !== nextCopyToneProgress) {
        showcasePanelElement.style.setProperty(
          '--showcase-copy-tone-progress',
          nextCopyToneProgress,
        );
        lastCopyToneProgress = nextCopyToneProgress;
      }

      if (lastCopyY !== nextCopyY) {
        showcasePanelElement.style.setProperty('--showcase-copy-y', nextCopyY);
        lastCopyY = nextCopyY;
      }

      if (lastCardScale !== nextCardScale) {
        showcasePanelElement.style.setProperty('--showcase-card-scale', nextCardScale);
        lastCardScale = nextCardScale;
      }

      if (lastCardScrollY !== nextCardScrollY) {
        showcasePanelElement.style.setProperty('--showcase-card-scroll-y', nextCardScrollY);
        lastCardScrollY = nextCardScrollY;
      }

      homeFeatureShowcaseCards.forEach((_, index) => {
        const cardNumber = index + 1;
        const followStart = isStackedLayout ? 0 : index === 0 ? -0.04 : 0.22 + (index - 1) * 0.105;
        const followDuration = isStackedLayout
          ? 1
          : index === 0
            ? 0.18
            : Math.max(0.12, 0.19 - index * 0.014);
        const sequentialCardProgress = isStackedLayout
          ? 1
          : easeInOutProgress(clamp((cardScrollProgress - followStart) / followDuration));
        const sequentialCardOpacity =
          sequentialCardProgress === 0 ? 0 : 0.12 + sequentialCardProgress * 0.88;
        const sequentialCardBlur = 14 * (1 - sequentialCardProgress);
        const revealOffset = 52 * (1 - sequentialCardProgress);
        const catchupOffset = 22 * (1 - sequentialCardProgress);
        const sequentialCardOffset = `calc(${catchupOffset.toFixed(2)}vh + ${revealOffset.toFixed(
          2,
        )}px)`;
        const enterProgress = index === 0 ? 1 : clamp(mobileStackPhase - (index - 1));
        const leaveProgress =
          index === homeFeatureShowcaseCards.length - 1 ? 0 : clamp(mobileStackPhase - index);
        const stackedOffset = index * 10 * (1 - enterProgress);
        const exitOffset = 560 * leaveProgress;
        const opacity = 1 - clamp((leaveProgress - 0.42) / 0.28);

        showcasePanelElement.style.setProperty(
          `--showcase-card-${String(cardNumber)}-opacity`,
          sequentialCardOpacity.toFixed(4),
        );
        showcasePanelElement.style.setProperty(
          `--showcase-card-${String(cardNumber)}-blur`,
          `${sequentialCardBlur.toFixed(2)}px`,
        );
        showcasePanelElement.style.setProperty(
          `--showcase-card-${String(cardNumber)}-y`,
          sequentialCardOffset,
        );
        showcasePanelElement.style.setProperty(
          `--showcase-mobile-card-${String(cardNumber)}-y`,
          `${(stackedOffset - exitOffset).toFixed(2)}px`,
        );
        showcasePanelElement.style.setProperty(
          `--showcase-mobile-card-${String(cardNumber)}-opacity`,
          opacity.toFixed(4),
        );
      });

      if (featuredCoursesElement && lastFeaturedCoursesTone !== nextFeaturedCoursesTone) {
        featuredCoursesElement.dataset['introTone'] = nextFeaturedCoursesTone;
        lastFeaturedCoursesTone = nextFeaturedCoursesTone;
      }

      if (currentStep === nextStep) {
        return;
      }

      showcasePanelElement.dataset['showcaseStep'] = String(nextStep);
    };

    const requestShowcaseStepUpdate = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateShowcaseStep);
    };

    updateShowcaseStep();

    window.addEventListener('scroll', requestShowcaseStepUpdate, { passive: true });
    window.addEventListener('resize', requestShowcaseStepUpdate);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('scroll', requestShowcaseStepUpdate);
      window.removeEventListener('resize', requestShowcaseStepUpdate);
      document.documentElement.style.removeProperty('--home-page-background');
    };
  }, []);

  const introRevealStyle: IntroRevealStyle = {
    '--intro-heading-blur': '5px',
    '--intro-heading-exit-opacity': 1,
    '--intro-heading-exit-y': '0px',
    '--intro-heading-line-1-position': '100%',
    '--intro-heading-line-2-position': '100%',
    '--intro-heading-line-3-position': '100%',
    '--intro-heading-line-4-position': '100%',
    '--intro-heading-progress': 0,
    '--intro-heading-y': '34px',
  };

  return (
    <section aria-labelledby='home-feature-showcase-heading' className={styles['section']}>
      <div className={styles['introScene']} ref={introSceneRef} style={introRevealStyle}>
        <div className={styles['intro']}>
          <h2 className={styles['introHeading']} id='home-feature-showcase-heading'>
            <span className={styles['introHeadingText']}>
              <span>실전 중심 초음파 교육</span>
              <span>증상에서 청구까지</span>
              <span>삭감 ZERO 임상 프로세스</span>
              <span>초음파는 소노스쿨입니다.</span>
            </span>
          </h2>
        </div>
      </div>

      <div
        className={classNames(styles['showcasePanel'], styles['showcasePanelAnimationRoot'])}
        data-home-showcase-panel='true'
        ref={showcasePanelRef}
      >
        <div className={styles['inner']}>
          <div className={styles['copyColumn']}>
            <h3 className={styles['heading']}>
              <span className={styles['headingPrimaryLine']}>SINCE 2003</span>
            </h3>

            <p className={styles['description']}>
              의사 교육 전문 국제 자격으로 증명된 차별화된 코칭을 경험하세요.
            </p>

            <a
              className={styles['courseLink']}
              data-showcase-course-link='true'
              href={routePaths.homeFeaturedCourses}
            >
              <span>과정 살펴보기</span>
              <span aria-hidden='true' className={styles['courseLinkArrow']}>
                <svg
                  className={styles['courseLinkArrowIcon']}
                  fill='none'
                  focusable='false'
                  viewBox='0 0 24 24'
                >
                  <path
                    d='M5 12H19'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                  />
                  <path
                    d='M12 5L19 12L12 19'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                  />
                </svg>
              </span>
            </a>
          </div>

          <ul
            aria-label='소노스쿨 교육 현장 이미지 5개'
            className={styles['cardList']}
            data-showcase-card-list='true'
          >
            {homeFeatureShowcaseCards.map((card) => (
              <li className={styles['cardItem']} data-showcase-card-item='true' key={card.id}>
                <article className={styles['card']}>
                  <img alt={card.imageAlt} className={styles['cardImage']} src={card.imageSrc} />

                  <div className={styles['cardCopy']}>
                    <div className={styles['cardTextBlock']}>
                      <p className={styles['cardCategory']}>{card.category}</p>
                      <p className={styles['cardTitle']}>
                        {card.titleLines.map((line, index) => (
                          <span key={line}>
                            {index > 0 ? <br /> : null}
                            {line}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default HomeFeatureShowcaseSection;
