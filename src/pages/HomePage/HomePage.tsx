import { useNavigate } from 'react-router-dom';

import SiteSearchBar from '@/components/search/SiteSearchBar/SiteSearchBar';
import { getMockHomeHeroSlides } from '@/mocks/data/homeHeroSlides';
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
  const { data, isPending } = useHomeHeroSlidesQuery();
  const fallbackHeroSlides = getMockHomeHeroSlides();

  // API 응답이 아직 없을 수도 있으므로, 기본값으로 빈 배열을 준비합니다.
  const slides = data?.items ?? [];
  const hasHeroSlides = slides.length > 0;
  const effectiveSlides = hasHeroSlides ? slides : fallbackHeroSlides.items;
  // 서버가 자동 재생 시간을 주지 않으면 페이지 기본값을 사용합니다.
  const autoPlayDurationMs =
    (hasHeroSlides ? data?.autoPlayDurationMs : fallbackHeroSlides.autoPlayDurationMs) ??
    DEFAULT_HOME_HERO_AUTO_PLAY_DURATION_MS;

  // 슬라이드 인덱스 계산과 이전/다음 이동 로직은 전용 훅에 맡깁니다.
  // 페이지 파일은 "어떤 데이터를 보여줄지" 중심으로 읽히게 유지합니다.
  const { displayedSlideIndex, handleMoveSlide, handleProgressAnimationEnd } =
    useHomePageHeroCarousel({
      slideCount: effectiveSlides.length,
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

  // 렌더링 직전에 "현재 화면에 보여 줄 슬라이드"를 계산합니다.
  const activeSlide = effectiveSlides[displayedSlideIndex];

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

      {isPending && !hasHeroSlides ? (
        <section
          aria-busy='true'
          aria-label='메인 슬라이드 로딩 중'
          className={styles['loadingSlide']}
        >
          <div aria-hidden='true' className={styles['loadingShimmer']} />
        </section>
      ) : (
        <HomePageHeroSection
          activeSlide={activeSlide}
          autoPlayDurationMs={autoPlayDurationMs}
          displayedSlideIndex={displayedSlideIndex}
          onMoveSlide={handleMoveSlide}
          onProgressAnimationEnd={handleProgressAnimationEnd}
          slideCount={effectiveSlides.length}
        />
      )}

      {/* 아래부터는 홈 본문 섹션들입니다. */}
      <HomeFeatureShowcaseSection />
      <HomeHistoryTimelineSection />
      <HomeNoticeSection />
    </div>
  );
};

export default HomePage;
