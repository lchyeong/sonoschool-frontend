import type {
  AdminConsoleResponse,
  AdminProgramDetailResponse,
  AdminLoginResponse,
  AdminNoticeItem,
  AdminProgramsResponse,
  AdminProgramMenuDetailResponse,
  AdminProgramMenuTreeResponse,
  AdminProgramFormat,
  CreateAdminProgramMenuPayload,
  CreateAdminProgramDraftPayload,
  AdminProgramItem,
  AdminProgramStatus,
  AdminQnaThread,
  AdminResourceItem,
  AdminReviewItem,
  CreateAdminNoticePayload,
  CreateAdminResourcePayload,
  CreateAdminReviewPayload,
  MoveAdminProgramMenuPayload,
  MoveAdminProgramPayload,
  ReorderAdminProgramMenuPayload,
  ReplyAdminQnaPayload,
  UpdateAdminProgramMenuPayload,
  UpsertAdminProgramPayload,
} from '@/types/adminConsole';

import {
  createMockAdminManagedProgram,
  createMockAdminProgramDraft,
  createMockAdminProgramMenu,
  deleteMockAdminManagedProgram,
  deleteMockAdminProgramMenu,
  getMockAdminProgramDetail,
  getMockAdminPrograms,
  getMockAdminProgramMenuDetail,
  getMockAdminProgramMenuTree,
  getMockAdminManagedProgramSummaries,
  getMockAdminManagedPrograms,
  getMockAdminProgramCollectionOptions,
  getMockAdminProgramMenus,
  hideMockAdminManagedProgram,
  moveMockAdminProgram,
  moveMockAdminProgramMenu,
  publishMockAdminManagedProgram,
  reorderMockAdminProgramMenu,
  toggleMockAdminManagedProgramVisibility,
  updateMockAdminProgramMenu,
  updateMockAdminManagedProgram,
} from './programCatalog';

interface MockProgramRecord {
  capacity: number | null;
  format: AdminProgramFormat;
  id: string;
  price: number;
  slug: string;
  soldCount: number;
  status: AdminProgramStatus;
  title: string;
  updatedAt: string;
}

interface MockAdminConsoleState {
  notices: AdminNoticeItem[];
  programs: MockProgramRecord[];
  qnaThreads: AdminQnaThread[];
  resources: AdminResourceItem[];
  reviewPosts: AdminReviewItem[];
}

const ADMIN_IDENTIFIER = 'admin';
const ADMIN_PASSWORD = 'password123';
const ADMIN_DISPLAY_NAME = '소노스쿨 운영 관리자';
const MOCK_PROGRAM_SCOPE = 'default';

let mockIdCounter = 1;
let adminConsoleState: MockAdminConsoleState | null = null;

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  currency: 'KRW',
  maximumFractionDigits: 0,
  style: 'currency',
});

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const createMockId = (prefix: string): string => {
  const nextId = mockIdCounter;
  mockIdCounter += 1;

  return `${prefix}-${String(nextId)}`;
};

const formatCurrencyLabel = (value: number): string => {
  return currencyFormatter.format(value);
};

const getMonthlySoldCount = (soldCount: number): number => {
  if (soldCount <= 0) return 0;
  return Math.max(1, Math.round(soldCount * 0.3));
};

const getRemainingSeats = (program: MockProgramRecord): number | null => {
  if (program.capacity === null) return null;
  return Math.max(program.capacity - program.soldCount, 0);
};

const toProgramItem = (program: MockProgramRecord): AdminProgramItem => {
  const remainingSeats = getRemainingSeats(program);

  return {
    capacity: program.capacity,
    format: program.format,
    id: program.id,
    monthlySoldCount: getMonthlySoldCount(program.soldCount),
    price: program.price,
    priceLabel: formatCurrencyLabel(program.price),
    remainingSeats,
    remainingSeatsLabel:
      remainingSeats === null ? '온라인 상시 판매' : `${String(remainingSeats)}석 남음`,
    slug: program.slug,
    soldCount: program.soldCount,
    status: program.status,
    title: program.title,
    updatedAt: program.updatedAt,
  };
};

