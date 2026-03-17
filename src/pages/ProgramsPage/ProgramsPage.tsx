import { Link } from 'react-router-dom';

import { env } from '@/config/env';
import { useProgramsOverviewQuery } from '@/query/useProgramsOverviewQuery';
import { routePaths } from '@/routes/routeRegistry';

import {
  ProgramCollectionCardItem,
  ProgramEducatorCard,
  ProgramLectureCardItem,
  ProgramStatList,
} from './programCatalogShared';
import styles from './ProgramsPage.module.scss';

const ProgramsPage = () => {
  // 전체 교육과정 허브에 필요한 요약 데이터는 별도 API로 가져옵니다.
  // 목록/상세 공통 데이터 구조를 맞춰 두면, 나중에 실제 백엔드로 교체하기가 쉽습니다.
  const { data, isError, isPending } = useProgramsOverviewQuery(env.siteKey);

  if (isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <p className={styles['stateTitle']}>교육과정 정보를 불러오는 중입니다.</p>
        <p className={styles['stateDescription']}>
          의사과정, 일반과정, 온라인과정 정보를 순서대로 준비하고 있습니다.
        </p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={styles['stateSection']}>
        <p className={styles['stateTitle']}>교육과정 허브를 불러오지 못했습니다.</p>
        <p className={styles['stateDescription']}>
          MSW 또는 프로그램 API 응답을 확인한 뒤 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  return (
    <div className={styles['container']}>
      {/* 최상단 허브 영역은 "소노스쿨 교육과정 전체 구조"를 한 번에 설명하는 역할을 합니다. */}
      <section className={styles['heroSection']}>
        <div className={styles['heroCopy']}>
          <p className={styles['eyebrow']}>교육과정 안내</p>
          <h1 className={styles['title']}>{data.title}</h1>
          <p className={styles['description']}>{data.description}</p>

          <ul className={styles['heroTagList']}>
            {data.heroTags.map((heroTag) => {
              return (
                <li className={styles['heroTagItem']} key={heroTag}>
                  {heroTag}
                </li>
              );
            })}
          </ul>

          <div className={styles['actionRow']}>
            <Link className={styles['primaryActionLink']} to={`${routePaths.search}?scope=lecture`}>
              강의 검색하기
            </Link>
            <Link className={styles['secondaryActionLink']} to={routePaths.contact}>
              수강 문의하기
            </Link>
          </div>
        </div>

        <ProgramStatList items={data.stats} />
      </section>

      {/* 1뎁스 과정군 카드는 헤더 상위 메뉴를 클릭했을 때 어디로 갈지 미리 보여 주는 영역입니다. */}
      <section className={styles['section']}>
        <div className={styles['sectionHeader']}>
          <p className={styles['sectionEyebrow']}>과정군 안내</p>
          <h2 className={styles['sectionTitle']}>과정군별로 빠르게 살펴보기</h2>
          <p className={styles['sectionDescription']}>
            의사과정, 일반과정, 온라인과정 중 현재 필요한 학습 방식에 맞는 범위를 먼저 선택해
            보세요.
          </p>
        </div>

        <div className={styles['collectionGrid']}>
          {data.categories.map((category) => {
            return <ProgramCollectionCardItem item={category} key={category.id} />;
          })}
        </div>
      </section>

      {/* 대표 강의 섹션은 전체 과정 허브에서도 바로 강의 상세로 들어갈 수 있게 도와줍니다. */}
      <section className={styles['section']}>
        <div className={styles['sectionHeader']}>
          <p className={styles['sectionEyebrow']}>대표 강의</p>
          <h2 className={styles['sectionTitle']}>대표 강의 먼저 보기</h2>
          <p className={styles['sectionDescription']}>
            소노스쿨의 전체 커리큘럼 중 문의가 잦거나 흐름을 이해하기 좋은 대표 강의를 먼저
            배치했습니다.
          </p>
        </div>

        <div className={styles['lectureGrid']}>
          {data.featuredLectures.map((lecture) => {
            return <ProgramLectureCardItem item={lecture} key={lecture.id} />;
          })}
        </div>
      </section>

      <section className={styles['bottomSection']}>
        <ProgramEducatorCard instructor={data.instructor} />

        <article className={styles['brandNoteCard']}>
          <p className={styles['sectionEyebrow']}>운영 방식</p>
          <h2 className={styles['brandNoteTitle']}>소노스쿨은 한 명의 강사 기준으로 운영됩니다.</h2>
          <p className={styles['brandNoteDescription']}>
            인프런처럼 여러 강사가 각자 다른 포맷으로 강의를 올리는 구조가 아니라, 장은희 강사가
            직접 설계한 학습 기준과 피드백 방식이 모든 과정에 일관되게 반영됩니다.
          </p>

          <ul className={styles['brandNoteList']}>
            <li className={styles['brandNoteItem']}>
              같은 용어와 같은 검사 순서를 반복해서 써서 과정 간 연결이 자연스럽습니다.
            </li>
            <li className={styles['brandNoteItem']}>
              오프라인 핸즈온과 온라인 복습 과정이 같은 학습 기준 위에서 이어집니다.
            </li>
            <li className={styles['brandNoteItem']}>
              추후 관리자 페이지가 붙더라도 공개/숨김 처리와 상세 설명 등록을 같은 데이터 구조로
              확장할 수 있게 설계했습니다.
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
};

export default ProgramsPage;
