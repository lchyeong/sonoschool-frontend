import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

import { fetchProgramPage } from '@/api/programCatalog';
import { useProgramSearchIndexQuery } from '@/query/useProgramSearchIndexQuery';

import { programPageQueryKey } from './useProgramPageQuery';

export interface ReviewBoardItem {
  authorLoginId: string;
  categoryLabel: string;
  content: string;
  dateLabel: string;
  heroImageAlt: string;
  heroImageSrc: string;
  id: string;
  programId: number | null;
  programPath: string;
  programTitle: string;
  rating: number;
}

const parseDateLabel = (value: string): number => {
  const [year, month, day] = value.split('.').map((item) => Number(item));

  if (!year || !month || !day) {
    return 0;
  }

  return Date.UTC(year, month - 1, day);
};

export const useReviewBoardQuery = () => {
  const searchIndexQuery = useProgramSearchIndexQuery();
  const lecturePaths = useMemo(() => {
    return Array.from(
      new Set(
        (searchIndexQuery.data?.items ?? [])
          .filter((item) => item.scope === 'lecture')
          .map((item) => item.to),
      ),
    );
  }, [searchIndexQuery.data?.items]);

  const programDetailQueries = useQueries({
    queries: lecturePaths.map((path) => ({
      enabled: searchIndexQuery.isSuccess,
      gcTime: 30 * 60 * 1000,
      queryFn: () => fetchProgramPage(path),
      queryKey: programPageQueryKey(path),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const data = useMemo(() => {
    const items: ReviewBoardItem[] = [];
    let reviewedProgramCount = 0;

    programDetailQueries.forEach((query, index) => {
      const programPage = query.data;

      if (!programPage || programPage.pageKind !== 'detail') {
        return;
      }

      const detailPage = programPage;

      if (!detailPage.reviews.length) {
        return;
      }

      reviewedProgramCount += 1;

      detailPage.reviews.forEach((review) => {
        items.push({
          authorLoginId: review.authorLoginId,
          categoryLabel: detailPage.categoryLabel,
          content: review.content,
          dateLabel: review.dateLabel,
          heroImageAlt: detailPage.heroImageAlt,
          heroImageSrc: detailPage.heroImageSrc,
          id: `${String(detailPage.programId ?? lecturePaths[index])}-${review.id}`,
          programId: detailPage.programId ?? null,
          programPath: lecturePaths[index] ?? '/programs',
          programTitle: detailPage.title,
          rating: review.rating,
        });
      });
    });

    items.sort((left, right) => {
      const dateDifference = parseDateLabel(right.dateLabel) - parseDateLabel(left.dateLabel);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return right.rating - left.rating;
    });

    return {
      items,
      reviewedProgramCount,
      sourceProgramCount: lecturePaths.length,
    };
  }, [lecturePaths, programDetailQueries]);

  const isPending =
    searchIndexQuery.isPending ||
    (searchIndexQuery.isSuccess && programDetailQueries.some((query) => query.isPending));
  const error =
    searchIndexQuery.error ?? programDetailQueries.find((query) => query.error)?.error ?? null;

  return {
    data,
    error,
    isError: Boolean(error),
    isPending,
  };
};
