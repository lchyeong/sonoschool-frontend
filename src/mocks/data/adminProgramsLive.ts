import type {
  AdminProgramCategoryTreeItem,
  AdminProgramDetail,
  AdminProgramListItem,
  AdminProgramUpsertPayload,
} from '@/types/adminProgramsLive';

type AdminProgramStateItem = AdminProgramDetail;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const CATEGORY_TREE: AdminProgramCategoryTreeItem[] = [
  {
    id: 1,
    name: '의사과정',
    slug: 'doctor-course',
    depth: 0,
    sortOrder: 0,
    active: true,
    children: [
      {
        id: 2,
        name: '내과과정',
        slug: 'internal-medicine',
        depth: 1,
        sortOrder: 0,
        active: true,
        children: [],
      },
      {
        id: 3,
        name: '응급/POCUS과정',
        slug: 'pocus',
        depth: 1,
        sortOrder: 1,
        active: true,
        children: [],
      },
    ],
  },
  {
    id: 10,
    name: '일반과정',
    slug: 'general-course',
    depth: 0,
    sortOrder: 1,
    active: true,
    children: [
      {
        id: 11,
        name: '복부과정',
        slug: 'abdomen',
        depth: 1,
        sortOrder: 0,
        active: true,
        children: [],
      },
    ],
  },
];

const INITIAL_PROGRAMS: AdminProgramStateItem[] = [
  {
    id: 2001,
    categoryId: 2,
    categoryName: '내과과정',
    title: '복부초음파 기초',
    slug: 'abdomen-ultrasound-basic',
    description: '복부초음파 기본 루틴과 핵심 포인트를 정리하는 온라인 강의입니다.',
    thumbnailUrl: null,
    programType: 'ONLINE',
    level: 'BEGINNER',
    instructorName: '김도윤',
    instructorBio: '내과 초음파 교육을 담당하는 전문 강사입니다.',
    price: 220000,
    salePrice: 180000,
    maxStudents: null,
    currentStudents: 12,
    full: false,
    published: true,
    catalogStatus: 'OPEN',
    saleStartAt: '2026-03-01T00:00:00.000Z',
    saleEndAt: '2026-12-31T14:59:59.000Z',
    accessDays: 90,
    accessPolicy: 'FIXED_DURATION',
    learningStartAt: '2026-03-10T00:00:00.000Z',
    learningEndAt: '2026-12-31T14:59:59.000Z',
    learningPoints: [],
    learningOutcomes: [
      {
        label: '기본 스캔 순서 정리',
        value: '복부초음파 기본 루틴을 스스로 설명하고 재현할 수 있습니다.',
      },
      {
        label: '정상 해부 구조 이해',
        value: '정상 해부 구조를 기준으로 주요 장기를 구분할 수 있습니다.',
      },
    ],
    recommendedFor: ['복부초음파 입문자', '기본 루틴을 다시 정리하려는 수강생'],
    checklists: ['기본 장비 세팅 확인', '프로브 방향 표기 숙지'],
    summaryItems: [
      {
        label: '기본 스캔 순서 정리',
        value: '실전 루틴 기준으로 복부초음파 흐름을 빠르게 잡습니다.',
      },
      { label: '정상 해부 구조 이해', value: '주요 해부 구조를 영상과 함께 연결해 이해합니다.' },
    ],
    faqs: [{ question: '모바일 수강이 가능한가요?', answer: '모바일과 PC 모두 가능합니다.' }],
    tags: [],
    documents: [],
    deletable: true,
    deleteBlockedReason: null,
  },
  {
    id: 2002,
    categoryId: 3,
    categoryName: '응급/POCUS과정',
    title: 'FAST 집중 실습',
    slug: 'fast-intensive-practice',
    description: '응급 현장에서 바로 활용하는 FAST 실습 과정입니다.',
    thumbnailUrl: null,
    programType: 'OFFLINE',
    level: 'INTERMEDIATE',
    instructorName: '이현수',
    instructorBio: null,
    price: 350000,
    salePrice: null,
    maxStudents: 20,
    currentStudents: 6,
    full: false,
    published: false,
    catalogStatus: 'SCHEDULED',
    saleStartAt: '2026-04-01T00:00:00.000Z',
    saleEndAt: '2026-05-31T14:59:59.000Z',
    accessDays: null,
    accessPolicy: 'COHORT',
    learningStartAt: '2026-06-01T00:00:00.000Z',
    learningEndAt: '2026-06-30T14:59:59.000Z',
    learningPoints: [],
    learningOutcomes: [
      {
        label: 'FAST 프로토콜 실습',
        value: '응급 상황에서 FAST 기본 루틴을 즉시 적용할 수 있습니다.',
      },
      {
        label: '응급 상황 판독 포인트',
        value: '현장에서 놓치기 쉬운 판독 포인트를 빠르게 구분할 수 있습니다.',
      },
    ],
    recommendedFor: ['응급실/중환자실 의료진'],
    checklists: ['현장 실습 일정 확인'],
    summaryItems: [
      { label: '현장 중심 실습', value: 'FAST 프로토콜을 현장 흐름에 맞춰 반복 실습합니다.' },
      { label: '응급 판독 포인트', value: '실제 응급 상황에서 필요한 해석 기준을 함께 익힙니다.' },
    ],
    faqs: [{ question: '실습 준비물이 있나요?', answer: '별도 준비물은 없습니다.' }],
    tags: [],
    documents: [],
    deletable: true,
    deleteBlockedReason: null,
  },
];

