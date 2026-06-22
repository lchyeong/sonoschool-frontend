import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import Pagination from '@/components/ui/Pagination/Pagination';
import { useProgramLectureCatalogQuery } from '@/query/useProgramLectureCatalogQuery';
import { classNames } from '@/utils/classNames';
import { shouldMuteProgramThumbnail } from '@/utils/programCatalogStatus';
import { getProgramImageCropStyle } from '@/utils/programImageCrop';

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
  const [mobileSlideIndex, setMobileSlideIndex] = useState(0);

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
  const activeMobileSlideIndex = courses.length
    ? Math.min(mobileSlideIndex, courses.length - 1)
    : 0;

  const handleSelectPage = (page: number) => {
    setRequestedPageIndex(page - 1);
  };

  const handleMoveMobileSlide = (direction: 'next' | 'prev') => {
    setMobileSlideIndex((currentIndex) => {
      const offset = direction === 'next' ? 1 : -1;
      return Math.min(Math.max(currentIndex + offset, 0), Math.max(courses.length - 1, 0));
    });
  };

  const renderCourseCard = (course: (typeof courses)[number]) => {
    const shouldMuteThumbnail = shouldMuteProgramThumbnail(course);
    const thumbnailCropStyle = getProgramImageCropStyle({
      offsetX: course.thumbnailCropOffsetX,
      offsetY: course.thumbnailCropOffsetY,
      zoom: course.thumbnailCropZoom,
    });

    return (
      <Link className={styles['cardLink']} to={course.to}>
        <article className={styles['courseCard']}>
          <div className={styles['courseImageFrame']}>
            <img
              alt={course.thumbnailAlt}
              className={classNames(
                styles['courseImage'],
                shouldMuteThumbnail && styles['courseImageMuted'],
              )}
              loading='lazy'
              src={course.thumbnailSrc}
              style={thumbnailCropStyle}
            />
          </div>

          <div className={styles['courseBody']}>
            <h3 className={styles['courseTitle']}>{course.title}</h3>
            <p className={styles['courseDescription']}>{course.summary}</p>
            <p className={styles['coursePrice']}>{course.priceLabel}</p>
          </div>
        </article>
      </Link>
    );
  };

  useEffect(() => {
    const sectionElement = sectionRef.current;

    if (!sectionElement) {
      return undefined;
    }

    let animationFrameId = 0;
    let lastHeadingOffset = '';
    let lastHeadingOpacity = '';
    let isHeadingVisible = false;

    const updateSectionIntro = () => {
      animationFrameId = 0;

      const rect = sectionElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const shouldShowHeading = isHeadingVisible
        ? rect.top <= viewportHeight * COURSES_HEADING_RESET_RATIO
        : rect.top <= viewportHeight * COURSES_HEADING_REVEAL_RATIO;
      const nextHeadingOffset = shouldShowHeading ? '0px' : '18px';
      const nextHeadingOpacity = shouldShowHeading ? '1' : '0';

      isHeadingVisible = shouldShowHeading;

      if (lastHeadingOffset !== nextHeadingOffset) {
        sectionElement.style.setProperty('--featured-courses-heading-offset', nextHeadingOffset);
        lastHeadingOffset = nextHeadingOffset;
      }

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
            소노스쿨이 약속하는 초음파 교육의 기준
          </h2>
          <ul className={styles['promiseList']}>
            <li>
              <strong>완벽한 스캔:</strong>
              <span>단 하나의 장기도 빠트리지 않는 체계적인 검사</span>
            </li>
            <li>
              <strong>글로벌 스탠다드:</strong>
              <span>국제·국내 기준을 모두 만족하는 가이드라인</span>
            </li>
            <li>
              <strong>안심 청구:</strong>
              <span>심평원 기준에 맞춘 정확한 결과와 청구 프로세스</span>
            </li>
          </ul>
          <p className={styles['supportText']}>소노스쿨의 대표과정을 소개합니다.</p>
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
                              {renderCourseCard(course)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {pageCount > 1 ? (
              <div className={styles['carouselControls']}>
                <Pagination
                  ariaLabel='전체 강의 페이지 이동'
                  currentPage={activePage}
                  onChange={handleSelectPage}
                  totalPages={pageCount}
                />
              </div>
            ) : null}

            <div
              aria-label={`${String(activeMobileSlideIndex + 1)} / ${String(courses.length)}`}
              aria-roledescription='carousel'
              className={styles['mobileCourseCarousel']}
            >
              <button
                aria-label='이전 대표 과정 보기'
                className={styles['mobileCourseArrowButton']}
                disabled={activeMobileSlideIndex === 0}
                onClick={() => {
                  handleMoveMobileSlide('prev');
                }}
                type='button'
              >
                &lt;
              </button>

              <div className={styles['mobileCourseViewport']}>
                <ul
                  aria-label='대표 과정 좌우 슬라이드'
                  className={styles['mobileCourseTrack']}
                  style={{
                    transform: `translateX(-${String(activeMobileSlideIndex * 100)}%)`,
                  }}
                >
                  {courses.map((course, courseIndex) => {
                    return (
                      <li
                        aria-hidden={courseIndex !== activeMobileSlideIndex}
                        className={styles['mobileCourseSlide']}
                        key={`mobile-${course.id}`}
                      >
                        {renderCourseCard(course)}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                aria-label='다음 대표 과정 보기'
                className={styles['mobileCourseArrowButton']}
                disabled={activeMobileSlideIndex >= courses.length - 1}
                onClick={() => {
                  handleMoveMobileSlide('next');
                }}
                type='button'
              >
                &gt;
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HomeFeaturedCoursesSection;
