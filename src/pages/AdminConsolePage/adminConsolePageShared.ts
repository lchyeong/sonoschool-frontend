type AdminResourceVisibility = 'public' | 'students-only';

export type AdminConsoleSection =
  | 'notices'
  | 'popups'
  | 'programMenus'
  | 'problemAreas'
  | 'programs'
  | 'practicum'
  | 'programReservations'
  | 'payments'
  | 'qna'
  | 'enrollments'
  | 'resources'
  | 'reviews';

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
  hybrid: '실습예약 프로그램',
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
  problemAreas: {
    description: '',
    eyebrow: '',
    title: '문제 영역 관리',
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
  programReservations: {
    description: '',
    eyebrow: '',
    title: '예약문의 관리',
  },
  payments: {
    description: '',
    eyebrow: '',
    title: '결제 관리',
  },
  qna: {
    description: '',
    eyebrow: '',
    title: 'Q&A 관리',
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

const VIEWPORT_DRAG_SCROLL_EDGE = 96;
const VIEWPORT_DRAG_SCROLL_MAX_DELTA = 52;

export const createViewportDragAutoScroller = () => {
  let animationFrameId: number | null = null;
  let scrollDelta = 0;

  const stop = () => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    scrollDelta = 0;
  };

  const scroll = () => {
    if (scrollDelta === 0) {
      animationFrameId = null;
      return;
    }

    window.scrollBy(0, scrollDelta);
    animationFrameId = window.requestAnimationFrame(scroll);
  };

  const update = (clientY: number) => {
    const viewportHeight = window.innerHeight;

    if (clientY < VIEWPORT_DRAG_SCROLL_EDGE) {
      scrollDelta = -Math.ceil(
        ((VIEWPORT_DRAG_SCROLL_EDGE - clientY) / VIEWPORT_DRAG_SCROLL_EDGE) *
          VIEWPORT_DRAG_SCROLL_MAX_DELTA,
      );
    } else if (clientY > viewportHeight - VIEWPORT_DRAG_SCROLL_EDGE) {
      scrollDelta = Math.ceil(
        ((clientY - (viewportHeight - VIEWPORT_DRAG_SCROLL_EDGE)) / VIEWPORT_DRAG_SCROLL_EDGE) *
          VIEWPORT_DRAG_SCROLL_MAX_DELTA,
      );
    } else {
      stop();
      return;
    }

    if (animationFrameId === null) {
      animationFrameId = window.requestAnimationFrame(scroll);
    }
  };

  return { stop, update };
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
