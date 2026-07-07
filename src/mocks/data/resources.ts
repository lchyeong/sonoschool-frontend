import type { ResourceItem } from '@/types/resource';

const initialResources: ResourceItem[] = [
  {
    id: 1,
    publicSlug: 'resource-1',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '2026 상반기 과정 일정표',
    description: '상반기 정규과정과 핸즈온 일정, 등록 기간을 한 장으로 정리한 안내 문서입니다.',
    createdAt: '2026-03-04T09:00:00Z',
    attachments: [
      {
        documentId: 101,
        publicSlug: 'resource-1-pdf',
        fileName: 'sonoschool-2026-schedule.pdf',
        fileSize: 1_824_512,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
      {
        documentId: 102,
        publicSlug: 'resource-1-hwp',
        fileName: 'sonoschool-2026-schedule.hwp',
        fileSize: 824_512,
        mimeType: 'application/x-hwp',
        sortOrder: 2,
      },
    ],
  },
  {
    id: 2,
    publicSlug: 'resource-2',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '오프라인 실습 준비 체크리스트',
    description: '핸즈온 수업 전 준비물, 복장, 현장 도착 시간을 요약한 체크리스트입니다.',
    createdAt: '2026-03-11T04:30:00Z',
    attachments: [
      {
        documentId: 201,
        publicSlug: 'resource-2-pdf',
        fileName: 'offline-hands-on-checklist.pdf',
        fileSize: 942_114,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 3,
    publicSlug: 'resource-3',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '수강생용 결제 및 영수증 안내',
    description: '결제 완료 후 영수증 확인 경로와 법인 제출용 증빙 발급 방법을 정리했습니다.',
    createdAt: '2026-03-18T06:10:00Z',
    attachments: [
      {
        documentId: 301,
        publicSlug: 'resource-3-pdf',
        fileName: 'payment-receipt-guide.pdf',
        fileSize: 724_615,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 4,
    publicSlug: 'resource-4',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '초음파 장비 세팅 가이드',
    description: '실습 전 장비 기본 설정과 화면 저장 옵션을 확인할 수 있는 안내 자료입니다.',
    createdAt: '2026-03-25T05:00:00Z',
    attachments: [
      {
        documentId: 401,
        publicSlug: 'resource-4-pdf',
        fileName: 'ultrasound-device-setup-guide.pdf',
        fileSize: 1_104_228,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 5,
    publicSlug: 'resource-5',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '복부 스캔 기본 프로토콜',
    description: '간, 담낭, 췌장 관찰 순서와 주요 체크포인트를 정리했습니다.',
    createdAt: '2026-04-01T05:00:00Z',
    attachments: [
      {
        documentId: 501,
        publicSlug: 'resource-5-pdf',
        fileName: 'abdomen-scan-basic-protocol.pdf',
        fileSize: 1_432_900,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 6,
    publicSlug: 'resource-6',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '근골격 초음파 실습 노트',
    description: '어깨, 팔꿈치, 손목 실습에서 자주 확인하는 포인트를 모았습니다.',
    createdAt: '2026-04-08T05:00:00Z',
    attachments: [
      {
        documentId: 601,
        publicSlug: 'resource-6-pdf',
        fileName: 'msk-ultrasound-practice-note.pdf',
        fileSize: 984_120,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 7,
    publicSlug: 'resource-7',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '갑상선 스캔 체크포인트',
    description: '갑상선 결절 관찰 시 필요한 위치 표시와 기록 항목을 정리한 자료입니다.',
    createdAt: '2026-04-15T05:00:00Z',
    attachments: [
      {
        documentId: 701,
        publicSlug: 'resource-7-pdf',
        fileName: 'thyroid-scan-checkpoints.pdf',
        fileSize: 876_340,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 8,
    publicSlug: 'resource-8',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '수료증 발급 안내',
    description: '수료 기준, 발급 신청 경로, 재발급 요청 방법을 한 번에 확인할 수 있습니다.',
    createdAt: '2026-04-22T05:00:00Z',
    attachments: [
      {
        documentId: 801,
        publicSlug: 'resource-8-pdf',
        fileName: 'certificate-issue-guide.pdf',
        fileSize: 532_880,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 9,
    publicSlug: 'resource-9',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '실시간 강의 접속 매뉴얼',
    description: '온라인 강의 입장, 마이크 설정, 출석 확인 절차를 정리했습니다.',
    createdAt: '2026-04-29T05:00:00Z',
    attachments: [
      {
        documentId: 901,
        publicSlug: 'resource-9-pdf',
        fileName: 'live-class-access-manual.pdf',
        fileSize: 692_450,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 10,
    publicSlug: 'resource-10',
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '자료실 이용 및 다운로드 안내',
    description: '자료실 검색, 첨부 파일 다운로드, 수강생 전용 자료 접근 기준을 안내합니다.',
    createdAt: '2026-05-06T05:00:00Z',
    attachments: [
      {
        documentId: 1001,
        publicSlug: 'resource-10-pdf',
        fileName: 'resource-library-download-guide.pdf',
        fileSize: 748_620,
        mimeType: 'application/pdf',
        sortOrder: 1,
      },
    ],
  },
];

let resources = initialResources.map((resource) => ({ ...resource }));

export const getMockGlobalResources = (): ResourceItem[] => {
  return [...resources].sort((left, right) => {
    const leftSortOrder = left.attachments[0]?.sortOrder ?? 0;
    const rightSortOrder = right.attachments[0]?.sortOrder ?? 0;

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
};

export const getMockGlobalResourceById = (resourceId: number): ResourceItem | null => {
  return resources.find((resource) => resource.id === resourceId) ?? null;
};

export const getMockGlobalResourceByPublicSlug = (publicSlug: string): ResourceItem | null => {
  return (
    resources.find(
      (resource) =>
        resource.publicSlug === publicSlug ||
        resource.attachments.some((attachment) => attachment.publicSlug === publicSlug),
    ) ?? null
  );
};

export const resetMockResourcesData = (): void => {
  resources = initialResources.map((resource) => ({ ...resource }));
};
