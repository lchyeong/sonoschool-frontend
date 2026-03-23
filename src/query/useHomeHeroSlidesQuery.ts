import { useQuery } from '@tanstack/react-query';

import { fetchHomeHeroSlides } from '@/api/homeHeroSlides';

export const homeHeroSlidesQueryKey = () => ['homeHeroSlides'] as const;

export const useHomeHeroSlidesQuery = () => {
  return useQuery({
    queryKey: homeHeroSlidesQueryKey(),
    queryFn: () => fetchHomeHeroSlides(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
