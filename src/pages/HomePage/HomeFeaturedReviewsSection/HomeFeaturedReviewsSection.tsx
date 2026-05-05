import { Link } from 'react-router-dom';

import homeReviewAbdomenImageSrc from '@/assets/sample/optimized/home_review_abdomen.jpg';
import homeReviewFastImageSrc from '@/assets/sample/optimized/home_review_fast.jpg';
import homeReviewMskImageSrc from '@/assets/sample/optimized/home_review_msk.jpg';
import homeReviewThyroidImageSrc from '@/assets/sample/optimized/home_review_thyroid.jpg';
import { routePaths } from '@/routes/routeRegistry';
import { classNames } from '@/utils/classNames';

import styles from './HomeFeaturedReviewsSection.module.scss';

export interface HomeFeaturedReviewCard {
  id: string;
  title: string;
  excerpt: string;
  topicLabel: string;
  badgeLabel: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  to: string;
  isPrimary?: boolean;
}

// 실제 과정 후기 API가 연결되면 이 배열을 홈 대표 후기 응답으로 교체하면 됩니다.
const defaultFeaturedReviewCards = [
  {
    id: 'home-featured-review-abdomen-core',
    title: '복부 코어 루틴 수업에서 학습 밀도가 가장 크게 올라간 순간',
    excerpt:
      '이번 회차는 간, 담낭, 췌장으로 이어지는 스캔 동선을 먼저 다시 정리한 뒤 즉시 핸즈온으로 넘어간 구성이 가장 효과적이었습니다. 강사 기준으로는 짧은 설명 뒤 바로 손 위치를 교정하는 템포가 집중도와 이해도를 동시에 끌어올렸습니다.',
    topicLabel: '복부 루틴 워크숍',
    badgeLabel: '대표 후기',
    thumbnailSrc: homeReviewAbdomenImageSrc,
    thumbnailAlt: '복부 초음파 실습이 진행되는 소노스쿨 교육 현장',
    to: routePaths.program('doctor-course-internal-medicine-abdomen-practice'),
    isPrimary: true,
  },
  {
    id: 'home-featured-review-fast-intensive',
    title: 'FAST 실습에서 손목 각도보다 먼저 교정해야 했던 시선 흐름',
    excerpt:
      'Subxiphoid window에서 막히는 수강생은 손목보다 시선이 먼저 흔들리는 경우가 많았습니다. 이번 교육 후기에는 강사가 어떤 순서로 시선, 프로브 방향, 압박 강도를 잡아 주었는지 구체적으로 정리했습니다.',
    topicLabel: '응급 POCUS 집중과정',
    badgeLabel: '강사 작성',
    thumbnailSrc: homeReviewFastImageSrc,
    thumbnailAlt: '응급 POCUS 실습이 진행되는 소노스쿨 교육 현장',
    to: routePaths.program('doctor-course-emergency-pocus-fast'),
  },
  {
    id: 'home-featured-review-thyroid-reading',
    title: '짧은 증례 브리핑이 갑상선 판독 토론 참여도를 끌어올린 이유',
    excerpt:
      '판독 세션 시작 전에 증례 배경을 3분 안에 압축해 주었더니 질문의 질과 참여 빈도가 모두 좋아졌습니다. 후기 본문에서는 강사 입장에서 어떤 질문이 실제 판독 사고를 넓혀 주었는지 기록했습니다.',
    topicLabel: '갑상선 판독 세션',
    badgeLabel: '강사 작성',
    thumbnailSrc: homeReviewThyroidImageSrc,
    thumbnailAlt: '갑상선 초음파 판독 교육이 진행되는 소노스쿨 교육 현장',
    to: routePaths.program('hybrid-course-head-neck-master'),
  },
  {
    id: 'home-featured-review-msk-lab',
    title: '어깨 스캔 반복 실습에서 페어 교차 피드백이 유효했던 이유',
    excerpt:
      '동일 조 안에서만 반복하지 않고 페어를 바꿔 피드백을 주고받게 하자 스캔 포인트 설명력이 눈에 띄게 좋아졌습니다. 이번 교육 후기는 근골격 수업에서 관찰된 학습 흐름 변화를 중심으로 정리했습니다.',
    topicLabel: '근골격 핸즈온 랩',
    badgeLabel: '강사 작성',
    thumbnailSrc: homeReviewMskImageSrc,
    thumbnailAlt: '근골격 초음파 실습이 진행되는 소노스쿨 교육 현장',
    to: routePaths.program('general-course-shoulder-basic-6-weeks'),
  },
] as const satisfies readonly HomeFeaturedReviewCard[];

export interface HomeFeaturedReviewsSectionProps {
  items?: readonly HomeFeaturedReviewCard[];
}

