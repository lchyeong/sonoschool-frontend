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

type IntroRevealStyle = CSSProperties & {
  '--intro-heading-blur': string;
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
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const scrollableDistance = Math.max(rect.height - viewportHeight, 1);
      const rawProgress = clamp(-rect.top / scrollableDistance);
      const appearProgress = clamp(rawProgress / 0.18);
      const fillProgress = clamp((rawProgress - 0.08) / 0.92);
      const easedAppearProgress = easeInOutProgress(appearProgress);
      const line1Progress = easeInOutProgress(clamp(fillProgress * 3));
      const line2Progress = easeInOutProgress(clamp(fillProgress * 3 - 1));
      const line3Progress = easeInOutProgress(clamp(fillProgress * 3 - 2));
      const translateY = (1 - easedAppearProgress) * 34;
      const blur = (1 - easedAppearProgress) * 5;

      introSceneElement.style.setProperty('--intro-heading-blur', `${blur.toFixed(2)}px`);
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

    if (!showcasePanelElement) {
      return undefined;
    }

    let animationFrameId = 0;

    const updateShowcaseStep = () => {
      animationFrameId = 0;

      const rect = showcasePanelElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const revealStart = viewportHeight * 0.78;
      const revealDistance = Math.max(viewportHeight * 1.8, rect.height * 0.82);
      const progress = clamp((revealStart - rect.top) / revealDistance);
      const cardScrollProgress = easeInOutProgress(clamp((progress - 0.05) / 0.93));
      const cardScrollY = 54 - cardScrollProgress * 154;
      const nextStep = getShowcaseStep(progress);
      const currentStep = Number(showcasePanelElement.dataset['showcaseStep'] ?? 0);

      showcasePanelElement.style.setProperty(
        '--showcase-card-scroll-y',
        `${cardScrollY.toFixed(2)}vh`,
      );

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
    };
  }, []);

  const introRevealStyle: IntroRevealStyle = {
    '--intro-heading-blur': '5px',
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
        data-following-tone='contrast'
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
