import { Link } from 'react-router-dom';

import searchScopeChevronIconSrc from '@/assets/icons/search-scope-chevron.svg';
import { routePaths } from '@/routes/routeRegistry';
import type {
  ProgramBreadcrumbItem,
  ProgramCatalogStatus,
  ProgramCollectionCard,
  ProgramInfoItem,
  ProgramInstructorProfile,
  ProgramLectureCard,
  ProgramStat,
} from '@/types/programCatalog';
import { classNames } from '@/utils/classNames';
import {
  resolveProgramCatalogStatus,
  shouldMuteProgramThumbnail,
} from '@/utils/programCatalogStatus';
import { getProgramImageCropStyle } from '@/utils/programImageCrop';

import styles from './programCatalogShared.module.scss';

interface ProgramStatListProps {
  items: readonly ProgramInfoItem[] | readonly ProgramStat[];
}

interface ProgramBreadcrumbsProps {
  className?: string | undefined;
  items: ProgramBreadcrumbItem[];
  maxDepth?: number | undefined;
}

interface ProgramCollectionCardItemProps {
  item: ProgramCollectionCard;
}

interface ProgramLectureCardItemProps {
  item: ProgramLectureCard;
  isAlertPending?: boolean;
  isAlertSubscribed?: boolean;
  isAuthenticated?: boolean;
  isCartPending?: boolean;
  isCartAdded?: boolean;
  isEnrollmentOwned?: boolean;
  onAddToCart?: ((item: ProgramLectureCard) => void) | undefined;
  onSubscribeAlert?: ((item: ProgramLectureCard) => void) | undefined;
}

interface ProgramArchiveLectureCardItemProps {
  item: ProgramLectureCard;
  isAlertPending?: boolean;
  isAlertSubscribed?: boolean;
  isAuthenticated?: boolean;
  isCartPending?: boolean;
  isCartAdded?: boolean;
  isEnrollmentOwned?: boolean;
  onAddToCart?: ((item: ProgramLectureCard) => void) | undefined;
  onSubscribeAlert?: ((item: ProgramLectureCard) => void) | undefined;
}

interface ProgramEducatorCardProps {
  instructor: ProgramInstructorProfile;
}

const buildProgramMetaTags = (item: ProgramLectureCard) => {
  return [item.difficultyLabel, item.formatLabel];
};

