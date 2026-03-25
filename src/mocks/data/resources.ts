import type { ResourceDownloadItem, ResourceItem } from '@/types/resource';

const initialResources: ResourceItem[] = [
  {
    id: 1,
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '2026 상반기 과정 일정표',
    description: '상반기 정규과정과 핸즈온 일정, 등록 기간을 한 장으로 정리한 안내 문서입니다.',
    fileName: 'sonoschool-2026-schedule.pdf',
    fileSize: 1_824_512,
    mimeType: 'application/pdf',
    sortOrder: 1,
    createdAt: '2026-03-04T09:00:00Z',
  },
  {
    id: 2,
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '오프라인 실습 준비 체크리스트',
    description: '핸즈온 수업 전 준비물, 복장, 현장 도착 시간을 요약한 체크리스트입니다.',
    fileName: 'offline-hands-on-checklist.pdf',
    fileSize: 942_114,
    mimeType: 'application/pdf',
    sortOrder: 2,
    createdAt: '2026-03-11T04:30:00Z',
  },
  {
    id: 3,
    scope: 'GLOBAL',
    visibility: 'PUBLIC',
    programId: null,
    programTitle: null,
    title: '수강생용 결제 및 영수증 안내',
    description: '결제 완료 후 영수증 확인 경로와 법인 제출용 증빙 발급 방법을 정리했습니다.',
    fileName: 'payment-receipt-guide.pdf',
    fileSize: 724_615,
    mimeType: 'application/pdf',
    sortOrder: 3,
    createdAt: '2026-03-18T06:10:00Z',
  },
];

let resources = initialResources.map((resource) => ({ ...resource }));

export const getMockGlobalResources = (): ResourceItem[] => {
  return [...resources].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
};

export const getMockGlobalResourceDownload = (resourceId: number): ResourceDownloadItem | null => {
  const resource = resources.find((item) => item.id === resourceId);

  if (!resource) {
    return null;
  }

  return {
    documentId: resource.id,
    downloadUrl: `https://example.com/downloads/${resource.fileName}`,
    expiresAt: Date.now() + 10 * 60 * 1000,
    fileName: resource.fileName,
  };
};

export const resetMockResourcesData = (): void => {
  resources = initialResources.map((resource) => ({ ...resource }));
};
