import { startTransition, useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import Modal from '@/components/overlay/Modal/Modal';
import ProgramQnaPanel from '@/components/qna/ProgramQnaPanel';
import ChevronDownIcon from '@/components/ui/icons/ChevronDownIcon';
import type {
  ProgramCurriculumLesson,
  ProgramCurriculumSection,
  ProgramDetailPageResponse,
  ProgramReviewItem,
} from '@/types/programCatalog';
import { classNames } from '@/utils/classNames';

import styles from './ProgramPageDetail.module.scss';
import {
  buildAdminReplyExample,
  detailTabItems,
  featureCardTitles,
  formatPriceLabel,
  type ReviewSortOrder,
} from './programPageDetailShared';
import type { ProgramPageDetailViewModel } from './useProgramPageDetailViewModel';

interface RatingStarsProps {
  inverse?: boolean;
  rating: number;
}

interface ReviewPreviewCardProps {
  isDimmed?: boolean;
  review: ProgramReviewItem;
}

interface FullReviewCardProps {
  review: ProgramReviewItem;
}

interface IntroductionBlockHeaderProps {
  subtitle: string;
  title: string;
}

interface IntroductionInfoBoxProps {
  content: string;
  title: string;
}

interface IntroductionFeatureCardProps {
  content: string;
  title: string;
}

interface CurriculumWeekRowProps {
  isOpen: boolean;
  onOpenOfflineSchedule: (lesson: ProgramCurriculumLesson) => void;
  onToggle: () => void;
  section: ProgramCurriculumSection;
  sectionIndex: number;
}

interface ProgramPageDetailHeroProps {
  data: ProgramDetailPageResponse;
  heroInfoPills: ProgramPageDetailViewModel['heroInfoPills'];
}

interface ProgramPageDetailMainContentProps {
  activeSectionId: ProgramPageDetailViewModel['activeSectionId'];
  data: ProgramDetailPageResponse;
  handleReviewCarouselScroll: ProgramPageDetailViewModel['handleReviewCarouselScroll'];
  handleTabClick: ProgramPageDetailViewModel['handleTabClick'];
  isQnaTabOpen: ProgramPageDetailViewModel['isQnaTabOpen'];
  openCurriculumRows: ProgramPageDetailViewModel['openCurriculumRows'];
  openFaqId: ProgramPageDetailViewModel['openFaqId'];
  reviewCarouselRef: ProgramPageDetailViewModel['reviewCarouselRef'];
  reviewSortOrder: ProgramPageDetailViewModel['reviewSortOrder'];
  sectionRefHandlers: ProgramPageDetailViewModel['sectionRefHandlers'];
  setOpenFaqId: ProgramPageDetailViewModel['setOpenFaqId'];
  setReviewSortOrder: ProgramPageDetailViewModel['setReviewSortOrder'];
  sortedReviews: ProgramPageDetailViewModel['sortedReviews'];
  toggleCurriculumRow: ProgramPageDetailViewModel['toggleCurriculumRow'];
  visiblePreviewReviewIds: ProgramPageDetailViewModel['visiblePreviewReviewIds'];
}

interface ProgramPageDetailSidebarProps {
  availabilityActionKind: 'ENROLL' | 'ALERT' | 'DISABLED';
  availabilityActionLabel: string;
  availabilityStatusDescription: string;
  availabilityStatusLabel: string;
  data: ProgramDetailPageResponse;
  discountedPriceAmount: ProgramPageDetailViewModel['discountedPriceAmount'];
  handleAddToCart: () => void;
  handleEnrollNow: () => void;
  handleRequestAvailabilityAlert: () => void;
  isAlertPending: boolean;
  isAlertSubscribed: boolean;
  isAuthenticated: boolean;
  isEnrollingNow: boolean;
  isAddingToCart: boolean;
  originalPriceAmount: ProgramPageDetailViewModel['originalPriceAmount'];
  totalPriceLabel: ProgramPageDetailViewModel['totalPriceLabel'];
}

const curriculumDeliveryTypeLabelMap: Record<
  ProgramCurriculumSection['lessons'][number]['deliveryType'],
  string
> = {
  offline: '오프라인 강의',
  online: '영상 강의',
  practicum: '실습 강의',
  problem: '문제풀이 강의',
  resource: '자료 강의',
};

const buildCurriculumLessonCapsules = (lesson: ProgramCurriculumSection['lessons'][number]) => {
  return [curriculumDeliveryTypeLabelMap[lesson.deliveryType]];
};

const parseScheduleTimeToMinutes = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const [hourText, minuteText] = value.split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const formatDurationLabel = (minutes: number, prefix: string | null = null) => {
  if (minutes <= 0) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const baseLabel =
    hours > 0 && remainingMinutes === 0
      ? `${String(hours)}시간`
      : hours > 0
        ? `${String(hours)}시간 ${String(remainingMinutes)}분`
        : `${String(minutes)}분`;

  return prefix ? `${prefix} ${baseLabel}` : baseLabel;
};

const formatCurriculumLessonTime = (lesson: ProgramCurriculumSection['lessons'][number]) => {
  const offlineScheduleMinutes =
    lesson.deliveryType === 'offline' &&
    lesson.offlineSchedules &&
    lesson.offlineSchedules.length > 0
      ? lesson.offlineSchedules.reduce((totalMinutes, schedule) => {
          const startMinutes = parseScheduleTimeToMinutes(schedule.startTime);
          const endMinutes = parseScheduleTimeToMinutes(schedule.endTime);

          if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
            return totalMinutes;
          }

          return totalMinutes + (endMinutes - startMinutes);
        }, 0)
      : 0;
  const minutes = offlineScheduleMinutes > 0 ? offlineScheduleMinutes : lesson.durationMinutes;

  if (!minutes || minutes <= 0) {
    return null;
  }

  if (lesson.deliveryType === 'online' || lesson.deliveryType === 'problem') {
    return formatDurationLabel(minutes);
  }

  if (lesson.deliveryType === 'offline') {
    return formatDurationLabel(minutes, '총');
  }

  return null;
};

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