let state = clone(INITIAL_PROGRAMS);
let nextProgramId = 3000;

const findCategoryName = (categoryId: number): string => {
  const stack = [...CATEGORY_TREE];
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) {
      continue;
    }
    if (current.id === categoryId) {
      return current.name;
    }
    stack.unshift(...current.children);
  }
  return '미분류';
};

const deriveCatalogStatus = (
  program: Pick<
    AdminProgramStateItem,
    | 'maxStudents'
    | 'currentStudents'
    | 'saleStartAt'
    | 'saleEndAt'
    | 'programType'
    | 'learningStartAt'
  >,
): AdminProgramStateItem['catalogStatus'] => {
  const now = Date.now();
  const learningStartAt = program.learningStartAt ? Date.parse(program.learningStartAt) : null;

  if (
    program.programType === 'OFFLINE' &&
    learningStartAt !== null &&
    Number.isFinite(learningStartAt) &&
    learningStartAt <= now
  ) {
    return 'STARTED';
  }

  if (program.maxStudents !== null && program.currentStudents >= program.maxStudents) {
    return 'FULL';
  }

  const saleStartAt = program.saleStartAt ? Date.parse(program.saleStartAt) : null;
  const saleEndAt = program.saleEndAt ? Date.parse(program.saleEndAt) : null;

  if (saleStartAt !== null && Number.isFinite(saleStartAt) && saleStartAt > now) {
    return 'SCHEDULED';
  }

  if (saleEndAt !== null && Number.isFinite(saleEndAt) && saleEndAt < now) {
    return 'CLOSED';
  }

  return 'OPEN';
};

const toListItem = (program: AdminProgramStateItem): AdminProgramListItem => ({
  id: program.id,
  categoryId: program.categoryId,
  categoryName: program.categoryName,
  title: program.title,
  slug: program.slug,
  thumbnailUrl: program.thumbnailUrl,
  thumbnailPreviewUrl:
    program.thumbnailPreviewUrl ?? resolveMockThumbnailPreviewUrl(program.thumbnailUrl),
  programType: program.programType,
  level: program.level,
  instructorName: program.instructorName,
  price: program.price,
  salePrice: program.salePrice,
  maxStudents: program.maxStudents,
  currentStudents: program.currentStudents,
  full: program.full,
  published: program.published,
  catalogStatus: deriveCatalogStatus({
    learningStartAt: program.learningStartAt,
    currentStudents: program.currentStudents,
    maxStudents: program.maxStudents,
    programType: program.programType,
    saleEndAt: program.saleEndAt,
    saleStartAt: program.saleStartAt,
  }),
  saleStartAt: program.saleStartAt,
  saleEndAt: program.saleEndAt,
});

const toDetail = (program: AdminProgramStateItem): AdminProgramDetail =>
  clone({
    ...program,
    catalogStatus: deriveCatalogStatus({
      learningStartAt: program.learningStartAt,
      currentStudents: program.currentStudents,
      maxStudents: program.maxStudents,
      programType: program.programType,
      saleEndAt: program.saleEndAt,
      saleStartAt: program.saleStartAt,
    }),
    thumbnailPreviewUrl:
      program.thumbnailPreviewUrl ?? resolveMockThumbnailPreviewUrl(program.thumbnailUrl),
  });