const buildArchiveMetaTags = (item: ProgramLectureCard) => {
  const sourceTags = item.tags?.length ? item.tags : buildProgramMetaTags(item);

  return Array.from(new Set(sourceTags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 3);
};

const resolveLectureCatalogStatus = (item: ProgramLectureCard): ProgramCatalogStatus => {
  return resolveProgramCatalogStatus(item);
};

const resolveAvailability = (item: ProgramLectureCard): { label: string; value: string } | null => {
  const catalogStatus = resolveLectureCatalogStatus(item);

  switch (catalogStatus) {
    case 'OPEN':
      if (item.remainingSeatsCount !== undefined) {
        return {
          label: '수강 가능',
          value: `${String(item.remainingSeatsCount)}명 남음`,
        };
      }

      if (!item.remainingSeatsLabel) {
        return {
          label: '수강 가능',
          value: '신청 가능',
        };
      }

      return {
        label: '수강 가능',
        value: item.remainingSeatsLabel.replace(/^인원\s*/, '').trim(),
      };
    case 'FULL':
      return {
        label: '모집 상태',
        value: '정원 마감',
      };
    case 'SCHEDULED':
      return {
        label: '모집 상태',
        value: '모집 예정',
      };
    case 'STARTED':
      return {
        label: '모집 상태',
        value: '운영 중',
      };
    case 'CLOSED':
      return {
        label: '모집 상태',
        value: '모집 종료',
      };
    case 'ENDED':
      return {
        label: '모집 상태',
        value: '과정 종료',
      };
  }
};

const buildScheduleText = (scheduleLabel: string) => {
  return `모집기간 ${scheduleLabel}`;
};

const buildDurationText = (durationLabel: string) => {
  return `운영기간 ${durationLabel}`;
};

const hasArchiveRecruitmentPeriod = (item: ProgramLectureCard) => {
  return Boolean(item.saleStartAt || item.saleEndAt || !item.scheduleLabel.includes('상시'));
};

const resolveArchiveStatusLabel = (item: ProgramLectureCard) => {
  const catalogStatus = resolveLectureCatalogStatus(item);

  switch (catalogStatus) {
    case 'OPEN':
      return hasArchiveRecruitmentPeriod(item) ? '모집 중' : '상시 모집 중';
    case 'FULL':
      return '정원마감';
    case 'SCHEDULED':
      return '모집예정';
    case 'STARTED':
      return '과정진행중';
    case 'CLOSED':
      return '신청마감';
    case 'ENDED':
      return '과정종료';
  }
};

const hasArchiveDiscount = (item: ProgramLectureCard) => {
  if (!item.discountRateLabel || !item.originalPriceLabel || !item.discountedPriceLabel) {
    return false;
  }

  return (
    item.discountRateLabel !== '0%' &&
    item.discountRateLabel !== '할인없음' &&
    item.discountRateLabel !== '할인 없음'
  );
};

const formatArchiveDiscountRate = (discountRateLabel: string) => {
  return discountRateLabel.includes('할인') ? discountRateLabel : `${discountRateLabel} 할인`;
};

const ProgramCardAction = ({
  isCartPending = false,
  isCartAdded = false,
  isEnrollmentOwned = false,
  item,
  onAddToCart,
}: {
  isAlertPending?: boolean;
  isAlertSubscribed?: boolean;
  isAuthenticated?: boolean;
  isCartPending?: boolean;
  isCartAdded?: boolean;
  isEnrollmentOwned?: boolean;
  item: ProgramLectureCard;
  onAddToCart?: ((item: ProgramLectureCard) => void) | undefined;
  onSubscribeAlert?: ((item: ProgramLectureCard) => void) | undefined;
}) => {
  const catalogStatus = resolveLectureCatalogStatus(item);
  const canAddToCart =
    catalogStatus === 'OPEN' &&
    !isEnrollmentOwned &&
    Boolean(onAddToCart) &&
    typeof item.programId === 'number' &&
    item.programId > 0;
  const isDisabled = !canAddToCart || isCartPending;

  const cartActionLabel = isEnrollmentOwned
    ? '이미 수강 중인 과정입니다.'
    : isCartAdded
      ? '장바구니 보기'
      : isCartPending
        ? '장바구니에 담는 중'
        : canAddToCart
          ? '장바구니 담기'
          : `${resolveArchiveStatusLabel(item)} 과정`;

  if (isEnrollmentOwned) {
    return (
      <button
        aria-label={cartActionLabel}
        className={classNames(styles['cardIconButton'], styles['cardIconButtonEnrollmentDisabled'])}
        disabled
        type='button'
      >
        <span className={styles['srOnly']}>{cartActionLabel}</span>
        <span aria-hidden='true' className={styles['cardActionIcon']} />
      </button>
    );
  }

  if (isCartAdded) {
    return (
      <Link
        aria-label={cartActionLabel}
        className={classNames(styles['cardIconButton'], styles['cardIconButtonAdded'])}
        to={routePaths.cart}
      >
        <span className={styles['srOnly']}>{cartActionLabel}</span>
        <span aria-hidden='true' className={styles['cardActionIcon']} />
      </Link>
    );
  }

  return (
    <button
      aria-label={cartActionLabel}
      className={classNames(
        styles['cardIconButton'],
        isCartPending && styles['cardIconButtonPending'],
      )}
      disabled={isDisabled}
      onClick={() => {
        if (!canAddToCart) {
          return;
        }

        onAddToCart?.(item);
      }}
      type='button'
    >
      <span className={styles['srOnly']}>{cartActionLabel}</span>
      <span aria-hidden='true' className={styles['cardActionIcon']} />
    </button>
  );
};

// 수치/요약 정보는 여러 화면에서 같은 형태로 반복되므로
// 공통 리스트 컴포넌트로 분리해 두면 페이지 본문이 더 빨리 읽힙니다.
export const ProgramStatList = ({ items }: ProgramStatListProps) => {
  return (
    <dl className={styles['statList']}>
      {items.map((item) => {
        return (
          <div className={styles['statCard']} key={item.label}>
            <dt className={styles['statLabel']}>{item.label}</dt>
            <dd className={styles['statValue']}>{item.value}</dd>
          </div>
        );
      })}
    </dl>
  );
};

// 현재 사용자가 어느 경로까지 들어왔는지 한 번에 이해할 수 있게
// 교육과정 페이지에는 브레드크럼을 항상 노출합니다.
const getCategoryBreadcrumbItems = (items: readonly ProgramBreadcrumbItem[], maxDepth?: number) => {
  const categoryItems = items[0]?.label === '교육과정' ? items.slice(1) : [...items];

  if (typeof maxDepth !== 'number' || maxDepth <= 0) {
    return categoryItems;
  }

  return categoryItems.slice(-maxDepth);
};

export const ProgramBreadcrumbs = ({ className, items, maxDepth }: ProgramBreadcrumbsProps) => {
  const displayItems = getCategoryBreadcrumbItems(items, maxDepth);

  if (!displayItems.length) {
    return null;
  }

  return (
    <nav aria-label='교육과정 경로' className={classNames(styles['breadcrumbNav'], className)}>
      <ol className={styles['breadcrumbList']}>
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;

          return (
            <li className={styles['breadcrumbItem']} key={`${item.to}-${item.label}`}>
              {isLast ? (
                <span aria-current='page' className={styles['breadcrumbCurrent']}>
                  {item.label}
                </span>
              ) : (
                <Link className={styles['breadcrumbLink']} to={item.to}>
                  {item.label}
                </Link>
              )}
              {!isLast ? (
                <img
                  alt=''
                  aria-hidden='true'
                  className={styles['breadcrumbChevron']}
                  src={searchScopeChevronIconSrc}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const ProgramCollectionCardItem = ({ item }: ProgramCollectionCardItemProps) => {
  return (
    <article className={styles['collectionCard']}>
      <div className={styles['collectionImageFrame']}>
        <img
          alt={item.coverImageAlt}
          className={styles['collectionImage']}
          src={item.coverImageSrc}
        />
      </div>

      <div className={styles['collectionBody']}>
        <div className={styles['collectionMetaRow']}>
          <span className={styles['collectionCount']}>과정 {String(item.lectureCount)}개</span>
          <ul className={styles['inlineTagList']}>
            {item.formatLabels.map((formatLabel) => {
              return (
                <li className={styles['inlineTagItemMuted']} key={formatLabel}>
                  {formatLabel}
                </li>
              );
            })}
          </ul>
        </div>

        <h3 className={styles['collectionTitle']}>
          <Link className={styles['cardLink']} to={item.to}>
            {item.title}
          </Link>
        </h3>
        <p className={styles['collectionDescription']}>{item.description}</p>
      </div>
    </article>
  );
};

export const ProgramLectureCardItem = ({
  item,
  isAlertPending = false,
  isAlertSubscribed = false,
  isAuthenticated = false,
  isCartPending = false,
  isCartAdded = false,
  isEnrollmentOwned = false,
  onAddToCart,
  onSubscribeAlert,
}: ProgramLectureCardItemProps) => {
  const availability = resolveAvailability(item);
  const metaTags = buildProgramMetaTags(item);
  const shouldMuteThumbnail = shouldMuteProgramThumbnail(item);
  const thumbnailCropStyle = getProgramImageCropStyle({
    offsetX: item.thumbnailCropOffsetX,
    offsetY: item.thumbnailCropOffsetY,
    zoom: item.thumbnailCropZoom,
  });

  return (
    <article className={styles['lectureCard']}>
      <Link aria-label={item.title} className={styles['cardLinkOverlay']} to={item.to} />

      <div className={styles['lectureImageFrame']}>
        <img
          alt={item.thumbnailAlt}
          className={classNames(
            styles['lectureImage'],
            shouldMuteThumbnail && styles['lectureImageMuted'],
          )}
          src={item.thumbnailSrc}
          style={thumbnailCropStyle}
        />
      </div>

      <div className={styles['lectureBody']}>
        <div className={styles['lectureMetaRow']}>
          <span className={styles['lectureCategory']}>{item.categoryLabel}</span>
          <div className={styles['lectureTopActionRow']}>
            <ProgramCardAction
              isAlertPending={isAlertPending}
              isAlertSubscribed={isAlertSubscribed}
              isAuthenticated={isAuthenticated}
              isCartAdded={isCartAdded}
              isCartPending={isCartPending}
              isEnrollmentOwned={isEnrollmentOwned}
              item={item}
              onAddToCart={onAddToCart}
              onSubscribeAlert={onSubscribeAlert}
            />
          </div>
        </div>

        <h3 className={styles['lectureTitle']}>{item.title}</h3>
        <p className={styles['lectureDescription']}>{item.summary}</p>

        <div className={styles['lecturePriceRow']}>
          <p className={styles['lecturePrice']}>{item.priceLabel}</p>

          {availability ? (
            <div className={styles['lectureAvailabilityBadge']}>
              <span className={styles['lectureAvailabilityLabel']}>{availability.label}</span>
              <span className={styles['lectureAvailabilityValue']}>{availability.value}</span>
            </div>
          ) : null}
        </div>

        <p className={styles['lectureScheduleText']}>{buildScheduleText(item.scheduleLabel)}</p>
        <p className={styles['lectureScheduleText']}>{buildDurationText(item.durationLabel)}</p>

        <ul className={styles['programMetaTagList']}>
          {metaTags.map((tag) => {
            return (
              <li className={styles['programMetaTagItem']} key={tag}>
                {tag}
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
};

// 카테고리 아카이브에서는 한 화면에 강의를 많이 훑어봐야 하므로
// 메타 정보를 줄이고 "강의 선택"에 집중한 더 단순한 카드 버전을 따로 둡니다.
export const ProgramArchiveLectureCardItem = ({
  item,
  isAlertPending = false,
  isAlertSubscribed = false,
  isAuthenticated = false,
  isCartAdded = false,
  isCartPending = false,
  isEnrollmentOwned = false,
  onAddToCart,
  onSubscribeAlert,
}: ProgramArchiveLectureCardItemProps) => {
  const catalogStatus = resolveLectureCatalogStatus(item);
  const archiveStatusLabel = resolveArchiveStatusLabel(item);
  const metaTags = buildArchiveMetaTags(item);
  const hasDiscount = hasArchiveDiscount(item);
  const salePriceLabel = item.discountedPriceLabel ?? item.priceLabel;
  const shouldMuteThumbnail = shouldMuteProgramThumbnail(catalogStatus);
  const thumbnailCropStyle = getProgramImageCropStyle({
    offsetX: item.thumbnailCropOffsetX,
    offsetY: item.thumbnailCropOffsetY,
    zoom: item.thumbnailCropZoom,
  });

  return (
    <article className={styles['archiveLectureCard']}>
      <Link aria-label={item.title} className={styles['cardLinkOverlay']} to={item.to} />

      <div className={styles['archiveLectureImageFrame']}>
        <img
          alt={item.thumbnailAlt}
          className={classNames(
            styles['archiveLectureImage'],
            shouldMuteThumbnail && styles['archiveLectureImageMuted'],
          )}
          src={item.thumbnailSrc}
          style={thumbnailCropStyle}
        />
      </div>

      <div className={styles['archiveLectureBody']}>
        <div className={styles['archiveLectureTopRow']}>
          <p
            className={classNames(
              styles['archiveLectureStatus'],
              catalogStatus !== 'OPEN' && styles['archiveLectureStatusMuted'],
            )}
          >
            {archiveStatusLabel}
          </p>

          <ProgramCardAction
            isAlertPending={isAlertPending}
            isAlertSubscribed={isAlertSubscribed}
            isAuthenticated={isAuthenticated}
            isCartAdded={isCartAdded}
            isCartPending={isCartPending}
            isEnrollmentOwned={isEnrollmentOwned}
            item={item}
            onAddToCart={onAddToCart}
            onSubscribeAlert={onSubscribeAlert}
          />
        </div>

        <h3 className={styles['archiveLectureTitle']}>{item.title}</h3>

        <div className={styles['archiveLectureBottomMeta']}>
          <div className={styles['archiveLecturePricing']}>
            {hasDiscount ? (
              <p className={styles['archiveLectureDiscountRow']}>
                <span className={styles['archiveLectureDiscountRate']}>
                  {formatArchiveDiscountRate(item.discountRateLabel ?? '')}
                </span>
                <span className={styles['archiveLectureOriginalPrice']}>
                  {item.originalPriceLabel}
                </span>
              </p>
            ) : null}
            <p className={styles['archiveLecturePrice']}>{salePriceLabel}</p>
          </div>

          <div className={styles['archiveLectureScheduleGroup']}>
            <p className={styles['archiveLectureScheduleRow']}>
              <span className={styles['archiveLectureScheduleLabel']}>모집기간</span>
              <span className={styles['archiveLectureScheduleValue']}>{item.scheduleLabel}</span>
            </p>
            <p className={styles['archiveLectureScheduleRow']}>
              <span className={styles['archiveLectureScheduleLabel']}>수강기간</span>
              <span className={styles['archiveLectureScheduleValue']}>{item.durationLabel}</span>
            </p>
          </div>

          <ul className={styles['programMetaTagList']}>
            {metaTags.map((tag) => {
              return (
                <li className={styles['programMetaTagItem']} key={tag}>
                  {tag}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </article>
  );
};

export const ProgramEducatorCard = ({ instructor }: ProgramEducatorCardProps) => {
  return (
    <aside className={styles['educatorCard']}>
      <div className={styles['educatorHeader']}>
        <img
          alt={instructor.profileImageAlt}
          className={styles['educatorImage']}
          src={instructor.profileImageSrc}
        />

        <div className={styles['educatorCopy']}>
          <p className={styles['educatorEyebrow']}>Lead Educator</p>
          <h3 className={styles['educatorName']}>{instructor.name}</h3>
          <p className={styles['educatorHeadline']}>{instructor.headline}</p>
        </div>
      </div>

      <p className={styles['educatorIntroduction']}>{instructor.introduction}</p>

      <ul className={styles['educatorHighlightList']}>
        {instructor.careerHighlights.map((careerHighlight) => {
          return (
            <li className={styles['educatorHighlightItem']} key={careerHighlight}>
              {careerHighlight}
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
