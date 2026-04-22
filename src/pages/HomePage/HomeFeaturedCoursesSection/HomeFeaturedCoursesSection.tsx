import { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import searchScopeChevronIconSrc from '@/assets/icons/search-scope-chevron.svg';
import { useProgramLectureCatalogQuery } from '@/query/useProgramLectureCatalogQuery';
import { classNames } from '@/utils/classNames';

import styles from './HomeFeaturedCoursesSection.module.scss';

const HOME_FEATURED_COURSE_CARD_LIMIT = 12;
const HOME_FEATURED_COURSE_AUTO_PLAY_DURATION_MS = 8000;

const loadingCards = Array.from({ length: HOME_FEATURED_COURSE_CARD_LIMIT }, (_, index) => {
  return {
    id: `home-featured-course-loading-${String(index + 1)}`,
  };
});

const HomeFeaturedCoursesSection = () => {
  const { data, error, isError, isPending } = useProgramLectureCatalogQuery();
  const courses = useMemo(() => data?.items ?? [], [data?.items]);
  const [requestedPageIndex, setRequestedPageIndex] = useState(0);

  const coursePages = useMemo(() => {
    if (!courses.length) {
      return [];
    }

    return Array.from(
      { length: Math.ceil(courses.length / HOME_FEATURED_COURSE_CARD_LIMIT) },
      (_, pageIndex) => {
        const startIndex = pageIndex * HOME_FEATURED_COURSE_CARD_LIMIT;

        return courses.slice(startIndex, startIndex + HOME_FEATURED_COURSE_CARD_LIMIT);
      },
    );
  }, [courses]);

  const pageCount = coursePages.length;
  const canNavigate = pageCount > 1;
  const activePageIndex = pageCount ? Math.min(requestedPageIndex, pageCount - 1) : 0;

  useEffect(() => {
    if (!canNavigate || typeof window === 'undefined') {
      return;
    }

    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRequestedPageIndex((currentPageIndex) => {
        return (Math.min(currentPageIndex, pageCount - 1) + 1) % pageCount;
      });
    }, HOME_FEATURED_COURSE_AUTO_PLAY_DURATION_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canNavigate, pageCount]);

  const handleMovePage = (direction: -1 | 1) => {
    if (!pageCount) {
      return;
    }

    setRequestedPageIndex((currentPageIndex) => {
      return (Math.min(currentPageIndex, pageCount - 1) + direction + pageCount) % pageCount;
    });
  };

  return (
    <section aria-labelledby='home-featured-courses-heading' className={styles['section']}>
      <div className={styles['inner']}>
        <h2 className={styles['heading']} id='home-featured-courses-heading'>
          대표 과정 먼저 보기
        </h2>
        <p className={styles['description']}>
          스노스쿨의 전체 커리큘럼 중 문의가 잦거나 흐름을 이해하기 좋은 대표 과정을 먼저
          배치했습니다.
        </p>

        {isPending ? (
          <ul aria-label='대표 과정 로딩 중' className={styles['courseGrid']}>
            {loadingCards.map((course) => {
              return (
                <li className={styles['courseItem']} key={course.id}>
                  <article
                    aria-busy='true'
                    aria-label='과정 카드 로딩 중'
                    className={styles['courseCard']}
                  >
                    <div aria-hidden='true' className={styles['courseImageSkeleton']} />

                    <div className={styles['courseBody']}>
                      <div aria-hidden='true' className={styles['courseTitleSkeleton']} />
                      <div aria-hidden='true' className={styles['courseDescriptionSkeleton']} />
                      <div aria-hidden='true' className={styles['coursePriceSkeleton']} />
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : isError || courses.length === 0 ? (
          <div aria-live='polite' className={styles['statusPanel']}>
            <p className={styles['statusTitle']}>교육과정을 불러오지 못했습니다.</p>
            <p className={styles['statusDescription']}>
              {isError && error instanceof Error
                ? error.message
                : '노출할 교육과정이 아직 등록되지 않았습니다.'}
            </p>
          </div>
        ) : (
          <>
            <div
              aria-label={`${String(activePageIndex + 1)} / ${String(pageCount)}`}
              aria-roledescription='carousel'
              className={styles['carouselViewport']}
            >
              <div
                className={styles['carouselTrack']}
                style={{ transform: `translateX(-${String(activePageIndex * 100)}%)` }}
              >
                {coursePages.map((page, pageIndex) => {
                  return (
                    <div
                      aria-hidden={pageIndex !== activePageIndex}
                      className={styles['carouselPage']}
                      key={`home-featured-courses-page-${String(pageIndex + 1)}`}
                    >
                      <ul aria-label='대표 과정 카드 목록' className={styles['carouselPageGrid']}>
                        {page.map((course) => {
                          return (
                            <li className={styles['courseItem']} key={course.id}>
                              <Link className={styles['cardLink']} to={course.to}>
                                <article className={styles['courseCard']}>
                                  <div className={styles['courseImageFrame']}>
                                    <img
                                      alt={course.thumbnailAlt}
                                      className={styles['courseImage']}
                                      loading='lazy'
                                      src={course.thumbnailSrc}
                                    />
                                  </div>

                                  <div className={styles['courseBody']}>
                                    <h3 className={styles['courseTitle']}>{course.title}</h3>
                                    <p className={styles['courseDescription']}>{course.summary}</p>
                                    <p className={styles['coursePrice']}>{course.priceLabel}</p>
                                  </div>
                                </article>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles['carouselControls']}>
              <button
                aria-label='이전 대표 과정 페이지'
                className={styles['carouselButton']}
                disabled={!canNavigate}
                onClick={() => {
                  handleMovePage(-1);
                }}
                type='button'
              >
                <img
                  alt=''
                  aria-hidden='true'
                  className={classNames(
                    styles['carouselButtonIcon'],
                    styles['carouselButtonIconPrev'],
                  )}
                  src={searchScopeChevronIconSrc}
                />
              </button>

              <button
                aria-label='다음 대표 과정 페이지'
                className={classNames(styles['carouselButton'], styles['carouselButtonNext'])}
                disabled={!canNavigate}
                onClick={() => {
                  handleMovePage(1);
                }}
                type='button'
              >
                <img
                  alt=''
                  aria-hidden='true'
                  className={classNames(
                    styles['carouselButtonIcon'],
                    styles['carouselButtonIconNext'],
                  )}
                  src={searchScopeChevronIconSrc}
                />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HomeFeaturedCoursesSection;