const formatScheduleDateLabel = (date: string) => {
  const targetDate = new Date(`${date}T00:00:00`);
  return `${String(targetDate.getFullYear())}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(targetDate.getDate()).padStart(2, '0')} (${weekdayLabels[targetDate.getDay()]})`;
};

const formatScheduleRangeLabel = (startDate: string, endDate: string | null) => {
  if (!endDate || endDate === startDate) {
    return formatScheduleDateLabel(startDate);
  }

  return `${formatScheduleDateLabel(startDate)} ~ ${formatScheduleDateLabel(endDate)}`;
};

const buildOfflineScheduleEntries = (lesson: ProgramCurriculumLesson) => {
  if (lesson.offlineSchedules && lesson.offlineSchedules.length > 0) {
    return lesson.offlineSchedules.map((schedule, index) => ({
      dateLabel: schedule.date
        ? formatScheduleDateLabel(schedule.date)
        : `일정 ${String(index + 1)}`,
      id: `${lesson.id}-${schedule.date ?? 'unknown'}-${String(index)}`,
      location: schedule.location?.trim() || null,
      notes: schedule.notes?.trim() || null,
      timeLabel:
        schedule.startTime && schedule.endTime
          ? `${schedule.startTime} - ${schedule.endTime}`
          : (schedule.startTime ?? schedule.endTime ?? null),
    }));
  }

  if (!lesson.startDate) {
    return [];
  }

  return [
    {
      dateLabel: formatScheduleRangeLabel(lesson.startDate, lesson.endDate),
      id: `${lesson.id}-fallback`,
      location: null,
      notes: null,
      timeLabel: null,
    },
  ];
};

