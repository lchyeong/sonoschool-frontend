import { routePaths } from '@/routes/routeRegistry';
import type {
  AdminProgramCategoryTreeItem,
  AdminProgramDetail,
  AdminProgramListItem,
  AdminProgramUpsertPayload,
} from '@/types/adminProgramsLive';
import type { HomeHeroSlidesResponse } from '@/types/homeHeroSlides';

import { mockProgramFallbackThumbnailSrc } from './mockProgramAssets';

type AdminProgramStateItem = AdminProgramDetail;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const toMockPublicSlug = (title: string, id: number): string => {
  const semanticSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return /[a-z]/.test(semanticSlug) ? semanticSlug : `course-${String(id)}`;
};

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

const findCategoryPathSegments = (
  categoryId: number,
  categories: readonly AdminProgramCategoryTreeItem[] = CATEGORY_TREE,
  parentSegments: readonly string[] = [],
): string[] | null => {
  for (const category of categories) {
    const nextSegments = [...parentSegments, category.slug];

    if (category.id === categoryId) {
      return nextSegments;
    }

    const childMatch = findCategoryPathSegments(categoryId, category.children, nextSegments);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
};

const buildAdminProgramPublicPath = (
  program: Pick<AdminProgramStateItem, 'categoryId' | 'publicPath' | 'slug'>,
): string => {
  const explicitPublicPath = program.publicPath?.trim();
  if (explicitPublicPath) {
    return explicitPublicPath;
  }

  const categoryPathSegments = findCategoryPathSegments(program.categoryId) ?? [];

  return routePaths.programCatalog(...categoryPathSegments, program.slug);
};

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
    price: 220000,
    salePrice: 180000,
    maxStudents: null,
    currentStudents: 12,
    full: false,
    published: true,
    featured: true,
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
    price: 350000,
    salePrice: null,
    maxStudents: 20,
    currentStudents: 20,
    full: true,
    published: false,
    featured: false,
    catalogStatus: 'FULL',
    saleStartAt: '2026-04-01T00:00:00.000Z',
    saleEndAt: '2026-05-31T14:59:59.000Z',
    accessDays: null,
    accessPolicy: 'UNLIMITED',
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
  {
    id: 2003,
    categoryId: 2,
    categoryName: '내과과정',
    title: '복부 실전 실습예약 마스터',
    slug: 'abdomen-hybrid-master',
    description:
      '영상 강의와 예약형 실습, 문제풀이 강의, 첨부자료를 함께 구성한 실습예약 프로그램입니다.',
    thumbnailUrl: null,
    programType: 'HYBRID',
    level: 'INTERMEDIATE',
    price: 480000,
    salePrice: 420000,
    maxStudents: null,
    currentStudents: 9,
    full: false,
    published: true,
    featured: true,
    catalogStatus: 'OPEN',
    saleStartAt: '2026-03-01T00:00:00.000Z',
    saleEndAt: '2026-07-31T14:59:59.000Z',
    accessDays: 180,
    accessPolicy: 'ROLLING_DAYS',
    learningStartAt: null,
    learningEndAt: null,
    learningPoints: [],
    learningOutcomes: [
      {
        label: '영상과 실습 연결',
        value: '온라인 학습 내용을 예약형 실습에 바로 연결할 수 있습니다.',
      },
    ],
    recommendedFor: ['실습까지 같이 준비하려는 수강생'],
    checklists: ['실습 예약 정책 확인'],
    summaryItems: [
      { label: '실습 예약 포함', value: '영상 학습 뒤 실습 예약과 피드백까지 이어집니다.' },
    ],
    faqs: [
      {
        question: '실습 예약은 별도인가요?',
        answer: '수강 후 실습 가능 슬롯을 예약할 수 있습니다.',
      },
    ],
    tags: [],
    documents: [],
    deletable: true,
    deleteBlockedReason: null,
  },
  {
    id: 2004,
    categoryId: 2,
    categoryName: '내과과정',
    title: 'AB 문제풀이 집중 트랙',
    slug: 'ab-problem-solving-track',
    description: '문제풀이 강의와 첨부자료만으로 구성된 문제풀이 전용 프로그램입니다.',
    thumbnailUrl: null,
    programType: 'PROBLEM_SOLVING',
    level: 'INTERMEDIATE',
    price: 160000,
    salePrice: 120000,
    maxStudents: null,
    currentStudents: 4,
    full: false,
    published: true,
    featured: false,
    catalogStatus: 'CLOSED',
    saleStartAt: '2026-02-01T00:00:00.000Z',
    saleEndAt: '2026-03-20T14:59:59.000Z',
    accessDays: 90,
    accessPolicy: 'ROLLING_DAYS',
    learningStartAt: null,
    learningEndAt: null,
    learningPoints: [],
    learningOutcomes: [
      {
        label: '문제 패턴 정리',
        value: '반복 출제 유형과 오답 포인트를 빠르게 정리할 수 있습니다.',
      },
    ],
    recommendedFor: ['시험 직전 문제풀이 중심 복습이 필요한 수강생'],
    checklists: ['해설 자료 다운로드 가능 여부 확인'],
    summaryItems: [{ label: '문제풀이 전용', value: '문제풀이 강의와 첨부자료만으로 구성합니다.' }],
    faqs: [
      {
        question: '영상 강의가 포함되나요?',
        answer: '이 과정은 문제풀이 강의와 첨부자료만 제공합니다.',
      },
    ],
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
  publicPath: buildAdminProgramPublicPath(program),
  thumbnailUrl: program.thumbnailUrl,
  thumbnailPreviewUrl:
    program.thumbnailPreviewUrl ?? resolveMockThumbnailPreviewUrl(program.thumbnailUrl),
  programType: program.programType,
  level: program.level,
  price: program.price,
  salePrice: program.salePrice,
  maxStudents: program.maxStudents,
  currentStudents: program.currentStudents,
  full: program.full,
  published: program.published,
  featured: program.featured,
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
  deletable: program.deletable ?? true,
  deleteBlockedReason: program.deleteBlockedReason ?? null,
});

