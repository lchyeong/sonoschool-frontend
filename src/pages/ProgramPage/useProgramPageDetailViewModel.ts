import type { Dispatch, RefCallback, RefObject, SetStateAction } from 'react';
import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { ProgramDetailPageResponse } from '@/types/programCatalog';

import {
  buildHeroInfoPills,
  detailTabItems,
  detailTabScrollOffsetPx,
  formatPriceLabel,
  getOptionList,
  getScrollBehavior,
  getSupportTags,
  parsePriceAmount,
  reviewCarouselScrollAmountPx,
  reviewPreviewVisibilityTolerancePx,
  sortProgramReviews,
  type DetailSectionId,
  type ReviewSortOrder,
} from './programPageDetailShared';

export interface ProgramPageDetailViewModel {
  activeSectionId: DetailSectionId;
  discountedPriceAmount: number;
  heroInfoPills: Array<{ label: string; value: string }>;
  openCurriculumRows: Record<string, boolean>;
  openFaqId: string | null;
  optionList: string[];
  originalPriceAmount: number;
  reviewCarouselRef: RefObject<HTMLDivElement | null>;
  reviewSortOrder: ReviewSortOrder;
  selectedOption: string;
  sectionRefHandlers: Record<DetailSectionId, RefCallback<HTMLElement>>;
  setOpenFaqId: Dispatch<SetStateAction<string | null>>;
  setReviewSortOrder: Dispatch<SetStateAction<ReviewSortOrder>>;
  setSelectedOption: Dispatch<SetStateAction<string>>;
  setShowOptionList: Dispatch<SetStateAction<boolean>>;
  showOptionList: boolean;
  sortedReviews: ProgramDetailPageResponse['reviews'];
  supportTags: string[];
  toggleCurriculumRow: (rowKey: string) => void;
  totalPriceLabel: string;
  visiblePreviewReviewIds: string[];
  handleReviewCarouselScroll: (direction: 'left' | 'right') => void;
  handleTabClick: (sectionId: DetailSectionId) => void;
}

const createSectionRefMap = (): Record<DetailSectionId, HTMLElement | null> => ({
  'course-curriculum': null,
  'course-faq': null,
  'course-introduction': null,
  'course-qna': null,
  'course-reviews': null,
});

const createInitialOpenCurriculumRows = (
  data: ProgramDetailPageResponse,
): Record<string, boolean> => {
  if (!data.curriculumTrack.sections.length) {
    return {};
  }

  return { [`${data.curriculumTrack.id}-0`]: true };
};

