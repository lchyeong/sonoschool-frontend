import type { NoticeItem } from '@/types/notice';

const initialNotices: NoticeItem[] = [
  {
    id: 2,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    title: '수강 신청 및 등록 절차 안내',
    content:
      '장바구니에서 결제를 완료한 뒤 바로 내 강의로 이동할 수 있습니다.\n결제 후에는 마이페이지에서 영수증과 수강 내역을 확인해 주세요.',
    pinned: false,
    published: true,
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
    published: true,
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
    published: false,
    createdAt: '2026-03-18T03:00:00Z',
    updatedAt: '2026-03-18T03:00:00Z',
  },
  {
    id: 5,
    scope: 'GLOBAL',
    programId: null,
    programTitle: null,
    title: '홈페이지 점검 시간 안내',
    content:
      '주말 새벽 2시부터 3시까지 홈페이지 점검이 예정되어 있습니다.\n점검 시간에는 로그인과 결제 기능이 일시적으로 지연될 수 있습니다.',
    pinned: false,
    published: true,
    createdAt: '2026-03-15T06:00:00Z',
    updatedAt: '2026-03-15T06:00:00Z',
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
  return sortNotices(notices.filter((notice) => notice.scope === 'GLOBAL'));
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
