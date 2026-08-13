import type { Dispatch, RefCallback, RefObject, SetStateAction } from 'react';
import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { ProgramDetailPageResponse } from '@/types/programCatalog';

import {
  buildHeroInfoPills,
  detailTabItems,
  detailTabScrollOffsetPx,
  formatPriceLabel,
  getScrollBehavior,
  resolveVisibleReviewPreviewIds,
  parsePriceAmount,
  reviewCarouselScrollAmountPx,
  sortProgramReviews,
  type DetailSectionId,
  type ReviewSortOrder,
} from './programPageDetailShared';

export interface ProgramPageDetailViewModel {
  activeTabId: DetailSectionId;
  activeSectionId: DetailSectionId;
  discountedPriceAmount: number;
  heroInfoPills: Array<{ label: string; value: string }>;
  isQnaTabOpen: boolean;
  openCurriculumRows: Record<string, boolean>;
  openFaqId: string | null;
  originalPriceAmount: number;
  reviewCarouselRef: RefObject<HTMLDivElement | null>;
  reviewSortOrder: ReviewSortOrder;
  sectionRefHandlers: Record<DetailSectionId, RefCallback<HTMLElement>>;
  setOpenFaqId: Dispatch<SetStateAction<string | null>>;
  setAllCurriculumRowsOpen: (isOpen: boolean) => void;
  setReviewSortOrder: Dispatch<SetStateAction<ReviewSortOrder>>;
  sortedReviews: ProgramDetailPageResponse['reviews'];
  toggleCurriculumRow: (rowKey: string) => void;
  totalPriceLabel: string;
  visiblePreviewReviewIds: string[];
  handleReviewCarouselScroll: (direction: 'left' | 'right') => void;
  handleTabClick: (sectionId: DetailSectionId) => void;
}

