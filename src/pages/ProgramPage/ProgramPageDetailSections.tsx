import { Link } from 'react-router-dom';

import ChevronDownIcon from '@/components/ui/icons/ChevronDownIcon';
import type {
  ProgramCurriculumSection,
  ProgramDetailPageResponse,
  ProgramReviewItem,
} from '@/types/programCatalog';
import { classNames } from '@/utils/classNames';

import styles from './ProgramPageDetail.module.scss';
import {
  buildAdminReplyExample,
  detailTabItems,
  featureCardTitles,
  formatPriceLabel,
  type ReviewSortOrder,
} from './programPageDetailShared';
import type { ProgramPageDetailViewModel } from './useProgramPageDetailViewModel';

interface RatingStarsProps {
  inverse?: boolean;
  rating: number;
}

interface ReviewPreviewCardProps {
  isDimmed?: boolean;
  review: ProgramReviewItem;
}

interface FullReviewCardProps {
  review: ProgramReviewItem;
}

interface IntroductionBlockHeaderProps {
  subtitle: string;
  title: string;
}

interface IntroductionInfoBoxProps {
  content: string;
  title: string;
}

interface IntroductionFeatureCardProps {
  content: string;
  title: string;
}

interface CurriculumWeekRowProps {
  isOpen: boolean;
  onToggle: () => void;
  section: ProgramCurriculumSection;
  sectionIndex: number;
}

interface ProgramPageDetailHeroProps {
  data: ProgramDetailPageResponse;
  heroInfoPills: ProgramPageDetailViewModel['heroInfoPills'];
  supportTags: string[];
}

interface ProgramPageDetailMainContentProps {
  activeSectionId: ProgramPageDetailViewModel['activeSectionId'];
  data: ProgramDetailPageResponse;
  handleReviewCarouselScroll: ProgramPageDetailViewModel['handleReviewCarouselScroll'];
  handleTabClick: ProgramPageDetailViewModel['handleTabClick'];
  openCurriculumRows: ProgramPageDetailViewModel['openCurriculumRows'];
  openFaqId: ProgramPageDetailViewModel['openFaqId'];
  reviewCarouselRef: ProgramPageDetailViewModel['reviewCarouselRef'];
  reviewSortOrder: ProgramPageDetailViewModel['reviewSortOrder'];
  sectionRefHandlers: ProgramPageDetailViewModel['sectionRefHandlers'];
  setOpenFaqId: ProgramPageDetailViewModel['setOpenFaqId'];
  setReviewSortOrder: ProgramPageDetailViewModel['setReviewSortOrder'];
  sortedReviews: ProgramPageDetailViewModel['sortedReviews'];
  toggleCurriculumRow: ProgramPageDetailViewModel['toggleCurriculumRow'];
  visiblePreviewReviewIds: ProgramPageDetailViewModel['visiblePreviewReviewIds'];
}

interface ProgramPageDetailSidebarProps {
  data: ProgramDetailPageResponse;
  discountedPriceAmount: ProgramPageDetailViewModel['discountedPriceAmount'];
  handleAddToCart: () => void;
  handleEnrollNow: () => void;
  isEnrollingNow: boolean;
  isAddingToCart: boolean;
  optionList: ProgramPageDetailViewModel['optionList'];
  originalPriceAmount: ProgramPageDetailViewModel['originalPriceAmount'];
  selectedOption: ProgramPageDetailViewModel['selectedOption'];
  setSelectedOption: ProgramPageDetailViewModel['setSelectedOption'];
  setShowOptionList: ProgramPageDetailViewModel['setShowOptionList'];
  showOptionList: ProgramPageDetailViewModel['showOptionList'];
  totalPriceLabel: ProgramPageDetailViewModel['totalPriceLabel'];
}

