import type { HomeHeroLectureSlide, HomeHeroSlide } from '@/types/homeHeroSlides';

// 서버가 자동 재생 시간을 내려주지 않을 때 사용할 홈 히어로 기본값입니다.
export const DEFAULT_HOME_HERO_AUTO_PLAY_DURATION_MS = 8000;

// `HomeHeroSlide`는 banner / lecture 두 종류가 섞인 유니언 타입입니다.
// 이 함수는 현재 슬라이드가 lecture 타입인지 좁혀 주는 타입 가드입니다.
export const isHomeHeroLectureSlide = (slide: HomeHeroSlide): slide is HomeHeroLectureSlide => {
  return slide.type === 'lecture';
};

// 강의형 슬라이드는 `thumbnailSrc`를,
// 배너형 슬라이드는 `imageSrc`를 배경 이미지로 사용해야 하므로 공통 헬퍼로 분리합니다.
export const getHomeHeroSlideBackgroundImageSrc = (slide: HomeHeroSlide): string => {
  return slide.type === 'banner' ? slide.imageSrc : (slide.backgroundSrc ?? slide.thumbnailSrc);
};
