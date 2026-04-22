import { Link, useLocation } from 'react-router-dom';

import { useProgramPageQuery } from '@/query/useProgramPageQuery';
import { routePaths } from '@/routes/routeRegistry';
import { classNames } from '@/utils/classNames';

import { ProgramArchiveLectureCardItem } from '../ProgramsPage/programCatalogShared';
import { useProgramCatalogActions } from '../ProgramsPage/useProgramCatalogActions';

import styles from './ProgramPage.module.scss';
import ProgramPageDetail from './ProgramPageDetail';

const ProgramPage = () => {
  // `/programs/*` 아래에서는 URL 전체가 현재 보고 싶은 교육과정 페이지의 식별자 역할을 합니다.
  // 그래서 params 조합 대신 `pathname` 자체를 API 조회 기준으로 사용합니다.
  const location = useLocation();
  const { data, isError, isPending } = useProgramPageQuery(location.pathname);
  const {
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
          <Link className={styles['primaryActionLink']} to={routePaths.programs}>
            전체 교육과정 보기
          </Link>
          <Link className={styles['secondaryActionLink']} to={routePaths.contact}>
            수강 문의하기
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
        <section className={styles['archiveHeaderSection']}>
          <div aria-hidden='true' className={styles['archiveHeaderDecor']}>
            <span className={styles['archiveHeaderDecorLeft']} />
            <span className={styles['archiveHeaderDecorTop']} />
            <span className={styles['archiveHeaderDecorRight']} />
          </div>

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
          <div className={styles['archiveLectureHeader']}>
            <p className={styles['archiveLectureLabel']}>
              총 <strong>{String(data.lectures.length)}</strong>개 과정
            </p>
          </div>

          <div className={styles['archiveLectureGrid']}>
            {data.lectures.map((lecture) => {
              return (
                <ProgramArchiveLectureCardItem
                  isAlertPending={isAlertPending(lecture.programId)}
                  isAlertSubscribed={
                    typeof lecture.programId === 'number' &&
                    subscribedProgramIds.has(lecture.programId)
                  }
                  isAuthenticated={isAuthenticated}
                  isCartPending={isAddToCartPending(lecture.programId)}
                  item={lecture}
                  key={lecture.id}
                  onAddToCart={handleAddToCart}
                  onSubscribeAlert={handleSubscribeAlert}
                />
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return <ProgramPageDetail data={data} />;
};

export default ProgramPage;
