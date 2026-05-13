import { Link } from 'react-router-dom';

import PublicBoardLayout from '@/components/board/PublicBoardLayout/PublicBoardLayout';
import shared from '@/components/board/PublicBoardLayout/PublicBoardLayout.module.scss';
import { useReviewBoardQuery } from '@/query/useReviewBoardQuery';
import { routePaths } from '@/routes/routeRegistry';

const buildExcerpt = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 160)}...`;
};

const formatRating = (value: number): string => {
  return `${value.toFixed(1)} / 5.0`;
};

const ReviewsPage = () => {
  const reviewBoardQuery = useReviewBoardQuery();
  const reviews = reviewBoardQuery.data.items;
  const featuredReview = reviews.at(0) ?? null;
  const secondaryReviews = reviews.slice(1, 9);

  const heroAside = (
    <>
      <article className={shared['metricCard']}>
        <p className={shared['metricValue']}>{String(reviews.length)}건</p>
        <p className={shared['metricLabel']}>집계된 실제 수강 후기</p>
      </article>
      <article className={shared['metricCard']}>
        <p className={shared['metricValue']}>
          {String(reviewBoardQuery.data.reviewedProgramCount)}개
        </p>
        <p className={shared['metricLabel']}>후기가 확인된 과정 수</p>
      </article>
      <article className={shared['metricCard']}>
        <p className={shared['metricValue']}>
          {String(reviewBoardQuery.data.sourceProgramCount)}개
        </p>
        <p className={shared['metricLabel']}>검토한 전체 과정 수</p>
      </article>
    </>
  );

  let content = (
    <section className={shared['stateSection']}>
      <div className={shared['stateContent']}>
        <h2 className={shared['stateTitle']}>아직 공개된 후기가 없습니다.</h2>
        <p className={shared['stateDescription']}>
          새로운 수강 후기가 등록되면 과정별로 이 페이지에 모아 보여 드립니다.
        </p>
      </div>
    </section>
  );

  if (reviewBoardQuery.isPending) {
    content = (
      <section aria-busy='true' className={shared['stateSection']}>
        <div className={shared['stateContent']}>
          <h2 className={shared['stateTitle']}>교육후기를 불러오는 중입니다.</h2>
          <p className={shared['stateDescription']}>
            각 과정 상세 페이지의 수강 후기를 순서대로 집계하고 있습니다.
          </p>
        </div>
      </section>
    );
  } else if (reviewBoardQuery.isError) {
    content = (
      <section className={shared['stateSection']}>
        <div className={shared['stateContent']}>
          <h2 className={shared['stateTitle']}>교육후기를 불러오지 못했습니다.</h2>
          <p className={shared['stateDescription']}>
            {reviewBoardQuery.error instanceof Error
              ? reviewBoardQuery.error.message
              : '후기 집계 상태를 확인한 뒤 다시 시도해 주세요.'}
          </p>
        </div>
      </section>
    );
  } else if (featuredReview) {
    content = (
      <div className={shared['splitLayout']}>
        <section className={shared['sectionCard']}>
          <div className={shared['panelHeader']}>
            <h2 className={shared['panelTitle']}>대표 후기</h2>
            <p className={shared['helperText']}>
              홈 대표 후기 섹션의 톤을 유지하면서 과정별 후기를 한곳에 모았습니다.
            </p>
          </div>

          <article className={shared['featuredCard']}>
            <div className={shared['featuredMeta']}>
              <span className={shared['badge']}>대표 후기</span>
              <span className={shared['badgeAccent']}>{featuredReview.categoryLabel}</span>
              <span className={shared['metaText']}>{featuredReview.dateLabel}</span>
            </div>

            <div className={shared['stackList']}>
              <h3 className={shared['featuredTitle']}>{featuredReview.programTitle}</h3>
              <p className={shared['featuredExcerpt']}>{buildExcerpt(featuredReview.content)}</p>
            </div>

            <div className={shared['metaRow']}>
              <p className={shared['ratingValue']}>평점 {formatRating(featuredReview.rating)}</p>
              <span className={shared['metaText']}>작성자 {featuredReview.authorName}</span>
            </div>

            <Link className={shared['heroLink']} to={featuredReview.programPath}>
              과정 상세에서 후기 더 보기
            </Link>
          </article>

          {secondaryReviews.length ? (
            <div className={shared['stackList']}>
              {secondaryReviews.map((review) => {
                return (
                  <Link className={shared['boardLink']} key={review.id} to={review.programPath}>
                    <div className={shared['metaRow']}>
                      <span className={shared['badgeAccent']}>{review.categoryLabel}</span>
                      <span className={shared['metaText']}>{review.dateLabel}</span>
                    </div>
                    <div className={shared['stackList']}>
                      <h3 className={shared['itemTitle']}>{review.programTitle}</h3>
                      <p className={shared['itemSummary']}>{buildExcerpt(review.content)}</p>
                    </div>
                    <div className={shared['metaRow']}>
                      <p className={shared['ratingValue']}>평점 {formatRating(review.rating)}</p>
                      <span className={shared['metaText']}>작성자 {review.authorName}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>

        <aside className={shared['sidebarStack']}>
          <section className={shared['sectionCard']}>
            <div className={shared['panelHeader']}>
              <h2 className={shared['panelTitle']}>후기 기준</h2>
            </div>
            <ul className={shared['metaList']}>
              <li>
                <p className={shared['metaLabel']}>데이터 출처</p>
                <p className={shared['metaText']}>
                  과정 상세 페이지에 공개된 실제 수강 후기를 모아 보여 줍니다.
                </p>
              </li>
              <li>
                <p className={shared['metaLabel']}>정렬 기준</p>
                <p className={shared['metaText']}>
                  최신 등록일 우선, 같은 날짜면 평점이 높은 후기를 먼저 노출합니다.
                </p>
              </li>
              <li>
                <p className={shared['metaLabel']}>상세 이동</p>
                <p className={shared['metaText']}>
                  모든 카드에서 해당 과정 상세 페이지로 바로 이동할 수 있습니다.
                </p>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    );
  }

  return (
    <PublicBoardLayout
      actions={
        <>
          <Link className={shared['heroLink']} to={routePaths.programs}>
            교육과정 보기
          </Link>
          <Link className={shared['secondaryLink']} to={routePaths.contact}>
            후기 관련 문의
          </Link>
        </>
      }
      description={
        <p>
          과정별 리뷰를 한 페이지에서 먼저 훑어보고, 필요하면 각 과정 상세로 바로 이동할 수 있게
          구성했습니다.
        </p>
      }
      eyebrow='FEATURED REVIEWS'
      heroAside={heroAside}
      title='교육후기'
    >
      {content}
    </PublicBoardLayout>
  );
};

export default ReviewsPage;