const buildInitialState = (): MockAdminConsoleState => {
  return {
    notices: [
      {
        category: '학사',
        id: 'notice-1',
        isPinned: true,
        publishedAt: '2026-03-14',
        status: 'published',
        title: '3월 복부 초음파 오프라인 실습반 준비물 및 입실 시간 안내',
      },
      {
        category: '운영',
        id: 'notice-2',
        isPinned: false,
        publishedAt: '2026-03-11',
        status: 'published',
        title: '온라인 강의 플레이어 점검 일정 공지',
      },
      {
        category: '이벤트',
        id: 'notice-3',
        isPinned: false,
        publishedAt: '2026-03-08',
        status: 'scheduled',
        title: '4월 신규 등록 프로모션 사전 안내',
      },
    ],
    programs: [
      {
        capacity: 24,
        format: 'offline',
        id: 'program-1',
        price: 1290000,
        slug: 'abdomen-basic-offline',
        soldCount: 18,
        status: 'published',
        title: '복부 초음파 Basic 오프라인 집중반',
        updatedAt: '2026-03-14',
      },
      {
        capacity: null,
        format: 'online',
        id: 'program-2',
        price: 490000,
        slug: 'echo-reporting-online',
        soldCount: 86,
        status: 'published',
        title: '심초음파 리포팅 온라인 마스터 과정',
        updatedAt: '2026-03-13',
      },
      {
        capacity: 12,
        format: 'hybrid',
        id: 'program-3',
        price: 890000,
        slug: 'msk-hybrid-advance',
        soldCount: 9,
        status: 'hidden',
        title: '근골격 초음파 Hybrid Advance',
        updatedAt: '2026-03-12',
      },
    ],
    qnaThreads: [
      {
        authorName: '김OO',
        category: '수강 문의',
        id: 'qna-1',
        question: '복부 초음파 Basic 과정은 비전공자도 따라갈 수 있는 난이도인가요?',
        status: 'waiting',
        submittedAt: '2026-03-14 09:20',
      },
      {
        authorName: '박OO',
        category: '결제 / 환불',
        id: 'qna-2',
        question: '법인카드 결제와 계산서 발행도 가능한가요?',
        reply: {
          authorName: '소노스쿨 관리자',
          content:
            '법인카드 결제 가능합니다. 계산서 발행이 필요하시면 사업자등록증을 함께 전달해 주세요.',
          repliedAt: '2026-03-13 15:10',
        },
        status: 'answered',
        submittedAt: '2026-03-13 14:02',
      },
      {
        authorName: '이OO',
        category: '오프라인 일정',
        id: 'qna-3',
        question: '오프라인 실습반은 결석 시 보강이 가능한가요?',
        status: 'waiting',
        submittedAt: '2026-03-12 18:40',
      },
    ],
    resources: [
      {
        attachmentName: 'echo-probe-checklist.pdf',
        attachmentSizeLabel: '1.2 MB',
        description: '실습 전에 프로브 포지션과 기본 루틴을 빠르게 체크할 수 있는 자료입니다.',
        id: 'resource-1',
        publishedAt: '2026-03-10',
        title: '심초음파 기본 프로브 포지션 체크리스트',
        visibility: 'public',
      },
      {
        attachmentName: 'abdomen-hands-on-sheet.xlsx',
        attachmentSizeLabel: '860 KB',
        description: '오프라인 핸즈온 참가자를 위한 실습 기록용 시트입니다.',
        id: 'resource-2',
        publishedAt: '2026-03-09',
        title: '복부 초음파 실습 기록 시트',
        visibility: 'students-only',
      },
    ],
    reviewPosts: [
      {
        educatorName: '소노스쿨 교육팀',
        id: 'review-post-1',
        publishedAt: '2026-03-09',
        status: 'published',
        summary:
          '임상 초음파 교육자는 단순 후기 수집보다 학습 변화와 현장 적용 포인트를 함께 전달해야 합니다. 이번 과정은 초보자도 검사 루틴을 잡기 쉽게 구성했습니다.',
        title: '초음파 교육자가 직접 소개하는 실전 적용형 학습 루틴',
      },
      {
        educatorName: '소노스쿨 교육팀',
        id: 'review-post-2',
        publishedAt: '2026-03-06',
        status: 'draft',
        summary:
          '오프라인 핸즈온과 온라인 복습을 어떻게 연결하면 좋은지 교육자 관점으로 정리한 초안입니다.',
        title: '핸즈온 실습과 온라인 복습을 함께 설계하는 이유',
      },
    ],
  };
};

