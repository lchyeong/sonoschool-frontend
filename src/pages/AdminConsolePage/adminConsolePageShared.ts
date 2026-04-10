type AdminNoticeCategory = '운영' | '학사' | '이벤트';
type AdminResourceVisibility = 'public' | 'students-only';

export type AdminConsoleSection =
  | 'notices'
  | 'popups'
  | 'programMenus'
  | 'programs'
  | 'practicum'
  | 'payments'
  | 'qna'
  | 'enrollments'
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
  notices: {
    description: '',
    eyebrow: '',
    title: '공지사항 관리',
  },
  popups: {
    description: '',
    eyebrow: '',
    title: '팝업 관리',
  },
  programMenus: {
    description: '',
    eyebrow: '',
    title: '프로그램 카테고리 관리',
  },
  programs: {
    description: '',
    eyebrow: '',
    title: '프로그램 관리',
  },
  practicum: {
    description: '',
    eyebrow: '',
    title: '일정관리',
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
  enrollments: {
    description: '',
    eyebrow: '',
    title: '회원관리',
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

export const PROGRAM_THUMBNAIL_FILE_ACCEPT = '.jpg,.jpeg,.png,.webp';

const PROGRAM_THUMBNAIL_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PROGRAM_THUMBNAIL_FILE_NAME_PATTERN = /\.(jpe?g|png|webp)$/i;

export const validateProgramThumbnailFile = (file: File): string | null => {
  const normalizedType = file.type.trim().toLowerCase();

  if (normalizedType && PROGRAM_THUMBNAIL_MIME_TYPES.has(normalizedType)) {
    return null;
  }

  if (PROGRAM_THUMBNAIL_FILE_NAME_PATTERN.test(file.name)) {
    return null;
  }

  return '대표 이미지는 JPG, PNG, WEBP 파일만 업로드할 수 있습니다.';
};
