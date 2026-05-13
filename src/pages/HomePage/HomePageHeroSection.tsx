import { useEffect, useRef, type CSSProperties } from 'react';

import homeHeroChevronIconSrc from '@/assets/icons/home-hero-chevron.svg';
import type { HomeHeroSlide } from '@/types/homeHeroSlides';
import { classNames } from '@/utils/classNames';

import styles from './HomePage.module.scss';
import { getHomeHeroSlideBackgroundImageSrc, isHomeHeroLectureSlide } from './homePageShared';

interface HomePageHeroSectionProps {
  activeSlide: HomeHeroSlide;
  autoPlayDurationMs: number;
  displayedSlideIndex: number;
  onMoveSlide: (direction: -1 | 1) => void;
  onProgressAnimationEnd: () => void;
  slideCount: number;
}

interface HomePageHeroControlBarProps {
  autoPlayDurationMs: number;
  onMoveSlide: (direction: -1 | 1) => void;
  onProgressAnimationEnd: () => void;
  progressKey: string;
}

const HomePageHeroControlBar = ({
  autoPlayDurationMs,
  onMoveSlide,
  onProgressAnimationEnd,
  progressKey,
}: HomePageHeroControlBarProps) => {
  // CSS 애니메이션 시간은 inline style로 전달합니다.
  // 이렇게 하면 서버/API 값에 따라 재생 시간을 쉽게 바꿀 수 있습니다.
  const progressStyle = {
    animationDuration: `${String(autoPlayDurationMs)}ms`,
  } as CSSProperties;

  return (
    <div className={styles['controlBar']}>
      <div className={styles['controlButtons']}>
        <button
          aria-label='이전 메인 슬라이드'
          className={styles['controlButton']}
          onClick={() => {
            onMoveSlide(-1);
          }}
          type='button'
        >
          <span className={classNames(styles['controlIconFrame'], styles['controlIconFramePrev'])}>
            <img
              alt=''
              aria-hidden='true'
              className={styles['controlIcon']}
              src={homeHeroChevronIconSrc}
            />
          </span>
        </button>

        <button
          aria-label='다음 메인 슬라이드'
          className={styles['controlButton']}
          onClick={() => {
            onMoveSlide(1);
          }}
          type='button'
        >
          <span className={classNames(styles['controlIconFrame'], styles['controlIconFrameNext'])}>
            <img
              alt=''
              aria-hidden='true'
              className={styles['controlIcon']}
              src={homeHeroChevronIconSrc}
            />
          </span>
        </button>
      </div>

      {/* progress bar는 시각 장식이므로 스크린 리더에서는 숨깁니다. */}
      <div aria-hidden='true' className={styles['progressTrack']}>
        <span
          className={styles['progressFill']}
          key={progressKey}
          onAnimationEnd={onProgressAnimationEnd}
          style={progressStyle}
        />
      </div>
    </div>
  );
};