export const useProgramPageDetailViewModel = (
  data: ProgramDetailPageResponse,
): ProgramPageDetailViewModel => {
  const [activeSectionId, setActiveSectionId] = useState<DetailSectionId>('course-introduction');
  const [reviewSortOrder, setReviewSortOrder] = useState<ReviewSortOrder>('recommended');
  const [visiblePreviewReviewIds, setVisiblePreviewReviewIds] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [showOptionList, setShowOptionList] = useState(false);
  const [openCurriculumRows, setOpenCurriculumRows] = useState<Record<string, boolean>>(() =>
    createInitialOpenCurriculumRows(data),
  );
  const [openFaqId, setOpenFaqId] = useState<string | null>(data.faqItems[0]?.id ?? null);

  const reviewCarouselRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<DetailSectionId, HTMLElement | null>>(createSectionRefMap());

  const supportTags = useMemo(() => getSupportTags(data), [data]);
  const optionList = useMemo(() => getOptionList(data), [data]);
  const heroInfoPills = useMemo(() => buildHeroInfoPills(data), [data]);
  const originalPriceAmount = useMemo(() => parsePriceAmount(data.originalPriceLabel), [data]);
  const discountedPriceAmount = useMemo(() => parsePriceAmount(data.discountedPriceLabel), [data]);
  const totalPriceLabel = useMemo(
    () => formatPriceLabel(discountedPriceAmount),
    [discountedPriceAmount],
  );
  const sortedReviews = useMemo(
    () => sortProgramReviews(data.reviews, reviewSortOrder),
    [data.reviews, reviewSortOrder],
  );

  useEffect(() => {
    startTransition(() => {
      setActiveSectionId('course-introduction');
      setOpenCurriculumRows(createInitialOpenCurriculumRows(data));
      setOpenFaqId(data.faqItems[0]?.id ?? null);
      setSelectedOption('');
      setShowOptionList(false);
      setReviewSortOrder('recommended');
    });
  }, [data]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollCheckpoint = window.scrollY + detailTabScrollOffsetPx;
      let nextActiveSectionId: DetailSectionId = detailTabItems[0].id;

      detailTabItems.forEach((tabItem) => {
        const sectionElement = sectionRefs.current[tabItem.id];

        if (sectionElement && sectionElement.offsetTop <= scrollCheckpoint) {
          nextActiveSectionId = tabItem.id;
        }
      });

      setActiveSectionId((currentActiveSectionId) => {
        return currentActiveSectionId === nextActiveSectionId
          ? currentActiveSectionId
          : nextActiveSectionId;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const reviewTrackElement = reviewCarouselRef.current;

    if (!reviewTrackElement || typeof window === 'undefined') {
      return;
    }

    let animationFrameId = 0;

    const syncVisiblePreviewReviews = () => {
      const reviewTrackRect = reviewTrackElement.getBoundingClientRect();
      const nextVisiblePreviewReviewIds = Array.from(reviewTrackElement.children).flatMap(
        (childElement) => {
          if (!(childElement instanceof HTMLElement)) {
            return [];
          }

          const reviewId = childElement.dataset['reviewId'];

          if (!reviewId) {
            return [];
          }

          const reviewCardRect = childElement.getBoundingClientRect();
          const isFullyVisible =
            reviewCardRect.left >= reviewTrackRect.left - reviewPreviewVisibilityTolerancePx &&
            reviewCardRect.right <= reviewTrackRect.right + reviewPreviewVisibilityTolerancePx;

          return isFullyVisible ? [reviewId] : [];
        },
      );

      setVisiblePreviewReviewIds((currentVisiblePreviewReviewIds) => {
        const hasSameItems =
          currentVisiblePreviewReviewIds.length === nextVisiblePreviewReviewIds.length &&
          currentVisiblePreviewReviewIds.every((reviewId, index) => {
            return reviewId === nextVisiblePreviewReviewIds[index];
          });

        return hasSameItems ? currentVisiblePreviewReviewIds : nextVisiblePreviewReviewIds;
      });
    };

    const requestVisiblePreviewReviewSync = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(syncVisiblePreviewReviews);
    };

    requestVisiblePreviewReviewSync();
    reviewTrackElement.addEventListener('scroll', requestVisiblePreviewReviewSync, {
      passive: true,
    });
    window.addEventListener('resize', requestVisiblePreviewReviewSync);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      reviewTrackElement.removeEventListener('scroll', requestVisiblePreviewReviewSync);
      window.removeEventListener('resize', requestVisiblePreviewReviewSync);
    };
  }, [sortedReviews]);

  const sectionRefHandlers = useMemo<Record<DetailSectionId, RefCallback<HTMLElement>>>(() => {
    return {
      'course-curriculum': (element) => {
        sectionRefs.current['course-curriculum'] = element;
      },
      'course-faq': (element) => {
        sectionRefs.current['course-faq'] = element;
      },
      'course-introduction': (element) => {
        sectionRefs.current['course-introduction'] = element;
      },
      'course-qna': (element) => {
        sectionRefs.current['course-qna'] = element;
      },
      'course-reviews': (element) => {
        sectionRefs.current['course-reviews'] = element;
      },
    };
  }, []);

  const handleTabClick = (sectionId: DetailSectionId) => {
    const targetElement = sectionRefs.current[sectionId];

    if (!targetElement) {
      return;
    }

    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      behavior: getScrollBehavior(),
      top: targetTop - detailTabScrollOffsetPx,
    });
    setActiveSectionId(sectionId);
  };

  const handleReviewCarouselScroll = (direction: 'left' | 'right') => {
    if (!reviewCarouselRef.current) {
      return;
    }

    const distance =
      direction === 'right' ? reviewCarouselScrollAmountPx : -reviewCarouselScrollAmountPx;

    reviewCarouselRef.current.scrollBy({
      behavior: getScrollBehavior(),
      left: distance,
    });
  };

  const toggleCurriculumRow = (rowKey: string) => {
    setOpenCurriculumRows((currentRows) => ({
      ...currentRows,
      [rowKey]: !currentRows[rowKey],
    }));
  };

  return {
    activeSectionId,
    discountedPriceAmount,
    handleReviewCarouselScroll,
    handleTabClick,
    heroInfoPills,
    openCurriculumRows,
    openFaqId,
    optionList,
    originalPriceAmount,
    reviewCarouselRef,
    reviewSortOrder,
    sectionRefHandlers,
    selectedOption,
    setOpenFaqId,
    setReviewSortOrder,
    setSelectedOption,
    setShowOptionList,
    showOptionList,
    sortedReviews,
    supportTags,
    toggleCurriculumRow,
    totalPriceLabel,
    visiblePreviewReviewIds,
  };
};
