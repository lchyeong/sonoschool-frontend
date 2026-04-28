import homeHeroCourseBackdropSrc from '@/assets/sample/home_hero_course_backdrop.png';
import homeHeroCourseCardSrc from '@/assets/sample/home_hero_course_card.png';
import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';

const mainHomeHeroSlides: HomeHeroSlidesResponse = {
  autoPlayDurationMs: 8000,
  items: [
    {
      id: 'lecture-clinical-ultrasound-core',
      type: 'lecture',
      title: '상복부 초음파 검사 전 준비와 기본 스캔 순서',
      description:
        '상복부 초음파 검사 시작 전 확인해야 할 환자 준비, 장비 세팅, Probe 선택, 검사 자세를 정리합니다. Liver, GB, Pancreas, Spleen, Kidney 순서로 이어지는 기본 검사 동선을 학습합니다.',
      thumbnailSrc: homeHeroCourseCardSrc,
      thumbnailAlt: '상복부 초음파 검사 기본 스캔 순서 강의 이미지',
      backgroundSrc: homeHeroCourseBackdropSrc,
      tags: ['상복부', '기본 스캔', '핸즈온'],
    },
  ],
};

export const getMockHomeHeroSlides = (): HomeHeroSlidesResponse => {
  return mainHomeHeroSlides;
};
