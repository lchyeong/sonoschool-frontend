import { useEffect, useEffectEvent, useRef, useState } from 'react';

import homeLectureImage1Src from '@/assets/sample/home_lecture_1.jpg';
import homeLectureImage2Src from '@/assets/sample/home_lecture_2.png';
import homeLectureImage3Src from '@/assets/sample/home_lecture_3.jpg';
import homeLectureImage4Src from '@/assets/sample/home_lecture_4.jpg';
import homeLectureImage5Src from '@/assets/sample/home_lecture_5.jpg';
import { classNames } from '@/utils/classNames';

import styles from './HomeFeatureShowcaseSection.module.scss';

const VIEWPORT_ACTIVE_CARD_TARGET_RATIO = 0.62;

const homeFeatureShowcaseCards = [
  {
    id: 'home-feature-showcase-card-1',
    imageAlt: '소노스쿨 교육 현장 1',
    imageSrc: homeLectureImage1Src,
    title: '교육 현장 01',
  },
  {
    id: 'home-feature-showcase-card-2',
    imageAlt: '소노스쿨 교육 현장 2',
    imageSrc: homeLectureImage2Src,
    title: '교육 현장 02',
  },
  {
    id: 'home-feature-showcase-card-3',
    imageAlt: '소노스쿨 교육 현장 3',
    imageSrc: homeLectureImage3Src,
    title: '교육 현장 03',
  },
  {
    id: 'home-feature-showcase-card-4',
    imageAlt: '소노스쿨 교육 현장 4',
    imageSrc: homeLectureImage4Src,
    title: '교육 현장 04',
  },
  {
    id: 'home-feature-showcase-card-5',
    imageAlt: '소노스쿨 교육 현장 5',
    imageSrc: homeLectureImage5Src,
    title: '교육 현장 05',
  },
] as const;

const HomeFeatureShowcaseSection = () => {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cardItemRefs = useRef<Array<HTMLLIElement | null>>([]);

  const updateActiveCardIndex = useEffectEvent(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) {
      return;
    }

    const sectionBounds = sectionElement.getBoundingClientRect();
    if (sectionBounds.bottom <= 0 || sectionBounds.top >= window.innerHeight) {
      return;
    }

    const targetViewportY = window.innerHeight * VIEWPORT_ACTIVE_CARD_TARGET_RATIO;
    let nextActiveCardIndex = 0;
    let nearestCardDistance = Number.POSITIVE_INFINITY;

    cardItemRefs.current.forEach((cardItemElement, cardIndex) => {
      if (!cardItemElement) {
        return;
      }

      const cardBounds = cardItemElement.getBoundingClientRect();
      const cardCenterY = cardBounds.top + cardBounds.height / 2;
      const isCardOutOfViewport = cardBounds.bottom < 0 || cardBounds.top > window.innerHeight;
      const cardDistance =
        Math.abs(cardCenterY - targetViewportY) + (isCardOutOfViewport ? window.innerHeight : 0);

      if (cardDistance < nearestCardDistance) {
        nearestCardDistance = cardDistance;
        nextActiveCardIndex = cardIndex;
      }
    });

    setActiveCardIndex((currentActiveCardIndex) =>
      currentActiveCardIndex === nextActiveCardIndex ? currentActiveCardIndex : nextActiveCardIndex,
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const scheduleActiveCardUpdate = () => {
      if (animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        updateActiveCardIndex();
      });
    };

    updateActiveCardIndex();
    window.addEventListener('scroll', scheduleActiveCardUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveCardUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', scheduleActiveCardUpdate);
      window.removeEventListener('resize', scheduleActiveCardUpdate);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <section
      aria-labelledby='home-feature-showcase-heading'
      className={styles['section']}
      ref={sectionRef}
    >
      <div className={styles['inner']}>
        <div className={styles['copyColumn']}>
          <span className={styles['eyebrow']}>SONO SCHOOL</span>

          <h2
            aria-label='SINCE 2003 의사교육전문 국제자격보유'
            className={styles['heading']}
            id='home-feature-showcase-heading'
          >
            <span className={styles['headingPrimaryLine']}>SINCE 2003</span>
            <span>의사교육전문</span>
            <span>국제자격보유</span>
          </h2>
        </div>

        <ul aria-label='소노스쿨 교육 현장 이미지 5개' className={styles['cardList']}>
          {homeFeatureShowcaseCards.map((card, cardIndex) => {
            const isActive = cardIndex === activeCardIndex;

            return (
              <li
                className={classNames(styles['cardItem'], isActive && styles['cardItemActive'])}
                key={card.id}
                ref={(element) => {
                  cardItemRefs.current[cardIndex] = element;
                }}
              >
                <div className={styles['cardMotion']}>
                  <article className={styles['card']}>
                    <img alt={card.imageAlt} className={styles['cardImage']} src={card.imageSrc} />
                    <div aria-hidden='true' className={styles['cardOverlay']} />

                    <div className={styles['cardCopy']}>
                      <span className={styles['cardBadge']}>SONO SCHOOL</span>
                      <p className={styles['cardTitle']}>{card.title}</p>
                    </div>
                  </article>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default HomeFeatureShowcaseSection;