const OfflineScheduleModal = ({
  lesson,
  onClose,
}: {
  lesson: ProgramCurriculumLesson;
  onClose: () => void;
}) => {
  const scheduleEntries = buildOfflineScheduleEntries(lesson);

  return (
    <Modal
      description='관리자가 등록한 오프라인 수업 일정을 확인할 수 있습니다.'
      onClose={onClose}
      size='lg'
      title={`${lesson.title} 오프라인 일정`}
    >
      <div className={styles['scheduleModalContent']}>
        <div className={styles['scheduleModalHeader']}>
          <p className={styles['scheduleModalKicker']}>오프라인 일정 안내</p>
          <h3 className={styles['scheduleModalTitle']}>{lesson.title}</h3>
        </div>

        <div className={styles['scheduleModalList']}>
          {scheduleEntries.map((entry, index) => {
            return (
              <article className={styles['scheduleModalItem']} key={entry.id}>
                <div className={styles['scheduleModalItemHeader']}>
                  <span className={styles['scheduleModalItemIndex']}>{String(index + 1)}회차</span>
                  <span className={styles['scheduleModalItemDate']}>{entry.dateLabel}</span>
                </div>

                {entry.timeLabel ? (
                  <p className={styles['scheduleModalItemMeta']}>시간 {entry.timeLabel}</p>
                ) : null}
                {entry.location ? (
                  <p className={styles['scheduleModalItemMeta']}>장소 {entry.location}</p>
                ) : null}
                {entry.notes ? (
                  <p className={styles['scheduleModalItemNotes']}>{entry.notes}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

const RatingStars = ({ inverse = false, rating }: RatingStarsProps) => {
  return (
    <div aria-hidden='true' className={styles['ratingStars']}>
      {Array.from({ length: 5 }, (_, index) => {
        const isFilled = index < Math.round(rating);

        return (
          <span
            className={classNames(
              styles['ratingStar'],
              isFilled
                ? styles['ratingStarFilled']
                : inverse
                  ? styles['ratingStarInverseEmpty']
                  : styles['ratingStarEmpty'],
            )}
            key={index}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

const ReviewPreviewCard = ({ isDimmed = false, review }: ReviewPreviewCardProps) => {
  return (
    <article
      className={classNames(
        styles['reviewPreviewCard'],
        isDimmed && styles['reviewPreviewCardDimmed'],
      )}
      data-review-id={review.id}
    >
      <p className={styles['reviewPreviewAuthor']}>{review.authorName}</p>

      <div className={styles['reviewMetaRow']}>
        <RatingStars rating={review.rating} />
        <span className={styles['reviewMetaScore']}>{review.rating.toFixed(1)}</span>
        <span className={styles['reviewMetaBadge']}>100% 수강 후 작성</span>
      </div>

      <p className={styles['reviewPreviewContent']}>{review.content}</p>
    </article>
  );
};

const FullReviewCard = ({ review }: FullReviewCardProps) => {
  return (
    <article className={styles['fullReviewCard']}>
      <div className={styles['fullReviewHeader']}>
        <span className={styles['fullReviewAuthor']}>{review.authorName}</span>
        <span className={styles['fullReviewDate']}>{review.dateLabel}</span>
      </div>

      <div className={styles['reviewMetaRow']}>
        <RatingStars rating={review.rating} />
        <span className={styles['reviewMetaScore']}>{review.rating.toFixed(1)}</span>
        <span className={styles['reviewMetaBadge']}>100% 수강 후 작성</span>
      </div>

      <p className={styles['fullReviewContent']}>{review.content}</p>

      <div className={styles['reviewReply']}>
        <div className={styles['reviewReplyHeader']}>
          <span className={styles['reviewReplyAuthor']}>소노스쿨 관리자</span>
          <span className={styles['reviewReplyBadge']}>관리자 답글</span>
        </div>

        <p className={styles['reviewReplyContent']}>{buildAdminReplyExample(review)}</p>
      </div>
    </article>
  );
};

const IntroductionBlockHeader = ({ subtitle, title }: IntroductionBlockHeaderProps) => {
  return (
    <div className={styles['introductionBlockHeader']}>
      <h3 className={styles['introductionBlockTitle']}>{title}</h3>
      <p className={styles['introductionBlockSubtitle']}>{subtitle}</p>
    </div>
  );
};

const IntroductionInfoBox = ({ content, title }: IntroductionInfoBoxProps) => {
  return (
    <article className={styles['infoBox']}>
      <p className={styles['infoBoxTitle']}>{title}</p>
      <ul className={styles['infoBoxList']}>
        <li className={styles['infoBoxItem']}>{content}</li>
      </ul>
    </article>
  );
};

const IntroductionFeatureCard = ({ content, title }: IntroductionFeatureCardProps) => {
  return (
    <article className={styles['featureCard']}>
      <span aria-hidden='true' className={styles['featureCardIcon']} />
      <p className={styles['featureCardTitle']}>{title}</p>
      <p className={styles['featureCardDescription']}>{content}</p>
    </article>
  );
};

const CurriculumWeekRow = ({
  isOpen,
  onOpenOfflineSchedule,
  onToggle,
  section,
  sectionIndex,
}: CurriculumWeekRowProps) => {
  return (
    <article className={styles['curriculumWeekRow']}>
      <button className={styles['curriculumWeekButton']} onClick={onToggle} type='button'>
        <div className={styles['curriculumWeekButtonLeft']}>
          <div className={styles['curriculumWeekLabelGroup']}>
            <span className={styles['curriculumWeekLabel']}>{String(sectionIndex + 1)}주차</span>
            <span className={styles['curriculumWeekHours']}>
              ({String(section.lessons.length)}강)
            </span>
          </div>
          <span className={styles['curriculumWeekTitle']}>{section.title}</span>
        </div>

        <ChevronDownIcon
          aria-hidden='true'
          className={classNames(
            styles['curriculumWeekChevron'],
            isOpen && styles['curriculumWeekChevronOpen'],
          )}
        />
      </button>

      {isOpen ? (
        <div className={styles['curriculumWeekContent']}>
          <p className={styles['curriculumWeekDescription']}>{section.description}</p>
          {section.lessons.map((lesson, lessonIndex) => {
            const lessonCapsules = buildCurriculumLessonCapsules(lesson);
            const lessonTime = formatCurriculumLessonTime(lesson);
            const hasOfflineSchedules = buildOfflineScheduleEntries(lesson).length > 0;

            return (
              <div
                className={classNames(
                  styles['curriculumLessonBlock'],
                  lessonIndex > 0 && styles['curriculumLessonBlockSeparated'],
                )}
                key={lesson.id}
              >
                <div className={styles['curriculumLessonHeader']}>
                  <div className={styles['curriculumLessonHeaderMain']}>
                    <span className={styles['curriculumLessonTitle']}>
                      {String(lessonIndex + 1)}. {lesson.title}
                    </span>
                    {lesson.deliveryType === 'problem' &&
                    lesson.questionCount &&
                    lesson.questionCount > 0 ? (
                      <span className={styles['curriculumLessonQuestionBadge']}>
                        총 {String(lesson.questionCount)}문항
                      </span>
                    ) : null}
                  </div>
                  <div className={styles['curriculumLessonHeaderAside']}>
                    {lesson.deliveryType === 'offline' && hasOfflineSchedules ? (
                      <button
                        className={styles['curriculumLessonScheduleButton']}
                        onClick={() => {
                          onOpenOfflineSchedule(lesson);
                        }}
                        type='button'
                      >
                        오프라인 일정 보기
                      </button>
                    ) : null}
                    <div className={styles['curriculumLessonCapsuleList']}>
                      {lessonCapsules.map((capsule) => {
                        return (
                          <span
                            className={styles['curriculumLessonCapsule']}
                            key={`${lesson.id}-${capsule}`}
                          >
                            {capsule}
                          </span>
                        );
                      })}
                    </div>
                    {lessonTime ? (
                      <span className={styles['curriculumLessonDuration']}>{lessonTime}</span>
                    ) : null}
                  </div>
                </div>

                <ul className={styles['curriculumLessonTopicList']}>
                  <li className={styles['curriculumLessonTopicItem']}>
                    {lesson.description || section.description}
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
};

export const ProgramPageDetailHero = ({ data, heroInfoPills }: ProgramPageDetailHeroProps) => {
  return (
    <section className={styles['heroSection']}>
      <div className={styles['heroBackground']}>
        <img alt='' className={styles['heroBackgroundImage']} src={data.heroImageSrc} />
        <div aria-hidden='true' className={styles['heroBackgroundOverlay']} />
      </div>

      <div className={styles['heroContent']}>
        <nav aria-label='교육과정 경로' className={styles['heroBreadcrumbNav']}>
          <ol className={styles['heroBreadcrumbList']}>
            {data.breadcrumbItems.map((breadcrumbItem, index) => {
              const isCurrent = index === data.breadcrumbItems.length - 1;

              return (
                <li
                  className={styles['heroBreadcrumbItem']}
                  key={`${breadcrumbItem.to}-${breadcrumbItem.label}`}
                >
                  {isCurrent ? (
                    <span className={styles['heroBreadcrumbCurrent']}>{breadcrumbItem.label}</span>
                  ) : (
                    <Link className={styles['heroBreadcrumbLink']} to={breadcrumbItem.to}>
                      {breadcrumbItem.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <h1 className={styles['heroTitle']}>{data.title}</h1>

        <div className={styles['heroRatingRow']}>
          <RatingStars inverse rating={data.overallRating} />
          <span className={styles['heroRatingScore']}>{data.overallRating.toFixed(1)}</span>
          <span className={styles['heroRatingCount']}>({data.reviewCount.toLocaleString()})</span>
        </div>

        <p className={styles['heroDescription']}>{data.description}</p>

        <div className={styles['heroInfoPillRow']}>
          {heroInfoPills.map((item) => {
            return (
              <div
                aria-label={`${item.label} ${item.value}`}
                className={styles['heroInfoPill']}
                key={item.label}
              >
                <span className={styles['heroInfoPillText']}>
                  #{item.label} {item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const ProgramPageDetailMainContent = ({
  activeSectionId,
  data,
  handleReviewCarouselScroll,
  handleTabClick,
  isQnaTabOpen,
  openCurriculumRows,
  openFaqId,
  reviewCarouselRef,
  reviewSortOrder,
  sectionRefHandlers,
  setOpenFaqId,
  setReviewSortOrder,
  sortedReviews,
  toggleCurriculumRow,
  visiblePreviewReviewIds,
}: ProgramPageDetailMainContentProps) => {
  const curriculumTrack = data.curriculumTrack;
  const [selectedOfflineLesson, setSelectedOfflineLesson] =
    useState<ProgramCurriculumLesson | null>(null);

  useEffect(() => {
    startTransition(() => {
      setSelectedOfflineLesson(null);
    });
  }, [data.programId]);

  return (
    <>
      <div className={styles['contentMain']}>
        <nav aria-label='강의 상세 탭' className={styles['tabBar']}>
          {detailTabItems.map((tabItem) => {
            const isActive = isQnaTabOpen
              ? tabItem.id === 'course-qna'
              : activeSectionId === tabItem.id;

            return (
              <button
                className={classNames(styles['tabButton'], isActive && styles['tabButtonActive'])}
                key={tabItem.id}
                onClick={() => {
                  handleTabClick(tabItem.id);
                }}
                type='button'
              >
                {tabItem.label}
              </button>
            );
          })}
        </nav>

        {isQnaTabOpen ? (
          <section className={classNames(styles['contentSection'], styles['qnaTabSection'])}>
            <ProgramQnaPanel
              enabled
              programId={data.programId ?? null}
              programThreadCount={data.qnaSummary?.totalThreadCount ?? null}
              title='Q&A'
              variant='board'
            />
          </section>
        ) : (
          <>
            <section className={styles['previewReviewSection']}>
              <h2 className={styles['sectionTitle']}>먼저 경험한 수강생들 후기</h2>

              <div className={styles['previewReviewCarousel']}>
                <div className={styles['previewReviewTrack']} ref={reviewCarouselRef}>
                  {sortedReviews.map((review) => {
                    return (
                      <ReviewPreviewCard
                        isDimmed={!visiblePreviewReviewIds.includes(review.id)}
                        key={review.id}
                        review={review}
                      />
                    );
                  })}
                </div>

                <button
                  aria-label='이전 후기'
                  className={classNames(
                    styles['carouselArrowButton'],
                    styles['carouselArrowButtonLeft'],
                  )}
                  onClick={() => {
                    handleReviewCarouselScroll('left');
                  }}
                  type='button'
                >
                  <span
                    aria-hidden='true'
                    className={classNames(
                      styles['carouselArrowIcon'],
                      styles['carouselArrowIconLeft'],
                    )}
                  />
                </button>

                <button
                  aria-label='다음 후기'
                  className={classNames(
                    styles['carouselArrowButton'],
                    styles['carouselArrowButtonRight'],
                  )}
                  onClick={() => {
                    handleReviewCarouselScroll('right');
                  }}
                  type='button'
                >
                  <span
                    aria-hidden='true'
                    className={classNames(
                      styles['carouselArrowIcon'],
                      styles['carouselArrowIconRight'],
                    )}
                  />
                </button>
              </div>
            </section>

            <section
              className={styles['contentSection']}
              id='course-introduction'
              ref={sectionRefHandlers['course-introduction']}
            >
              <h2 className={styles['sectionTitle']}>강의 소개</h2>

              <div className={styles['introductionSectionGroup']}>
                <section>
                  <IntroductionBlockHeader
                    subtitle='이론을 넘어 진단 사고력을 키우는 핵심 차별점을 정리했습니다.'
                    title='핵심 포인트'
                  />

                  <div className={styles['sectionBlockBody']}>
                    <div className={styles['infoBoxListGroup']}>
                      {data.stats.map((corePoint) => {
                        return (
                          <IntroductionInfoBox
                            content={corePoint.value}
                            key={`${corePoint.label}-${corePoint.value}`}
                            title={corePoint.label}
                          />
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section>
                  <IntroductionBlockHeader
                    subtitle='이 강의를 통해 기대할 수 있는 실전 변화와 성장 포인트를 정리했습니다.'
                    title='이 강의를 듣고 나면 이렇게 달라집니다'
                  />

                  <div className={styles['sectionBlockBody']}>
                    <div className={styles['checkItemGroup']}>
                      {(
                        data.learningOutcomes ??
                        (data.learningPoints ?? []).map((item, index) => ({
                          label: `변화 포인트 ${String(index + 1)}`,
                          value: item,
                        }))
                      ).map((statItem) => {
                        return (
                          <div className={styles['checkBlock']} key={statItem.label}>
                            <div className={styles['checkBlockTitleRow']}>
                              <span aria-hidden='true' className={styles['checkIcon']} />
                              <span className={styles['checkBlockTitle']}>{statItem.label}</span>
                            </div>

                            <ul className={styles['checkBlockList']}>
                              <li className={styles['checkBlockItem']}>{statItem.value}</li>
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section>
                  <IntroductionBlockHeader
                    subtitle='현재 학습 단계와 고민에 맞는 추천 대상'
                    title='이런 고민을 가진 분들께 추천합니다'
                  />

                  <div className={styles['sectionBlockBody']}>
                    <article className={styles['targetCard']}>
                      <div className={styles['targetCardContent']}>
                        <p className={styles['targetCardLabel']}>강의 대상은</p>

                        <div className={styles['targetCardChecklist']}>
                          {data.recommendedFor.map((item) => {
                            return (
                              <div className={styles['targetChecklistItem']} key={item}>
                                <span
                                  aria-hidden='true'
                                  className={styles['targetChecklistIcon']}
                                />
                                <span className={styles['targetChecklistText']}>{item}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  </div>
                </section>

                <section>
                  <IntroductionBlockHeader
                    subtitle='원활한 학습을 위해 미리 확인해야 할 안내 사항'
                    title='학습 효과를 높이기 위한 수강 전 체크리스트'
                  />

                  <div className={styles['sectionBlockBody']}>
                    <div className={styles['featureCardGrid']}>
                      {data.preparationChecklist.map((item, index) => {
                        return (
                          <IntroductionFeatureCard
                            content={item}
                            key={item}
                            title={featureCardTitles[index] ?? `체크 포인트 ${String(index + 1)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            </section>

            <section
              className={styles['contentSection']}
              id='course-curriculum'
              ref={sectionRefHandlers['course-curriculum']}
            >
              <h2 className={styles['sectionTitle']}>커리큘럼</h2>

              <div className={styles['curriculumTrackGroup']}>
                <section className={styles['curriculumTrack']}>
                  {curriculumTrack.title ? (
                    <div className={styles['curriculumTrackHeader']}>
                      <span aria-hidden='true' className={styles['curriculumTrackDot']} />
                      <h3 className={styles['curriculumTrackTitle']}>{curriculumTrack.title}</h3>
                    </div>
                  ) : null}

                  <div className={styles['curriculumSummaryPanel']}>
                    {curriculumTrack.summaryKind === 'decimal' ? (
                      <ol className={styles['curriculumSummaryListDecimal']}>
                        {curriculumTrack.summaryItems.map((item) => {
                          return (
                            <li className={styles['curriculumSummaryItem']} key={item}>
                              {item}
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <ul className={styles['curriculumSummaryListDisc']}>
                        {curriculumTrack.summaryItems.map((item) => {
                          return (
                            <li className={styles['curriculumSummaryItem']} key={item}>
                              {item}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className={styles['curriculumWeekList']}>
                    {curriculumTrack.sections.map((section, sectionIndex) => {
                      const rowKey = `${curriculumTrack.id}-${String(sectionIndex)}`;

                      return (
                        <CurriculumWeekRow
                          isOpen={openCurriculumRows[rowKey] ?? false}
                          key={rowKey}
                          onOpenOfflineSchedule={setSelectedOfflineLesson}
                          onToggle={() => {
                            toggleCurriculumRow(rowKey);
                          }}
                          section={section}
                          sectionIndex={sectionIndex}
                        />
                      );
                    })}
                  </div>
                </section>
              </div>
            </section>

            <section
              className={styles['contentSection']}
              id='course-reviews'
              ref={sectionRefHandlers['course-reviews']}
            >
              <h2 className={styles['sectionTitle']}>수강평</h2>

              <div className={styles['reviewScoreSummary']}>
                <span aria-hidden='true' className={styles['reviewScoreStar']}>
                  ★
                </span>
                <span className={styles['reviewScoreValue']}>{data.overallRating.toFixed(1)}</span>
                <span className={styles['reviewScoreCount']}>
                  ({data.reviewCount.toLocaleString()})
                </span>
              </div>

              <div className={styles['reviewSectionHeaderRow']}>
                <h3 className={styles['reviewSectionHeading']}>전체 수강평</h3>

                <label className={styles['selectField']}>
                  <span className={styles['screenReaderOnly']}>수강평 정렬</span>
                  <select
                    className={styles['sortSelect']}
                    onChange={(event) => {
                      setReviewSortOrder(event.target.value as ReviewSortOrder);
                    }}
                    value={reviewSortOrder}
                  >
                    <option value='recommended'>추천순</option>
                    <option value='latest'>최신순</option>
                  </select>
                </label>
              </div>

              <div className={styles['fullReviewList']}>
                {sortedReviews.map((review) => {
                  return <FullReviewCard key={review.id} review={review} />;
                })}
              </div>

              <button className={styles['moreReviewButton']} type='button'>
                수강평 더보기
              </button>
            </section>

            <section
              className={styles['contentSection']}
              id='course-faq'
              ref={sectionRefHandlers['course-faq']}
            >
              <h2 className={styles['sectionTitle']}>자주하는 질문</h2>

              <div className={styles['faqList']}>
                {data.faqItems.map((faqItem) => {
                  const isOpen = openFaqId === faqItem.id;

                  return (
                    <div
                      className={classNames(styles['faqItem'], isOpen && styles['faqItemOpen'])}
                      key={faqItem.id}
                    >
                      <button
                        className={classNames(
                          styles['faqQuestionButton'],
                          isOpen && styles['faqQuestionButtonOpen'],
                        )}
                        onClick={() => {
                          setOpenFaqId((currentOpenFaqId) => {
                            return currentOpenFaqId === faqItem.id ? null : faqItem.id;
                          });
                        }}
                        type='button'
                      >
                        <div className={styles['faqQuestionContent']}>
                          <span className={styles['faqQuestionText']}>{faqItem.question}</span>
                        </div>

                        <ChevronDownIcon
                          aria-hidden='true'
                          className={classNames(
                            styles['faqChevron'],
                            isOpen && styles['faqChevronOpen'],
                          )}
                        />
                      </button>

                      {isOpen ? <p className={styles['faqAnswer']}>{faqItem.answer}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>

      {selectedOfflineLesson ? (
        <OfflineScheduleModal
          lesson={selectedOfflineLesson}
          onClose={() => {
            setSelectedOfflineLesson(null);
          }}
        />
      ) : null}
    </>
  );
};

export const ProgramPageDetailSidebar = ({
  availabilityActionKind,
  availabilityActionLabel,
  availabilityStatusDescription,
  availabilityStatusLabel,
  data,
  discountedPriceAmount,
  handleAddToCart,
  handleEnrollNow,
  handleRequestAvailabilityAlert,
  isAlertPending,
  isAlertSubscribed,
  isAuthenticated,
  isEnrollingNow,
  isAddingToCart,
  originalPriceAmount,
  totalPriceLabel,
}: ProgramPageDetailSidebarProps) => {
  const hasDiscount =
    originalPriceAmount > 0 &&
    discountedPriceAmount > 0 &&
    discountedPriceAmount < originalPriceAmount;

  return (
    <aside className={styles['sidebar']}>
      <div className={styles['pricingCard']}>
        {hasDiscount ? (
          <p className={styles['pricingOriginalPrice']}>
            {originalPriceAmount ? formatPriceLabel(originalPriceAmount) : data.originalPriceLabel}
          </p>
        ) : null}

        <div className={styles['pricingDiscountRow']}>
          {hasDiscount ? (
            <span className={styles['pricingDiscountRate']}>{data.discountRateLabel}</span>
          ) : null}
          <span className={styles['pricingDiscountedPrice']}>
            {formatPriceLabel(discountedPriceAmount)}
          </span>
        </div>

        {data.remainingSeatsLabel || availabilityActionKind !== 'ENROLL' ? (
          <div className={styles['pricingAvailabilityBox']}>
            <span className={styles['pricingAvailabilityLabel']}>
              {availabilityActionKind === 'ENROLL' ? '현재 수강 가능' : '모집 상태'}
            </span>
            <span className={styles['pricingAvailabilityValue']}>{availabilityStatusLabel}</span>
          </div>
        ) : null}
        <p className={styles['pricingAvailabilityDescription']}>{availabilityStatusDescription}</p>

        <div className={styles['pricingTotalRow']}>
          <span className={styles['pricingTotalLabel']}>총 결제 금액</span>
          <span className={styles['pricingTotalValue']}>{totalPriceLabel}</span>
        </div>

        <div className={styles['pricingActionRow']}>
          {availabilityActionKind === 'ALERT' ? (
            <button
              className={styles['applyActionLink']}
              disabled={isAlertPending || isAlertSubscribed}
              onClick={handleRequestAvailabilityAlert}
              type='button'
            >
              {!isAuthenticated
                ? '로그인 후 알림 받기'
                : isAlertSubscribed
                  ? '알림 신청 완료'
                  : isAlertPending
                    ? '신청 중...'
                    : '알림 받기'}
            </button>
          ) : availabilityActionKind === 'DISABLED' ? (
            <button className={styles['applyActionLink']} disabled type='button'>
              {availabilityActionLabel}
            </button>
          ) : (
            <>
              <button
                className={styles['cartActionLink']}
                disabled={isAddingToCart}
                onClick={handleAddToCart}
                type='button'
              >
                {isAddingToCart ? '담는 중...' : '장바구니'}
              </button>
              <button
                className={styles['applyActionLink']}
                disabled={isEnrollingNow}
                onClick={handleEnrollNow}
                type='button'
              >
                {isEnrollingNow ? '이동 중...' : '수강 신청 하기'}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