const getState = (): MockAdminConsoleState => {
  if (adminConsoleState) {
    return adminConsoleState;
  }

  adminConsoleState = buildInitialState();
  return adminConsoleState;
};

const buildAdminConsoleResponse = (): AdminConsoleResponse => {
  const state = getState();
  const basePrograms = state.programs.map(toProgramItem);
  const managedPrograms = getMockAdminManagedPrograms(MOCK_PROGRAM_SCOPE);
  const programs = [...getMockAdminManagedProgramSummaries(MOCK_PROGRAM_SCOPE), ...basePrograms];

  const totalRevenue = programs.reduce(
    (sum, program) => sum + program.price * program.soldCount,
    0,
  );
  const monthlyRevenue = programs.reduce(
    (sum, program) => sum + program.price * program.monthlySoldCount,
    0,
  );
  const totalOrders = programs.reduce((sum, program) => sum + program.soldCount, 0);
  const pendingQnaCount = state.qnaThreads.filter((thread) => thread.status === 'waiting').length;
  const publishedProgramCount = programs.filter((program) => program.status === 'published').length;
  const remainingOfflineSeats = programs.reduce((sum, program) => {
    return sum + (program.remainingSeats ?? 0);
  }, 0);
  const bestSeller =
    [...programs].sort((left, right) => right.soldCount - left.soldCount)[0] ?? programs[0];

  return {
    adminDisplayName: ADMIN_DISPLAY_NAME,
    managedPrograms: cloneData(managedPrograms),
    notices: cloneData(
      [...state.notices].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
    ),
    programMenus: cloneData(getMockAdminProgramMenus(MOCK_PROGRAM_SCOPE)),
    programCollectionOptions: cloneData(getMockAdminProgramCollectionOptions(MOCK_PROGRAM_SCOPE)),
    programs: cloneData(
      [...programs].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    ),
    qnaThreads: cloneData(
      [...state.qnaThreads].sort((left, right) =>
        right.submittedAt.localeCompare(left.submittedAt),
      ),
    ),
    resources: cloneData(
      [...state.resources].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
    ),
    reviewPosts: cloneData(
      [...state.reviewPosts].sort((left, right) =>
        right.publishedAt.localeCompare(left.publishedAt),
      ),
    ),
    salesOverview: {
      bestSellerTitle: bestSeller.title,
      grossRevenueLabel: formatCurrencyLabel(totalRevenue),
      monthlyRevenueLabel: formatCurrencyLabel(monthlyRevenue),
      totalOrdersLabel: `${String(totalOrders)}건`,
    },
    salesRows: cloneData(
      [...programs]
        .sort((left, right) => right.soldCount - left.soldCount)
        .map((program) => ({
          format: program.format,
          id: program.id,
          monthlyRevenueLabel: formatCurrencyLabel(program.price * program.monthlySoldCount),
          monthlySoldCount: program.monthlySoldCount,
          programTitle: program.title,
          remainingSeatsLabel: program.remainingSeatsLabel,
          soldCount: program.soldCount,
          status: program.status,
          totalRevenueLabel: formatCurrencyLabel(program.price * program.soldCount),
        })),
    ),
    summaryCards: [
      {
        description: '현재 공개 중인 강의 수',
        id: 'summary-1',
        label: '운영 중 강의',
        tone: 'brand',
        value: `${String(publishedProgramCount)}개`,
      },
      {
        description: '답변 대기 중인 문의',
        id: 'summary-2',
        label: '미답변 Q&A',
        tone: pendingQnaCount > 0 ? 'danger' : 'neutral',
        value: `${String(pendingQnaCount)}건`,
      },
      {
        description: '누적 매출 합계',
        id: 'summary-3',
        label: '누적 매출',
        tone: 'accent',
        value: formatCurrencyLabel(totalRevenue),
      },
      {
        description: '오프라인 / 하이브리드 잔여 좌석',
        id: 'summary-4',
        label: '잔여 좌석',
        tone: 'neutral',
        value: `${String(remainingOfflineSeats)}석`,
      },
    ],
  };
};

