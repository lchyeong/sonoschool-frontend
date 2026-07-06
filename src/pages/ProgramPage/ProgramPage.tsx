import { useMemo, useState } from 'react';

import { Link, useLocation } from 'react-router-dom';

import CartAddedModal from '@/components/cart/CartAddedModal/CartAddedModal';
import { useProgramPageQuery } from '@/query/useProgramPageQuery';
import { routePaths } from '@/routes/routeRegistry';
import type { ProgramLectureCard } from '@/types/programCatalog';
import { classNames } from '@/utils/classNames';
import { resolveProgramCatalogStatus } from '@/utils/programCatalogStatus';

import { ProgramArchiveLectureCardItem, ProgramBreadcrumbs } from './programCatalogShared';
import styles from './ProgramPage.module.scss';
import ProgramPageDetail from './ProgramPageDetail';
import { useProgramCatalogActions } from './useProgramCatalogActions';

type ProgramHubLectureTabKey = 'all' | 'recruiting' | 'alwaysRecruiting' | 'closed';

interface IndexedProgramLecture {
  item: ProgramLectureCard;
  originalIndex: number;
}

interface ProgramHubLectureTabState {
  activeTab: ProgramHubLectureTabKey;
  nowTime: number;
  pathname: string;
}

const DEFAULT_PROGRAM_HUB_LECTURE_TAB: ProgramHubLectureTabKey = 'recruiting';
const EMPTY_PROGRAM_LECTURES: readonly ProgramLectureCard[] = [];

const PROGRAM_HUB_LECTURE_TABS: Array<{
  key: ProgramHubLectureTabKey;
  label: string;
}> = [
  { key: 'all', label: '전체' },
  { key: 'recruiting', label: '모집 중' },
  { key: 'alwaysRecruiting', label: '상시 모집 중' },
  { key: 'closed', label: '신청 마감' },
];

const PROGRAM_HUB_EMPTY_MESSAGES: Record<
  ProgramHubLectureTabKey,
  { title: string; description: string }
> = {
  all: {
    title: '현재 등록된 과정이 없습니다.',
    description: '상위 교육과정으로 이동해 다른 카테고리의 과정을 확인해 주세요.',
  },
  recruiting: {
    title: '현재 모집 중인 과정이 없습니다.',
    description: '전체 또는 상시 모집 중 탭에서 다른 과정을 확인해 주세요.',
  },
  alwaysRecruiting: {
    title: '현재 상시 모집 중인 과정이 없습니다.',
    description: '모집 중 탭에서 일정이 열린 과정을 확인해 주세요.',
  },
  closed: {
    title: '현재 신청 마감된 진행 과정이 없습니다.',
    description: '모집 중인 과정 또는 전체 과정을 확인해 주세요.',
  },
};

const parseDateTime = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
};

const parseScheduleLabelEndTime = (scheduleLabel: string): number | null => {
  const matches = [...scheduleLabel.matchAll(/(\d{4})\.(\d{2})(?:\.(\d{2}))?/g)];
  const lastMatch = matches.at(-1);

  if (!lastMatch) {
    return null;
  }

  const year = Number(lastMatch[1]);
  const month = Number(lastMatch[2]);
  const day = lastMatch[3] ? Number(lastMatch[3]) : new Date(Date.UTC(year, month, 0)).getUTCDate();
  const time = Date.UTC(year, month - 1, day, 23, 59, 59, 999);

  return Number.isNaN(time) ? null : time;
};

const hasRecruitmentPeriod = (lecture: ProgramLectureCard): boolean => {
  if (lecture.saleStartAt || lecture.saleEndAt) {
    return true;
  }

  return (
    !lecture.scheduleLabel.includes('상시') &&
    parseScheduleLabelEndTime(lecture.scheduleLabel) !== null
  );
};

const isAlwaysRecruitingLecture = (lecture: ProgramLectureCard): boolean => {
  return (
    resolveProgramCatalogStatus(lecture) === 'OPEN' &&
    !lecture.saleStartAt &&
    !lecture.saleEndAt &&
    lecture.scheduleLabel.includes('상시')
  );
};

const isRecruitingLecture = (lecture: ProgramLectureCard, nowTime: number): boolean => {
  if (resolveProgramCatalogStatus(lecture) !== 'OPEN' || !hasRecruitmentPeriod(lecture)) {
    return false;
  }

  const saleStartTime = parseDateTime(lecture.saleStartAt);
  const saleEndTime = parseDateTime(lecture.saleEndAt);

  if (saleStartTime !== null && nowTime < saleStartTime) {
    return false;
  }

  if (saleEndTime !== null && nowTime > saleEndTime) {
    return false;
  }

  return !isAlwaysRecruitingLecture(lecture);
};

