import { Link } from 'react-router-dom';

import cartIconSrc from '@/assets/icons/icon_cart.svg';
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

import styles from './programCatalogShared.module.scss';

interface ProgramStatListProps {
  items: readonly ProgramInfoItem[] | readonly ProgramStat[];
}

interface ProgramBreadcrumbsProps {
  items: ProgramBreadcrumbItem[];
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
  onAddToCart?: ((item: ProgramLectureCard) => void) | undefined;
  onSubscribeAlert?: ((item: ProgramLectureCard) => void) | undefined;
}

interface ProgramArchiveLectureCardItemProps {
  item: ProgramLectureCard;
  isAlertPending?: boolean;
  isAlertSubscribed?: boolean;
  isAuthenticated?: boolean;
  isCartPending?: boolean;
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

const isLectureSoldOut = (item: ProgramLectureCard) => {
  if (item.remainingSeatsCount !== undefined) {
    return item.remainingSeatsCount <= 0;
  }

  if (!item.remainingSeatsLabel) {
    return false;
  }

  return item.remainingSeatsLabel.includes('0명');
};

const resolveLectureCatalogStatus = (item: ProgramLectureCard): ProgramCatalogStatus => {
  if (item.catalogStatus) {
    return item.catalogStatus;
  }

  return isLectureSoldOut(item) ? 'FULL' : 'OPEN';
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
  }
};

const buildScheduleText = (scheduleLabel: string) => {
  return `모집기간 ${scheduleLabel}`;
};

const buildDurationText = (durationLabel: string) => {
  return `운영기간 ${durationLabel}`;
};

const resolveArchiveStatusLabel = (item: ProgramLectureCard) => {
  const catalogStatus = resolveLectureCatalogStatus(item);

  switch (catalogStatus) {
    case 'OPEN':
      return '신청가능';
    case 'FULL':
      return '정원마감';
    case 'SCHEDULED':
      return '모집예정';
    case 'STARTED':
      return '운영중';
    case 'CLOSED':
      return '신청마감';
  }
};

const ProgramCardAction = ({
  isAlertPending = false,
  isAlertSubscribed = false,
  isAuthenticated = false,
  isCartPending = false,
  item,
  onAddToCart,
  onSubscribeAlert,
}: {
  isAlertPending?: boolean;
  isAlertSubscribed?: boolean;
  isAuthenticated?: boolean;
  isCartPending?: boolean;
  item: ProgramLectureCard;
  onAddToCart?: ((item: ProgramLectureCard) => void) | undefined;
  onSubscribeAlert?: ((item: ProgramLectureCard) => void) | undefined;
}) => {
  const catalogStatus = resolveLectureCatalogStatus(item);

  if (catalogStatus === 'FULL') {
    if (!isAuthenticated) {
      return (
        <Link
          className={classNames(styles['cardActionLink'], styles['cardActionSecondary'])}
          to={routePaths.login}
        >
          로그인 후 알림 받기
        </Link>
      );
    }

    return (
      <button
        className={classNames(
          styles['cardActionButton'],
          isAlertSubscribed ? styles['cardActionDisabled'] : styles['cardActionPrimary'],
        )}
        disabled={isAlertPending || isAlertSubscribed}
        onClick={() => {
          onSubscribeAlert?.(item);
        }}
        type='button'
      >
        {isAlertSubscribed ? '알림 신청 완료' : isAlertPending ? '신청 중...' : '알림 받기'}
      </button>
    );
  }

  if (catalogStatus === 'SCHEDULED') {
    return (
      <button
        className={classNames(styles['cardActionButton'], styles['cardActionSecondary'])}
        disabled
        type='button'
      >
        모집 예정
      </button>
    );
  }

  if (catalogStatus === 'STARTED' || catalogStatus === 'CLOSED') {
    return (
      <button
        className={classNames(styles['cardActionButton'], styles['cardActionDisabled'])}
        disabled
        type='button'
      >
        신청 마감
      </button>
    );
  }

  if (!onAddToCart || typeof item.programId !== 'number' || item.programId <= 0) {
    return null;
  }

  return (
    <button
      aria-label={isCartPending ? '장바구니에 담는 중' : '장바구니 담기'}
      className={classNames(
        styles['cardIconButton'],
        isCartPending && styles['cardIconButtonPending'],
      )}
      disabled={isCartPending}
      onClick={() => {
        onAddToCart(item);
      }}
      type='button'
    >
      <span className={styles['srOnly']}>
        {isCartPending ? '장바구니에 담는 중' : '장바구니 담기'}
      </span>
      <img alt='' aria-hidden='true' className={styles['cardActionIcon']} src={cartIconSrc} />
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
export const ProgramBreadcrumbs = ({ items }: ProgramBreadcrumbsProps) => {
  return (
    <nav aria-label='교육과정 경로' className={styles['breadcrumbNav']}>
      <ol className={styles['breadcrumbList']}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

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
  onAddToCart,
  onSubscribeAlert,
}: ProgramLectureCardItemProps) => {
  const availability = resolveAvailability(item);
  const metaTags = buildProgramMetaTags(item);

  return (
    <article className={styles['lectureCard']}>
      <div className={styles['lectureImageFrame']}>
        <img alt={item.thumbnailAlt} className={styles['lectureImage']} src={item.thumbnailSrc} />
      </div>

      <div className={styles['lectureBody']}>
        <div className={styles['lectureMetaRow']}>
          <span className={styles['lectureCategory']}>{item.categoryLabel}</span>
          <div className={styles['lectureTopActionRow']}>
            <ProgramCardAction
              isAlertPending={isAlertPending}
              isAlertSubscribed={isAlertSubscribed}
              isAuthenticated={isAuthenticated}
              isCartPending={isCartPending}
              item={item}
              onAddToCart={onAddToCart}
              onSubscribeAlert={onSubscribeAlert}
            />
          </div>
        </div>

        <h3 className={styles['lectureTitle']}>
          <Link className={styles['cardLink']} to={item.to}>
            {item.title}
          </Link>
        </h3>
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
export const ProgramArchiveLectureCardItem = ({ item }: ProgramArchiveLectureCardItemProps) => {
  const archiveStatusLabel = resolveArchiveStatusLabel(item);
  const metaTags = buildArchiveMetaTags(item);

  return (
    <Link aria-label={item.title} className={styles['archiveLectureCardLink']} to={item.to}>
      <article className={styles['archiveLectureCard']}>
        <div className={styles['archiveLectureImageFrame']}>
          <img
            alt={item.thumbnailAlt}
            className={styles['archiveLectureImage']}
            src={item.thumbnailSrc}
          />
        </div>

        <div className={styles['archiveLectureBody']}>
          <p
            className={classNames(
              styles['archiveLectureStatus'],
              resolveLectureCatalogStatus(item) !== 'OPEN' && styles['archiveLectureStatusMuted'],
            )}
          >
            {archiveStatusLabel}
          </p>

          <h3 className={styles['archiveLectureTitle']}>{item.title}</h3>

          <div className={styles['archiveLectureBottomMeta']}>
            <p className={styles['archiveLecturePrice']}>{item.priceLabel}</p>

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
    </Link>
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
