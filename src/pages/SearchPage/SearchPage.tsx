import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import SiteSearchBar from '@/components/search/SiteSearchBar/SiteSearchBar';
import { useProgramSearchIndexQuery } from '@/query/useProgramSearchIndexQuery';
import { routePaths } from '@/routes/routeRegistry';
import {
  defaultSearchScope,
  getSearchScopeBrowseDescription,
  getSearchScopeLabel,
  isSearchScope,
  type SearchScope,
} from '@/search/programSearchShared';
import type { ProgramSearchItem } from '@/types/programSearch';
import { classNames } from '@/utils/classNames';
import { shouldMuteProgramThumbnail } from '@/utils/programCatalogStatus';
import { getProgramImageCropStyle } from '@/utils/programImageCrop';

import styles from './SearchPage.module.scss';

const normalizeSearchText = (value: string): string => {
  return value.trim().toLowerCase();
};

// 백엔드 검색 API가 아직 없으므로,
// 프런트에서 받은 인덱스 데이터를 최대한 넓게 검색할 수 있게 문자열을 합쳐 둡니다.
const buildProgramSearchableText = (item: ProgramSearchItem): string => {
  return normalizeSearchText(`${item.title} ${item.description} ${item.categoryLabel}`);
};

const SearchPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // URL 쿼리스트링을 현재 검색 상태의 단일 기준(source of truth)으로 사용합니다.
  const query = params.get('q')?.trim() ?? '';
  const rawScope = params.get('scope') ?? defaultSearchScope;
  const selectedScope = isSearchScope(rawScope) ? rawScope : defaultSearchScope;
  const normalizedQuery = normalizeSearchText(query);
  const { data, isError, isPending } = useProgramSearchIndexQuery();

  const items = data?.items ?? [];
  const filteredItems = items.filter((item) => {
    // 현재 선택한 카테고리와 다른 데이터는 먼저 걸러 냅니다.
    if (item.scope !== selectedScope) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = buildProgramSearchableText(item);

    return searchableText.includes(normalizedQuery);
  });

  const scopeLabel = getSearchScopeLabel(selectedScope);
  const headingText = query ? `"${query}" ${scopeLabel} 검색 결과` : `${scopeLabel} 전체 검색`;
  const descriptionText = query
    ? `${scopeLabel} 영역에서 일치하는 결과 ${String(filteredItems.length)}개를 찾았습니다.`
    : getSearchScopeBrowseDescription(selectedScope);

  const handleSubmitSearch = (scope: SearchScope, nextQuery: string) => {
    const searchParams = new URLSearchParams();

    searchParams.set('scope', scope);

    if (nextQuery) {
      searchParams.set('q', nextQuery);
    }

    void navigate(`${routePaths.search}?${searchParams.toString()}`);
  };

  return (
    <div className={styles['container']}>
      <section className={styles['heroSection']}>
        <div className={styles['heroText']}>
          <h1 className={styles['title']}>{headingText}</h1>
          <p className={styles['description']}>{descriptionText}</p>
        </div>

        <SiteSearchBar
          className={styles['searchBar']}
          initialQuery={query}
          initialScope={selectedScope}
          onSubmitSearch={handleSubmitSearch}
        />
      </section>

      {isPending ? (
        <section className={styles['stateSection']} aria-busy='true'>
          <p className={styles['stateTitle']}>검색 대상을 불러오는 중입니다.</p>
        </section>
      ) : null}

      {isError ? (
        <section className={styles['stateSection']}>
          <p className={styles['stateTitle']}>검색 데이터를 불러오지 못했습니다.</p>
          <p className={styles['stateDescription']}>검색 API와 서버 상태를 확인해 주세요.</p>
        </section>
      ) : null}

      {!isPending && !isError ? (
        <section aria-label='검색 결과 목록' className={styles['resultsGrid']}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const shouldMuteThumbnail = shouldMuteProgramThumbnail(item.catalogStatus);
              const thumbnailCropStyle = getProgramImageCropStyle({
                offsetX: item.thumbnailCropOffsetX,
                offsetY: item.thumbnailCropOffsetY,
                zoom: item.thumbnailCropZoom,
              });

              return (
                <article className={styles['resultCard']} key={item.id}>
                  <div className={styles['cardImageFrame']}>
                    <img
                      alt={item.thumbnailAlt}
                      className={classNames(
                        styles['cardImage'],
                        shouldMuteThumbnail && styles['cardImageMuted'],
                      )}
                      src={item.thumbnailSrc}
                      style={thumbnailCropStyle}
                    />
                  </div>

                  <div className={styles['cardBody']}>
                    <span className={styles['categoryLabel']}>{item.categoryLabel}</span>
                    <h2 className={styles['cardTitle']}>
                      <Link className={styles['cardLink']} to={item.to}>
                        {item.title}
                      </Link>
                    </h2>
                    <p className={styles['cardDescription']}>{item.description}</p>
                  </div>
                </article>
              );
            })
          ) : (
            <article className={styles['emptyStateCard']}>
              <h2 className={styles['stateTitle']}>일치하는 결과가 없습니다.</h2>
              <p className={styles['stateDescription']}>
                다른 키워드로 다시 검색하시거나 검색 범위를 바꿔서 시도해 주세요.
              </p>
            </article>
          )}
        </section>
      ) : null}
    </div>
  );
};

export default SearchPage;