const isLearningOngoing = (lecture: ProgramLectureCard, nowTime: number): boolean => {
  const catalogStatus = resolveProgramCatalogStatus(lecture);
  const learningStartTime = parseDateTime(lecture.learningStartAt);
  const learningEndTime = parseDateTime(lecture.learningEndAt);

  if (learningStartTime === null && learningEndTime === null) {
    return catalogStatus === 'STARTED';
  }

  if (learningStartTime !== null && nowTime < learningStartTime) {
    return false;
  }

  if (learningEndTime !== null && nowTime > learningEndTime) {
    return false;
  }

  return true;
};

const isClosedOngoingLecture = (lecture: ProgramLectureCard, nowTime: number): boolean => {
  const catalogStatus = resolveProgramCatalogStatus(lecture);

  return (
    (catalogStatus === 'CLOSED' || catalogStatus === 'STARTED') &&
    isLearningOngoing(lecture, nowTime)
  );
};

const getRecruitmentEndTime = (lecture: ProgramLectureCard): number | null => {
  return parseDateTime(lecture.saleEndAt) ?? parseScheduleLabelEndTime(lecture.scheduleLabel);
};

const compareNullableTimeAscending = (left: number | null, right: number | null): number => {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
};

const sortByRecruitmentDeadline = (
  left: IndexedProgramLecture,
  right: IndexedProgramLecture,
): number => {
  const deadlineDiff = compareNullableTimeAscending(
    getRecruitmentEndTime(left.item),
    getRecruitmentEndTime(right.item),
  );

  return deadlineDiff === 0 ? left.originalIndex - right.originalIndex : deadlineDiff;
};

const sortByLatestCreated = (left: IndexedProgramLecture, right: IndexedProgramLecture): number => {
  const leftCreatedTime = parseDateTime(left.item.createdAt);
  const rightCreatedTime = parseDateTime(right.item.createdAt);
  const createdDiff = compareNullableTimeAscending(rightCreatedTime, leftCreatedTime);

  return createdDiff === 0 ? left.originalIndex - right.originalIndex : createdDiff;
};

const filterLecturesByTab = (
  lectures: readonly ProgramLectureCard[],
  activeTab: ProgramHubLectureTabKey,
  nowTime: number,
): ProgramLectureCard[] => {
  const indexedLectures = lectures.map((item, originalIndex) => ({ item, originalIndex }));

  if (activeTab === 'all') {
    return indexedLectures.map((lecture) => lecture.item);
  }

  const filteredLectures = indexedLectures.filter((lecture) => {
    if (activeTab === 'recruiting') {
      return isRecruitingLecture(lecture.item, nowTime);
    }

    if (activeTab === 'alwaysRecruiting') {
      return isAlwaysRecruitingLecture(lecture.item);
    }

    return isClosedOngoingLecture(lecture.item, nowTime);
  });

  const sortedLectures = [...filteredLectures].sort(
    activeTab === 'recruiting' ? sortByRecruitmentDeadline : sortByLatestCreated,
  );

  return sortedLectures.map((lecture) => lecture.item);
};

