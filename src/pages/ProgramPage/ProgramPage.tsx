import { useMemo, useState } from 'react';

import { Link, useLocation } from 'react-router-dom';

import CartAddedModal from '@/components/cart/CartAddedModal/CartAddedModal';
import { useProgramPageQuery } from '@/query/useProgramPageQuery';
import { routePaths } from '@/routes/routeRegistry';
import type { ProgramLectureCard } from '@/types/programCatalog';
import { classNames } from '@/utils/classNames';

import { ProgramArchiveLectureCardItem, ProgramBreadcrumbs } from './programCatalogShared';
import {
  classifyProgramHubLecture,
  getProgramRecruitmentEndTime,
  parseProgramDateTime,
  type ProgramHubLectureCategory,
  type ProgramHubLectureTabKey,
} from './programHubLectureClassification';
import styles from './ProgramPage.module.scss';
import ProgramPageDetail from './ProgramPageDetail';
import { useProgramCatalogActions } from './useProgramCatalogActions';

interface IndexedProgramLecture {
  item: ProgramLectureCard;
  originalIndex: number;
}

interface ProgramHubLectureTabState {
  activeTab: ProgramHubLectureTabKey;
  nowTime: number;
  pathname: string;
  userSelected: boolean;
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
    title: '현재 신청이 마감된 과정이 없습니다.',
    description: '모집 중인 과정 또는 전체 과정을 확인해 주세요.',
  },
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
    getProgramRecruitmentEndTime(left.item),
    getProgramRecruitmentEndTime(right.item),
  );

  return deadlineDiff === 0 ? left.originalIndex - right.originalIndex : deadlineDiff;
};

const sortByLatestCreated = (left: IndexedProgramLecture, right: IndexedProgramLecture): number => {
  const leftCreatedTime = parseProgramDateTime(left.item.createdAt);
  const rightCreatedTime = parseProgramDateTime(right.item.createdAt);
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

  const filteredLectures = indexedLectures.filter(
    (lecture) => classifyProgramHubLecture(lecture.item, nowTime) === activeTab,
  );

  const sortLectures = activeTab === 'recruiting' ? sortByRecruitmentDeadline : sortByLatestCreated;
  const sortedLectures = [...filteredLectures].sort(sortLectures);

  return sortedLectures.map((lecture) => lecture.item);
};

const resolveDefaultLectureTab = (
  lectures: readonly ProgramLectureCard[],
  nowTime: number,
): ProgramHubLectureTabKey => {
  const tabPriority: ProgramHubLectureCategory[] = ['recruiting', 'alwaysRecruiting', 'closed'];

  for (const tab of tabPriority) {
    if (lectures.some((lecture) => classifyProgramHubLecture(lecture, nowTime) === tab)) {
      return tab;
    }
  }

  return DEFAULT_PROGRAM_HUB_LECTURE_TAB;
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
    userSelected: false,
  }));
  const lectureTabNowTime = lectureTabState.nowTime;
  const collectionLectures = useMemo(() => {
    return data?.pageKind === 'collection' ? data.lectures : EMPTY_PROGRAM_LECTURES;
  }, [data]);
  const defaultLectureTab = useMemo(() => {
    return resolveDefaultLectureTab(collectionLectures, lectureTabNowTime);
  }, [collectionLectures, lectureTabNowTime]);
  const activeLectureTab =
    lectureTabState.pathname === location.pathname && lectureTabState.userSelected
      ? lectureTabState.activeTab
      : defaultLectureTab;
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
                      userSelected: true,
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
