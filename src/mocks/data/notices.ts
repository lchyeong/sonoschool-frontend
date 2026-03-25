import type { NoticeItem } from '@/types/notice';

const initialNotices: NoticeItem[] = [
  {
    id: 1,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    title: '2026 상반기 교육 일정 안내',
    content:
      '2026년 상반기 정규과정과 핸즈온 일정이 확정되었습니다.\n세부 일정과 신청 가능 시점은 각 과정 상세페이지와 함께 순차 안내드립니다.',
    pinned: true,
    popup: true,
    published: true,
    visibleStartAt: '2026-03-01T00:00:00Z',
    visibleEndAt: null,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 2,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    title: '수강 신청 및 등록 절차 안내',
    content:
      '장바구니에서 결제를 완료한 뒤 바로 내 강의로 이동할 수 있습니다.\n결제 후에는 마이페이지에서 영수증과 수강 내역을 확인해 주세요.',
    pinned: false,
    popup: false,
    published: true,
    visibleStartAt: '2026-03-07T00:00:00Z',
    visibleEndAt: null,
    createdAt: '2026-03-07T05:00:00Z',
    updatedAt: '2026-03-07T05:00:00Z',
  },
  {
    id: 3,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    title: '수강생 전용 자료실 이용 안내',
    content:
      '강의별 복습 자료와 실습 참고 문서는 수강 상태에 따라 자료실에서 내려받을 수 있습니다.\n자료 업데이트가 있을 때마다 공지사항에서도 함께 안내합니다.',
    pinned: false,
    popup: false,
    published: true,
    visibleStartAt: '2026-03-12T00:00:00Z',
    visibleEndAt: null,
    createdAt: '2026-03-12T08:30:00Z',
    updatedAt: '2026-03-12T08:30:00Z',
  },
  {
    id: 4,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    title: '관리자 내부 초안 공지',
    content: '이 공지는 비공개 상태라 사용자 목록에는 노출되지 않습니다.',
    pinned: false,
    popup: false,
    published: false,
    visibleStartAt: null,
    visibleEndAt: null,
    createdAt: '2026-03-18T03:00:00Z',
    updatedAt: '2026-03-18T03:00:00Z',
  },
];

let notices = initialNotices.map((notice) => ({ ...notice }));

const sortNotices = (items: NoticeItem[]): NoticeItem[] => {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
};

export const getMockPublishedGlobalNotices = (): NoticeItem[] => {
  return sortNotices(notices.filter((notice) => notice.scope === 'GLOBAL' && notice.published));
};

export const getMockAdminNotices = (): NoticeItem[] => {
  return sortNotices(notices);
};

export const getMockNoticeById = (noticeId: number): NoticeItem | null => {
  return notices.find((notice) => notice.id === noticeId) ?? null;
};

export const createMockNotice = (
  payload: Omit<NoticeItem, 'id' | 'createdAt' | 'updatedAt'>,
): NoticeItem => {
  const nextId = Math.max(...notices.map((notice) => notice.id), 0) + 1;
  const now = new Date().toISOString();
  const nextNotice: NoticeItem = {
    ...payload,
    createdAt: now,
    id: nextId,
    updatedAt: now,
  };

  notices = sortNotices([nextNotice, ...notices]);
  return nextNotice;
};

export const updateMockNotice = (
  noticeId: number,
  payload: Partial<Omit<NoticeItem, 'id' | 'createdAt'>>,
): NoticeItem | null => {
  const currentNotice = getMockNoticeById(noticeId);

  if (!currentNotice) {
    return null;
  }

  const nextNotice: NoticeItem = {
    ...currentNotice,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  notices = sortNotices(notices.map((notice) => (notice.id === noticeId ? nextNotice : notice)));
  return nextNotice;
};

export const deleteMockNotice = (noticeId: number): boolean => {
  const nextItems = notices.filter((notice) => notice.id !== noticeId);

  if (nextItems.length === notices.length) {
    return false;
  }

  notices = nextItems;
  return true;
};