export const getMockAdminConsole = (): AdminConsoleResponse => {
  return buildAdminConsoleResponse();
};

export const getMockAdminProgramMenuTreeResponse = (): AdminProgramMenuTreeResponse => {
  return cloneData(getMockAdminProgramMenuTree(MOCK_PROGRAM_SCOPE));
};

export const getMockAdminProgramMenuDetailResponse = (
  menuId: string,
): AdminProgramMenuDetailResponse | null => {
  const detail = getMockAdminProgramMenuDetail(MOCK_PROGRAM_SCOPE, menuId);

  return detail ? cloneData(detail) : null;
};

export const getMockAdminProgramsResponse = (options?: {
  collectionPath?: string | null;
  format?: AdminProgramFormat | 'all';
  query?: string;
  status?: AdminProgramStatus | 'all';
}): AdminProgramsResponse => {
  return cloneData(getMockAdminPrograms(MOCK_PROGRAM_SCOPE, options));
};

export const getMockAdminProgramDetailResponse = (
  programId: string,
): AdminProgramDetailResponse | null => {
  const detail = getMockAdminProgramDetail(MOCK_PROGRAM_SCOPE, programId);

  return detail ? cloneData(detail) : null;
};

export const attemptMockAdminLogin = (
  identifier: string,
  password: string,
): AdminLoginResponse | null => {
  getState();

  if (identifier !== ADMIN_IDENTIFIER || password !== ADMIN_PASSWORD) {
    return null;
  }

  return {
    accessToken: 'mock-admin-access-token',
    tokenType: 'Bearer',
    expiresAt: new Date('2026-12-31T00:00:00.000Z').toISOString(),
    loginId: identifier,
    adminDisplayName: ADMIN_DISPLAY_NAME,
    role: 'ROLE_ADMIN',
  };
};

export const createMockAdminNotice = (payload: CreateAdminNoticePayload): AdminNoticeItem => {
  const state = getState();
  const nextNotice: AdminNoticeItem = {
    category: payload.category,
    id: createMockId('notice'),
    isPinned: payload.isPinned,
    publishedAt: '2026-03-15',
    status: 'published',
    title: payload.title,
  };

  state.notices.unshift(nextNotice);

  return cloneData(nextNotice);
};

export const replyMockAdminQna = (
  threadId: string,
  payload: ReplyAdminQnaPayload,
): AdminQnaThread | null => {
  const state = getState();
  const thread = state.qnaThreads.find((item) => item.id === threadId);
  if (!thread) return null;

  thread.reply = {
    authorName: '소노스쿨 관리자',
    content: payload.content,
    repliedAt: '2026-03-15 10:30',
  };
  thread.status = 'answered';

  return cloneData(thread);
};