const createSectionRefMap = (): Record<DetailSectionId, HTMLElement | null> => ({
  'course-qna': null,
  'course-curriculum': null,
  'course-faq': null,
  'course-introduction': null,
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

const createAllOpenCurriculumRows = (
  data: ProgramDetailPageResponse,
  isOpen: boolean,
): Record<string, boolean> => {
  return Object.fromEntries(
    data.curriculumTrack.sections.map((_, sectionIndex) => {
      return [`${data.curriculumTrack.id}-${String(sectionIndex)}`, isOpen];
    }),
  );
};

const scrollToSectionTop = (top: number) => {
  try {
    window.scrollTo({
      behavior: getScrollBehavior(),
      top,
    });
  } catch {
    // jsdom does not implement window.scrollTo.
  }
};

export const useProgramPageDetailViewModel = (
  data: ProgramDetailPageResponse,
): ProgramPageDetailViewModel => {
  const detailResetKey = data.programId ?? data.breadcrumbItems.at(-1)?.to ?? data.title;
  const [activeTabId, setActiveTabId] = useState<DetailSectionId>('course-introduction');
  const [activeSectionId, setActiveSectionId] = useState<DetailSectionId>('course-introduction');
  const [isQnaTabOpen, setIsQnaTabOpen] = useState(false);
  const [pendingScrollSectionId, setPendingScrollSectionId] = useState<DetailSectionId | null>(
    null,
  );
  const [reviewSortOrder, setReviewSortOrder] = useState<ReviewSortOrder>('recommended');
  const [visiblePreviewReviewIds, setVisiblePreviewReviewIds] = useState<string[]>([]);
  const [openCurriculumRows, setOpenCurriculumRows] = useState<Record<string, boolean>>(() =>
    createInitialOpenCurriculumRows(data),
  );
  const [openFaqId, setOpenFaqId] = useState<string | null>(data.faqItems[0]?.id ?? null);

  const reviewCarouselRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<DetailSectionId, HTMLElement | null>>(createSectionRefMap());

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
  const resolvedVisiblePreviewReviewIds = useMemo(() => {
    const reviewIdSet = new Set(sortedReviews.map((review) => review.id));
    const matchingVisibleReviewIds = visiblePreviewReviewIds.filter((reviewId) =>
      reviewIdSet.has(reviewId),
    );

    if (matchingVisibleReviewIds.length > 0) {
      return matchingVisibleReviewIds;
    }

    const firstReview = sortedReviews.at(0);
    return firstReview ? [firstReview.id] : [];
  }, [sortedReviews, visiblePreviewReviewIds]);

  useEffect(() => {
    startTransition(() => {
      setActiveTabId('course-introduction');
      setActiveSectionId('course-introduction');
      setIsQnaTabOpen(false);
      setPendingScrollSectionId(null);
      setOpenCurriculumRows(createInitialOpenCurriculumRows(data));
      setOpenFaqId(data.faqItems[0]?.id ?? null);
      setReviewSortOrder('recommended');
    });
  }, [data, detailResetKey]);

  useEffect(() => {
    const handleScroll = () => {
      if (isQnaTabOpen) {
        return;
      }

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
      setActiveTabId((currentActiveTabId) => {
        return currentActiveTabId === nextActiveSectionId
          ? currentActiveTabId
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
  }, [isQnaTabOpen]);

  useLayoutEffect(() => {
    if (!isQnaTabOpen || pendingScrollSectionId !== 'course-qna') {
      return;
    }

    const targetElement = sectionRefs.current['course-qna'];

    if (!targetElement) {
      return;
    }

    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY;

    scrollToSectionTop(targetTop - detailTabScrollOffsetPx);
    startTransition(() => {
      setPendingScrollSectionId(null);
    });
  }, [isQnaTabOpen, pendingScrollSectionId]);

  useLayoutEffect(() => {
    if (
      isQnaTabOpen ||
      pendingScrollSectionId === null ||
      pendingScrollSectionId === 'course-qna'
    ) {
      return;
    }

    const targetElement = sectionRefs.current[pendingScrollSectionId];

    if (!targetElement) {
      return;
    }

    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY;

    scrollToSectionTop(targetTop - detailTabScrollOffsetPx);
    startTransition(() => {
      setPendingScrollSectionId(null);
    });
  }, [isQnaTabOpen, pendingScrollSectionId]);

  useLayoutEffect(() => {
    const reviewTrackElement = reviewCarouselRef.current;

    if (!reviewTrackElement || typeof window === 'undefined') {
      return;
    }

    let animationFrameId = 0;

    const syncVisiblePreviewReviews = () => {
      const reviewTrackRect = reviewTrackElement.getBoundingClientRect();
      const reviewCardBounds = Array.from(reviewTrackElement.children).flatMap((childElement) => {
        if (!(childElement instanceof HTMLElement)) {
          return [];
        }

        const reviewId = childElement.dataset['reviewId'];

        if (!reviewId) {
          return [];
        }

        const reviewCardRect = childElement.getBoundingClientRect();
        return [
          {
            left: reviewCardRect.left,
            reviewId,
            right: reviewCardRect.right,
          },
        ];
      });
      const nextVisiblePreviewReviewIds = resolveVisibleReviewPreviewIds(
        { left: reviewTrackRect.left, right: reviewTrackRect.right },
        reviewCardBounds,
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
      'course-qna': (element) => {
        sectionRefs.current['course-qna'] = element;
      },
      'course-curriculum': (element) => {
        sectionRefs.current['course-curriculum'] = element;
      },
      'course-faq': (element) => {
        sectionRefs.current['course-faq'] = element;
      },
      'course-introduction': (element) => {
        sectionRefs.current['course-introduction'] = element;
      },
      'course-reviews': (element) => {
        sectionRefs.current['course-reviews'] = element;
      },
    };
  }, []);

  const handleTabClick = (sectionId: DetailSectionId) => {
    if (sectionId === 'course-qna') {
      setIsQnaTabOpen(true);
      setPendingScrollSectionId(sectionId);
      setActiveTabId(sectionId);
      setActiveSectionId(sectionId);
      return;
    }

    if (isQnaTabOpen) {
      setIsQnaTabOpen(false);
      setPendingScrollSectionId(sectionId);
      setActiveTabId(sectionId);
      setActiveSectionId(sectionId);
      return;
    }

    const targetElement = sectionRefs.current[sectionId];

    if (!targetElement) {
      return;
    }

    setIsQnaTabOpen(false);
    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY;

    scrollToSectionTop(targetTop - detailTabScrollOffsetPx);
    setActiveTabId(sectionId);
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

  const setAllCurriculumRowsOpen = (isOpen: boolean) => {
    setOpenCurriculumRows(createAllOpenCurriculumRows(data, isOpen));
  };

  return {
    activeSectionId,
    activeTabId,
    discountedPriceAmount,
    handleReviewCarouselScroll,
    handleTabClick,
    heroInfoPills,
    isQnaTabOpen,
    openCurriculumRows,
    openFaqId,
    originalPriceAmount,
    reviewCarouselRef,
    reviewSortOrder,
    sectionRefHandlers,
    setAllCurriculumRowsOpen,
    setOpenFaqId,
    setReviewSortOrder,
    sortedReviews,
    toggleCurriculumRow,
    totalPriceLabel,
    visiblePreviewReviewIds: resolvedVisiblePreviewReviewIds,
  };
};
