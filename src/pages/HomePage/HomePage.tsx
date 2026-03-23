import { useNavigate } from 'react-router-dom';

import SiteSearchBar from '@/components/search/SiteSearchBar/SiteSearchBar';
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
  const navigate = useNavigate();
  const { data, error, isError, isPending } = useHomeHeroSlidesQuery();
  const slides = data?.items ?? [];
  const autoPlayDurationMs = data?.autoPlayDurationMs ?? DEFAULT_HOME_HERO_AUTO_PLAY_DURATION_MS;

  const { displayedSlideIndex, handleMoveSlide, handleProgressAnimationEnd } =
    useHomePageHeroCarousel({
      slideCount: slides.length,
    });

  const handleSubmitSearch = (scope: SearchScope, query: string) => {
    const normalizedQuery = query.trim();
    const searchParams = new URLSearchParams();

    searchParams.set('scope', scope);

    if (normalizedQuery) {
      searchParams.set('q', normalizedQuery);
    }

    void navigate(`${routePaths.search}?${searchParams.toString()}`);
  };

  const activeSlide = slides[displayedSlideIndex];

  return (
    <div className={styles['container']}>
      <section className={styles['searchSection']}>
        <SiteSearchBar
          className={styles['searchBar']}
          initialScope={defaultSearchScope}
          onSubmitSearch={handleSubmitSearch}
        />
      </section>

      {isPending ? (
        <section
          aria-busy='true'
          aria-label='메인 슬라이드 로딩 중'
          className={styles['loadingSlide']}
        >
          <div aria-hidden='true' className={styles['loadingShimmer']} />
        </section>
      ) : activeSlide ? (
        <HomePageHeroSection
          activeSlide={activeSlide}
          autoPlayDurationMs={autoPlayDurationMs}
          displayedSlideIndex={displayedSlideIndex}
          onMoveSlide={handleMoveSlide}
          onProgressAnimationEnd={handleProgressAnimationEnd}
          slideCount={slides.length}
        />
      ) : (
        <section aria-live='polite' className={styles['errorSlide']}>
          <div>
            <p className={styles['errorTitle']}>메인 슬라이드를 불러오지 못했습니다.</p>
            <p className={styles['errorDescription']}>
              {isError && error instanceof Error
                ? error.message
                : '운영 설정을 확인한 뒤 다시 시도해 주세요.'}
            </p>
          </div>
        </section>
      )}

      <HomeFeatureShowcaseSection />
      <HomeHistoryTimelineSection />
      <HomeNoticeSection />
    </div>
  );
};

export default HomePage;