const ProgramPage = () => {
  // `/programs/*` 아래에서는 URL 전체가 현재 보고 싶은 교육과정 페이지의 식별자 역할을 합니다.
  // 그래서 params 조합 대신 `pathname` 자체를 API 조회 기준으로 사용합니다.
  const location = useLocation();
  const { data, isError, isPending } = useProgramPageQuery(location.pathname);
  const [lectureTabState, setLectureTabState] = useState<ProgramHubLectureTabState>(() => ({
    activeTab: DEFAULT_PROGRAM_HUB_LECTURE_TAB,
    nowTime: new Date().getTime(),
    pathname: location.pathname,
  }));
  const activeLectureTab =
    lectureTabState.pathname === location.pathname
      ? lectureTabState.activeTab
      : DEFAULT_PROGRAM_HUB_LECTURE_TAB;
  const lectureTabNowTime = lectureTabState.nowTime;
  const collectionLectures = useMemo(() => {
    return data?.pageKind === 'collection' ? data.lectures : EMPTY_PROGRAM_LECTURES;
  }, [data]);
  const visibleLectures = useMemo(() => {
    return filterLecturesByTab(collectionLectures, activeLectureTab, lectureTabNowTime);
  }, [activeLectureTab, collectionLectures, lectureTabNowTime]);
  const {
    addedCartItem,
    cartProgramIds,
    closeAddedCartModal,
    enrolledProgramIds,
    handleAddToCart,
    handleSubscribeAlert,
    isAddToCartPending,
    isAlertPending,
    isAuthenticated,
    subscribedProgramIds,
  } = useProgramCatalogActions(data?.pageKind === 'collection' ? data.lectures : []);

  if (isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <p className={styles['stateTitle']}>교육과정 페이지를 불러오는 중입니다.</p>
        <p className={styles['stateDescription']}>
          선택하신 메뉴에 맞는 과정 목록 또는 과정 상세 정보를 준비하고 있습니다.
        </p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={styles['stateSection']}>
        <p className={styles['stateTitle']}>요청하신 교육과정을 찾지 못했습니다.</p>
        <p className={styles['stateDescription']}>
          헤더 메뉴 구조와 프로그램 API 응답을 다시 확인해 주세요.
        </p>
        <div className={styles['stateActionRow']}>
          <Link className={styles['primaryActionLink']} to={routePaths.homeFeaturedCourses}>
            전체 교육과정 보기
          </Link>
        </div>
      </section>
    );
  }

  // 같은 URL 구조라도 API 응답의 `pageKind`에 따라
  // "목록 페이지"와 "상세 페이지"를 분기합니다.
  if (data.pageKind === 'collection') {
    const shouldShowChildCollections =
      data.breadcrumbItems.length > 2 && data.childCollections.length > 0;

    return (
      <div className={styles['container']}>
        <ProgramBreadcrumbs
          className={styles['archiveBreadcrumb']}
          items={data.breadcrumbItems}
          maxDepth={3}
        />

        <section className={styles['archiveHeaderSection']}>
          <div className={styles['archiveHeaderCopy']}>
            <span className={styles['eyebrow']}>SONO SCHOOL</span>
            <h1 className={styles['title']}>{data.title}</h1>
            <p className={styles['description']}>{data.description}</p>
          </div>
        </section>

        {shouldShowChildCollections ? (
          <section className={styles['archiveFilterSection']}>
            <p className={styles['archiveFilterLabel']}>세부 과정</p>
            <div className={styles['archiveFilterList']}>
              {data.childCollections.map((childCollection) => {
                return (
                  <Link
                    className={styles['archiveFilterLink']}
                    key={childCollection.id}
                    to={childCollection.to}
                  >
                    {childCollection.title}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section
          className={classNames(
            styles['archiveLectureSection'],
            shouldShowChildCollections && styles['archiveLectureSectionAfterFilters'],
          )}
        >
          <div aria-label='과정 모집 상태' className={styles['archiveLectureTabs']} role='tablist'>
            {PROGRAM_HUB_LECTURE_TABS.map((tab) => {
              const isActive = activeLectureTab === tab.key;

              return (
                <button
                  aria-selected={isActive}
                  className={styles['archiveLectureTab']}
                  data-active={isActive}
                  key={tab.key}
                  onClick={() => {
                    setLectureTabState({
                      activeTab: tab.key,
                      nowTime: new Date().getTime(),
                      pathname: location.pathname,
                    });
                  }}
                  role='tab'
                  type='button'
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className={styles['archiveLectureHeader']}>
            <p className={styles['archiveLectureLabel']}>
              총 <strong>{String(visibleLectures.length)}</strong>개 과정
            </p>
          </div>

          {visibleLectures.length > 0 ? (
            <div className={styles['archiveLectureGrid']}>
              {visibleLectures.map((lecture) => {
                return (
                  <ProgramArchiveLectureCardItem
                    isAlertPending={isAlertPending(lecture.programId)}
                    isAlertSubscribed={
                      typeof lecture.programId === 'number' &&
                      subscribedProgramIds.has(lecture.programId)
                    }
                    isAuthenticated={isAuthenticated}
                    isCartAdded={
                      typeof lecture.programId === 'number' && cartProgramIds.has(lecture.programId)
                    }
                    isCartPending={isAddToCartPending(lecture.programId)}
                    isEnrollmentOwned={
                      typeof lecture.programId === 'number' &&
                      enrolledProgramIds.has(lecture.programId)
                    }
                    item={lecture}
                    key={lecture.id}
                    onAddToCart={handleAddToCart}
                    onSubscribeAlert={handleSubscribeAlert}
                  />
                );
              })}
            </div>
          ) : (
            <div className={styles['archiveEmptyState']}>
              <p className={styles['archiveEmptyTitle']}>
                {PROGRAM_HUB_EMPTY_MESSAGES[activeLectureTab].title}
              </p>
              <p className={styles['archiveEmptyDescription']}>
                {PROGRAM_HUB_EMPTY_MESSAGES[activeLectureTab].description}
              </p>
              <Link className={styles['secondaryActionLink']} to={routePaths.homeFeaturedCourses}>
                전체 교육과정 보기
              </Link>
            </div>
          )}
        </section>

        {addedCartItem ? (
          <CartAddedModal item={addedCartItem} onClose={closeAddedCartModal} />
        ) : null}
      </div>
    );
  }

  return <ProgramPageDetail data={data} />;
};

export default ProgramPage;
