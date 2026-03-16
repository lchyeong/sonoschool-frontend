import { useQuery } from '@tanstack/react-query';

import { fetchHomeHeroSlides } from '@/api/homeHeroSlides';

export const homeHeroSlidesQueryKey = (siteKey: string) => ['homeHeroSlides', siteKey] as const;

export const useHomeHeroSlidesQuery = (siteKey: string) => {
  return useQuery({
    queryKey: homeHeroSlidesQueryKey(siteKey),
    queryFn: () => fetchHomeHeroSlides(siteKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
