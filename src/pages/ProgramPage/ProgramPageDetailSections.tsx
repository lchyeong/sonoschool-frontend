import { startTransition, useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import sampleBannerSrc from '@/assets/images/sample_banner.png';
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
import { getProgramImageCropStyle } from '@/utils/programImageCrop';
import { sanitizeRequiredPublicAssetUrl } from '@/utils/publicAssetUrl';

import styles from './ProgramPageDetail.module.scss';
import {
  buildAdminReplyExample,
  detailTabItems,
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
  withIcon?: boolean;
  subtitle?: string;
  title: string;
}

interface IntroductionInfoBoxProps {
  content: string;
  title: string;
}

interface CurriculumWeekRowProps {
  isOpen: boolean;
  onOpenOfflineSchedule: (lesson: ProgramCurriculumLesson) => void;
  onToggle: () => void;
  section: ProgramCurriculumSection;
  sectionIndex: number;
  showDurationLabels: boolean;
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
  setAllCurriculumRowsOpen: ProgramPageDetailViewModel['setAllCurriculumRowsOpen'];
  setOpenFaqId: ProgramPageDetailViewModel['setOpenFaqId'];
  setReviewSortOrder: ProgramPageDetailViewModel['setReviewSortOrder'];
  sortedReviews: ProgramPageDetailViewModel['sortedReviews'];
  toggleCurriculumRow: ProgramPageDetailViewModel['toggleCurriculumRow'];
  visiblePreviewReviewIds: ProgramPageDetailViewModel['visiblePreviewReviewIds'];
}

interface ProgramPageDetailSidebarProps {
  availabilityActionKind: 'ENROLL' | 'DISABLED';
  availabilityActionLabel: string;
  availabilityStatusLabel: string;
  data: ProgramDetailPageResponse;
  discountedPriceAmount: ProgramPageDetailViewModel['discountedPriceAmount'];
  handleAddToCart: () => void;
  handleEnrollNow: () => void;
  handleRequestReservationInquiry: () => void;
  isAddingToCart: boolean;
  isCartAdded?: boolean;
  isEnrollmentOwned?: boolean;
  isEnrollingNow: boolean;
  isReservationInquiryAvailable: boolean;
  isReservationPending: boolean;
  originalPriceAmount: ProgramPageDetailViewModel['originalPriceAmount'];
  totalPriceLabel: ProgramPageDetailViewModel['totalPriceLabel'];
}

const curriculumDeliveryTypeLabelMap: Record<
  ProgramCurriculumSection['lessons'][number]['deliveryType'],
  string
> = {
  offline: '오프라인',
  online: '영상강의',
  practicum: '실습강의',
  problem: '문제풀이',
  resource: '자료강의',
};

const buildCurriculumLessonCapsules = (lesson: ProgramCurriculumSection['lessons'][number]) => {
  return [curriculumDeliveryTypeLabelMap[lesson.deliveryType]];
};

const curriculumFallbackDurationMinutes: Partial<
  Record<ProgramCurriculumSection['lessons'][number]['deliveryType'], number>
> = {
  offline: 60,
  practicum: 60,
  resource: 60,
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

const parseDurationLabelToMinutes = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const hourMatch = value.match(/(\d+)\s*시간/);
  const minuteMatch = value.match(/(\d+)\s*분/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const totalMinutes = hours * 60 + minutes;

  return totalMinutes > 0 ? totalMinutes : null;
};

const getDisplayBreadcrumbItems = (data: ProgramDetailPageResponse) => {
  return data.breadcrumbItems[0]?.label === '교육과정'
    ? data.breadcrumbItems.slice(1)
    : data.breadcrumbItems;
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

const formatMinuteDurationLabel = (minutes: number, prefix: string | null = null) => {
  if (minutes <= 0) {
    return null;
  }

  const baseLabel = `${String(minutes)}분`;

  return prefix ? `${prefix} ${baseLabel}` : baseLabel;
};

const getOfflineScheduleDurationMinutes = (lesson: ProgramCurriculumSection['lessons'][number]) => {
  if (
    lesson.deliveryType !== 'offline' ||
    !lesson.offlineSchedules ||
    lesson.offlineSchedules.length === 0
  ) {
    return 0;
  }

  return lesson.offlineSchedules.reduce((totalMinutes, schedule) => {
    const startMinutes = parseScheduleTimeToMinutes(schedule.startTime);
    const endMinutes = parseScheduleTimeToMinutes(schedule.endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return totalMinutes;
    }

    return totalMinutes + (endMinutes - startMinutes);
  }, 0);
};

const getCurriculumLessonDurationMinutes = (
  lesson: ProgramCurriculumSection['lessons'][number],
) => {
  const durationLabelMinutes = parseDurationLabelToMinutes(lesson.durationLabel);

  if (
    lesson.deliveryType === 'problem' &&
    lesson.problemTimeLimitSeconds &&
    lesson.problemTimeLimitSeconds > 0
  ) {
    return Math.ceil(lesson.problemTimeLimitSeconds / 60);
  }

  const offlineScheduleMinutes = getOfflineScheduleDurationMinutes(lesson);

  if (offlineScheduleMinutes > 0) {
    return offlineScheduleMinutes;
  }

  if (lesson.durationMinutes && lesson.durationMinutes > 0) {
    return lesson.durationMinutes;
  }

  if (durationLabelMinutes) {
    return durationLabelMinutes;
  }

  return curriculumFallbackDurationMinutes[lesson.deliveryType] ?? 0;
};

const formatCurriculumLessonTime = (lesson: ProgramCurriculumSection['lessons'][number]) => {
  const minutes = getCurriculumLessonDurationMinutes(lesson);

  if (!minutes || minutes <= 0) {
    return null;
  }

  return formatMinuteDurationLabel(minutes);
};

const shouldShowCurriculumDurationLabels = (sections: readonly ProgramCurriculumSection[]) => {
  const lessons = sections.flatMap((section) => section.lessons);
  const hasOfflineOrPracticumLesson = lessons.some(
    (lesson) => lesson.deliveryType === 'offline' || lesson.deliveryType === 'practicum',
  );

  if (hasOfflineOrPracticumLesson) {
    return false;
  }

  return lessons.some(
    (lesson) => lesson.deliveryType === 'online' || lesson.deliveryType === 'problem',
  );
};

const shouldShowCurriculumLessonTime = (
  lesson: ProgramCurriculumSection['lessons'][number],
  showDurationLabels: boolean,
) => {
  return showDurationLabels || lesson.deliveryType === 'problem';
};

const getCurriculumTotalDurationMinutes = (sections: readonly ProgramCurriculumSection[]) => {
  return sections.reduce((sectionTotalMinutes, section) => {
    return (
      sectionTotalMinutes +
      section.lessons.reduce((lessonTotalMinutes, lesson) => {
        return lessonTotalMinutes + getCurriculumLessonDurationMinutes(lesson);
      }, 0)
    );
  }, 0);
};

const renderCurriculumSummaryLabel = (label: string) => {
  const parts = label.split(/(\d+)/g);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    return /^\d+$/.test(part) ? (
      <strong key={`${part}-${String(index)}`}>{part}</strong>
    ) : (
      <span key={`${part}-${String(index)}`}>{part}</span>
    );
  });
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

const formatRemainingSeatsValue = (
  remainingSeatsLabel: string | undefined,
  fallbackLabel: string,
) => {
  if (!remainingSeatsLabel) {
    return fallbackLabel;
  }

  const normalizedLabel = remainingSeatsLabel
    .replace(/^수강\s*가능\s*인원\s*/, '')
    .replace(/^인원\s*/, '')
    .replace(/^잔여석\s*/, '')
    .replace(/\s*남음$/, '')
    .trim();

  if (!normalizedLabel || !/\d+\s*명/.test(normalizedLabel)) {
    return fallbackLabel;
  }

  return `잔여석 ${normalizedLabel}`;
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
      <p className={styles['reviewPreviewAuthor']}>{review.authorLoginId}</p>

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
        <span className={styles['fullReviewAuthor']}>{review.authorLoginId}</span>
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

const IntroductionBlockHeader = ({
  subtitle,
  title,
  withIcon = false,
}: IntroductionBlockHeaderProps) => {
  return (
    <div
      className={classNames(
        styles['introductionBlockHeader'],
        !subtitle && styles['introductionBlockHeaderWithoutSubtitle'],
      )}
    >
      <h3 className={styles['introductionBlockTitle']}>
        {withIcon ? (
          <span aria-hidden='true' className={styles['introductionBlockTitleIcon']} />
        ) : null}
        <span>{title}</span>
      </h3>
      {subtitle ? <p className={styles['introductionBlockSubtitle']}>{subtitle}</p> : null}
    </div>
  );
};

const IntroductionInfoBox = ({ content, title }: IntroductionInfoBoxProps) => {
  return (
    <article className={styles['infoBox']}>
      <p className={styles['infoBoxTitle']}>{title}</p>
      <div className={styles['infoBoxItemRow']}>
        <span aria-hidden='true' className={styles['infoBoxCheckIcon']} />
        <p className={styles['infoBoxItem']}>{content}</p>
      </div>
    </article>
  );
};

const IntroductionChecklistItem = ({ content }: { content: string }) => {
  return (
    <article className={styles['featureCard']}>
      <span aria-hidden='true' className={styles['featureCardIcon']} />
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
  showDurationLabels,
}: CurriculumWeekRowProps) => {
  const sectionDurationLabel = showDurationLabels
    ? formatMinuteDurationLabel(
        section.lessons.reduce((totalMinutes, lesson) => {
          return totalMinutes + getCurriculumLessonDurationMinutes(lesson);
        }, 0),
      )
    : null;

  return (
    <article className={styles['curriculumWeekRow']}>
      <button className={styles['curriculumWeekButton']} onClick={onToggle} type='button'>
        <div className={styles['curriculumWeekButtonLeft']}>
          <span className={styles['curriculumWeekTitle']}>
            섹션 {String(sectionIndex + 1)}. <span>{section.title}</span>
          </span>
        </div>

        <div className={styles['curriculumWeekButtonRight']}>
          <span className={styles['curriculumWeekMeta']}>{String(section.lessons.length)}개</span>
          {sectionDurationLabel ? (
            <>
              <span aria-hidden='true' className={styles['curriculumWeekMetaDot']} />
              <span className={styles['curriculumWeekMeta']}>{sectionDurationLabel}</span>
            </>
          ) : null}
          <ChevronDownIcon
            aria-hidden='true'
            className={classNames(
              styles['curriculumWeekChevron'],
              isOpen && styles['curriculumWeekChevronOpen'],
            )}
          />
        </div>
      </button>

      {isOpen ? (
        <div className={styles['curriculumWeekContent']}>
          <p className={styles['curriculumWeekDescription']}>{section.description}</p>
          {section.lessons.map((lesson, lessonIndex) => {
            const [lessonTypeLabel] = buildCurriculumLessonCapsules(lesson);
            const lessonTime = shouldShowCurriculumLessonTime(lesson, showDurationLabels)
              ? formatCurriculumLessonTime(lesson)
              : null;
            const questionCountLabel =
              lesson.deliveryType === 'problem' && lesson.questionCount && lesson.questionCount > 0
                ? `${String(lesson.questionCount)}문항`
                : null;
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
                  <span className={styles['curriculumLessonCapsule']}>{lessonTypeLabel}</span>
                  <div className={styles['curriculumLessonHeaderMain']}>
                    <span className={styles['curriculumLessonTitle']}>
                      {String(lessonIndex + 1)}. {lesson.title}
                    </span>
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
                    {questionCountLabel ? (
                      <span className={styles['curriculumLessonQuestionCount']}>
                        {questionCountLabel}
                      </span>
                    ) : null}
                    {questionCountLabel && lessonTime ? (
                      <span aria-hidden='true' className={styles['curriculumLessonMetaDot']} />
                    ) : null}
                    {lessonTime ? (
                      <span className={styles['curriculumLessonDuration']}>{lessonTime}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
};

export const ProgramPageDetailHero = ({ data, heroInfoPills }: ProgramPageDetailHeroProps) => {
  const breadcrumbItems = getDisplayBreadcrumbItems(data);
  const heroImageSrc = sanitizeRequiredPublicAssetUrl(data.heroImageSrc, sampleBannerSrc);
  const heroImageCropStyle = getProgramImageCropStyle({
    offsetX: data.heroImageCropOffsetX,
    offsetY: data.heroImageCropOffsetY,
    zoom: data.heroImageCropZoom,
  });

  return (
    <section className={styles['heroSection']}>
      <div className={styles['heroBackground']}>
        <img
          alt=''
          className={styles['heroBackgroundImage']}
          src={heroImageSrc}
          style={heroImageCropStyle}
        />
        <div aria-hidden='true' className={styles['heroBackgroundOverlay']} />
      </div>

      <div className={styles['heroContent']}>
        <nav aria-label='교육과정 경로' className={styles['heroBreadcrumbNav']}>
          <ol className={styles['heroBreadcrumbList']}>
            {breadcrumbItems.map((breadcrumbItem, index) => {
              const isCurrent = index === breadcrumbItems.length - 1;

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

        <p className={styles['heroDescription']}>{data.description}</p>

        <div className={styles['heroRatingRow']}>
          <RatingStars inverse rating={data.overallRating} />
          <span className={styles['heroRatingScore']}>{data.overallRating.toFixed(1)}</span>
          <span className={styles['heroRatingCount']}>({data.reviewCount.toLocaleString()})</span>
        </div>

        <div className={styles['heroInfoPillRow']}>
          {heroInfoPills.map((item) => {
            return (
              <div
                aria-label={`${item.label} ${item.value}`}
                className={styles['heroInfoPill']}
                key={item.label}
              >
                <span className={styles['heroInfoPillText']}>{item.value}</span>
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
  setAllCurriculumRowsOpen,
  setOpenFaqId,
  setReviewSortOrder,
  sortedReviews,
  toggleCurriculumRow,
  visiblePreviewReviewIds,
}: ProgramPageDetailMainContentProps) => {
  const curriculumTrack = data.curriculumTrack;
  const hasReviews = sortedReviews.length > 0;
  const curriculumSectionCount = curriculumTrack.sections.length;
  const curriculumLessonCount = curriculumTrack.sections.reduce((total, section) => {
    return total + section.lessons.length;
  }, 0);
  const showCurriculumDurationLabels = shouldShowCurriculumDurationLabels(curriculumTrack.sections);
  const curriculumTotalDurationLabel = showCurriculumDurationLabels
    ? formatDurationLabel(getCurriculumTotalDurationMinutes(curriculumTrack.sections), '총')
    : null;
  const curriculumSummaryLabels = [
    `${String(curriculumSectionCount)}개 섹션`,
    `${String(curriculumLessonCount)}개 학습 콘텐츠`,
    ...(curriculumTotalDurationLabel ? [curriculumTotalDurationLabel] : []),
  ];
  const curriculumRowKeys = curriculumTrack.sections.map((_, sectionIndex) => {
    return `${curriculumTrack.id}-${String(sectionIndex)}`;
  });
  const hasCurriculumSections = curriculumRowKeys.length > 0;
  const areAllCurriculumRowsOpen =
    hasCurriculumSections && curriculumRowKeys.every((rowKey) => openCurriculumRows[rowKey]);
  const curriculumToggleAllLabel = areAllCurriculumRowsOpen ? '모두 접기' : '모두 펼치기';
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
          <section
            className={classNames(styles['contentSection'], styles['qnaTabSection'])}
            id='course-qna'
            ref={sectionRefHandlers['course-qna']}
          >
            <ProgramQnaPanel
              boardLayout='table'
              enabled
              exclusiveWriteMode
              hideBoardTitle
              programId={data.programId ?? null}
              programThreadCount={data.qnaSummary?.totalThreadCount ?? null}
              showBoardSummary={false}
              title='Q&A'
              variant='board'
            />
          </section>
        ) : (
          <>
            {hasReviews ? (
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
            ) : null}

            <section
              className={classNames(
                styles['contentSection'],
                hasReviews && styles['contentSectionSeparated'],
              )}
              id='course-introduction'
              ref={sectionRefHandlers['course-introduction']}
            >
              <h2 className={styles['sectionTitle']}>강의 소개</h2>

              <div className={styles['introductionSectionGroup']}>
                <section className={styles['corePointSection']}>
                  <IntroductionBlockHeader title='핵심 포인트' withIcon />

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

                <section className={styles['outcomeSection']}>
                  <IntroductionBlockHeader title='이 강의를 듣고 나면 이렇게 달라집니다' />

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

                <section className={styles['targetSection']}>
                  <IntroductionBlockHeader title='이런 고민을 가진 분들께 추천합니다' />

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

                <section className={styles['preparationSection']}>
                  <IntroductionBlockHeader title='학습 효과를 높이기 위한 수강 전 체크리스트' />

                  <div className={styles['sectionBlockBody']}>
                    <div className={styles['featureCardGrid']}>
                      {data.preparationChecklist.map((item, index) => {
                        return (
                          <IntroductionChecklistItem
                            content={item}
                            key={`${item}-${String(index)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            </section>

            <section
              className={classNames(styles['contentSection'], styles['contentSectionSeparated'])}
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

                  <div className={styles['curriculumControlsRow']}>
                    <div className={styles['curriculumSummaryPanel']}>
                      <ul className={styles['curriculumSummaryListDisc']}>
                        {curriculumSummaryLabels.map((item) => {
                          return (
                            <li className={styles['curriculumSummaryItem']} key={item}>
                              {renderCurriculumSummaryLabel(item)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {hasCurriculumSections ? (
                      <button
                        className={styles['curriculumToggleAllButton']}
                        onClick={() => {
                          setAllCurriculumRowsOpen(!areAllCurriculumRowsOpen);
                        }}
                        type='button'
                      >
                        <ChevronDownIcon
                          aria-hidden='true'
                          className={classNames(
                            styles['curriculumToggleAllIcon'],
                            areAllCurriculumRowsOpen && styles['curriculumToggleAllIconOpen'],
                          )}
                        />
                        <span>{curriculumToggleAllLabel}</span>
                      </button>
                    ) : null}
                  </div>

                  {curriculumTrack.sections.length > 0 ? (
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
                            showDurationLabels={showCurriculumDurationLabels}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles['curriculumEmptyState']}>
                      <p className={styles['curriculumEmptyTitle']}>강의 구성이 준비 중입니다.</p>
                      <p className={styles['curriculumEmptyDescription']}>
                        등록된 섹션과 강의가 아직 없습니다.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </section>

            <section
              className={classNames(styles['contentSection'], styles['contentSectionSeparated'])}
              id='course-reviews'
              ref={sectionRefHandlers['course-reviews']}
            >
              <div className={styles['reviewTitleRow']}>
                <h2 className={styles['sectionTitle']}>수강평</h2>
                <span className={styles['reviewTotalCount']}>
                  전체{' '}
                  <strong className={styles['reviewTotalCountValue']}>
                    {data.reviewCount.toLocaleString()}
                  </strong>
                  개
                </span>
              </div>

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

              {hasReviews ? (
                <button className={styles['moreReviewButton']} type='button'>
                  수강평 더보기
                </button>
              ) : null}
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
  availabilityStatusLabel,
  data,
  discountedPriceAmount,
  handleAddToCart,
  handleEnrollNow,
  handleRequestReservationInquiry,
  isAddingToCart,
  isCartAdded = false,
  isEnrollmentOwned = false,
  isEnrollingNow,
  isReservationInquiryAvailable,
  isReservationPending,
  originalPriceAmount,
  totalPriceLabel,
}: ProgramPageDetailSidebarProps) => {
  const hasDiscount =
    originalPriceAmount > 0 &&
    discountedPriceAmount > 0 &&
    discountedPriceAmount < originalPriceAmount;
  const discountAmount = hasDiscount ? originalPriceAmount - discountedPriceAmount : 0;
  const statusLabel = availabilityStatusLabel;
  const statusValue = formatRemainingSeatsValue(data.remainingSeatsLabel, availabilityStatusLabel);

  return (
    <aside className={styles['sidebar']}>
      <div className={styles['pricingCard']}>
        <div className={styles['pricingStatusRow']}>
          <span className={styles['pricingStatusLabel']}>{statusLabel}</span>
          <span className={styles['pricingStatusValue']}>{statusValue}</span>
        </div>

        <div className={styles['pricingInfoRows']}>
          <div className={styles['pricingInfoRow']}>
            <span className={styles['pricingInfoLabel']}>상품 금액</span>
            <span className={styles['pricingInfoValue']}>
              {originalPriceAmount
                ? formatPriceLabel(originalPriceAmount)
                : data.originalPriceLabel}
            </span>
          </div>

          {hasDiscount ? (
            <div className={styles['pricingInfoRow']}>
              <span className={styles['pricingInfoLabel']}>강의 할인</span>
              <span className={styles['pricingDiscountValue']}>
                -{formatPriceLabel(discountAmount)}
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles['pricingDivider']} />

        <div className={styles['pricingTotalRow']}>
          <span className={styles['pricingTotalLabel']}>총 결제 금액</span>
          <span className={styles['pricingTotalValue']}>{totalPriceLabel}</span>
        </div>

        <div className={styles['pricingActionRow']}>
          {availabilityActionKind === 'ENROLL' ? (
            <>
              <button
                className={styles['applyActionLink']}
                disabled={isEnrollmentOwned || isEnrollingNow}
                onClick={handleEnrollNow}
                type='button'
              >
                {isEnrollmentOwned ? '수강 중' : isEnrollingNow ? '이동 중...' : '수강신청하기'}
              </button>
              {isReservationInquiryAvailable ? (
                <button
                  className={styles['reservationActionLink']}
                  disabled={isReservationPending}
                  onClick={handleRequestReservationInquiry}
                  type='button'
                >
                  {isReservationPending ? '접수 중...' : '예약하기'}
                </button>
              ) : null}
              <button
                className={
                  isCartAdded
                    ? `${styles['cartActionLink']} ${styles['cartActionLinkAdded']}`
                    : styles['cartActionLink']
                }
                disabled={isEnrollmentOwned || isAddingToCart}
                onClick={handleAddToCart}
                type='button'
              >
                {isCartAdded ? '장바구니 보기' : isAddingToCart ? '담는 중...' : '장바구니 담기'}
              </button>
            </>
          ) : (
            <button className={styles['applyActionLink']} disabled type='button'>
              {availabilityActionLabel}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