export const createMockAdminResource = (payload: CreateAdminResourcePayload): AdminResourceItem => {
  const state = getState();
  const nextResource: AdminResourceItem = {
    attachmentName: payload.attachmentName,
    attachmentSizeLabel: payload.attachmentSizeLabel,
    description: payload.description,
    id: createMockId('resource'),
    publishedAt: '2026-03-15',
    title: payload.title,
    visibility: payload.visibility,
  };

  state.resources.unshift(nextResource);

  return cloneData(nextResource);
};

export const createMockAdminReview = (payload: CreateAdminReviewPayload): AdminReviewItem => {
  const state = getState();
  const nextReviewPost: AdminReviewItem = {
    educatorName: '소노스쿨 교육팀',
    id: createMockId('review-post'),
    publishedAt: '2026-03-15',
    status: 'published',
    summary: payload.summary,
    title: payload.title,
  };

  state.reviewPosts.unshift(nextReviewPost);

  return cloneData(nextReviewPost);
};

export const createMockAdminProgram = (
  payload: UpsertAdminProgramPayload,
): AdminProgramItem | null => {
  const createdProgram = createMockAdminManagedProgram(MOCK_PROGRAM_SCOPE, payload);

  if (!createdProgram) {
    return null;
  }

  return {
    capacity: createdProgram.capacity,
    format: createdProgram.format,
    id: createdProgram.id,
    monthlySoldCount: createdProgram.monthlySoldCount,
    price: createdProgram.price,
    priceLabel: createdProgram.priceLabel,
    remainingSeats: createdProgram.remainingSeats,
    remainingSeatsLabel:
      createdProgram.remainingSeats === null
        ? '온라인 상시 판매'
        : `${String(createdProgram.remainingSeats)}석 남음`,
    slug: createdProgram.slug,
    soldCount: createdProgram.soldCount,
    status: createdProgram.status,
    title: createdProgram.title,
    updatedAt: createdProgram.updatedAt,
  };
};

export const createMockAdminProgramDraftItem = (
  payload: CreateAdminProgramDraftPayload,
): { id: string } | null => {
  const programId = createMockAdminProgramDraft(MOCK_PROGRAM_SCOPE, payload);

  return programId ? { id: programId } : null;
};

export const updateMockAdminProgram = (
  programId: string,
  payload: UpsertAdminProgramPayload,
): AdminProgramItem | null => {
  const updatedProgram = updateMockAdminManagedProgram(MOCK_PROGRAM_SCOPE, programId, payload);

  if (!updatedProgram) {
    return null;
  }

  return {
    capacity: updatedProgram.capacity,
    format: updatedProgram.format,
    id: updatedProgram.id,
    monthlySoldCount: updatedProgram.monthlySoldCount,
    price: updatedProgram.price,
    priceLabel: updatedProgram.priceLabel,
    remainingSeats: updatedProgram.remainingSeats,
    remainingSeatsLabel:
      updatedProgram.remainingSeats === null
        ? '온라인 상시 판매'
        : `${String(updatedProgram.remainingSeats)}석 남음`,
    slug: updatedProgram.slug,
    soldCount: updatedProgram.soldCount,
    status: updatedProgram.status,
    title: updatedProgram.title,
    updatedAt: updatedProgram.updatedAt,
  };
};

export const toggleMockAdminProgramVisibility = (programId: string): AdminProgramItem | null => {
  const updatedProgram = toggleMockAdminManagedProgramVisibility(MOCK_PROGRAM_SCOPE, programId);

  if (!updatedProgram) {
    return null;
  }

  return {
    capacity: updatedProgram.capacity,
    format: updatedProgram.format,
    id: updatedProgram.id,
    monthlySoldCount: updatedProgram.monthlySoldCount,
    price: updatedProgram.price,
    priceLabel: updatedProgram.priceLabel,
    remainingSeats: updatedProgram.remainingSeats,
    remainingSeatsLabel:
      updatedProgram.remainingSeats === null
        ? '온라인 상시 판매'
        : `${String(updatedProgram.remainingSeats)}석 남음`,
    slug: updatedProgram.slug,
    soldCount: updatedProgram.soldCount,
    status: updatedProgram.status,
    title: updatedProgram.title,
    updatedAt: updatedProgram.updatedAt,
  };
};