const resolveMockThumbnailPreviewUrl = (thumbnailUrl: string | null): string | null => {
  if (!thumbnailUrl) {
    return null;
  }

  if (!thumbnailUrl.startsWith('s3://mock-bucket/assets/programs/thumbnails/')) {
    return thumbnailUrl;
  }

  const objectKey = thumbnailUrl.replace('s3://mock-bucket/assets/programs/thumbnails/', '');
  return `https://cdn.mock/programs/${objectKey}`;
};

const toStateItem = (
  id: number,
  payload: AdminProgramUpsertPayload,
  currentStudents = 0,
  published = false,
): AdminProgramStateItem => {
  const maxStudents = payload.maxStudents;
  return {
    id,
    categoryId: payload.categoryId,
    categoryName: findCategoryName(payload.categoryId),
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    thumbnailPreviewUrl: resolveMockThumbnailPreviewUrl(payload.thumbnailUrl),
    programType: payload.programType,
    level: payload.level,
    instructorName: payload.instructorName,
    instructorBio: payload.instructorBio,
    price: payload.price,
    salePrice: payload.salePrice,
    maxStudents,
    currentStudents,
    full: maxStudents !== null ? currentStudents >= maxStudents : false,
    published,
    catalogStatus: deriveCatalogStatus({
      learningStartAt: payload.learningStartAt,
      currentStudents,
      maxStudents,
      programType: payload.programType,
      saleEndAt: payload.saleEndAt,
      saleStartAt: payload.saleStartAt,
    }),
    saleStartAt: payload.saleStartAt,
    saleEndAt: payload.saleEndAt,
    accessDays: payload.accessDays,
    accessPolicy: payload.accessPolicy,
    learningStartAt: payload.learningStartAt,
    learningEndAt: payload.learningEndAt,
    learningPoints: clone(payload.learningPoints),
    learningOutcomes: clone(payload.learningOutcomes),
    recommendedFor: clone(payload.recommendedFor),
    checklists: clone(payload.checklists),
    summaryItems: clone(payload.summaryItems),
    faqs: clone(payload.faqs),
    tags: [],
    documents: [],
    deletable: true,
    deleteBlockedReason: null,
  };
};

export const resetMockAdminProgramsLiveData = () => {
  state = clone(INITIAL_PROGRAMS);
  nextProgramId = 3000;
};

export const getMockAdminProgramCategories = (): AdminProgramCategoryTreeItem[] =>
  clone(CATEGORY_TREE);

export const getMockAdminProgramsLive = (): AdminProgramListItem[] => state.map(toListItem);

export const getMockAdminProgramDetailLive = (programId: number): AdminProgramDetail | null => {
  const program = state.find((item) => item.id === programId);
  return program ? toDetail(program) : null;
};

export const createMockAdminProgramLive = (
  payload: AdminProgramUpsertPayload,
): AdminProgramDetail => {
  const program = toStateItem(nextProgramId++, payload);
  state.unshift(program);
  return toDetail(program);
};

export const updateMockAdminProgramLive = (
  programId: number,
  payload: AdminProgramUpsertPayload,
): AdminProgramDetail | null => {
  const index = state.findIndex((item) => item.id === programId);
  if (index < 0) {
    return null;
  }

  const current = state[index];
  const nextProgram = {
    ...toStateItem(programId, payload, current.currentStudents, current.published),
    tags: clone(current.tags),
    documents: clone(current.documents),
    deletable: current.deletable ?? true,
    deleteBlockedReason: current.deleteBlockedReason ?? null,
  };
  state[index] = nextProgram;
  return toDetail(nextProgram);
};

export const publishMockAdminProgramLive = (programId: number): AdminProgramDetail | null => {
  const program = state.find((item) => item.id === programId);
  if (!program) {
    return null;
  }
  program.published = true;
  return toDetail(program);
};

export const unpublishMockAdminProgramLive = (programId: number): AdminProgramDetail | null => {
  const program = state.find((item) => item.id === programId);
  if (!program) {
    return null;
  }
  program.published = false;
  return toDetail(program);
};

export const deleteMockAdminProgramLive = (programId: number): boolean => {
  const nextState = state.filter((item) => item.id !== programId);
  if (nextState.length === state.length) {
    return false;
  }
  state = nextState;
  return true;
};