const MAX_DISPLAYED_REVIEW_COUNT = 4;
const MAX_SECONDARY_REVIEW_COUNT = 3;

const HomeFeaturedReviewsSection = ({
  items = defaultFeaturedReviewCards,
}: HomeFeaturedReviewsSectionProps) => {
  const displayedItems = items.slice(0, MAX_DISPLAYED_REVIEW_COUNT);
  const firstItem = displayedItems.at(0);

  if (!firstItem) {
    return null;
  }

  const primaryItem = displayedItems.find((item) => item.isPrimary) ?? firstItem;
  const secondaryItems = displayedItems
    .filter((item) => item.id !== primaryItem.id)
    .slice(0, MAX_SECONDARY_REVIEW_COUNT);
  const displayedReviewCount = 1 + secondaryItems.length;

  return (
    <section aria-labelledby='home-featured-reviews-heading' className={styles['section']}>
      <div className={styles['inner']}>
        <div className={styles['header']}>
          <div className={styles['copyBlock']}>
            <span className={styles['eyebrow']}>FEATURED REVIEWS</span>

            <div className={styles['titleBlock']}>
              <h2 className={styles['heading']} id='home-featured-reviews-heading'>
                교육 후기
              </h2>
              <p className={styles['description']}>
                수업 중 실제로 자주 막히는 순간과 강의 운영 포인트를 강사 시선으로 정리했습니다.
                홈에서는 대표 후기 4건을 먼저 확인하고, 각 카드에서 해당 강좌 상세 페이지 후기
                영역으로 이어지도록 구성했습니다.
              </p>
            </div>
          </div>

          <Link className={styles['viewAllLink']} to={routePaths.homeFeaturedCourses}>
            전체 과정 보기
          </Link>
        </div>

        <ul
          aria-label={`대표 교육후기 ${String(displayedReviewCount)}개`}
          className={styles['editorialGrid']}
        >
          <li className={classNames(styles['cardItem'], styles['cardItemPrimary'])}>
            <article className={styles['card']}>
              <Link
                className={classNames(styles['cardLink'], styles['cardLinkPrimary'])}
                to={primaryItem.to}
              >
                <div className={styles['cardMedia']}>
                  <img
                    alt={primaryItem.thumbnailAlt}
                    className={styles['cardImage']}
                    src={primaryItem.thumbnailSrc}
                  />
                  <div aria-hidden='true' className={styles['cardOverlay']} />
                </div>

                <div className={styles['cardBody']}>
                  <div className={styles['cardLabelRow']}>
                    <span className={styles['badge']}>{primaryItem.badgeLabel}</span>
                    <span className={styles['topicLabel']}>{primaryItem.topicLabel}</span>
                  </div>

                  <div className={styles['primaryTitleBlock']}>
                    <p className={styles['primaryLead']}>현장에서 바로 기록한 강사 노트</p>
                    <h3 className={classNames(styles['cardTitle'], styles['cardTitlePrimary'])}>
                      {primaryItem.title}
                    </h3>
                  </div>

                  <p className={classNames(styles['cardExcerpt'], styles['cardExcerptPrimary'])}>
                    {primaryItem.excerpt}
                  </p>
                  <span className={classNames(styles['cardCta'], styles['cardCtaPrimary'])}>
                    대표 후기 자세히 보기
                  </span>
                </div>
              </Link>
            </article>
          </li>

          {secondaryItems.map((item, itemIndex) => {
            return (
              <li
                className={classNames(styles['cardItem'], styles['cardItemSecondary'])}
                key={item.id}
              >
                <article className={styles['card']}>
                  <Link
                    className={classNames(styles['cardLink'], styles['cardLinkSecondary'])}
                    to={item.to}
                  >
                    <span aria-hidden='true' className={styles['secondaryIndex']}>
                      {String(itemIndex + 1).padStart(2, '0')}
                    </span>

                    <div className={styles['secondaryMedia']}>
                      <img
                        alt={item.thumbnailAlt}
                        className={styles['secondaryImage']}
                        src={item.thumbnailSrc}
                      />
                    </div>

                    <div className={styles['secondaryCopy']}>
                      <div className={styles['cardLabelRow']}>
                        <span className={styles['secondaryBadge']}>{item.badgeLabel}</span>
                        <span className={styles['topicLabel']}>{item.topicLabel}</span>
                      </div>

                      <h3 className={classNames(styles['cardTitle'], styles['cardTitleSecondary'])}>
                        {item.title}
                      </h3>
                      <p
                        className={classNames(
                          styles['cardExcerpt'],
                          styles['cardExcerptSecondary'],
                        )}
                      >
                        {item.excerpt}
                      </p>
                    </div>

                    <span className={styles['secondaryArrow']} aria-hidden='true' />
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default HomeFeaturedReviewsSection;
