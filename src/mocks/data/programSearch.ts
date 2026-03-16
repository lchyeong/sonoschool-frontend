import { routePaths } from '@/routes/routeRegistry';
import type { ProgramSearchIndexResponse } from '@/types/programSearch';

import { getMockProgramSearchLectureItems } from './programCatalog';

const communityProgramSearchItems: ProgramSearchIndexResponse['items'] = [
  {
    categoryLabel: '교육후기',
    description:
      '실습 밀도와 피드백 만족도가 높았다는 후기를 중심으로 대표 수강 경험을 정리한 리뷰 콘텐츠입니다.',
    id: 'review-best-2026',
    scope: 'review',
    tags: ['후기', '복부', '실습 만족도'],
    thumbnailAlt: '복부 초음파 과정 후기 썸네일',
    thumbnailSrc: '/example.png',
    title: '복부 초음파 과정 수강 후기 모음',
    to: routePaths.reviews,
  },
  {
    categoryLabel: '교육후기',
    description:
      '응급실 현장에서 실제로 어떤 변화가 있었는지 수료생 경험을 중심으로 정리한 인터뷰형 후기입니다.',
    id: 'review-pocus-story',
    scope: 'review',
    tags: ['응급', '수강후기', '인터뷰'],
    thumbnailAlt: '응급 POCUS 수료생 인터뷰 썸네일',
    thumbnailSrc: '/SRDMS_OG.png',
    title: '응급 POCUS 수료생 인터뷰',
    to: routePaths.reviews,
  },
  {
    categoryLabel: '공지사항',
    description: '복부, 갑상선, 근골격 주요 과정의 모집 일정과 신청 안내를 포함한 공지사항입니다.',
    id: 'notice-schedule-open',
    scope: 'notice',
    tags: ['모집', '일정', '정규과정'],
    thumbnailAlt: '2026 상반기 정규과정 모집 공지 썸네일',
    thumbnailSrc: '/example.png',
    title: '2026 상반기 정규과정 모집 공지',
    to: routePaths.notices,
  },
  {
    categoryLabel: '공지사항',
    description:
      '교육 당일 실습실 입실 시간, 준비물, 복장, 장비 이용 규정을 정리한 안내 공지입니다.',
    id: 'notice-room-guide',
    scope: 'notice',
    tags: ['준비물', '실습실', '안내'],
    thumbnailAlt: '실습실 이용 및 준비물 안내 썸네일',
    thumbnailSrc: '/SRDMS_OG.png',
    title: '실습실 이용 및 준비물 안내',
    to: routePaths.notices,
  },
  {
    categoryLabel: 'Q&A',
    description:
      '복부 초음파 입문자가 자주 묻는 탐촉자 각도와 손목 고정 연습 방법에 대한 질문입니다.',
    id: 'qna-probe-angle',
    scope: 'qna',
    tags: ['프로브', '기초', '질문'],
    thumbnailAlt: '프로브 각도 조절 질문 썸네일',
    thumbnailSrc: '/example.png',
    title: '프로브 각도 조절이 어려울 때 어떻게 연습하나요?',
    to: routePaths.qna,
  },
  {
    categoryLabel: 'Q&A',
    description:
      '응급 POCUS 학습자들이 자주 올리는 window 확보 관련 질문과 답변을 정리한 항목입니다.',
    id: 'qna-fast-window',
    scope: 'qna',
    tags: ['FAST', 'window', '응급'],
    thumbnailAlt: 'FAST window 질문 썸네일',
    thumbnailSrc: '/SRDMS_OG.png',
    title: 'FAST에서 subxiphoid window가 잘 안 잡힙니다',
    to: routePaths.qna,
  },
  {
    categoryLabel: '자료실',
    description:
      '기본 루틴 점검에 활용할 수 있는 복부 초음파 체크리스트 자료를 내려받을 수 있습니다.',
    id: 'resource-checklist',
    scope: 'resource',
    tags: ['체크리스트', '복부', '다운로드'],
    thumbnailAlt: '복부 초음파 체크리스트 자료 썸네일',
    thumbnailSrc: '/example.png',
    title: '복부 초음파 체크리스트 다운로드',
    to: routePaths.resources,
  },
  {
    categoryLabel: '자료실',
    description: '갑상선 결절 평가와 경부 소견 정리에 사용할 수 있는 리포트 템플릿 자료입니다.',
    id: 'resource-report-template',
    scope: 'resource',
    tags: ['리포트', '갑상선', '템플릿'],
    thumbnailAlt: '갑상선 판독 리포트 템플릿 자료 썸네일',
    thumbnailSrc: '/SRDMS_OG.png',
    title: '갑상선 판독 리포트 템플릿',
    to: routePaths.resources,
  },
];

export const getMockProgramSearchIndex = (siteKey: string): ProgramSearchIndexResponse => {
  return {
    items: [...getMockProgramSearchLectureItems(siteKey), ...communityProgramSearchItems],
  };
};
