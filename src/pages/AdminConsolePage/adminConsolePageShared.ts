import type { AdminNoticeCategory, AdminResourceVisibility } from '@/types/adminConsole';

export type AdminConsoleSection =
  | 'dashboard'
  | 'notices'
  | 'programMenus'
  | 'programs'
  | 'payments'
  | 'qna'
  | 'resources'
  | 'reviews';

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
    description: '',
    eyebrow: '',
    title: '운영 대시보드',
  },
  notices: {
    description: '',
    eyebrow: '',
    title: '공지사항 관리',
  },
  programMenus: {
    description: '',
    eyebrow: '',
    title: '강의 카테고리 관리',
  },
  programs: {
    description: '',
    eyebrow: '',
    title: '강의 관리',
  },
  payments: {
    description: '',
    eyebrow: '',
    title: '결제 관리',
  },
  qna: {
    description: '',
    eyebrow: '',
    title: '문의 답변 관리',
  },
  resources: {
    description: '',
    eyebrow: '',
    title: '자료실 관리',
  },
  reviews: {
    description: '',
    eyebrow: '',
    title: '교육후기 관리',
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
