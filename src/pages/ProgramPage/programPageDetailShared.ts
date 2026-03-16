import type { ProgramDetailPageResponse, ProgramReviewItem } from '@/types/programCatalog';

export const detailTabItems = [
  { id: 'course-introduction', label: '강의 소개' },
  { id: 'course-curriculum', label: '커리큘럼' },
  { id: 'course-reviews', label: '수강평' },
  { id: 'course-faq', label: '자주하는 질문' },
] as const;

export const featureCardTitles = ['학습 준비', '복습 자료', '시청 환경', '수료 기준'] as const;
export const detailTabScrollOffsetPx = 152;
export const reviewCarouselScrollAmountPx = 360;
export const reviewPreviewVisibilityTolerancePx = 1;

export type DetailSectionId = (typeof detailTabItems)[number]['id'];
export type ReviewSortOrder = 'recommended' | 'latest';

export const getScrollBehavior = (): ScrollBehavior => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'auto';
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
};

export const parseDateLabel = (dateLabel: string): number => {
  const [year = '0', month = '0', day = '0'] = dateLabel.split('.');

  return Number(year) * 10_000 + Number(month) * 100 + Number(day);
};

export const parsePriceAmount = (priceLabel: string): number => {
  const numericValue = priceLabel.replace(/[^\d]/g, '');

  return numericValue ? Number(numericValue) : 0;
};

export const formatPriceLabel = (amount: number): string => {
  return `${new Intl.NumberFormat('ko-KR').format(amount)} 원`;
};

export const buildAdminReplyExample = (review: ProgramReviewItem): string => {
  return `안녕하세요, ${review.authorName}님. 남겨주신 수강 후기를 꼼꼼히 확인했습니다. 실제 학습과 임상 적용에 도움이 되었다는 말씀 감사드리며, 이후 과정에서도 복습 자료와 피드백 품질을 더 촘촘하게 보강하겠습니다.`;
};

export const getSupportTags = (data: ProgramDetailPageResponse): string[] => {
  return data.hashtagLabels.length ? data.hashtagLabels : data.tags;
};

export const getOptionList = (data: ProgramDetailPageResponse): string[] => {
  return Array.from(new Set([data.title, ...data.relatedLectures.map((item) => item.title)])).slice(
    0,
    3,
  );
};

export const buildHeroInfoPills = (
  data: ProgramDetailPageResponse,
): Array<{ label: string; value: string }> => {
  return [
    { label: '난이도', value: data.difficultyLabel },
    { label: '모집 기간', value: data.registrationPeriodLabel },
    ...(data.operationPeriodLabel
      ? [{ label: '운영 기간', value: data.operationPeriodLabel }]
      : []),
    { label: '강의 기간', value: data.durationLabel },
    { label: '커리큘럼', value: `이론 및 실습 ${String(data.curriculumTrack.sections.length)}개` },
    { label: '수업 구분', value: data.formatLabel },
  ];
};

export const sortProgramReviews = (
  reviews: readonly ProgramReviewItem[],
  reviewSortOrder: ReviewSortOrder,
): ProgramReviewItem[] => {
  return [...reviews].sort((leftReview, rightReview) => {
    if (reviewSortOrder === 'latest') {
      return parseDateLabel(rightReview.dateLabel) - parseDateLabel(leftReview.dateLabel);
    }

    if (rightReview.rating !== leftReview.rating) {
      return rightReview.rating - leftReview.rating;
    }

    return parseDateLabel(rightReview.dateLabel) - parseDateLabel(leftReview.dateLabel);
  });
};
