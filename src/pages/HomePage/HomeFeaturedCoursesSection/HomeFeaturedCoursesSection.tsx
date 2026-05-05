import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import Pagination from '@/components/ui/Pagination/Pagination';
import { useProgramLectureCatalogQuery } from '@/query/useProgramLectureCatalogQuery';

import styles from './HomeFeaturedCoursesSection.module.scss';

const HOME_FEATURED_COURSE_CARD_LIMIT = 12;
const COURSES_HEADING_REVEAL_RATIO = 0.86;
const COURSES_HEADING_RESET_RATIO = 0.94;

const loadingCards = Array.from({ length: HOME_FEATURED_COURSE_CARD_LIMIT }, (_, index) => {
  return {
    id: `home-featured-course-loading-${String(index + 1)}`,
  };
});

const HomeFeaturedCoursesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
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
  const activePageIndex = pageCount ? Math.min(requestedPageIndex, pageCount - 1) : 0;
  const activePage = activePageIndex + 1;

  const handleSelectPage = (page: number) => {
    setRequestedPageIndex(page - 1);
  };

  useEffect(() => {
    const sectionElement = sectionRef.current;

    if (!sectionElement) {
      return undefined;
    }

    let animationFrameId = 0;
    let lastHeadingOpacity = '';
    let isHeadingVisible = false;

    const updateSectionIntro = () => {
      animationFrameId = 0;

      const rect = sectionElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const shouldShowHeading = isHeadingVisible
        ? rect.top <= viewportHeight * COURSES_HEADING_RESET_RATIO
        : rect.top <= viewportHeight * COURSES_HEADING_REVEAL_RATIO;
      const nextHeadingOpacity = shouldShowHeading ? '1' : '0';

      isHeadingVisible = shouldShowHeading;

      if (lastHeadingOpacity !== nextHeadingOpacity) {
        sectionElement.style.setProperty('--featured-courses-heading-opacity', nextHeadingOpacity);
        lastHeadingOpacity = nextHeadingOpacity;
      }
    };

    const requestSectionIntroUpdate = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateSectionIntro);
    };

    updateSectionIntro();

    window.addEventListener('scroll', requestSectionIntroUpdate, { passive: true });
    window.addEventListener('resize', requestSectionIntroUpdate);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('scroll', requestSectionIntroUpdate);
      window.removeEventListener('resize', requestSectionIntroUpdate);
    };
  }, []);

  return (
    <section
      aria-labelledby='home-featured-courses-heading'
      className={styles['section']}
      data-home-featured-courses-section='true'
      data-intro-tone='contrast'
      id='home-featured-courses'
      ref={sectionRef}
    >
      <div className={styles['inner']}>
        <div className={styles['headingBlock']}>
          <h2 className={styles['heading']} id='home-featured-courses-heading'>
            <span>진료의 확신을 완성하는</span>
            <span>초음파 교육, 소노스쿨</span>
          </h2>
          <p className={styles['description']}>
            단순 반복을 넘어선 초밀착 핸즈온으로 잘못된 루틴을 바로잡습니다.
            <br />
            진료실의 막막함이 자신감으로 바뀌는 실전 교육을 경험하세요.
          </p>
          <p className={styles['supportText']}>소노스쿨의 검증된 대표 과정을 소개합니다.</p>
        </div>

        {isPending ? (
          <ul aria-label='전체 강의 로딩 중' className={styles['courseGrid']}>
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
                      <ul aria-label='전체 강의 카드 목록' className={styles['carouselPageGrid']}>
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
              <Pagination
                ariaLabel='전체 강의 페이지 이동'
                currentPage={activePage}
                onChange={handleSelectPage}
                totalPages={pageCount}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HomeFeaturedCoursesSection;