export const publishMockAdminProgramItem = (programId: string): AdminProgramItem | null => {
  const updatedProgram = publishMockAdminManagedProgram(MOCK_PROGRAM_SCOPE, programId);

  if (!updatedProgram) {
    return null;
  }

  return {
    capacity: updatedProgram.capacity,
    format: updatedProgram.format,
    id: updatedProgram.id,
    monthlySoldCount: updatedProgram.monthlySoldCount,
    price: updatedProgram.price,
    priceLabel: updatedProgram.priceLabel,
    remainingSeats: updatedProgram.remainingSeats,
    remainingSeatsLabel:
      updatedProgram.remainingSeats === null
        ? '온라인 상시 판매'
        : `${String(updatedProgram.remainingSeats)}석 남음`,
    slug: updatedProgram.slug,
    soldCount: updatedProgram.soldCount,
    status: updatedProgram.status,
    title: updatedProgram.title,
    updatedAt: updatedProgram.updatedAt,
  };
};

export const hideMockAdminProgramItem = (programId: string): AdminProgramItem | null => {
  const updatedProgram = hideMockAdminManagedProgram(MOCK_PROGRAM_SCOPE, programId);

  if (!updatedProgram) {
    return null;
  }

  return {
    capacity: updatedProgram.capacity,
    format: updatedProgram.format,
    id: updatedProgram.id,
    monthlySoldCount: updatedProgram.monthlySoldCount,
    price: updatedProgram.price,
    priceLabel: updatedProgram.priceLabel,
    remainingSeats: updatedProgram.remainingSeats,
    remainingSeatsLabel:
      updatedProgram.remainingSeats === null
        ? '온라인 상시 판매'
        : `${String(updatedProgram.remainingSeats)}석 남음`,
    slug: updatedProgram.slug,
    soldCount: updatedProgram.soldCount,
    status: updatedProgram.status,
    title: updatedProgram.title,
    updatedAt: updatedProgram.updatedAt,
  };
};

export const deleteMockAdminProgram = (programId: string): boolean => {
  return deleteMockAdminManagedProgram(MOCK_PROGRAM_SCOPE, programId);
};

export const createMockAdminProgramMenuItem = (payload: CreateAdminProgramMenuPayload) => {
  return createMockAdminProgramMenu(MOCK_PROGRAM_SCOPE, payload);
};

export const updateMockAdminProgramMenuItem = (
  menuId: string,
  payload: UpdateAdminProgramMenuPayload,
) => {
  return updateMockAdminProgramMenu(MOCK_PROGRAM_SCOPE, menuId, payload);
};

export const deleteMockAdminProgramMenuItem = (menuId: string) => {
  return deleteMockAdminProgramMenu(MOCK_PROGRAM_SCOPE, menuId);
};

export const moveMockAdminProgramMenuItem = (
  menuId: string,
  payload: MoveAdminProgramMenuPayload,
) => {
  return moveMockAdminProgramMenu(MOCK_PROGRAM_SCOPE, menuId, payload);
};

export const reorderMockAdminProgramMenuItem = (
  menuId: string,
  payload: ReorderAdminProgramMenuPayload,
) => {
  return reorderMockAdminProgramMenu(MOCK_PROGRAM_SCOPE, menuId, payload);
};

export const moveMockAdminProgramItem = (programId: string, payload: MoveAdminProgramPayload) => {
  return moveMockAdminProgram(MOCK_PROGRAM_SCOPE, programId, payload);
};

export const resetMockAdminConsoleData = (): void => {
  mockIdCounter = 1;
  adminConsoleState = null;
};
