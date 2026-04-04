import { Link } from 'react-router-dom';

import type {
  ProgramBreadcrumbItem,
  ProgramCollectionCard,
  ProgramInfoItem,
  ProgramInstructorProfile,
  ProgramLectureCard,
  ProgramStat,
} from '@/types/programCatalog';

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
}

interface ProgramArchiveLectureCardItemProps {
  item: ProgramLectureCard;
}

interface ProgramEducatorCardProps {
  instructor: ProgramInstructorProfile;
}

const formatRemainingSeatsValue = (
  remainingSeatsCount: number | undefined,
  remainingSeatsLabel: string | undefined,
): string | null => {
  if (remainingSeatsCount !== undefined) {
    return `${String(remainingSeatsCount)}명 남음`;
  }

  if (!remainingSeatsLabel) {
    return null;
  }

  const [, remainingValue = remainingSeatsLabel] = remainingSeatsLabel.split('인원 ');

  return remainingValue;
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
          <span className={styles['collectionCount']}>강의 {String(item.lectureCount)}개</span>
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

export const ProgramLectureCardItem = ({ item }: ProgramLectureCardItemProps) => {
  const remainingSeatsValue = formatRemainingSeatsValue(
    item.remainingSeatsCount,
    item.remainingSeatsLabel,
  );

  return (
    <article className={styles['lectureCard']}>
      <div className={styles['lectureImageFrame']}>
        <img alt={item.thumbnailAlt} className={styles['lectureImage']} src={item.thumbnailSrc} />
      </div>

      <div className={styles['lectureBody']}>
        <div className={styles['lectureMetaRow']}>
          <span className={styles['lectureCategory']}>{item.categoryLabel}</span>
        </div>

        <h3 className={styles['lectureTitle']}>
          <Link className={styles['cardLink']} to={item.to}>
            {item.title}
          </Link>
        </h3>
        <p className={styles['lectureDescription']}>{item.summary}</p>

        <div className={styles['lecturePriceRow']}>
          <p className={styles['lecturePrice']}>{item.priceLabel}</p>

          {remainingSeatsValue ? (
            <div className={styles['lectureAvailabilityBadge']}>
              <span className={styles['lectureAvailabilityLabel']}>수강 가능</span>
              <span className={styles['lectureAvailabilityValue']}>{remainingSeatsValue}</span>
            </div>
          ) : null}
        </div>

        <dl className={styles['lectureInfoList']}>
          <div>
            <dt>운영 방식</dt>
            <dd>{item.formatLabel}</dd>
          </div>
          <div>
            <dt>학습 기간</dt>
            <dd>{item.durationLabel}</dd>
          </div>
          <div>
            <dt>난이도</dt>
            <dd>{item.difficultyLabel}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
};

// 카테고리 아카이브에서는 한 화면에 강의를 많이 훑어봐야 하므로
// 메타 정보를 줄이고 "강의 선택"에 집중한 더 단순한 카드 버전을 따로 둡니다.
export const ProgramArchiveLectureCardItem = ({ item }: ProgramArchiveLectureCardItemProps) => {
  const remainingSeatsValue = formatRemainingSeatsValue(
    item.remainingSeatsCount,
    item.remainingSeatsLabel,
  );

  return (
    <article className={styles['archiveLectureCard']}>
      <Link className={styles['archiveLectureImageLink']} to={item.to}>
        <div className={styles['archiveLectureImageFrame']}>
          <img
            alt={item.thumbnailAlt}
            className={styles['archiveLectureImage']}
            src={item.thumbnailSrc}
          />
        </div>
      </Link>

      <div className={styles['archiveLectureBody']}>
        <div className={styles['archiveLectureMetaRow']}>
          <span className={styles['archiveLectureCategory']}>{item.categoryLabel}</span>
        </div>

        <h3 className={styles['archiveLectureTitle']}>
          <Link className={styles['cardLink']} to={item.to}>
            {item.title}
          </Link>
        </h3>

        <p className={styles['archiveLectureInstructor']}>장은희 강사</p>

        <div className={styles['archiveLectureBottomMeta']}>
          <p className={styles['archiveLecturePrice']}>{item.priceLabel}</p>

          {remainingSeatsValue ? (
            <div className={styles['archiveLectureAvailability']}>
              <span className={styles['archiveLectureAvailabilityLabel']}>수강 가능 인원</span>
              <span className={styles['archiveLectureAvailabilityValue']}>
                {remainingSeatsValue}
              </span>
            </div>
          ) : null}

          <p className={styles['archiveLectureSchedule']}>{item.scheduleLabel}</p>
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
