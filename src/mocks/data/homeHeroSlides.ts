import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';

const mainHomeHeroSlides: HomeHeroSlidesResponse = {
  autoPlayDurationMs: 8000,
  items: [
    {
      id: 'lecture-clinical-ultrasound-core',
      type: 'lecture',
      title: '임상 초음파 코어 루틴과 국제 자격 준비 집중 과정',
      description:
        '복부, 응급, 근골격 핵심 루틴을 실습 중심으로 반복하고 국제 자격 대비에 필요한 판독 흐름까지 함께 정리합니다.',
      thumbnailSrc: '/example.png',
      thumbnailAlt: '임상 초음파 코어 루틴과 국제 자격 준비 집중 과정 소개 이미지',
      tags: ['국제자격', '코어루틴', '핸즈온'],
    },
    {
      id: 'lecture-emergency-pocus',
      type: 'lecture',
      title: '응급실 POCUS FAST 집중 마스터 클래스',
      description:
        'FAST, 폐, 심장 접근을 실제 응급실 흐름에 맞춰 반복 실습하고 즉시 적용 가능한 스캔 포인트를 정리합니다.',
      thumbnailSrc: '/SRDMS_OG.png',
      thumbnailAlt: '응급실 POCUS FAST 강의 썸네일 예시',
      tags: ['응급', 'POCUS', '핸즈온'],
    },
    {
      id: 'lecture-abdomen-core',
      type: 'lecture',
      title: '복부 초음파 코어 루틴과 판독 포인트',
      description:
        '복부 기본 스캔 루틴과 주요 장기 확인 순서를 단계적으로 익히고 실제 케이스로 해석 흐름을 연결합니다.',
      thumbnailSrc: '/example.png',
      thumbnailAlt: '복부 초음파 강의 썸네일 예시',
      tags: ['복부', '기초', '실습'],
    },
  ],
};

const compactHomeHeroSlides: HomeHeroSlidesResponse = {
  autoPlayDurationMs: 8000,
  items: mainHomeHeroSlides.items.slice(0, 2),
};

export const getMockHomeHeroSlides = (siteKey: string): HomeHeroSlidesResponse => {
  if (siteKey.includes('compact')) {
    return compactHomeHeroSlides;
  }

  return mainHomeHeroSlides;
};