const toDetail = (program: AdminProgramStateItem): AdminProgramDetail =>
  clone({
    ...program,
    publicPath: buildAdminProgramPublicPath(program),
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
    return mockProgramFallbackThumbnailSrc;
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
  featured = false,
): AdminProgramStateItem => {
  const maxStudents = payload.maxStudents;
  const program = {
    id,
    categoryId: payload.categoryId,
    categoryName: findCategoryName(payload.categoryId),
    title: payload.title,
    slug: toMockPublicSlug(payload.title, id),
    description: payload.description,
    thumbnailUrl: payload.thumbnailUrl,
    thumbnailPreviewUrl: resolveMockThumbnailPreviewUrl(payload.thumbnailUrl),
    programType: payload.programType,
    level: payload.level,
    price: payload.price,
    salePrice: payload.salePrice,
    maxStudents,
    currentStudents,
    full: maxStudents !== null ? currentStudents >= maxStudents : false,
    published,
    featured,
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

  return {
    ...program,
    publicPath: buildAdminProgramPublicPath(program),
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
  program.featured = false;
  return toDetail(program);
};

export const featureMockAdminProgramOnHome = (programId: number): AdminProgramDetail | null => {
  const program = state.find((item) => item.id === programId);
  if (!program) {
    return null;
  }
  program.featured = true;
  return toDetail(program);
};

export const unfeatureMockAdminProgramOnHome = (programId: number): AdminProgramDetail | null => {
  const program = state.find((item) => item.id === programId);
  if (!program) {
    return null;
  }
  program.featured = false;
  return toDetail(program);
};

export const getMockHomeHeroSlides = (): HomeHeroSlidesResponse => {
  const items = state
    .filter((program) => program.published && program.featured)
    .slice(0, 5)
    .map((program) => ({
      description: program.description ?? `${program.categoryName} 최신 강의입니다.`,
      detailPath: buildAdminProgramPublicPath(program),
      id: `program-${String(program.id)}`,
      thumbnailAlt: `${program.title} 썸네일`,
      thumbnailSrc:
        program.thumbnailPreviewUrl ??
        resolveMockThumbnailPreviewUrl(program.thumbnailUrl) ??
        mockProgramFallbackThumbnailSrc,
      title: program.title,
      type: 'lecture' as const,
    }));

  return {
    autoPlayDurationMs: 8000,
    items,
  };
};

export const deleteMockAdminProgramLive = (programId: number): boolean => {
  const nextState = state.filter((item) => item.id !== programId);
  if (nextState.length === state.length) {
    return false;
  }
  state = nextState;
  return true;
};
