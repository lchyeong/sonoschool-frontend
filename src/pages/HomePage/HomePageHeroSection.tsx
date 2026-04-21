import type { CSSProperties } from 'react';

import slideChevronLeftIconSrc from '@/assets/icons/slide-chevron-left.svg';
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
              src={slideChevronLeftIconSrc}
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
              src={slideChevronLeftIconSrc}
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
  // 강의형 슬라이드는 배경 이미지를 CSS background-image로 깔기 때문에 style 객체를 준비합니다.
  const lectureBackgroundStyle = {
    backgroundImage: `url(${getHomeHeroSlideBackgroundImageSrc(activeSlide)})`,
  } as CSSProperties;

  return (
    <section aria-labelledby='home-hero-heading' className={styles['sliderSection']}>
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

                <HomePageHeroControlBar
                  autoPlayDurationMs={autoPlayDurationMs}
                  onMoveSlide={onMoveSlide}
                  onProgressAnimationEnd={onProgressAnimationEnd}
                  progressKey={activeSlide.id}
                />
              </div>

              <div className={styles['thumbnailColumn']}>
                <div
                  aria-label={activeSlide.thumbnailAlt}
                  className={styles['thumbnailFrame']}
                  role='img'
                />
              </div>
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
      </article>
    </section>
  );
};

export default HomePageHeroSection;