const HomePageHeroSection = ({
  activeSlide,
  autoPlayDurationMs,
  displayedSlideIndex,
  onMoveSlide,
  onProgressAnimationEnd,
  slideCount,
}: HomePageHeroSectionProps) => {
  const sliderSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sliderSection = sliderSectionRef.current;

    if (!sliderSection) {
      return undefined;
    }

    const reducedMotionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    let animationFrameId = 0;

    const applyDefaultState = () => {
      sliderSection.style.setProperty('--home-hero-scroll-opacity', '1');
      sliderSection.style.setProperty('--home-hero-scroll-y', '0px');
      sliderSection.style.setProperty('--home-hero-scroll-scale', '1');
    };

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const smoothStep = (value: number) => value * value * (3 - 2 * value);

    const updateScrollState = () => {
      animationFrameId = 0;

      if (reducedMotionQuery?.matches === true) {
        applyDefaultState();
        return;
      }

      const sectionRect = sliderSection.getBoundingClientRect();
      const sectionTop = sectionRect.top + window.scrollY;
      const sectionHeight = sectionRect.height;
      const fadeStart = sectionTop + sectionHeight * 0.38;
      const fadeEnd = sectionTop + sectionHeight * 0.9;
      const fadeDistance = Math.max(fadeEnd - fadeStart, 1);
      const progress = clamp((window.scrollY - fadeStart) / fadeDistance, 0, 1);
      const easedProgress = smoothStep(progress);

      sliderSection.style.setProperty(
        '--home-hero-scroll-opacity',
        String(Math.max(0, 1 - easedProgress)),
      );
      sliderSection.style.setProperty('--home-hero-scroll-y', `${String(-34 * easedProgress)}px`);
      sliderSection.style.setProperty(
        '--home-hero-scroll-scale',
        String(1 - 0.025 * easedProgress),
      );
    };

    const requestUpdate = () => {
      if (animationFrameId > 0) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateScrollState);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    reducedMotionQuery?.addEventListener('change', requestUpdate);

    return () => {
      if (animationFrameId > 0) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      reducedMotionQuery?.removeEventListener('change', requestUpdate);
    };
  }, []);

  // 강의형 슬라이드는 배경 이미지를 CSS background-image로 깔기 때문에 style 객체를 준비합니다.
  const lectureBackgroundStyle = {
    backgroundImage: `url(${getHomeHeroSlideBackgroundImageSrc(activeSlide)})`,
  } as CSSProperties;

  return (
    <section
      aria-labelledby='home-hero-heading'
      className={styles['sliderSection']}
      ref={sliderSectionRef}
    >
      {/* 화면에는 숨기지만, 페이지의 메인 히어로 영역 제목을 접근성 트리에 남깁니다. */}
      <h1 className={styles['srOnly']} id='home-hero-heading'>
        SONO SCHOOL 메인 슬라이드
      </h1>

      <article
        aria-label={`${String(displayedSlideIndex + 1)} / ${String(slideCount)}`}
        aria-roledescription='carousel'
        className={classNames(
          styles['slideFrame'],
          isHomeHeroLectureSlide(activeSlide) ? styles['lectureSlide'] : styles['bannerSlide'],
        )}
        key={activeSlide.id}
      >
        {isHomeHeroLectureSlide(activeSlide) ? (
          <>
            {/* 강의형 슬라이드는 흐릿한 배경 이미지와 오버레이를 겹쳐 분위기를 만듭니다. */}
            <div
              aria-hidden='true'
              className={styles['lectureBackdrop']}
              style={lectureBackgroundStyle}
            />
            <div aria-hidden='true' className={styles['lectureOverlay']} />

            <div className={styles['lectureLayout']}>
              <div className={styles['lectureCopyColumn']}>
                <div className={styles['lectureCopyBlock']}>
                  <h2 className={styles['lectureTitle']}>{activeSlide.title}</h2>
                  <p className={styles['lectureDescription']}>{activeSlide.description}</p>
                </div>
              </div>

              <div className={styles['thumbnailColumn']}>
                <div
                  aria-label={activeSlide.thumbnailAlt}
                  className={styles['thumbnailFrame']}
                  role='img'
                >
                  <img
                    alt=''
                    aria-hidden='true'
                    className={styles['thumbnailImage']}
                    src={activeSlide.thumbnailSrc}
                  />
                </div>
              </div>
            </div>

            <div className={styles['lectureControlBar']}>
              <HomePageHeroControlBar
                autoPlayDurationMs={autoPlayDurationMs}
                onMoveSlide={onMoveSlide}
                onProgressAnimationEnd={onProgressAnimationEnd}
                progressKey={activeSlide.id}
              />
            </div>
          </>
        ) : (
          <>
            {/* 배너형 슬라이드는 전체 이미지를 바로 출력합니다. */}
            <img
              alt={activeSlide.imageAlt}
              className={styles['bannerImage']}
              src={activeSlide.imageSrc}
            />
            <div aria-hidden='true' className={styles['bannerOverlay']} />

            <div className={styles['bannerControlBar']}>
              <HomePageHeroControlBar
                autoPlayDurationMs={autoPlayDurationMs}
                onMoveSlide={onMoveSlide}
                onProgressAnimationEnd={onProgressAnimationEnd}
                progressKey={activeSlide.id}
              />
            </div>
          </>
        )}

        <div aria-hidden='true' className={styles['heroScrollIndicator']}>
          <span className={styles['heroScrollLabel']}>SCROLL</span>
          <span className={styles['heroScrollTrack']} />
        </div>
      </article>
    </section>
  );
};

export default HomePageHeroSection;
