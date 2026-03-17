import { useNavigate } from 'react-router-dom';

import SiteSearchBar from '@/components/search/SiteSearchBar/SiteSearchBar';
import { env } from '@/config/env';
import { useHomeHeroSlidesQuery } from '@/query/useHomeHeroSlidesQuery';
import { routePaths } from '@/routes/routeRegistry';
import { defaultSearchScope, type SearchScope } from '@/search/programSearchShared';

import HomeFeatureShowcaseSection from './HomeFeatureShowcaseSection/HomeFeatureShowcaseSection';
import HomeHistoryTimelineSection from './HomeHistoryTimelineSection/HomeHistoryTimelineSection';
import HomeNoticeSection from './HomeNoticeSection/HomeNoticeSection';
import styles from './HomePage.module.scss';
import HomePageHeroSection from './HomePageHeroSection';
import { DEFAULT_HOME_HERO_AUTO_PLAY_DURATION_MS } from './homePageShared';
import { useHomePageHeroCarousel } from './useHomePageHeroCarousel';

const HomePage = () => {
  // 검색 페이지로 이동할 때 사용하는 라우터 함수입니다.
  const navigate = useNavigate();
  // 홈 히어로 슬라이드 데이터를 서버에서 가져옵니다.
  // `isPending`은 아직 응답을 기다리는 중인지,
  // `isError`는 요청이 실패했는지를 뜻합니다.
  const { data, isError, isPending } = useHomeHeroSlidesQuery(env.siteKey);

  // API 응답이 아직 없을 수도 있으므로, 기본값으로 빈 배열을 준비합니다.
  const slides = data?.items ?? [];
  // 서버가 자동 재생 시간을 주지 않으면 페이지 기본값을 사용합니다.
  const autoPlayDurationMs = data?.autoPlayDurationMs ?? DEFAULT_HOME_HERO_AUTO_PLAY_DURATION_MS;

  // 슬라이드 인덱스 계산과 이전/다음 이동 로직은 전용 훅에 맡깁니다.
  // 페이지 파일은 "어떤 데이터를 보여줄지" 중심으로 읽히게 유지합니다.
  const { displayedSlideIndex, handleMoveSlide, handleProgressAnimationEnd } =
    useHomePageHeroCarousel({
      slideCount: slides.length,
    });

  // 검색창에서 전달된 scope, query를 URL 쿼리스트링으로 바꿔 검색 페이지로 이동합니다.
  const handleSubmitSearch = (scope: SearchScope, query: string) => {
    // 사용자가 앞뒤 공백만 입력했을 때 불필요한 공백 검색을 막기 위해 trim 합니다.
    const normalizedQuery = query.trim();
    const searchParams = new URLSearchParams();

    // 어떤 검색 범위인지(`lecture`, `instructor` 등)를 항상 URL에 남깁니다.
    searchParams.set('scope', scope);

    // 검색어가 비어 있지 않을 때만 `q` 파라미터를 추가합니다.
    if (normalizedQuery) {
      searchParams.set('q', normalizedQuery);
    }

    // navigate는 Promise를 반환할 수 있으므로,
    // 여기서는 반환값을 기다리지 않는다는 뜻으로 `void`를 붙입니다.
    void navigate(`${routePaths.search}?${searchParams.toString()}`);
  };

  // 로딩 중에는 본문 전체 대신 메인 슬라이드 자리만 스켈레톤으로 보여 줍니다.
  if (isPending) {
    return (
      <div className={styles['container']}>
        <section
          aria-busy='true'
          aria-label='메인 슬라이드 로딩 중'
          className={styles['loadingSlide']}
        >
          {/* shimmer 요소는 시각 효과용이므로 스크린 리더에서는 숨깁니다. */}
          <div aria-hidden='true' className={styles['loadingShimmer']} />
        </section>
      </div>
    );
  }

  // 요청 실패이거나, 성공했더라도 슬라이드가 한 개도 없으면 오류 화면을 보여 줍니다.
  if (isError || !slides.length) {
    return (
      <div className={styles['container']}>
        <section aria-label='메인 슬라이드 오류' className={styles['errorSlide']}>
          <p className={styles['errorTitle']}>메인 슬라이드를 불러오지 못했습니다.</p>
          <p className={styles['errorDescription']}>
            슬라이드 API 응답을 확인한 뒤 다시 시도해 주세요.
          </p>
        </section>
      </div>
    );
  }

  // 렌더링 직전에 "현재 화면에 보여 줄 슬라이드"를 계산합니다.
  const activeSlide = slides[displayedSlideIndex];

  return (
    <div className={styles['container']}>
      {/* 홈 상단 검색 영역입니다. */}
      <section className={styles['searchSection']}>
        <SiteSearchBar
          className={styles['searchBar']}
          initialScope={defaultSearchScope}
          onSubmitSearch={handleSubmitSearch}
        />
      </section>

      {/* 히어로 슬라이드는 별도 컴포넌트로 분리해,
      페이지 셸은 섹션 조합만 담당하도록 유지합니다. */}
      <HomePageHeroSection
        activeSlide={activeSlide}
        autoPlayDurationMs={autoPlayDurationMs}
        displayedSlideIndex={displayedSlideIndex}
        onMoveSlide={handleMoveSlide}
        onProgressAnimationEnd={handleProgressAnimationEnd}
        slideCount={slides.length}
      />

      {/* 아래부터는 홈 본문 섹션들입니다. */}
      <HomeFeatureShowcaseSection />
      <HomeHistoryTimelineSection siteKey={env.siteKey} />
      <HomeNoticeSection />
    </div>
  );
};

export default HomePage;
