import type { HomeHistoryTimelineResponse } from '@/types/homeHistoryTimeline';

const mainHomeHistoryTimeline: HomeHistoryTimelineResponse = {
  items: [
    {
      year: '2003',
      title: 'SRDMS 시작',
      description:
        'Sono School Registry for Diagnostic Medical Sonography를 시작으로 초음파 교육의 기준과 방향을 정리하는 첫 출발점을 만들었습니다.',
    },
    {
      year: '2004',
      title: '대학병원 의국 교육 시작',
      description:
        '삼성서울병원, 서울아산병원, 서울대학교병원 등 다수 대학병원 의국을 대상으로 초음파 교육을 진행하기 시작했습니다.',
    },
    {
      year: '2010',
      title: '임상 중심 교육 확장',
      description:
        '내과와 소아과 임상 경험을 바탕으로 현장 판단과 진료 흐름을 반영한 실전형 초음파 교육 구성을 확대했습니다.',
    },
    {
      year: '2016',
      title: '국제 자격 기반 커리큘럼 정비',
      description:
        'RDMS, RDCS, RVT 국제 자격 체계를 기준으로 복부, 산부인과, 소아, 유방, 심장, 혈관 영역의 커리큘럼을 정비했습니다.',
    },
    {
      year: '2022',
      title: '전문의 대상 연수 프로그램 운영',
      description:
        '전문의 대상 실무 교육과 파트너십 연수를 통해 현장 적용 중심의 초음파 교육 프로그램을 더 넓게 운영했습니다.',
    },
    {
      year: '2026',
      title: '소노스쿨 국제초음파연수원 운영 고도화',
      description:
        '소노스쿨 국제초음파연수원(SRDMS) 체계를 고도화하며 현장형 교육, 국제 자격 기준, 실무형 훈련을 하나의 흐름으로 연결하고 있습니다.',
    },
  ],
};

const compactHomeHistoryTimeline: HomeHistoryTimelineResponse = {
  items: mainHomeHistoryTimeline.items.slice(0, 4),
};

export const getMockHomeHistoryTimeline = (siteKey: string): HomeHistoryTimelineResponse => {
  if (siteKey.includes('compact')) {
    return compactHomeHistoryTimeline;
  }

  return mainHomeHistoryTimeline;
};
