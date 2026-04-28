export interface HomeHeroBannerSlide {
  id: string;
  type: 'banner';
  imageSrc: string;
  imageAlt: string;
}

export interface HomeHeroLectureSlide {
  id: string;
  type: 'lecture';
  title: string;
  description: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  backgroundSrc?: string | undefined;
  tags?: string[] | undefined;
}

export type HomeHeroSlide = HomeHeroBannerSlide | HomeHeroLectureSlide;

export interface HomeHeroSlidesResponse {
  items: HomeHeroSlide[];
  autoPlayDurationMs: number;
}