const RatingStars = ({ inverse = false, rating }: RatingStarsProps) => {
  return (
    <div aria-hidden='true' className={styles['ratingStars']}>
      {Array.from({ length: 5 }, (_, index) => {
        const isFilled = index < Math.round(rating);

        return (
          <span
            className={classNames(
              styles['ratingStar'],
              isFilled
                ? styles['ratingStarFilled']
                : inverse
                  ? styles['ratingStarInverseEmpty']
                  : styles['ratingStarEmpty'],
            )}
            key={index}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

const ReviewPreviewCard = ({ isDimmed = false, review }: ReviewPreviewCardProps) => {
  return (
    <article
      className={classNames(
        styles['reviewPreviewCard'],
        isDimmed && styles['reviewPreviewCardDimmed'],
      )}
      data-review-id={review.id}
    >
      <p className={styles['reviewPreviewAuthor']}>{review.authorName}</p>

      <div className={styles['reviewMetaRow']}>
        <RatingStars rating={review.rating} />
        <span className={styles['reviewMetaScore']}>{review.rating.toFixed(1)}</span>
        <span className={styles['reviewMetaBadge']}>100% 수강 후 작성</span>
      </div>

      <p className={styles['reviewPreviewContent']}>{review.content}</p>
    </article>
  );
};

const FullReviewCard = ({ review }: FullReviewCardProps) => {
  return (
    <article className={styles['fullReviewCard']}>
      <div className={styles['fullReviewHeader']}>
        <span className={styles['fullReviewAuthor']}>{review.authorName}</span>
        <span className={styles['fullReviewDate']}>{review.dateLabel}</span>
      </div>

      <div className={styles['reviewMetaRow']}>
        <RatingStars rating={review.rating} />
        <span className={styles['reviewMetaScore']}>{review.rating.toFixed(1)}</span>
        <span className={styles['reviewMetaBadge']}>100% 수강 후 작성</span>
      </div>

      <p className={styles['fullReviewContent']}>{review.content}</p>

      <div className={styles['reviewReply']}>
        <div className={styles['reviewReplyHeader']}>
          <span className={styles['reviewReplyAuthor']}>소노스쿨 관리자</span>
          <span className={styles['reviewReplyBadge']}>관리자 답글</span>
        </div>

        <p className={styles['reviewReplyContent']}>{buildAdminReplyExample(review)}</p>
      </div>
    </article>
  );
};

const IntroductionBlockHeader = ({ subtitle, title }: IntroductionBlockHeaderProps) => {
  return (
    <div className={styles['introductionBlockHeader']}>
      <h3 className={styles['introductionBlockTitle']}>{title}</h3>
      <p className={styles['introductionBlockSubtitle']}>{subtitle}</p>
    </div>
  );
};

const IntroductionInfoBox = ({ content, title }: IntroductionInfoBoxProps) => {
  return (
    <article className={styles['infoBox']}>
      <p className={styles['infoBoxTitle']}>{title}</p>
      <ul className={styles['infoBoxList']}>
        <li className={styles['infoBoxItem']}>{content}</li>
      </ul>
    </article>
  );
};

const IntroductionFeatureCard = ({ content, title }: IntroductionFeatureCardProps) => {
  return (
    <article className={styles['featureCard']}>
      <span aria-hidden='true' className={styles['featureCardIcon']} />
      <p className={styles['featureCardTitle']}>{title}</p>
      <p className={styles['featureCardDescription']}>{content}</p>
    </article>
  );
};

const CurriculumWeekRow = ({ isOpen, onToggle, section, sectionIndex }: CurriculumWeekRowProps) => {
  return (
    <article className={styles['curriculumWeekRow']}>
      <button className={styles['curriculumWeekButton']} onClick={onToggle} type='button'>
        <div className={styles['curriculumWeekButtonLeft']}>
          <div className={styles['curriculumWeekLabelGroup']}>
            <span className={styles['curriculumWeekLabel']}>{String(sectionIndex + 1)}주차</span>
            <span className={styles['curriculumWeekHours']}>
              ({String(section.lessons.length)}강)
            </span>
          </div>
          <span className={styles['curriculumWeekTitle']}>{section.title}</span>
        </div>

        <ChevronDownIcon
          aria-hidden='true'
          className={classNames(
            styles['curriculumWeekChevron'],
            isOpen && styles['curriculumWeekChevronOpen'],
          )}
        />
      </button>

      {isOpen ? (
        <div className={styles['curriculumWeekContent']}>
          <p className={styles['curriculumWeekDescription']}>{section.description}</p>
          {section.lessons.map((lesson, lessonIndex) => {
            return (
              <div
                className={classNames(
                  styles['curriculumLessonBlock'],
                  lessonIndex > 0 && styles['curriculumLessonBlockSeparated'],
                )}
                key={lesson.id}
              >
                <div className={styles['curriculumLessonHeader']}>
                  <span className={styles['curriculumLessonTitle']}>
                    {String(lessonIndex + 1)}. {lesson.title}
                  </span>
                  <span className={styles['curriculumLessonDuration']}>{lesson.durationLabel}</span>
                </div>

                <ul className={styles['curriculumLessonTopicList']}>
                  <li className={styles['curriculumLessonTopicItem']}>
                    {lesson.description || section.description}
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
};

export const ProgramPageDetailHero = ({
  data,
  heroInfoPills,
  supportTags,
}: ProgramPageDetailHeroProps) => {
  return (
    <section className={styles['heroSection']}>
      <div className={styles['heroBackground']}>
        <img alt='' className={styles['heroBackgroundImage']} src={data.heroImageSrc} />
        <div aria-hidden='true' className={styles['heroBackgroundOverlay']} />
      </div>

      <div className={styles['heroContent']}>
        <nav aria-label='교육과정 경로' className={styles['heroBreadcrumbNav']}>
          <ol className={styles['heroBreadcrumbList']}>
            {data.breadcrumbItems.map((breadcrumbItem, index) => {
              const isCurrent = index === data.breadcrumbItems.length - 1;

              return (
                <li
                  className={styles['heroBreadcrumbItem']}
                  key={`${breadcrumbItem.to}-${breadcrumbItem.label}`}
                >
                  {isCurrent ? (
                    <span className={styles['heroBreadcrumbCurrent']}>{breadcrumbItem.label}</span>
                  ) : (
                    <Link className={styles['heroBreadcrumbLink']} to={breadcrumbItem.to}>
                      {breadcrumbItem.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={styles['heroHashTagRow']}>
          {supportTags.slice(0, 3).map((tag) => {
            return (
              <span className={styles['heroHashTag']} key={tag}>
                #{tag}
              </span>
            );
          })}
        </div>

        <h1 className={styles['heroTitle']}>{data.title}</h1>

        <div className={styles['heroRatingRow']}>
          <RatingStars inverse rating={data.overallRating} />
          <span className={styles['heroRatingScore']}>{data.overallRating.toFixed(1)}</span>
          <span className={styles['heroRatingCount']}>({data.reviewCount.toLocaleString()})</span>
        </div>

        <p className={styles['heroDescription']}>{data.description}</p>

        <div className={styles['heroInfoPillRow']}>
          {heroInfoPills.map((item) => {
            return (
              <div className={styles['heroInfoPill']} key={item.label}>
                <span className={styles['heroInfoPillLabel']}>{item.label}</span>
                <span aria-hidden='true' className={styles['heroInfoDivider']} />
                <span className={styles['heroInfoPillValue']}>{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const ProgramPageDetailMainContent = ({
  activeSectionId,
  data,
  handleReviewCarouselScroll,
  handleTabClick,
  openCurriculumRows,
  openFaqId,
  reviewCarouselRef,
  reviewSortOrder,
  sectionRefHandlers,
  setOpenFaqId,
  setReviewSortOrder,
  sortedReviews,
  toggleCurriculumRow,
  visiblePreviewReviewIds,
}: ProgramPageDetailMainContentProps) => {
  const curriculumTrack = data.curriculumTrack;

  return (
    <div className={styles['contentMain']}>
      <nav aria-label='강의 상세 탭' className={styles['tabBar']}>
        {detailTabItems.map((tabItem) => {
          const isActive = activeSectionId === tabItem.id;

          return (
            <button
              className={classNames(styles['tabButton'], isActive && styles['tabButtonActive'])}
              key={tabItem.id}
              onClick={() => {
                handleTabClick(tabItem.id);
              }}
              type='button'
            >
              {tabItem.label}
            </button>
          );
        })}
      </nav>

      <section className={styles['previewReviewSection']}>
        <h2 className={styles['sectionTitle']}>먼저 경험한 수강생들 후기</h2>

        <div className={styles['previewReviewCarousel']}>
          <div className={styles['previewReviewTrack']} ref={reviewCarouselRef}>
            {sortedReviews.map((review) => {
              return (
                <ReviewPreviewCard
                  isDimmed={!visiblePreviewReviewIds.includes(review.id)}
                  key={review.id}
                  review={review}
                />
              );
            })}
          </div>

          <button
            aria-label='이전 후기'
            className={classNames(styles['carouselArrowButton'], styles['carouselArrowButtonLeft'])}
            onClick={() => {
              handleReviewCarouselScroll('left');
            }}
            type='button'
          >
            <span
              aria-hidden='true'
              className={classNames(styles['carouselArrowIcon'], styles['carouselArrowIconLeft'])}
            />
          </button>

          <button
            aria-label='다음 후기'
            className={classNames(
              styles['carouselArrowButton'],
              styles['carouselArrowButtonRight'],
            )}
            onClick={() => {
              handleReviewCarouselScroll('right');
            }}
            type='button'
          >
            <span
              aria-hidden='true'
              className={classNames(styles['carouselArrowIcon'], styles['carouselArrowIconRight'])}
            />
          </button>
        </div>
      </section>

      <section
        className={styles['contentSection']}
        id='course-introduction'
        ref={sectionRefHandlers['course-introduction']}
      >
        <h2 className={styles['sectionTitle']}>강의 소개</h2>

        <div className={styles['introductionSectionGroup']}>
          <section>
            <IntroductionBlockHeader
              subtitle='이론을 넘어 실제 적용 포인트를 구조적으로 익히는 핵심 요소'
              title='실전력을 극대화하는 핵심 학습 포인트'
            />

            <div className={styles['sectionBlockBody']}>
              <div className={styles['infoBoxListGroup']}>
                {data.learningPoints.map((learningPoint, index) => {
                  return (
                    <IntroductionInfoBox
                      content={learningPoint}
                      key={learningPoint}
                      title={`핵심 포인트 ${String(index + 1)}`}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <IntroductionBlockHeader
              subtitle='수강 후 바로 체감할 수 있는 학습 변화'
              title='수강 후 달라지는 학습 성과'
            />

            <div className={styles['sectionBlockBody']}>
              <div className={styles['checkItemGroup']}>
                {data.stats.slice(0, 3).map((statItem) => {
                  return (
                    <div className={styles['checkBlock']} key={statItem.label}>
                      <div className={styles['checkBlockTitleRow']}>
                        <span aria-hidden='true' className={styles['checkIcon']} />
                        <span className={styles['checkBlockTitle']}>{statItem.label}</span>
                      </div>

                      <ul className={styles['checkBlockList']}>
                        <li className={styles['checkBlockItem']}>{statItem.value}</li>
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <IntroductionBlockHeader
              subtitle='현재 학습 단계와 고민에 맞는 추천 대상'
              title='이런 고민을 가진 분들께 추천합니다'
            />

            <div className={styles['sectionBlockBody']}>
              <article className={styles['targetCard']}>
                <div className={styles['targetCardContent']}>
                  <p className={styles['targetCardLabel']}>강의 대상은</p>

                  <div className={styles['targetCardChecklist']}>
                    {data.recommendedFor.map((item) => {
                      return (
                        <div className={styles['targetChecklistItem']} key={item}>
                          <span aria-hidden='true' className={styles['targetChecklistIcon']} />
                          <span className={styles['targetChecklistText']}>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section>
            <IntroductionBlockHeader
              subtitle='원활한 학습을 위해 미리 확인해야 할 안내 사항'
              title='학습 효과를 높이기 위한 수강 전 체크리스트'
            />

            <div className={styles['sectionBlockBody']}>
              <div className={styles['featureCardGrid']}>
                {data.preparationChecklist.map((item, index) => {
                  return (
                    <IntroductionFeatureCard
                      content={item}
                      key={item}
                      title={featureCardTitles[index] ?? `체크 포인트 ${String(index + 1)}`}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section
        className={styles['contentSection']}
        id='course-curriculum'
        ref={sectionRefHandlers['course-curriculum']}
      >
        <h2 className={styles['sectionTitle']}>커리큘럼</h2>

        <div className={styles['curriculumTrackGroup']}>
          <section className={styles['curriculumTrack']}>
            {curriculumTrack.title ? (
              <div className={styles['curriculumTrackHeader']}>
                <span aria-hidden='true' className={styles['curriculumTrackDot']} />
                <h3 className={styles['curriculumTrackTitle']}>{curriculumTrack.title}</h3>
              </div>
            ) : null}

            <div className={styles['curriculumSummaryPanel']}>
              {curriculumTrack.summaryKind === 'decimal' ? (
                <ol className={styles['curriculumSummaryListDecimal']}>
                  {curriculumTrack.summaryItems.map((item) => {
                    return (
                      <li className={styles['curriculumSummaryItem']} key={item}>
                        {item}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <ul className={styles['curriculumSummaryListDisc']}>
                  {curriculumTrack.summaryItems.map((item) => {
                    return (
                      <li className={styles['curriculumSummaryItem']} key={item}>
                        {item}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={styles['curriculumWeekList']}>
              {curriculumTrack.sections.map((section, sectionIndex) => {
                const rowKey = `${curriculumTrack.id}-${String(sectionIndex)}`;

                return (
                  <CurriculumWeekRow
                    isOpen={openCurriculumRows[rowKey] ?? false}
                    key={rowKey}
                    onToggle={() => {
                      toggleCurriculumRow(rowKey);
                    }}
                    section={section}
                    sectionIndex={sectionIndex}
                  />
                );
              })}
            </div>
          </section>
        </div>
      </section>

      <section
        className={styles['contentSection']}
        id='course-reviews'
        ref={sectionRefHandlers['course-reviews']}
      >
        <h2 className={styles['sectionTitle']}>수강평</h2>

        <div className={styles['reviewScoreSummary']}>
          <span aria-hidden='true' className={styles['reviewScoreStar']}>
            ★
          </span>
          <span className={styles['reviewScoreValue']}>{data.overallRating.toFixed(1)}</span>
          <span className={styles['reviewScoreCount']}>({data.reviewCount.toLocaleString()})</span>
        </div>

        <div className={styles['reviewSectionHeaderRow']}>
          <h3 className={styles['reviewSectionHeading']}>전체 수강평</h3>

          <label className={styles['selectField']}>
            <span className={styles['screenReaderOnly']}>수강평 정렬</span>
            <select
              className={styles['sortSelect']}
              onChange={(event) => {
                setReviewSortOrder(event.target.value as ReviewSortOrder);
              }}
              value={reviewSortOrder}
            >
              <option value='recommended'>추천순</option>
              <option value='latest'>최신순</option>
            </select>
          </label>
        </div>

        <div className={styles['fullReviewList']}>
          {sortedReviews.map((review) => {
            return <FullReviewCard key={review.id} review={review} />;
          })}
        </div>

        <button className={styles['moreReviewButton']} type='button'>
          수강평 더보기
        </button>
      </section>

      <section
        className={styles['contentSection']}
        id='course-faq'
        ref={sectionRefHandlers['course-faq']}
      >
        <h2 className={styles['sectionTitle']}>자주하는 질문</h2>

        <div className={styles['faqList']}>
          {data.faqItems.map((faqItem) => {
            const isOpen = openFaqId === faqItem.id;

            return (
              <div
                className={classNames(styles['faqItem'], isOpen && styles['faqItemOpen'])}
                key={faqItem.id}
              >
                <button
                  className={classNames(
                    styles['faqQuestionButton'],
                    isOpen && styles['faqQuestionButtonOpen'],
                  )}
                  onClick={() => {
                    setOpenFaqId((currentOpenFaqId) => {
                      return currentOpenFaqId === faqItem.id ? null : faqItem.id;
                    });
                  }}
                  type='button'
                >
                  <div className={styles['faqQuestionContent']}>
                    <span className={styles['faqQuestionText']}>{faqItem.question}</span>
                  </div>

                  <ChevronDownIcon
                    aria-hidden='true'
                    className={classNames(styles['faqChevron'], isOpen && styles['faqChevronOpen'])}
                  />
                </button>

                {isOpen ? <p className={styles['faqAnswer']}>{faqItem.answer}</p> : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export const ProgramPageDetailSidebar = ({
  data,
  discountedPriceAmount,
  handleAddToCart,
  handleEnrollNow,
  isEnrollingNow,
  isAddingToCart,
  optionList,
  originalPriceAmount,
  selectedOption,
  setSelectedOption,
  setShowOptionList,
  showOptionList,
  totalPriceLabel,
}: ProgramPageDetailSidebarProps) => {
  const selectedOptionLabel = selectedOption || '옵션을 선택하세요';

  return (
    <aside className={styles['sidebar']}>
      <div className={styles['pricingCard']}>
        <p className={styles['pricingOriginalPrice']}>
          {originalPriceAmount ? formatPriceLabel(originalPriceAmount) : data.originalPriceLabel}
        </p>

        <div className={styles['pricingDiscountRow']}>
          <span className={styles['pricingDiscountRate']}>{data.discountRateLabel}</span>
          <span className={styles['pricingDiscountedPrice']}>
            {formatPriceLabel(discountedPriceAmount)}
          </span>
        </div>

        {data.remainingSeatsLabel ? (
          <div className={styles['pricingAvailabilityBox']}>
            <span className={styles['pricingAvailabilityLabel']}>현재 수강 가능</span>
            <span className={styles['pricingAvailabilityValue']}>{data.remainingSeatsLabel}</span>
          </div>
        ) : null}

        <div className={styles['sidebarOptionSection']}>
          <p className={styles['sidebarSectionTitle']}>옵션</p>

          <button
            className={styles['sidebarSelectButton']}
            onClick={() => {
              setShowOptionList((currentValue) => !currentValue);
            }}
            type='button'
          >
            <span className={styles['sidebarSelectButtonText']}>{selectedOptionLabel}</span>
            <ChevronDownIcon aria-hidden='true' className={styles['sidebarSelectButtonIcon']} />
          </button>

          {showOptionList ? (
            <div className={styles['sidebarOptionList']}>
              {optionList.map((optionItem) => {
                return (
                  <button
                    className={styles['sidebarOptionItem']}
                    key={optionItem}
                    onClick={() => {
                      setSelectedOption(optionItem);
                      setShowOptionList(false);
                    }}
                    type='button'
                  >
                    {optionItem}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {selectedOption ? (
          <div className={styles['selectedOptionPanel']}>
            <div className={styles['selectedOptionHeader']}>
              <span className={styles['selectedOptionTitle']}>{selectedOption}</span>

              <button
                className={styles['selectedOptionRemoveButton']}
                onClick={() => {
                  setSelectedOption('');
                }}
                type='button'
              >
                ×
              </button>
            </div>
          </div>
        ) : null}

        <div className={styles['pricingSummaryLine']}>
          <span className={styles['pricingSummaryLabel']}>{selectedOptionLabel}</span>
          <span className={styles['pricingSummaryValue']}>{totalPriceLabel}</span>
        </div>

        <div className={styles['pricingTotalRow']}>
          <span className={styles['pricingTotalLabel']}>총 결제 금액</span>
          <span className={styles['pricingTotalValue']}>{totalPriceLabel}</span>
        </div>

        <div className={styles['pricingActionRow']}>
          <button
            className={styles['cartActionLink']}
            disabled={isAddingToCart}
            onClick={handleAddToCart}
            type='button'
          >
            {isAddingToCart ? '담는 중...' : '장바구니'}
          </button>
          <button
            className={styles['applyActionLink']}
            disabled={isEnrollingNow}
            onClick={handleEnrollNow}
            type='button'
          >
            {isEnrollingNow ? '이동 중...' : '수강 신청 하기'}
          </button>
        </div>
      </div>
    </aside>
  );
};
