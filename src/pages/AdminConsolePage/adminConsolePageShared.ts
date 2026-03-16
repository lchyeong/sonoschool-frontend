import type { AdminNoticeCategory, AdminResourceVisibility } from '@/types/adminConsole';

export type AdminConsoleSection =
  | 'dashboard'
  | 'notices'
  | 'programMenus'
  | 'programs'
  | 'qna'
  | 'resources'
  | 'reviews'
  | 'sales';

export interface NoticeFormState {
  category: AdminNoticeCategory;
  isPinned: boolean;
  title: string;
}

export interface ResourceFormState {
  attachmentFile: File | null;
  description: string;
  title: string;
  visibility: AdminResourceVisibility;
}

export interface ReviewFormState {
  summary: string;
  title: string;
}

export const INITIAL_NOTICE_FORM: NoticeFormState = {
  category: '운영',
  isPinned: false,
  title: '',
};

export const INITIAL_RESOURCE_FORM: ResourceFormState = {
  attachmentFile: null,
  description: '',
  title: '',
  visibility: 'public',
};

export const INITIAL_REVIEW_FORM: ReviewFormState = {
  summary: '',
  title: '',
};

export const resourceVisibilityLabel: Record<AdminResourceVisibility, string> = {
  public: '전체 공개',
  'students-only': '수강생 전용',
};

export const programFormatLabel = {
  hybrid: '하이브리드',
  offline: '오프라인',
  online: '온라인',
} as const;

export const programStatusLabel = {
  draft: '초안',
  hidden: '숨김',
  published: '게시중',
} as const;

export const sectionContent = {
  dashboard: {
    description: '미답변 문의, 강의 수, 매출, 잔여 좌석을 먼저 확인하고 각 관리 메뉴로 이동합니다.',
    eyebrow: 'Dashboard',
    title: '운영 대시보드',
  },
  notices: {
    description: '공지사항 등록과 기존 공지 상태를 관리합니다.',
    eyebrow: 'Notice',
    title: '공지사항 관리',
  },
  programMenus: {
    description: '헤더 교육과정 메뉴와 공개 강의 카테고리 구조를 같은 데이터로 관리합니다.',
    eyebrow: 'Program Menus',
    title: '강의메뉴관리',
  },
  programs: {
    description:
      '강의 목록에서 등록, 복제, 편집 대상을 고른 뒤 전용 페이지에서 작업합니다. 작업 후에는 같은 목록 상태로 돌아올 수 있습니다.',
    eyebrow: 'Programs',
    title: '강의 관리',
  },
  qna: {
    description: '문의 글에 대한 답변 상태를 확인하고 관리자 답변을 등록합니다.',
    eyebrow: 'Q&A',
    title: '문의 답변 관리',
  },
  resources: {
    description: '파일 첨부 자료 게시글을 등록하고 공개 범위를 설정합니다.',
    eyebrow: 'Resources',
    title: '자료실 관리',
  },
  reviews: {
    description: '초음파 교육자가 남기는 홍보형 교육후기 글을 등록합니다.',
    eyebrow: 'Reviews',
    title: '교육후기 관리',
  },
  sales: {
    description: '강의별 판매량, 잔여 좌석, 누적 매출과 당월 매출을 확인합니다.',
    eyebrow: 'Sales',
    title: '매출 관리',
  },
} as const satisfies Record<
  AdminConsoleSection,
  {
    description: string;
    eyebrow: string;
    title: string;
  }
>;

export const formatFileSizeLabel = (size: number): string => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${String(Math.max(1, Math.round(size / 1024)))} KB`;
};
