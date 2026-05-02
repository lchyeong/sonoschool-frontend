import { useEffect, useRef, type CSSProperties } from 'react';

import homeLectureImage1Src from '@/assets/sample/home_lecture_1.jpg';
import homeLectureImage2Src from '@/assets/sample/home_lecture_2.png';
import homeLectureImage3Src from '@/assets/sample/home_lecture_3.jpg';
import homeLectureImage4Src from '@/assets/sample/home_lecture_4.jpg';
import homeLectureImage5Src from '@/assets/sample/home_lecture_5.jpg';
import { classNames } from '@/utils/classNames';

import styles from './HomeFeatureShowcaseSection.module.scss';

const homeFeatureShowcaseCards = [
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-1',
    imageAlt: '소노스쿨 교육 현장 1',
    imageSrc: homeLectureImage1Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-2',
    imageAlt: '소노스쿨 교육 현장 2',
    imageSrc: homeLectureImage2Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-3',
    imageAlt: '소노스쿨 교육 현장 3',
    imageSrc: homeLectureImage3Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-4',
    imageAlt: '소노스쿨 교육 현장 4',
    imageSrc: homeLectureImage4Src,
    title: '교육 현장',
  },
  {
    description: '의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    id: 'home-feature-showcase-card-5',
    imageAlt: '소노스쿨 교육 현장 5',
    imageSrc: homeLectureImage5Src,
    title: '교육 현장',
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
  to: [58, 197, 176],
} as const;
const SHOWCASE_BACKGROUND_ENTER_START_RATIO = 0.51;
const SHOWCASE_BACKGROUND_ENTER_END_RATIO = 0.45;

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
      const line1Progress = easeInOutProgress(clamp(fillProgress * 3));
      const line2Progress = easeInOutProgress(clamp(fillProgress * 3 - 1));
      const line3Progress = easeInOutProgress(clamp(fillProgress * 3 - 2));
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
    let lastCardScrollY = '';
    let lastFeaturedCoursesTone = '';

    const updateShowcaseStep = () => {
      animationFrameId = 0;

      const rect = showcasePanelElement.getBoundingClientRect();
      const introRect = introSceneElement?.getBoundingClientRect();
      const featuredCoursesRect = featuredCoursesElement?.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const stickyDistance = Math.max(rect.height - viewportHeight, 1);
      const revealStart = viewportHeight * 0.78;
      const revealDistance = Math.max(viewportHeight * 1.8, rect.height * 0.82);
      const progress = clamp((revealStart - rect.top) / revealDistance);
      const cardProgress = clamp(-rect.top / stickyDistance);
      const backgroundEnterProgress = introRect
        ? easeInOutProgress(
            clamp(
              (viewportHeight * SHOWCASE_BACKGROUND_ENTER_START_RATIO - introRect.bottom) /
                (viewportHeight *
                  (SHOWCASE_BACKGROUND_ENTER_START_RATIO - SHOWCASE_BACKGROUND_ENTER_END_RATIO)),
            ),
          )
        : 0;
      const hasEnteredCoursesBackground = featuredCoursesRect
        ? featuredCoursesRect.top <= viewportHeight * 0.34
        : false;
      const backgroundExitProgress = hasEnteredCoursesBackground ? 1 : 0;
      const backgroundProgress = backgroundEnterProgress * (1 - backgroundExitProgress);
      const hasSettledShowcaseCopy = introRect ? introRect.bottom <= viewportHeight * 0.43 : false;
      const copyRevealProgress = backgroundProgress === 1 && hasSettledShowcaseCopy ? 1 : 0;
      const cardScrollProgress = cardProgress;
      const cardScrollY = 54 - cardScrollProgress * 154;
      const nextStep = getShowcaseStep(progress);
      const currentStep = Number(showcasePanelElement.dataset['showcaseStep'] ?? 0);
      const nextBackgroundColor = getHomeBackgroundColor(backgroundProgress);
      const nextCopyOpacity =
        copyRevealProgress === 0 ? '0' : (0.25 + copyRevealProgress * 0.75).toFixed(4);
      const copyToneProgress = easeInOutProgress(clamp((cardProgress - 0.01) / 0.07));
      const nextCopyY = hasSettledShowcaseCopy ? '0vh' : '15vh';
      const nextCopyToneProgress = copyToneProgress.toFixed(4);
      const nextCardScrollY = `${cardScrollY.toFixed(2)}vh`;
      const nextFeaturedCoursesTone = hasEnteredCoursesBackground ? 'light' : 'contrast';

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

      if (lastCardScrollY !== nextCardScrollY) {
        showcasePanelElement.style.setProperty('--showcase-card-scroll-y', nextCardScrollY);
        lastCardScrollY = nextCardScrollY;
      }

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
    '--intro-heading-progress': 0,
    '--intro-heading-y': '34px',
  };

  return (
    <section aria-labelledby='home-feature-showcase-heading' className={styles['section']}>
      <div className={styles['introScene']} ref={introSceneRef} style={introRevealStyle}>
        <div className={styles['intro']}>
          <h2 className={styles['introHeading']} id='home-feature-showcase-heading'>
            <span className={styles['introHeadingText']}>
              <span>의료진의 성장을 위한</span>
              <span>선명한 초음파 교육,</span>
              <span>소노스쿨입니다.</span>
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

            <a className={styles['courseLink']} href='/programs'>
              <span>과정 살펴보기</span>
              <span aria-hidden='true' className={styles['courseLinkArrow']} />
            </a>
          </div>

          <ul aria-label='소노스쿨 교육 현장 이미지 5개' className={styles['cardList']}>
            {homeFeatureShowcaseCards.map((card) => (
              <li className={styles['cardItem']} key={card.id}>
                <article className={styles['card']}>
                  <img alt={card.imageAlt} className={styles['cardImage']} src={card.imageSrc} />
                  <div aria-hidden='true' className={styles['cardOverlay']} />

                  <div className={styles['cardCopy']}>
                    <span aria-hidden='true' className={styles['cardDivider']} />
                    <div className={styles['cardTextBlock']}>
                      <p className={styles['cardTitle']}>{card.title}</p>
                      <p className={styles['cardDescription']}>{card.description}</p>
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
