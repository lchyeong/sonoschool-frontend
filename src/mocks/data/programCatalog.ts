import homeLecture1Src from '@/assets/sample/home_lecture_1.jpg';
import homeLecture2Src from '@/assets/sample/home_lecture_2.png';
import homeLecture3Src from '@/assets/sample/home_lecture_3.jpg';
import homeLecture4Src from '@/assets/sample/home_lecture_4.jpg';
import homeLecture5Src from '@/assets/sample/home_lecture_5.jpg';
import { routePaths } from '@/routes/routeRegistry';
import type {
  AdminProgramAccessPolicy,
  AdminProgramCollectionOption,
  AdminProgramDetailResponse,
  AdminProgramDetailItem,
  AdminProgramFormat,
  AdminProgramMenuDetailResponse,
  AdminProgramMenuItem,
  AdminProgramMenuLinkedProgram,
  AdminProgramMenuParentOption,
  CreateAdminProgramMenuPayload,
  AdminProgramItem,
  AdminProgramMenuTreeItem,
  AdminProgramMenuTreeResponse,
  AdminProgramMenuStatus,
  AdminProgramListItem,
  AdminProgramsResponse,
  AdminProgramStatus,
  CreateAdminProgramDraftPayload,
  MoveAdminProgramMenuPayload,
  MoveAdminProgramPayload,
  ReorderAdminProgramMenuPayload,
  UpdateAdminProgramMenuPayload,
  UpsertAdminProgramPayload,
} from '@/types/adminProgramCatalogMock';
import type {
  ProgramBreadcrumbItem,
  ProgramCollectionCard,
  ProgramCurriculumLesson,
  ProgramCollectionPageResponse,
  ProgramCurriculumSection,
  ProgramCurriculumTrack,
  ProgramDetailPageResponse,
  ProgramFaqItem,
  ProgramInfoItem,
  ProgramInstructorProfile,
  ProgramLectureCard,
  ProgramPageResponse,
  ProgramReviewItem,
  ProgramsOverviewResponse,
  ProgramStat,
} from '@/types/programCatalog';
import type { ProgramSearchIndexResponse } from '@/types/programSearch';
import type { SiteNavigationItem } from '@/types/siteNavigation';
import {
  deriveCurriculumLessonDurationLabel,
  deriveCurriculumSectionDurationLabel,
  deriveProgramDisplayText,
} from '@/utils/programMetadata';

type ProgramVisibility = 'hidden' | 'public';

interface ProgramCatalogBaseSeed {
  id: string;
  label: string;
  slug: string;
  description: string;
  coverImageAlt: string;
  coverImageSrc: string;
  tags: string[];
  visibility?: ProgramVisibility | undefined;
}

interface ProgramCatalogCollectionSeed extends ProgramCatalogBaseSeed {
  kind: 'collection';
  isSingleLectureHub?: boolean | undefined;
  curatorNote: string;
  kicker: string;
  children: ProgramCatalogNodeSeed[];
}

interface ProgramCatalogLectureSeed extends ProgramCatalogBaseSeed {
  kind: 'lecture';
  curriculumTrack?: ProgramCurriculumTrack | undefined;
  discountRateLabel?: string | undefined;
  discountedPriceLabel?: string | undefined;
  difficultyLabel: string;
  durationLabel: string;
  faqItems?: ProgramFaqItem[] | undefined;
  featured?: boolean | undefined;
  formatLabel: string;
  hashtagLabels?: string[] | undefined;
  learningPoints?: string[] | undefined;
  monthlyInstallmentLabel?: string | undefined;
  originalPriceLabel?: string | undefined;
  priceLabel?: string | undefined;
  preparationChecklist?: string[] | undefined;
  operationPeriodLabel?: string | undefined;
  remainingSeatsCount?: number | undefined;
  remainingSeatsLabel?: string | undefined;
  registrationPeriodLabel?: string | undefined;
  recommendedFor?: string[] | undefined;
  scheduleLabel?: string | undefined;
  stats?: ProgramInfoItem[] | undefined;
  tuitionLabel: string;
  wrapInLeafHub?: boolean | undefined;
}

type ProgramCatalogNodeSeed = ProgramCatalogCollectionSeed | ProgramCatalogLectureSeed;

interface ProgramCatalogAncestor {
  isSingleLectureHub?: boolean | undefined;
  label: string;
  to: string;
}

interface ProgramCatalogBaseNode {
  id: string;
  label: string;
  to: string;
  description: string;
  coverImageAlt: string;
  coverImageSrc: string;
  tags: string[];
  visibility: ProgramVisibility;
  ancestors: ProgramCatalogAncestor[];
}

interface ProgramCatalogCollectionNode extends ProgramCatalogBaseNode {
  kind: 'collection';
  curatorNote: string;
  kicker: string;
  isSingleLectureHub?: boolean | undefined;
  children: ProgramCatalogNode[];
}

interface ProgramCatalogLectureNode extends ProgramCatalogBaseNode {
  curriculumTrack: ProgramCurriculumTrack;
  discountRateLabel: string;
  discountedPriceLabel: string;
  kind: 'lecture';
  difficultyLabel: string;
  durationLabel: string;
  faqItems: ProgramFaqItem[];
  featured: boolean;
  formatLabel: string;
  hashtagLabels: string[];
  learningPoints: string[];
  monthlyInstallmentLabel: string;
  originalPriceLabel: string;
  operationPeriodLabel?: string | undefined;
  priceLabel: string;
  preparationChecklist: string[];
  remainingSeatsCount?: number | undefined;
  remainingSeatsLabel?: string | undefined;
  registrationPeriodLabel: string;
  recommendedFor: string[];
  scheduleLabel: string;
  stats: ProgramInfoItem[];
  tuitionLabel: string;
}

type ProgramCatalogNode = ProgramCatalogCollectionNode | ProgramCatalogLectureNode;

const PROGRAM_DETAIL_SLUG = 'detail';
const PROGRAM_MENU_MAX_DEPTH = 3;
const PROGRAM_MENU_TOP_LEVEL_LIMIT = 6;
const PROGRAM_OVERVIEW_FEATURED_LECTURE_LIMIT = 8;
const PROGRAM_OVERVIEW_FEATURED_LECTURE_IDS = [
  'doctor-course-internal-medicine-abdomen-practice',
  'doctor-course-cardiology',
  'general-course-abdomen-basic-2026-mar-apr',
  'general-course-thyroid-basic',
  'general-course-fast-basic',
  'online-course-abdominal-physics',
  'online-course-efast-core-video',
  'online-course-female-pelvis-theory',
] as const;

interface MockEditableProgramCatalogRecord {
  accessPolicy: AdminProgramAccessPolicy;
  capacity: number | null;
  id: string;
  learningEndDate: string | null;
  learningStartDate: string | null;
  originalPrice: number;
  price: number;
  registrationEndDate: string | null;
  registrationStartDate: string | null;
  soldCount: number;
  status: AdminProgramStatus;
  updatedAt: string;
}

interface MockManagedProgramCatalogRecord extends MockEditableProgramCatalogRecord {
  curriculumTrack: ProgramCurriculumTrack;
  description: string;
  difficultyLabel: string;
  durationLabel: string;
  faqItems: ProgramFaqItem[];
  format: AdminProgramFormat;
  formatLabel: string;
  hashtagLabels: string[];
  heroImageAlt: string;
  heroImageSrc: string;
  learningPoints: string[];
  operationPeriodLabel?: string | undefined;
  parentCollectionPath: string;
  preparationChecklist: string[];
  recommendedFor: string[];
  registrationPeriodLabel: string;
  scheduleLabel: string;
  slug: string;
  stats: ProgramInfoItem[];
  tags: string[];
  title: string;
  tuitionLabel: string;
}

interface MockSiteLinkedProgramCatalogRecord extends MockEditableProgramCatalogRecord {
  format: AdminProgramFormat;
}

// 이 파일은 "강의 카탈로그의 단일 원본(single source of truth)" 역할을 합니다.
// 헤더 메뉴, 검색 인덱스, 목록 페이지, 상세 페이지가 각각 따로 데이터를 갖지 않고
// 모두 여기서 파생되도록 만들어 두면 구조가 서로 어긋날 가능성을 크게 줄일 수 있습니다.
const programInstructorProfile: ProgramInstructorProfile = {
  name: '장은희',
  headline: '국제 자격과 임상 경험을 바탕으로 초음파 루틴을 구조화하는 소노스쿨 대표 강사',
  introduction:
    '소노스쿨은 장은희 강사 한 명의 수업 철학과 피드백 기준을 중심으로 운영되는 초음파 교육 플랫폼입니다. 모든 과정은 현장에서 바로 적용할 수 있는 스캔 순서, 판독 포인트, 보고 흐름을 한 번에 익히도록 설계되어 있습니다.',
  profileImageAlt: '소노스쿨 장은희 강사 프로필 이미지',
  profileImageSrc: '/SRDMS_OG.png',
  careerHighlights: [
    '복부, 경부, 심장, 근골격 초음파 루틴 교육 및 국제 자격 대비 과정 운영',
    '핸즈온 피드백과 증례 기반 복습 구조를 결합한 소노스쿨 커리큘럼 총괄',
    '초음파 입문자부터 임상 적용 단계까지 한 명의 기준으로 학습 난이도를 연결',
  ],
};

let managedProgramIdCounter = 1;
let programMenuIdCounter = 1;

const managedProgramsBySite = new Map<string, MockManagedProgramCatalogRecord[]>();
const siteLinkedProgramsBySite = new Map<string, MockSiteLinkedProgramCatalogRecord[]>();
const programCatalogSeedsBySite = new Map<string, ProgramCatalogNodeSeed[]>();
const programCatalogBaseTreeCacheBySite = new Map<string, ProgramCatalogNode[]>();

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const invalidateProgramCatalogBaseTreeCache = (siteKey?: string): void => {
  if (siteKey) {
    programCatalogBaseTreeCacheBySite.delete(siteKey);
    return;
  }

  programCatalogBaseTreeCacheBySite.clear();
};

const createManagedProgramId = (): string => {
  const nextId = managedProgramIdCounter;
  managedProgramIdCounter += 1;

  return `managed-program-${String(nextId)}`;
};

const createProgramMenuId = (): string => {
  const nextId = programMenuIdCounter;
  programMenuIdCounter += 1;

  return `program-menu-${String(nextId)}`;
};

const toLeafHubCollectionSeed = (
  lecture: ProgramCatalogLectureSeed,
): ProgramCatalogCollectionSeed => {
  const detailLectureSeed: ProgramCatalogLectureSeed = {
    ...lecture,
    slug: PROGRAM_DETAIL_SLUG,
  };

  return {
    children: [detailLectureSeed],
    coverImageAlt: lecture.coverImageAlt,
    coverImageSrc: lecture.coverImageSrc,
    curatorNote: `${lecture.label} 교육과정 허브에서 강의 목록을 먼저 확인한 뒤 상세 정보로 이어집니다.`,
    description: lecture.description,
    id: `${lecture.id}-hub`,
    isSingleLectureHub: true,
    kicker: 'Program Hub',
    kind: 'collection',
    label: lecture.label,
    slug: lecture.slug,
    tags: lecture.tags,
    visibility: lecture.visibility,
  };
};

const normalizeProgramCatalogSeedTree = (
  seeds: ProgramCatalogNodeSeed[],
): ProgramCatalogNodeSeed[] => {
  return seeds.map((seed) => {
    if (seed.kind === 'lecture') {
      if (seed.wrapInLeafHub === false) {
        return seed;
      }

      return toLeafHubCollectionSeed(seed);
    }

    return {
      ...seed,
      children: normalizeProgramCatalogSeedTree(seed.children),
    };
  });
};

const getManagedPrograms = (siteKey: string): MockManagedProgramCatalogRecord[] => {
  const existing = managedProgramsBySite.get(siteKey);
  if (existing) {
    return existing;
  }

  const nextPrograms = buildInitialManagedPrograms();
  managedProgramsBySite.set(siteKey, nextPrograms);
  return nextPrograms;
};

const getProgramCatalogSeeds = (siteKey: string): ProgramCatalogNodeSeed[] => {
  const existing = programCatalogSeedsBySite.get(siteKey);
  if (existing) {
    return existing;
  }

  const nextSeeds = normalizeProgramCatalogSeedTree(cloneData(programCatalogSeeds));
  programCatalogSeedsBySite.set(siteKey, nextSeeds);
  return nextSeeds;
};

const createDefaultFaqItems = (formatLabel: string, durationLabel: string): ProgramFaqItem[] => {
  return [
    {
      answer: formatLabel.includes('온라인')
        ? '강의 시작 전 수강 안내 메일과 함께 시청 경로를 안내합니다. 온라인 과정은 반복 재생과 노트 정리가 가능한 흐름으로 제공됩니다.'
        : '강의 안내 메일에서 시간표와 준비물을 미리 전달합니다. 오프라인 과정은 첫 세션에서 스캔 자세와 학습 목표를 다시 정리합니다.',
      id: `${formatLabel}-attendance`,
      question: '수업 전 준비해야 할 것이 있나요?',
    },
    {
      answer: `${durationLabel} 동안 핵심 루틴을 반복하도록 설계되어 있으며, 수강 후에는 복습 포인트와 체크리스트를 다시 확인할 수 있습니다.`,
      id: `${formatLabel}-review`,
      question: '복습은 어떤 방식으로 진행되나요?',
    },
  ];
};

const createDefaultLearningPoints = (label: string, tags: string[]): string[] => {
  const [firstTag = '임상 루틴', secondTag = '핸즈온', thirdTag = '판독 포인트'] = tags;

  return [
    `${label}에서 바로 적용할 수 있는 ${firstTag} 중심 스캔 순서를 익힙니다.`,
    `${secondTag} 관점에서 프로브 각도, 화면 확보, 체크 포인트를 반복 정리합니다.`,
    `${thirdTag}와 연결되는 보고 흐름을 증례와 함께 점검합니다.`,
  ];
};

const createDefaultPreparationChecklist = (formatLabel: string): string[] => {
  return formatLabel.includes('온라인')
    ? [
        '집중해서 시청할 수 있는 환경과 필기 도구를 미리 준비합니다.',
        '반복 시청이 필요한 장면은 개인 노트에 루틴 순서를 함께 정리합니다.',
        '강의 후 바로 복습할 수 있도록 태그별 질문을 메모해 둡니다.',
      ]
    : [
        '편한 복장과 개인 필기 도구를 준비합니다.',
        '실습 전후로 확인할 체크리스트를 출력하거나 메모해 옵니다.',
        '직전에 궁금했던 임상 질문을 2~3개 정도 정리해 오면 피드백에 도움이 됩니다.',
      ];
};

const formatMockDateLabel = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${String(year)}.${month}.${day}`;
};

const addUtcDays = (date: Date, days: number): Date => {
  const clonedDate = new Date(date.getTime());
  clonedDate.setUTCDate(clonedDate.getUTCDate() + days);

  return clonedDate;
};

interface ManagedProgramDerivedText {
  durationLabel: string;
  effectiveLearningEndDate: string | null;
  effectiveLearningStartDate: string | null;
  formatLabel: string;
  operationPeriodLabel: string | null;
  registrationPeriodLabel: string;
  scheduleLabel: string;
  tuitionLabel: string;
}

const deriveManagedProgramText = (
  format: AdminProgramFormat,
  accessPolicy: AdminProgramAccessPolicy,
  registrationStartDate: string | null,
  registrationEndDate: string | null,
  learningStartDate: string | null,
  learningEndDate: string | null,
  curriculumTrack?: ProgramCurriculumTrack | null,
): ManagedProgramDerivedText => {
  return deriveProgramDisplayText({
    accessPolicy,
    ...(curriculumTrack === undefined ? {} : { curriculumTrack }),
    format,
    learningEndDate,
    learningStartDate,
    registrationEndDate,
    registrationStartDate,
  });
};

const createMockOfflineScheduleLabel = (id: string, durationLabel: string): string => {
  // 백엔드가 아직 없으므로 강의 id를 기준으로 일정 시작일을 고정해 두면
  // 새로고침해도 같은 강의가 항상 같은 모의 일정을 보여줄 수 있습니다.
  const dayOffset = Array.from(id).reduce((accumulator, character) => {
    return accumulator + character.charCodeAt(0);
  }, 0);
  const startDate = addUtcDays(new Date(Date.UTC(2026, 3, 6)), dayOffset % 120);
  const weekMatch = durationLabel.match(/(\d+)주/);
  const dayMatch = durationLabel.match(/(\d+)일/);

  if (weekMatch) {
    const weekCount = Number(weekMatch[1]);
    const endDate = addUtcDays(startDate, weekCount * 7 - 1);

    return `${formatMockDateLabel(startDate)} - ${formatMockDateLabel(endDate)} 진행`;
  }

  if (dayMatch) {
    const dayCount = Number(dayMatch[1]);

    if (dayCount <= 1) {
      return `${formatMockDateLabel(startDate)} 진행`;
    }

    const endDate = addUtcDays(startDate, dayCount - 1);

    return `${formatMockDateLabel(startDate)} - ${formatMockDateLabel(endDate)} 진행`;
  }

  return `${formatMockDateLabel(startDate)} 일정 안내 예정`;
};

const createDefaultScheduleLabel = (
  id: string,
  formatLabel: string,
  durationLabel: string,
): string => {
  if (formatLabel.includes('패키지')) {
    return '구매 후 1년간 이론 시청 가능 · 현장 실습 일정 별도 안내';
  }

  if (formatLabel.includes('온라인 시험 대비')) {
    return '구매 후 무제한 수강 가능';
  }

  if (formatLabel.includes('온라인')) {
    return '구매 후 1년간 수강 가능';
  }

  return createMockOfflineScheduleLabel(id, durationLabel);
};

const formatMockPriceLabel = (amount: number): string => {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
};

const calculateDiscountRateLabel = (originalPrice: number, discountedPrice: number): string => {
  if (originalPrice <= 0 || originalPrice <= discountedPrice) {
    return '0%';
  }

  const discountRate = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
  return `${String(discountRate)}%`;
};

const buildMonthlyInstallmentLabel = (discountedPrice: number): string => {
  const installment = Math.max(1, Math.ceil(discountedPrice / 12));

  return `월 ${formatMockPriceLabel(installment)} × 12개월`;
};

const createDefaultPriceLabel = (formatLabel: string, durationLabel: string): string => {
  if (formatLabel.includes('패키지')) {
    return formatMockPriceLabel(1_590_000);
  }

  if (formatLabel.includes('온라인 시험 대비')) {
    return formatMockPriceLabel(390_000);
  }

  if (formatLabel.includes('온라인')) {
    return formatMockPriceLabel(490_000);
  }

  if (durationLabel.includes('12주')) {
    return formatMockPriceLabel(2_490_000);
  }

  if (durationLabel.includes('6주')) {
    return formatMockPriceLabel(1_290_000);
  }

  if (durationLabel.includes('5주')) {
    return formatMockPriceLabel(1_090_000);
  }

  if (durationLabel.includes('4주')) {
    return formatMockPriceLabel(890_000);
  }

  if (durationLabel.includes('2일')) {
    return formatMockPriceLabel(1_290_000);
  }

  if (durationLabel.includes('1일')) {
    return formatMockPriceLabel(690_000);
  }

  return formatMockPriceLabel(990_000);
};

const createDefaultOriginalPriceLabel = (discountedPriceLabel: string): string => {
  const discountedPrice = Number(discountedPriceLabel.replace(/[^\d]/g, ''));
  const originalPrice = discountedPrice > 0 ? Math.ceil(discountedPrice / 0.85) : 9_000_000;

  return formatMockPriceLabel(originalPrice);
};

const createDefaultDiscountRateLabel = (
  originalPriceLabel: string,
  discountedPriceLabel: string,
): string => {
  const originalPrice = Number(originalPriceLabel.replace(/[^\d]/g, ''));
  const discountedPrice = Number(discountedPriceLabel.replace(/[^\d]/g, ''));

  return calculateDiscountRateLabel(originalPrice, discountedPrice);
};

const createDefaultMonthlyInstallmentLabel = (discountedPriceLabel: string): string => {
  const discountedPrice = Number(discountedPriceLabel.replace(/[^\d]/g, ''));

  return buildMonthlyInstallmentLabel(discountedPrice > 0 ? discountedPrice : 990_000);
};

const createDefaultRemainingSeatsCount = (id: string, formatLabel: string): number | undefined => {
  if (formatLabel.includes('온라인 이론+스캔') || formatLabel.includes('온라인 시험 대비')) {
    return undefined;
  }

  // 공개 화면에서도 강의마다 같은 잔여 인원이 보이도록 id 기반의 고정 mock 값을 사용합니다.
  const hashedValue = Array.from(id).reduce((accumulator, character) => {
    return accumulator + character.charCodeAt(0);
  }, 0);
  const remainingSeats = (hashedValue % 10) + 3;

  return remainingSeats;
};

const createDefaultRemainingSeatsLabel = (
  remainingSeatsCount: number | undefined,
): string | undefined => {
  if (remainingSeatsCount === undefined) {
    return undefined;
  }

  return `수강 가능 인원 ${String(remainingSeatsCount)}명 남음`;
};

const getMonthlySoldCount = (soldCount: number): number => {
  if (soldCount <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(soldCount * 0.3));
};

const normalizeManagedCapacity = (
  format: AdminProgramFormat,
  capacity: number | null,
  soldCount: number,
): number | null => {
  if (format === 'online') {
    return null;
  }

  return Math.max(capacity ?? soldCount, soldCount);
};

const getManagedRemainingSeats = (
  format: AdminProgramFormat,
  capacity: number | null,
  soldCount: number,
): number | null => {
  if (format === 'online' || capacity === null) {
    return null;
  }

  return Math.max(capacity - soldCount, 0);
};

const createDefaultReviews = (label: string): ProgramReviewItem[] => {
  return [
    {
      authorName: '박지현',
      content: `${label} 수업은 처음부터 끝까지 스캔 순서를 반복해서 정리해 주셔서, 임상에서 바로 적용할 수 있었습니다. 특히 프로브 각도 잡는 부분이 가장 도움이 됐습니다.`,
      dateLabel: '2026.01.15',
      id: `${label}-review-1`,
      rating: 5,
    },
    {
      authorName: '김태우',
      content:
        '강의 구성이 체계적이고, 복습할 때 다시 확인하기 좋은 포인트가 명확하게 정리되어 있어서 만족합니다. 다음 심화 과정도 이어서 수강할 예정입니다.',
      dateLabel: '2026.02.03',
      id: `${label}-review-2`,
      rating: 5,
    },
    {
      authorName: '이수아',
      content:
        '실습 위주로 진행되어 실제 검사 상황과 비슷하게 연습할 수 있었습니다. 피드백도 세세하게 해주셔서 부족한 부분을 바로 교정할 수 있었습니다.',
      dateLabel: '2026.02.20',
      id: `${label}-review-3`,
      rating: 5,
    },
  ];
};

const createDefaultHashtagLabels = (formatLabel: string, difficultyLabel: string): string[] => {
  return [formatLabel, difficultyLabel];
};

const createDefaultRecommendedFor = (
  label: string,
  difficultyLabel: string,
  formatLabel: string,
): string[] => {
  return [
    `${label} 루틴을 처음부터 다시 구조화하고 싶은 ${difficultyLabel} 학습자`,
    `${formatLabel} 과정 안에서 실제 임상 적용 순서를 정리하고 싶은 수강생`,
    '단편적인 스캔 지식보다 한 번에 연결되는 검사 흐름이 필요한 분',
  ];
};

const createDefaultStats = (
  formatLabel: string,
  durationLabel: string,
  difficultyLabel: string,
  tuitionLabel: string,
): ProgramInfoItem[] => {
  return [
    { label: '운영 방식', value: formatLabel },
    { label: '학습 기간', value: durationLabel },
    { label: '난이도', value: difficultyLabel },
    { label: '수강 안내', value: tuitionLabel },
  ];
};

const getCurriculumSeedMode = (formatLabel: string): 'hybrid' | 'offline' | 'online' => {
  if (formatLabel.includes('패키지') || formatLabel.includes('실습 포함')) {
    return 'hybrid';
  }

  if (formatLabel.includes('온라인')) {
    return 'online';
  }

  return 'offline';
};

const buildMockIsoDate = (year: number, month: number, day: number): string => {
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getLastDayOfMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

const getDistributedLessonOffset = (
  startDate: string,
  endDate: string,
  slotIndex: number,
  maxSlotIndex: number,
): number => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start ||
    maxSlotIndex <= 0
  ) {
    return slotIndex * 2;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const totalDaySpan = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay);

  return Math.round((totalDaySpan * slotIndex) / maxSlotIndex);
};

const getDefaultCurriculumWindow = (scheduleLabel: string) => {
  const fullRangeMatch = scheduleLabel.match(
    /(\d{4})\.(\d{2})\.(\d{2})\s*-\s*(\d{4})\.(\d{2})\.(\d{2})\s*진행/,
  );

  if (fullRangeMatch) {
    return {
      endDate: buildMockIsoDate(
        Number(fullRangeMatch[4]),
        Number(fullRangeMatch[5]),
        Number(fullRangeMatch[6]),
      ),
      startDate: buildMockIsoDate(
        Number(fullRangeMatch[1]),
        Number(fullRangeMatch[2]),
        Number(fullRangeMatch[3]),
      ),
    };
  }

  const monthRangeMatch = scheduleLabel.match(/(\d{4})\.(\d{2})\s*-\s*(\d{4})\.(\d{2})\s*진행/);

  if (monthRangeMatch) {
    const startYear = Number(monthRangeMatch[1]);
    const startMonth = Number(monthRangeMatch[2]);
    const endYear = Number(monthRangeMatch[3]);
    const endMonth = Number(monthRangeMatch[4]);

    return {
      endDate: buildMockIsoDate(endYear, endMonth, getLastDayOfMonth(endYear, endMonth)),
      startDate: buildMockIsoDate(startYear, startMonth, 1),
    };
  }

  const singleDateMatch = scheduleLabel.match(/(\d{4})\.(\d{2})\.(\d{2})\s*진행/);

  if (singleDateMatch) {
    const singleDate = buildMockIsoDate(
      Number(singleDateMatch[1]),
      Number(singleDateMatch[2]),
      Number(singleDateMatch[3]),
    );

    return {
      endDate: singleDate,
      startDate: singleDate,
    };
  }

  return {
    endDate: '2026-04-21',
    startDate: '2026-04-07',
  };
};

const createDefaultCurriculumLesson = (
  label: string,
  lessonTitle: string,
  deliveryType: ProgramCurriculumLesson['deliveryType'],
  sectionIndex: number,
  lessonIndex: number,
  scheduleLabel: string,
): ProgramCurriculumLesson => {
  if (deliveryType === 'online') {
    const lesson: ProgramCurriculumLesson = {
      deliveryType,
      description: `${label}의 ${lessonTitle}를 온라인 영상으로 먼저 익히고 복습 포인트를 정리합니다.`,
      durationLabel: '',
      durationMinutes: 45 + lessonIndex * 15,
      endDate: null,
      id: `${label}-lesson-${String(sectionIndex + 1)}-${String(lessonIndex + 1)}`,
      startDate: null,
      title: lessonTitle,
    };

    lesson.durationLabel = deriveCurriculumLessonDurationLabel(lesson);
    return lesson;
  }

  const { endDate, startDate } = getDefaultCurriculumWindow(scheduleLabel);
  const absoluteLessonIndex = sectionIndex * 3 + lessonIndex;
  const lessonStartDate =
    addIsoDays(startDate, getDistributedLessonOffset(startDate, endDate, absoluteLessonIndex, 8)) ??
    startDate;
  const lesson: ProgramCurriculumLesson = {
    deliveryType,
    description: `${label}의 ${lessonTitle}를 오프라인 실습과 피드백 중심으로 다룹니다.`,
    durationLabel: '',
    durationMinutes: null,
    endDate: lessonStartDate,
    id: `${label}-lesson-${String(sectionIndex + 1)}-${String(lessonIndex + 1)}`,
    startDate: lessonStartDate,
    title: lessonTitle,
  };

  lesson.durationLabel = deriveCurriculumLessonDurationLabel(lesson);
  return lesson;
};

const createDefaultCurriculumSections = (
  label: string,
  tags: string[],
  formatLabel: string,
  scheduleLabel: string,
): ProgramCurriculumSection[] => {
  const [firstTag = '기초 루틴', secondTag = '핵심 포인트', thirdTag = '증례 복습'] = tags;
  const curriculumMode = getCurriculumSeedMode(formatLabel);

  const sections: ProgramCurriculumSection[] = [
    {
      description: `${label}에서 반드시 먼저 정리해야 하는 해부학적 기준과 스캔 진입 순서를 다룹니다.`,
      durationLabel: '',
      id: `${label}-foundation`,
      lessons: [],
      title: '기본 루틴 정리',
    },
    {
      description:
        '현장에서 자주 막히는 장면을 기준으로 스캔 포인트와 판독 기준을 압축해 설명합니다.',
      durationLabel: '',
      id: `${label}-core`,
      lessons: [],
      title: '핵심 포인트 심화',
    },
    {
      description: '실제 상황을 가정해 검사 순서, 설명 방식, 복습 기준까지 한 번에 점검합니다.',
      durationLabel: '',
      id: `${label}-case`,
      lessons: [],
      title: '증례 적용과 복습',
    },
  ];

  const lessonTitleGroups = [
    [`${firstTag} 기준 잡기`, '프로브 운용과 화면 고정', '정상 구조 체크 포인트'],
    ['놓치기 쉬운 소견 구분', `${secondTag} 재정리`, '보고 흐름 연결'],
    ['케이스 흐름 복습', `${thirdTag} 체크리스트`, '질문 정리와 피드백'],
  ] as const;

  sections.forEach((section, sectionIndex) => {
    section.lessons = lessonTitleGroups[sectionIndex].map((lessonTitle, lessonIndex) => {
      if (curriculumMode === 'hybrid') {
        return createDefaultCurriculumLesson(
          label,
          lessonTitle,
          lessonIndex % 2 === 0 ? 'online' : 'offline',
          sectionIndex,
          lessonIndex,
          scheduleLabel,
        );
      }

      return createDefaultCurriculumLesson(
        label,
        lessonTitle,
        curriculumMode === 'online' ? 'online' : 'offline',
        sectionIndex,
        lessonIndex,
        scheduleLabel,
      );
    });
    section.durationLabel = deriveCurriculumSectionDurationLabel(section);
  });

  return sections;
};

const createDefaultCurriculumTrack = (
  label: string,
  tags: string[],
  formatLabel: string,
  scheduleLabel: string,
): ProgramCurriculumTrack => {
  const sections = createDefaultCurriculumSections(label, tags, formatLabel, scheduleLabel);

  return {
    id: `${label}-track`,
    sections,
    summaryItems: sections
      .flatMap((section) => section.lessons.map((lesson) => lesson.title))
      .slice(0, 4),
    summaryKind: 'disc',
  };
};

const programSeedImagePool = [
  homeLecture1Src,
  homeLecture2Src,
  homeLecture3Src,
  homeLecture4Src,
  homeLecture5Src,
  '/SRDMS_OG.png',
  '/example.png',
];

const getProgramSeedImageSrc = (imageIndex: number): string => {
  return programSeedImagePool[imageIndex % programSeedImagePool.length] ?? homeLecture1Src;
};

interface ProgramLectureSeedFactoryInput {
  description: string;
  difficultyLabel: string;
  durationLabel: string;
  featured?: boolean | undefined;
  formatLabel: string;
  id: string;
  imageIndex: number;
  label: string;
  scheduleLabel?: string | undefined;
  slug: string;
  tags: string[];
  tuitionLabel: string;
  wrapInLeafHub?: boolean | undefined;
}

const createLectureSeed = ({
  description,
  difficultyLabel,
  durationLabel,
  featured,
  formatLabel,
  id,
  imageIndex,
  label,
  scheduleLabel,
  slug,
  tags,
  tuitionLabel,
  wrapInLeafHub,
}: ProgramLectureSeedFactoryInput): ProgramCatalogLectureSeed => {
  return {
    coverImageAlt: `${label} 대표 이미지`,
    coverImageSrc: getProgramSeedImageSrc(imageIndex),
    description,
    difficultyLabel,
    durationLabel,
    ...(featured ? { featured } : {}),
    formatLabel,
    id,
    kind: 'lecture',
    label,
    ...(scheduleLabel ? { scheduleLabel } : {}),
    slug,
    tags,
    tuitionLabel,
    ...(wrapInLeafHub === false ? { wrapInLeafHub } : {}),
  };
};

interface ProgramCollectionSeedFactoryInput {
  children: ProgramCatalogNodeSeed[];
  curatorNote: string;
  description: string;
  id: string;
  imageIndex: number;
  kicker: string;
  label: string;
  slug: string;
  tags: string[];
}

const createCollectionSeed = ({
  children,
  curatorNote,
  description,
  id,
  imageIndex,
  kicker,
  label,
  slug,
  tags,
}: ProgramCollectionSeedFactoryInput): ProgramCatalogCollectionSeed => {
  return {
    children,
    coverImageAlt: `${label} 대표 이미지`,
    coverImageSrc: getProgramSeedImageSrc(imageIndex),
    curatorNote,
    description,
    id,
    kicker,
    kind: 'collection',
    label,
    slug,
    tags,
  };
};

const doctorCourseInternalMedicineSeed = createCollectionSeed({
  children: [
    createLectureSeed({
      description: '내과 외래와 병동에서 바로 적용하는 복부 스캔 루틴을 실전 중심으로 다룹니다.',
      difficultyLabel: '중급',
      durationLabel: '1일 집중',
      featured: true,
      formatLabel: '오프라인 심화',
      id: 'doctor-course-internal-medicine-abdomen-practice',
      imageIndex: 0,
      label: '내과과정 복부 실전 워크숍',
      slug: 'abdomen-practice',
      tags: ['내과', '복부', '실전'],
      tuitionLabel: '수강 문의 후 일정 안내',
      wrapInLeafHub: false,
    }),
    createLectureSeed({
      description: '간·담도계 증례를 내과 진료 질문에 맞춰 반복 판독하는 워크숍입니다.',
      difficultyLabel: '중급',
      durationLabel: '1일 집중',
      formatLabel: '오프라인 심화',
      id: 'doctor-course-internal-medicine-hepatobiliary-cases',
      imageIndex: 1,
      label: '내과과정 간·담도 증례 워크숍',
      slug: 'hepatobiliary-cases',
      tags: ['내과', '간담도', '증례'],
      tuitionLabel: '수강 문의 후 일정 안내',
      wrapInLeafHub: false,
    }),
    createLectureSeed({
      description: '신장과 요로계 스캔 포인트를 실제 내과 workflow에 연결해 훈련합니다.',
      difficultyLabel: '중급',
      durationLabel: '1일 집중',
      formatLabel: '오프라인 심화',
      id: 'doctor-course-internal-medicine-renal-urinary-practice',
      imageIndex: 2,
      label: '내과과정 신장·요로 실습 워크숍',
      slug: 'renal-urinary-practice',
      tags: ['내과', '신장', '요로'],
      tuitionLabel: '수강 문의 후 일정 안내',
      wrapInLeafHub: false,
    }),
  ],
  curatorNote:
    '내과과정은 복부, 간담도, 신장·요로 중심 실습을 나눠 두고 임상 질문별로 비교해 볼 수 있게 구성합니다.',
  description:
    '내과 진료 현장에서 자주 쓰는 복부·간담도·신장 초음파 실습을 허브에서 비교할 수 있습니다.',
  id: 'doctor-course-internal-medicine',
  imageIndex: 0,
  kicker: 'Doctor Intensive',
  label: '내과과정',
  slug: 'internal-medicine',
  tags: ['내과', '복부', '임상 루틴'],
});

const doctorCoursePocusSeed = createCollectionSeed({
  children: [
    createCollectionSeed({
      children: [
        createLectureSeed({
          description: '응급실 FAST 핵심 window를 집중적으로 반복 훈련하는 오프라인 워크숍입니다.',
          difficultyLabel: '중급',
          durationLabel: '1일 집중',
          featured: true,
          formatLabel: '오프라인 심화',
          id: 'doctor-course-emergency-pocus-fast',
          imageIndex: 5,
          label: '응급 POCUS FAST 집중 워크숍',
          slug: 'fast-intensive-workshop',
          tags: ['FAST', 'POCUS', '응급'],
          tuitionLabel: '수강 문의 후 일정 안내',
          wrapInLeafHub: false,
        }),
      ],
      curatorNote:
        'FAST 집중과정은 응급실 첫 평가에 필요한 window 확보와 판독 순서를 압축해 다룹니다.',
      description: 'FAST 루틴과 실전 적용 포인트를 강의별로 확인할 수 있는 세부 허브입니다.',
      id: 'doctor-course-pocus-fast',
      imageIndex: 5,
      kicker: 'POCUS Intensive',
      label: 'FAST 집중과정',
      slug: 'fast',
      tags: ['FAST', 'POCUS', '응급'],
    }),
    createCollectionSeed({
      children: [
        createLectureSeed({
          description: '쇼크 환자 평가에서 RUSH 알고리즘을 임상 판단과 함께 정리하는 워크숍입니다.',
          difficultyLabel: '고급',
          durationLabel: '1일 집중',
          formatLabel: '오프라인 심화',
          id: 'doctor-course-rush-shock-assessment',
          imageIndex: 6,
          label: 'RUSH 쇼크 평가 워크숍',
          slug: 'shock-assessment-workshop',
          tags: ['RUSH', '쇼크', 'POCUS'],
          tuitionLabel: '수강 문의 후 일정 안내',
          wrapInLeafHub: false,
        }),
      ],
      curatorNote: 'RUSH 쇼크 평가과정은 쇼크 감별 루틴을 bedside 의사결정 흐름에 맞춰 정리합니다.',
      description: 'RUSH 알고리즘을 주제로 한 강의를 허브에서 모아 볼 수 있습니다.',
      id: 'doctor-course-pocus-rush',
      imageIndex: 6,
      kicker: 'POCUS Intensive',
      label: 'RUSH 쇼크 평가과정',
      slug: 'rush',
      tags: ['RUSH', '쇼크', 'POCUS'],
    }),
    createCollectionSeed({
      children: [
        createLectureSeed({
          description: '폐초음파로 호흡곤란 환자를 평가하는 핵심 라인과 함정을 다룹니다.',
          difficultyLabel: '중급',
          durationLabel: '1일 집중',
          formatLabel: '오프라인 심화',
          id: 'doctor-course-lung-ultrasound-dyspnea',
          imageIndex: 0,
          label: '폐초음파 호흡곤란 감별 워크숍',
          slug: 'dyspnea-workshop',
          tags: ['폐초음파', '호흡곤란', 'POCUS'],
          tuitionLabel: '수강 문의 후 일정 안내',
          wrapInLeafHub: false,
        }),
      ],
      curatorNote:
        '폐초음파과정은 호흡곤란 감별과 line 판독 포인트를 임상 시나리오와 함께 정리합니다.',
      description: '폐초음파 호흡곤란 평가 주제 강의를 세부 허브로 확인할 수 있습니다.',
      id: 'doctor-course-pocus-lung-ultrasound',
      imageIndex: 0,
      kicker: 'POCUS Intensive',
      label: '폐초음파과정',
      slug: 'lung-ultrasound',
      tags: ['폐초음파', 'POCUS', '호흡곤란'],
    }),
  ],
  curatorNote:
    '응급/POCUS과정은 FAST, RUSH, 폐초음파 세부 허브를 두고 3뎁스 구조에서 어떤 흐름으로 보여지는지 검증하기 위한 과정군입니다.',
  description:
    '응급과 bedside POCUS 주제를 세부 허브 단위로 나눠 확인할 수 있는 의사과정 브랜치입니다.',
  id: 'doctor-course-pocus',
  imageIndex: 5,
  kicker: 'Doctor Intensive',
  label: '응급/POCUS과정',
  slug: 'pocus',
  tags: ['POCUS', '응급', 'bedside'],
});

const additionalDoctorCourseLectureSeeds: ProgramCatalogLectureSeed[] = [
  createLectureSeed({
    description: '갑상선과 두경부 병변 평가를 임상 질문 중심으로 정리하는 진단 워크숍입니다.',
    difficultyLabel: '중급',
    durationLabel: '2일 워크숍',
    formatLabel: '오프라인 심화',
    id: 'doctor-course-thyroid-neck-diagnostic',
    imageIndex: 1,
    label: '갑상선·경부 진단 워크숍',
    slug: 'thyroid-neck-diagnostic-workshop',
    tags: ['갑상선', '경부', '판독'],
    tuitionLabel: '수강 문의 후 일정 안내',
  }),
  createLectureSeed({
    description: '유방초음파 임상 판독과 BI-RADS 보고 흐름을 압축해 다루는 과정입니다.',
    difficultyLabel: '고급',
    durationLabel: '2일 워크숍',
    formatLabel: '오프라인 심화',
    id: 'doctor-course-breast-clinical-reading',
    imageIndex: 2,
    label: '유방초음파 임상판독 워크숍',
    slug: 'breast-ultrasound-clinical-reading-workshop',
    tags: ['유방', 'BI-RADS', '판독'],
    tuitionLabel: '수강 문의 후 일정 안내',
  }),
  createLectureSeed({
    description: '혈관 접근과 DVT bedside 평가를 함께 정리하는 실전형 워크숍입니다.',
    difficultyLabel: '중급',
    durationLabel: '1일 집중',
    formatLabel: '오프라인 심화',
    id: 'doctor-course-vascular-access-dvt',
    imageIndex: 3,
    label: '혈관접근·DVT Bedside 워크숍',
    slug: 'vascular-access-dvt-bedside-workshop',
    tags: ['혈관', 'DVT', 'Bedside'],
    tuitionLabel: '수강 문의 후 일정 안내',
  }),
  createLectureSeed({
    description: '여성 골반초음파를 진료 흐름과 연결해 보는 임상 적용 중심 과정입니다.',
    difficultyLabel: '중급',
    durationLabel: '2일 워크숍',
    formatLabel: '오프라인 심화',
    id: 'doctor-course-female-pelvic-clinical',
    imageIndex: 4,
    label: '여성골반초음파 진료 적용 과정',
    slug: 'female-pelvic-ultrasound-clinical-course',
    tags: ['여성골반', 'OB/GYN', '진료 적용'],
    tuitionLabel: '수강 문의 후 일정 안내',
  }),
  createLectureSeed({
    description: '태아심장 기본 view와 이상 소견 접근을 입문 수준에서 정리합니다.',
    difficultyLabel: '고급',
    durationLabel: '2일 워크숍',
    formatLabel: '오프라인 심화',
    id: 'doctor-course-fetal-echo-intro',
    imageIndex: 5,
    label: '태아심장초음파 입문 워크숍',
    slug: 'fetal-echocardiography-intro-workshop',
    tags: ['태아심장', 'FE', '입문'],
    tuitionLabel: '수강 문의 후 일정 안내',
  }),
];

const generalCourseAbdomenBasicSeed = createCollectionSeed({
  children: [
    createLectureSeed({
      description: '2026년 3월부터 4월까지 진행하는 복부 Basic 스캔 6주 정규 기수입니다.',
      difficultyLabel: '입문',
      durationLabel: '6주',
      featured: true,
      formatLabel: '오프라인 정규',
      id: 'general-course-abdomen-basic-2026-mar-apr',
      imageIndex: 0,
      label: '복부 Basic 스캔 6주',
      scheduleLabel: '2026.03 - 2026.04 진행',
      slug: '2026-mar-apr',
      tags: ['복부', '기초', '6주'],
      tuitionLabel: '수강 문의 후 일정 안내',
      wrapInLeafHub: false,
    }),
    createLectureSeed({
      description: '2026년 5월부터 6월까지 진행하는 복부 Basic 스캔 6주 정규 기수입니다.',
      difficultyLabel: '입문',
      durationLabel: '6주',
      formatLabel: '오프라인 정규',
      id: 'general-course-abdomen-basic-2026-may-jun',
      imageIndex: 1,
      label: '복부 Basic 스캔 6주',
      scheduleLabel: '2026.05 - 2026.06 진행',
      slug: '2026-may-jun',
      tags: ['복부', '기초', '6주'],
      tuitionLabel: '수강 문의 후 일정 안내',
      wrapInLeafHub: false,
    }),
    createLectureSeed({
      description: '2026년 9월부터 10월까지 진행하는 복부 Basic 스캔 6주 정규 기수입니다.',
      difficultyLabel: '입문',
      durationLabel: '6주',
      formatLabel: '오프라인 정규',
      id: 'general-course-abdomen-basic-2026-sep-oct',
      imageIndex: 2,
      label: '복부 Basic 스캔 6주',
      scheduleLabel: '2026.09 - 2026.10 진행',
      slug: '2026-sep-oct',
      tags: ['복부', '기초', '6주'],
      tuitionLabel: '수강 문의 후 일정 안내',
      wrapInLeafHub: false,
    }),
  ],
  curatorNote:
    '복부 Basic 스캔 6주는 같은 교육 내용이라도 기수별 일정이 다른 상황을 허브 안에서 비교할 수 있도록 구성했습니다.',
  description: '같은 복부 Basic 6주 커리큘럼을 여러 기수 일정으로 나눠 확인할 수 있는 허브입니다.',
  id: 'general-course-abdomen-basic',
  imageIndex: 0,
  kicker: 'General Track',
  label: '복부 Basic 스캔 6주',
  slug: 'abdomen-basic-6-weeks',
  tags: ['복부', '기초', '6주'],
});

const additionalGeneralCourseCategorySeeds: ProgramCatalogCollectionSeed[] = [
  createCollectionSeed({
    children: [
      createLectureSeed({
        description: '갑상선 해부와 기본 스캔 루틴을 6주 동안 반복하는 입문 과정입니다.',
        difficultyLabel: '입문',
        durationLabel: '6주',
        featured: true,
        formatLabel: '오프라인 정규',
        id: 'general-course-thyroid-basic',
        imageIndex: 6,
        label: '갑상선 Basic 스캔 6주',
        slug: 'thyroid-basic-scan-6-weeks',
        tags: ['갑상선', '기초', '6주'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: '경동맥 duplex 기초와 협착 판독 포인트를 정리하는 과정입니다.',
        difficultyLabel: '중급',
        durationLabel: '6주',
        formatLabel: '오프라인 정규',
        id: 'general-course-carotid-duplex',
        imageIndex: 0,
        label: '경동맥 Duplex 6주',
        slug: 'carotid-duplex-6-weeks',
        tags: ['경동맥', 'duplex', '판독'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: '갑상선, 림프절, 침샘 판독을 케이스 중심으로 연결하는 정규과정입니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '10주',
        formatLabel: '오프라인 정규',
        id: 'general-course-head-neck-regular',
        imageIndex: 1,
        label: '두경부 판독 정규과정 10주',
        slug: 'head-neck-regular-course-10-weeks',
        tags: ['두경부', '정규과정', '판독'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
    ],
    curatorNote: '두경부과정은 갑상선과 혈관, 림프절 판독을 단계별로 연결하는 트랙입니다.',
    description: '갑상선과 두경부 스캔 루틴, 혈관 평가, 판독 흐름을 나눠 학습합니다.',
    id: 'general-course-neck',
    imageIndex: 6,
    kicker: 'General Track',
    label: '두경부과정',
    slug: 'neck-course',
    tags: ['두경부', '갑상선', '혈관'],
  }),
  createCollectionSeed({
    children: [
      createLectureSeed({
        description: '어깨 초음파의 기본 해부와 장축·단축 루틴을 익히는 입문 과정입니다.',
        difficultyLabel: '입문',
        durationLabel: '6주',
        featured: true,
        formatLabel: '오프라인 정규',
        id: 'general-course-shoulder-basic',
        imageIndex: 2,
        label: '어깨 초음파 Basic 6주',
        slug: 'shoulder-ultrasound-basic-6-weeks',
        tags: ['근골격', '어깨', '기초'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: '손목과 팔꿈치 통증 스캔 루틴을 임상 질문과 함께 정리합니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '4주',
        formatLabel: '오프라인 집중',
        id: 'general-course-wrist-elbow-pain',
        imageIndex: 3,
        label: '손목·팔꿈치 통증 스캔 4주',
        slug: 'wrist-elbow-pain-scan-4-weeks',
        tags: ['근골격', '통증', '4주'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: '시술 유도 초음파의 needle tracking과 안전 포인트를 다룹니다.',
        difficultyLabel: '중급',
        durationLabel: '4주',
        formatLabel: '오프라인 집중',
        id: 'general-course-interventional-msk',
        imageIndex: 4,
        label: '시술 유도 근골격 초음파 4주',
        slug: 'interventional-msk-ultrasound-4-weeks',
        tags: ['근골격', '시술 유도', '실습'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
    ],
    curatorNote: '근골격과정은 부위별 스캔과 시술 유도 장면을 반복 훈련하도록 설계합니다.',
    description: '어깨부터 말초 관절, 시술 유도까지 근골격 초음파를 단계적으로 학습합니다.',
    id: 'general-course-musculoskeletal',
    imageIndex: 2,
    kicker: 'General Track',
    label: '근골격과정',
    slug: 'musculoskeletal',
    tags: ['근골격', '시술 유도', '통증 스캔'],
  }),
  createCollectionSeed({
    children: [
      createLectureSeed({
        description: '여성 골반초음파 기본 anatomy와 scan plane을 6주 동안 익힙니다.',
        difficultyLabel: '입문',
        durationLabel: '6주',
        featured: true,
        formatLabel: '오프라인 정규',
        id: 'general-course-female-pelvis-basic',
        imageIndex: 5,
        label: '여성골반 Basic 6주',
        slug: 'female-pelvis-basic-6-weeks',
        tags: ['여성골반', '기초', '6주'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: '1삼분기 산과 스캔에서 기본 측정과 확인 포인트를 정리합니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '4주',
        formatLabel: '오프라인 집중',
        id: 'general-course-first-trimester',
        imageIndex: 6,
        label: '산과 1삼분기 스캔 4주',
        slug: 'first-trimester-scan-4-weeks',
        tags: ['산과', '1삼분기', '측정'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: 'OB/GYN 초음파를 여성 골반과 산과 흐름으로 연결해 보는 정규과정입니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '10주',
        formatLabel: '오프라인 정규',
        id: 'general-course-obgyn-regular',
        imageIndex: 0,
        label: 'OB/GYN 정규과정 10주',
        slug: 'obgyn-regular-course-10-weeks',
        tags: ['OB/GYN', '정규과정', '여성초음파'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
    ],
    curatorNote:
      '여성초음파과정은 골반과 산과 스캔을 단계별로 연결해 기본기와 판독을 함께 다룹니다.',
    description: '여성 골반과 산과 초음파를 입문부터 정규과정까지 단계적으로 학습합니다.',
    id: 'general-course-women-ultrasound',
    imageIndex: 5,
    kicker: 'General Track',
    label: '여성초음파과정',
    slug: 'women-ultrasound',
    tags: ['여성골반', '산과', 'OB/GYN'],
  }),
  createCollectionSeed({
    children: [
      createLectureSeed({
        description: '유방초음파 기본 anatomy와 scan method를 정리하는 입문 과정입니다.',
        difficultyLabel: '입문',
        durationLabel: '6주',
        featured: true,
        formatLabel: '오프라인 정규',
        id: 'general-course-breast-basic',
        imageIndex: 1,
        label: '유방초음파 Basic 6주',
        slug: 'breast-ultrasound-basic-6-weeks',
        tags: ['유방', '기초', '6주'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: 'BI-RADS 판독 증례를 중심으로 리포트 작성 흐름을 훈련합니다.',
        difficultyLabel: '중급',
        durationLabel: '4주',
        formatLabel: '오프라인 집중',
        id: 'general-course-birads-cases',
        imageIndex: 2,
        label: 'BI-RADS 판독 증례 4주',
        slug: 'birads-reading-cases-4-weeks',
        tags: ['유방', 'BI-RADS', '증례'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
    ],
    curatorNote: '유방과정은 기본 스캔과 BI-RADS 판독을 함께 익혀 임상 리포팅까지 연결합니다.',
    description: '유방초음파 기초 스캔과 BI-RADS 증례 판독을 단계적으로 학습합니다.',
    id: 'general-course-breast',
    imageIndex: 1,
    kicker: 'General Track',
    label: '유방과정',
    slug: 'breast',
    tags: ['유방', 'BI-RADS', '판독'],
  }),
  createCollectionSeed({
    children: [
      createLectureSeed({
        description: 'FAST 핵심 window와 프로브 진입 루틴을 4주 동안 반복 훈련합니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '4주',
        featured: true,
        formatLabel: '오프라인 집중',
        id: 'general-course-fast-basic',
        imageIndex: 3,
        label: 'FAST Basic 4주',
        slug: 'fast-basic-4-weeks',
        tags: ['FAST', 'POCUS', '응급'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: 'B-line과 pleural line 판독을 중심으로 폐초음파를 정리하는 과정입니다.',
        difficultyLabel: '중급',
        durationLabel: '4주',
        formatLabel: '오프라인 집중',
        id: 'general-course-lung-ultrasound-line',
        imageIndex: 4,
        label: '폐초음파 라인 판독 4주',
        slug: 'lung-ultrasound-line-reading-4-weeks',
        tags: ['폐초음파', 'B-line', '판독'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
      createLectureSeed({
        description: 'RUSH 알고리즘을 실제 응급실 질문 흐름으로 연결해 훈련합니다.',
        difficultyLabel: '중급',
        durationLabel: '4주',
        formatLabel: '오프라인 집중',
        id: 'general-course-rush-practice',
        imageIndex: 5,
        label: 'RUSH 알고리즘 실습 4주',
        slug: 'rush-algorithm-practice-4-weeks',
        tags: ['RUSH', 'POCUS', '실습'],
        tuitionLabel: '수강 문의 후 일정 안내',
      }),
    ],
    curatorNote: '응급/POCUS과정은 FAST, 폐초음파, RUSH를 묶어 bedside 의사결정을 훈련합니다.',
    description: '응급 상황에서 바로 활용하는 POCUS 루틴을 단계적으로 학습하는 과정입니다.',
    id: 'general-course-pocus',
    imageIndex: 3,
    kicker: 'General Track',
    label: '응급/POCUS과정',
    slug: 'pocus',
    tags: ['POCUS', '응급', 'bedside'],
  }),
];

const additionalArdmsExamPrepLectureSeeds: ProgramCatalogLectureSeed[] = [
  createLectureSeed({
    description: 'Adult Echocardiography 시험 유형과 판독 포인트를 문제풀이 중심으로 정리합니다.',
    difficultyLabel: '중급',
    durationLabel: '온라인 3주',
    formatLabel: '온라인 시험 대비',
    id: 'online-course-ae-problem-solving',
    imageIndex: 4,
    label: 'AE 문제풀이 강의',
    slug: 'ae-problem-solving',
    tags: ['ARDMS', 'AE', '문제풀이'],
    tuitionLabel: '온라인 등록 예정',
  }),
  createLectureSeed({
    description: '유방초음파 BR 시험 대비에 필요한 핵심 이론과 판독 프레임을 정리합니다.',
    difficultyLabel: '중급',
    durationLabel: '온라인 3주',
    formatLabel: '온라인 시험 대비',
    id: 'online-course-br-core-theory',
    imageIndex: 5,
    label: 'BR 핵심 이론 정리',
    slug: 'br-core-theory',
    tags: ['ARDMS', 'BR', '유방'],
    tuitionLabel: '온라인 등록 예정',
  }),
  createLectureSeed({
    description: 'VT 시험 대비를 위해 혈관 파형과 stenosis 접근을 문제풀이와 함께 학습합니다.',
    difficultyLabel: '고급',
    durationLabel: '온라인 4주',
    formatLabel: '온라인 시험 대비',
    id: 'online-course-vt-problem-solving',
    imageIndex: 6,
    label: 'VT 문제풀이 강의',
    slug: 'vt-problem-solving',
    tags: ['ARDMS', 'VT', '혈관'],
    tuitionLabel: '온라인 등록 예정',
  }),
  createLectureSeed({
    description: '태아심장 FE 시험 대비를 위한 기본 view와 대표 개념을 정리하는 특강입니다.',
    difficultyLabel: '고급',
    durationLabel: '온라인 3주',
    formatLabel: '온라인 시험 대비',
    id: 'online-course-fe-core-concepts',
    imageIndex: 0,
    label: 'FE 핵심 개념 특강',
    slug: 'fe-core-concepts',
    tags: ['ARDMS', 'FE', '태아심장'],
    tuitionLabel: '온라인 등록 예정',
  }),
];

const additionalOnlineCourseCategorySeeds: ProgramCatalogCollectionSeed[] = [
  createCollectionSeed({
    children: [
      createLectureSeed({
        description: 'EFAST 핵심 영상과 view별 체크 포인트를 짧은 모듈로 정리합니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '온라인 2주',
        featured: true,
        formatLabel: '온라인 이론+스캔',
        id: 'online-course-efast-core-video',
        imageIndex: 1,
        label: 'EFAST 핵심 영상 모듈',
        slug: 'efast-core-video-module',
        tags: ['EFAST', 'POCUS', '영상 모듈'],
        tuitionLabel: '온라인 등록 예정',
      }),
      createLectureSeed({
        description: 'B-line, pleural sliding, consolidation을 중심으로 폐초음파를 정리합니다.',
        difficultyLabel: '중급',
        durationLabel: '온라인 3주',
        formatLabel: '온라인 이론+스캔',
        id: 'online-course-lung-b-line-reading',
        imageIndex: 2,
        label: '폐초음파 B-line 판독',
        slug: 'lung-ultrasound-b-line-reading',
        tags: ['폐초음파', 'B-line', 'POCUS'],
        tuitionLabel: '온라인 등록 예정',
      }),
      createLectureSeed({
        description: 'RUSH 알고리즘을 쇼크 감별 흐름과 함께 정리하는 온라인 리뷰 과정입니다.',
        difficultyLabel: '중급',
        durationLabel: '온라인 3주',
        formatLabel: '온라인 이론+스캔',
        id: 'online-course-rush-review',
        imageIndex: 3,
        label: 'RUSH 알고리즘 정리',
        slug: 'rush-algorithm-review',
        tags: ['RUSH', '쇼크', 'POCUS'],
        tuitionLabel: '온라인 등록 예정',
      }),
      createLectureSeed({
        description: '혈관 접근과 말초정맥 확보에 필요한 초음파 가이드를 영상 중심으로 학습합니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '온라인 2주',
        formatLabel: '온라인 이론+스캔',
        id: 'online-course-vascular-access-guide',
        imageIndex: 4,
        label: '혈관 접근 초음파 가이드',
        slug: 'vascular-access-ultrasound-guide',
        tags: ['혈관접근', 'POCUS', '가이드'],
        tuitionLabel: '온라인 등록 예정',
      }),
    ],
    curatorNote:
      'POCUS 라이브러리는 응급과 bedside 초음파 장면을 짧은 모듈로 반복 학습하도록 구성합니다.',
    description: 'EFAST, 폐초음파, 혈관 접근, RUSH 등 POCUS 핵심 장면을 온라인으로 학습합니다.',
    id: 'online-course-pocus-library',
    imageIndex: 1,
    kicker: 'Online Library',
    label: 'POCUS 라이브러리',
    slug: 'pocus-library',
    tags: ['POCUS', '온라인', '영상 라이브러리'],
  }),
  createCollectionSeed({
    children: [
      createLectureSeed({
        description: '여성 골반초음파 anatomy와 scan plane을 온라인 영상으로 반복 학습합니다.',
        difficultyLabel: '입문',
        durationLabel: '온라인 4주',
        featured: true,
        formatLabel: '온라인 이론+스캔',
        id: 'online-course-female-pelvis-theory',
        imageIndex: 5,
        label: '여성골반 이론+스캔 동영상',
        slug: 'female-pelvis-theory-scan-video',
        tags: ['여성골반', '온라인', '이론+스캔'],
        tuitionLabel: '온라인 등록 예정',
      }),
      createLectureSeed({
        description: '산과 기본 측정과 trimester별 핵심 기준을 이론 중심으로 정리합니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '온라인 3주',
        formatLabel: '온라인 이론+스캔',
        id: 'online-course-obstetric-biometry-theory',
        imageIndex: 6,
        label: '산과 기본 측정 이론',
        slug: 'obstetric-biometry-theory',
        tags: ['산과', '측정', '이론'],
        tuitionLabel: '온라인 등록 예정',
      }),
      createLectureSeed({
        description: '유방초음파 판독에서 자주 사용하는 BI-RADS 프레임을 온라인으로 정리합니다.',
        difficultyLabel: '중급',
        durationLabel: '온라인 3주',
        formatLabel: '온라인 이론+스캔',
        id: 'online-course-breast-reading-core',
        imageIndex: 0,
        label: '유방 판독 핵심',
        slug: 'breast-reading-core',
        tags: ['유방', 'BI-RADS', '판독'],
        tuitionLabel: '온라인 등록 예정',
      }),
    ],
    curatorNote: '여성초음파 이론 트랙은 골반, 산과, 유방 초음파를 온라인 복습 중심으로 묶습니다.',
    description: '여성 골반, 산과, 유방초음파를 온라인 이론과 스캔 영상 중심으로 학습합니다.',
    id: 'online-course-women-ultrasound-theory',
    imageIndex: 5,
    kicker: 'Online Library',
    label: '여성초음파 이론',
    slug: 'women-ultrasound-theory',
    tags: ['여성초음파', '온라인', '복습'],
  }),
];

interface InitialManagedProgramFactoryInput {
  accessPolicy: AdminProgramAccessPolicy;
  capacity?: number | null | undefined;
  description: string;
  difficultyLabel: string;
  format: AdminProgramFormat;
  imageIndex: number;
  learningEndDate: string | null;
  learningStartDate: string | null;
  parentCollectionPath: string;
  price: number;
  registrationEndDate: string | null;
  registrationStartDate: string | null;
  slug: string;
  soldCount: number;
  status?: AdminProgramStatus | undefined;
  tags: string[];
  title: string;
  updatedAt?: string | undefined;
}

const createInitialManagedProgramRecord = ({
  accessPolicy,
  capacity,
  description,
  difficultyLabel,
  format,
  imageIndex,
  learningEndDate,
  learningStartDate,
  parentCollectionPath,
  price,
  registrationEndDate,
  registrationStartDate,
  slug,
  soldCount,
  status = 'published',
  tags,
  title,
  updatedAt = '2026-03-16',
}: InitialManagedProgramFactoryInput): MockManagedProgramCatalogRecord => {
  const derivedText = deriveManagedProgramText(
    format,
    accessPolicy,
    registrationStartDate,
    registrationEndDate,
    learningStartDate,
    learningEndDate,
  );
  const normalizedCapacity =
    format === 'online' ? null : Math.max(capacity ?? soldCount + 6, soldCount);

  return {
    accessPolicy,
    capacity: normalizedCapacity,
    curriculumTrack: createDefaultCurriculumTrack(
      title,
      tags,
      derivedText.formatLabel,
      derivedText.scheduleLabel,
    ),
    description,
    difficultyLabel,
    durationLabel: derivedText.durationLabel,
    faqItems: createDefaultFaqItems(derivedText.formatLabel, derivedText.durationLabel),
    format,
    formatLabel: derivedText.formatLabel,
    hashtagLabels: createDefaultHashtagLabels(derivedText.formatLabel, difficultyLabel),
    heroImageAlt: `${title} 대표 이미지`,
    heroImageSrc: getProgramSeedImageSrc(imageIndex),
    id: createManagedProgramId(),
    learningPoints: createDefaultLearningPoints(title, tags),
    learningEndDate: derivedText.effectiveLearningEndDate,
    learningStartDate: derivedText.effectiveLearningStartDate,
    operationPeriodLabel: derivedText.operationPeriodLabel ?? undefined,
    originalPrice: Math.ceil(price / 0.85),
    parentCollectionPath: normalizeProgramPath(parentCollectionPath),
    preparationChecklist: createDefaultPreparationChecklist(derivedText.formatLabel),
    price,
    registrationEndDate,
    registrationPeriodLabel: derivedText.registrationPeriodLabel,
    registrationStartDate,
    recommendedFor: createDefaultRecommendedFor(title, difficultyLabel, derivedText.formatLabel),
    scheduleLabel: derivedText.scheduleLabel,
    slug,
    soldCount,
    stats: createDefaultStats(
      derivedText.formatLabel,
      derivedText.durationLabel,
      difficultyLabel,
      derivedText.tuitionLabel,
    ),
    status,
    tags,
    title,
    tuitionLabel: derivedText.tuitionLabel,
    updatedAt,
  };
};

const applyManagedProgramDerivedText = (
  record: Pick<
    MockManagedProgramCatalogRecord,
    | 'accessPolicy'
    | 'curriculumTrack'
    | 'format'
    | 'learningEndDate'
    | 'learningStartDate'
    | 'registrationEndDate'
    | 'registrationStartDate'
  >,
): ManagedProgramDerivedText => {
  return deriveManagedProgramText(
    record.format,
    record.accessPolicy,
    record.registrationStartDate,
    record.registrationEndDate,
    record.learningStartDate,
    record.learningEndDate,
    record.curriculumTrack,
  );
};

function buildInitialManagedPrograms(): MockManagedProgramCatalogRecord[] {
  return [
    createInitialManagedProgramRecord({
      accessPolicy: 'cohort',
      description: '복부 도플러와 증례 피드백을 중심으로 복부 심화 루틴을 정리하는 관리강의입니다.',
      difficultyLabel: '중급',
      format: 'offline',
      imageIndex: 1,
      learningEndDate: '2026-04-27',
      learningStartDate: '2026-03-31',
      parentCollectionPath: '/programs/general-course/abdomen/abdomen-advance-6-weeks',
      price: 890_000,
      registrationEndDate: '2026-03-28',
      registrationStartDate: '2026-03-05',
      slug: 'abdomen-doppler-case-feedback-4-weeks',
      soldCount: 14,
      tags: ['복부', '도플러', '증례'],
      title: '복부 도플러 증례 피드백 4주',
    }),
    createInitialManagedProgramRecord({
      accessPolicy: 'cohort',
      description: '갑상선 결절 평가와 판독 문장을 실제 케이스 기반으로 연습하는 관리강의입니다.',
      difficultyLabel: '중급',
      format: 'offline',
      imageIndex: 2,
      learningEndDate: '2026-05-12',
      learningStartDate: '2026-04-15',
      parentCollectionPath: '/programs/general-course/neck-course/thyroid-basic-scan-6-weeks',
      price: 920_000,
      registrationEndDate: '2026-04-10',
      registrationStartDate: '2026-03-20',
      slug: 'thyroid-nodule-reading-practice-4-weeks',
      soldCount: 11,
      tags: ['갑상선', '결절', '판독'],
      title: '갑상선 결절 판독 실습 4주',
    }),
    createInitialManagedProgramRecord({
      accessPolicy: 'cohort',
      capacity: 18,
      description:
        'FAST 증례를 반복 검토하고 응급실 적용 포인트를 피드백하는 실습 포함 온라인 부트캠프입니다.',
      difficultyLabel: '중급',
      format: 'hybrid',
      imageIndex: 3,
      learningEndDate: '2026-04-21',
      learningStartDate: '2026-03-25',
      parentCollectionPath: '/programs/general-course/pocus/fast-basic-4-weeks',
      price: 790_000,
      registrationEndDate: '2026-03-20',
      registrationStartDate: '2026-03-01',
      slug: 'fast-case-review-bootcamp',
      soldCount: 10,
      tags: ['FAST', '증례', 'POCUS'],
      title: 'FAST 증례 리뷰 부트캠프',
    }),
    createInitialManagedProgramRecord({
      accessPolicy: 'cohort',
      description: 'BI-RADS 리포팅 문장과 판독 요약을 실제 유방초음파 케이스로 훈련합니다.',
      difficultyLabel: '중급',
      format: 'offline',
      imageIndex: 4,
      learningEndDate: '2026-06-02',
      learningStartDate: '2026-05-06',
      parentCollectionPath: '/programs/general-course/breast/birads-reading-cases-4-weeks',
      price: 940_000,
      registrationEndDate: '2026-05-02',
      registrationStartDate: '2026-04-10',
      slug: 'breast-birads-reporting-practice',
      soldCount: 9,
      tags: ['유방', 'BI-RADS', '리포팅'],
      title: '유방 BI-RADS 리포팅 실습반',
    }),
    createInitialManagedProgramRecord({
      accessPolicy: 'limited-window',
      description: 'Adult Echo 시험 대비용 모의고사와 해설 세션을 묶은 온라인 관리강의입니다.',
      difficultyLabel: '중급',
      format: 'online',
      imageIndex: 5,
      learningEndDate: '2026-04-20',
      learningStartDate: '2026-03-31',
      parentCollectionPath: '/programs/online-course/ardms-exam-prep/ae-problem-solving',
      price: 430_000,
      registrationEndDate: '2026-03-30',
      registrationStartDate: '2026-03-10',
      slug: 'ae-mock-exam-review',
      soldCount: 27,
      status: 'hidden',
      tags: ['ARDMS', 'AE', '모의고사'],
      title: 'AE 모의고사 해설반',
    }),
  ];
}

const programCatalogSeeds: ProgramCatalogNodeSeed[] = [
  {
    children: [
      doctorCourseInternalMedicineSeed,
      {
        coverImageAlt: '의사과정 심장과정 대표 이미지',
        coverImageSrc: homeLecture2Src,
        description: '심초음파 기본부터 임상 판단까지 단계적으로 익히는 의사 대상 과정입니다.',
        difficultyLabel: '중급',
        durationLabel: '2일 워크숍',
        formatLabel: '오프라인 심화',
        id: 'doctor-course-cardiology',
        kind: 'lecture',
        label: '심장과정',
        slug: 'cardiology',
        tags: ['심장', '판독', '워크숍'],
        tuitionLabel: '수강 문의 후 일정 안내',
      },
      {
        coverImageAlt: '의사과정 소아과정 대표 이미지',
        coverImageSrc: homeLecture3Src,
        description: '소아 환자 평가와 스캔 포인트를 중심으로 구성된 과정입니다.',
        difficultyLabel: '중급',
        durationLabel: '1일 집중',
        formatLabel: '오프라인 심화',
        id: 'doctor-course-pediatrics',
        kind: 'lecture',
        label: '소아과정',
        slug: 'pediatrics',
        tags: ['소아', '평가', '실습'],
        tuitionLabel: '수강 문의 후 일정 안내',
      },
      {
        coverImageAlt: '의사과정 소아심장과정 대표 이미지',
        coverImageSrc: homeLecture4Src,
        description: '소아 심장 초음파 판독과 진료 적용을 집중적으로 다루는 과정입니다.',
        difficultyLabel: '고급',
        durationLabel: '2일 워크숍',
        formatLabel: '오프라인 심화',
        id: 'doctor-course-pediatric-cardiology',
        kind: 'lecture',
        label: '소아심장과정',
        slug: 'pediatric-cardiology',
        tags: ['소아심장', '판독', '집중'],
        tuitionLabel: '수강 문의 후 일정 안내',
      },
      {
        coverImageAlt: '의사과정 근골격 집중과정 대표 이미지',
        coverImageSrc: homeLecture5Src,
        description: '근골격 초음파 스캔 실습을 짧은 기간에 집중적으로 훈련하는 과정입니다.',
        difficultyLabel: '중급',
        durationLabel: '1일 집중',
        formatLabel: '오프라인 심화',
        id: 'doctor-course-msk-intensive',
        kind: 'lecture',
        label: 'MSK 스캔집중과정',
        slug: 'msk-scan-intensive',
        tags: ['근골격', '스캔', '집중'],
        tuitionLabel: '수강 문의 후 일정 안내',
      },
      doctorCoursePocusSeed,
      {
        coverImageAlt: '의사과정 복부 패키지 대표 이미지',
        coverImageSrc: '/example.png',
        description: '복부 이론 동영상과 현장 실습을 함께 묶은 패키지 과정입니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '온라인 + 현장 실습',
        formatLabel: '패키지 과정',
        id: 'doctor-course-abdomen-package',
        kind: 'lecture',
        label: '복부 동영상 + Hands-on 실습 패키지',
        slug: 'abdomen-hands-on-package',
        tags: ['복부', '패키지', '실습'],
        tuitionLabel: '수강 문의 후 일정 안내',
      },
      {
        coverImageAlt: '의사과정 두경부 패키지 대표 이미지',
        coverImageSrc: '/SRDMS_OG.png',
        description: '두경부 이론 학습과 Hands-on 실습을 결합한 패키지 과정입니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '온라인 + 현장 실습',
        formatLabel: '패키지 과정',
        id: 'doctor-course-neck-package',
        kind: 'lecture',
        label: '두경부 동영상 + Hands-on 실습 패키지',
        slug: 'neck-hands-on-package',
        tags: ['두경부', '패키지', '실습'],
        tuitionLabel: '수강 문의 후 일정 안내',
      },
      ...additionalDoctorCourseLectureSeeds,
    ],
    coverImageAlt: '의사과정 대표 이미지',
    coverImageSrc: homeLecture1Src,
    curatorNote:
      '의사과정은 진료 현장에서 바로 써야 하는 루틴을 짧은 시간 안에 압축해 반복하는 방식으로 설계합니다.',
    description: '의사 대상 오프라인 심화 과정을 전공과 학습 방식에 따라 확인할 수 있습니다.',
    id: 'doctor-courses',
    kicker: 'Doctor Intensive',
    kind: 'collection',
    label: '의사과정',
    slug: 'doctor-course',
    tags: ['오프라인', '임상 적용', '핸즈온'],
  },
  {
    children: [
      {
        children: [
          generalCourseAbdomenBasicSeed,
          {
            coverImageAlt: '복부 어드밴스 스캔 6주 대표 이미지',
            coverImageSrc: homeLecture2Src,
            description: '심화 증례와 고급 스캔 포인트를 다루는 6주 과정입니다.',
            difficultyLabel: '중급',
            durationLabel: '6주',
            formatLabel: '오프라인 정규',
            id: 'general-course-abdomen-advance',
            kind: 'lecture',
            label: '복부 Advance 스캔 6주',
            slug: 'abdomen-advance-6-weeks',
            tags: ['복부', '심화', '증례'],
            tuitionLabel: '수강 문의 후 일정 안내',
          },
          {
            coverImageAlt: '복부 정규과정 대표 이미지',
            coverImageSrc: homeLecture3Src,
            description: '기초와 심화를 연속으로 수강하는 통합 복부 정규과정입니다.',
            difficultyLabel: '입문-중급',
            durationLabel: '12주',
            formatLabel: '오프라인 정규',
            id: 'general-course-abdomen-regular',
            kind: 'lecture',
            label: '복부 정규과정 (Basic+Advance)',
            slug: 'abdomen-regular-course',
            tags: ['복부', '정규과정', '통합'],
            tuitionLabel: '수강 문의 후 일정 안내',
          },
          {
            coverImageAlt: '내과 임상준비 집중스캔 5주 대표 이미지',
            coverImageSrc: homeLecture4Src,
            description: '임상 투입 전 자주 쓰는 복부 스캔 루틴을 5주 동안 집중 훈련합니다.',
            difficultyLabel: '입문-중급',
            durationLabel: '5주',
            formatLabel: '오프라인 집중',
            id: 'general-course-internal-medicine-intensive',
            kind: 'lecture',
            label: '내과 임상준비 집중스캔 5주',
            slug: 'internal-medicine-intensive-5-weeks',
            tags: ['내과', '집중', '루틴'],
            tuitionLabel: '수강 문의 후 일정 안내',
          },
          {
            coverImageAlt: '예비방사선사 4주집중코스 대표 이미지',
            coverImageSrc: homeLecture5Src,
            description: '예비 방사선사를 위한 단기 집중형 입문 코스입니다.',
            difficultyLabel: '입문',
            durationLabel: '4주',
            formatLabel: '오프라인 집중',
            id: 'general-course-radiographer-intensive',
            kind: 'lecture',
            label: '예비방사선사 4주집중코스',
            slug: 'radiographer-intensive-4-weeks',
            tags: ['방사선사', '입문', '4주'],
            tuitionLabel: '수강 문의 후 일정 안내',
          },
        ],
        coverImageAlt: '일반과정 복부과정 대표 이미지',
        coverImageSrc: homeLecture1Src,
        curatorNote: '복부과정은 기초 스캔에서 임상 적용까지 단계를 나눠 연결하는 트랙입니다.',
        description: '복부 초음파 기본기부터 정규과정까지 단계별로 이어지는 트랙입니다.',
        id: 'general-course-abdomen',
        kicker: 'General Track',
        kind: 'collection',
        label: '복부과정',
        slug: 'abdomen',
        tags: ['복부', '정규과정', '기초부터 심화까지'],
      },
      {
        children: [
          {
            coverImageAlt: '심장 정규과정 12주 대표 이미지',
            coverImageSrc: homeLecture2Src,
            description: '심초음파 핵심 이론과 판독을 체계적으로 익히는 12주 과정입니다.',
            difficultyLabel: '중급',
            durationLabel: '12주',
            formatLabel: '오프라인 정규',
            id: 'general-course-cardiology-regular',
            kind: 'lecture',
            label: '심장 정규과정 12주',
            slug: 'cardiology-regular-12-weeks',
            tags: ['심장', '정규과정', '판독'],
            tuitionLabel: '수강 문의 후 일정 안내',
          },
          {
            coverImageAlt: '심장 임상집중스캔 6주 대표 이미지',
            coverImageSrc: homeLecture3Src,
            description: '임상 현장 적용을 목표로 한 심장 스캔 집중 과정입니다.',
            difficultyLabel: '중급',
            durationLabel: '6주',
            formatLabel: '오프라인 집중',
            id: 'general-course-cardiology-intensive',
            kind: 'lecture',
            label: '심장 임상집중스캔 6주',
            slug: 'cardiology-intensive-6-weeks',
            tags: ['심장', '집중', '임상 적용'],
            tuitionLabel: '수강 문의 후 일정 안내',
          },
        ],
        coverImageAlt: '일반과정 심장과정 대표 이미지',
        coverImageSrc: homeLecture3Src,
        curatorNote: '심장과정은 이론과 실제 판독을 함께 다뤄서 검사 후 판단 흐름까지 연결합니다.',
        description: '심초음파 입문과 임상 적용을 나눠서 수강할 수 있는 과정입니다.',
        id: 'general-course-cardiology',
        kicker: 'General Track',
        kind: 'collection',
        label: '심장과정',
        slug: 'cardiology',
        tags: ['심장', '정규과정', '집중'],
      },
      {
        coverImageAlt: '일반과정 두경부 패키지 대표 이미지',
        coverImageSrc: homeLecture4Src,
        description: '두경부 동영상 학습과 Hands-on 실습을 함께 제공하는 패키지입니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '온라인 + 현장 실습',
        formatLabel: '패키지 과정',
        id: 'general-course-neck-package',
        kind: 'lecture',
        label: '두경부 동영상 + Hands-on 실습 패키지',
        slug: 'neck-hands-on-package',
        tags: ['두경부', '패키지', '실습'],
        tuitionLabel: '수강 문의 후 일정 안내',
      },
      ...additionalGeneralCourseCategorySeeds,
    ],
    coverImageAlt: '일반과정 대표 이미지',
    coverImageSrc: homeLecture2Src,
    curatorNote:
      '일반과정은 처음 시작하는 수강생이 단계별로 올라갈 수 있도록 기본기, 정규과정, 집중과정을 나눠 구성합니다.',
    description: '직군과 학습 목적에 맞는 일반 초음파 과정을 분야별로 탐색할 수 있습니다.',
    id: 'general-courses',
    kicker: 'Clinical Curriculum',
    kind: 'collection',
    label: '일반과정',
    slug: 'general-course',
    tags: ['정규과정', '입문부터 심화', '반복 학습'],
  },
  {
    children: [
      {
        children: [
          {
            coverImageAlt: '상복부 이론과 스캔 동영상 대표 이미지',
            coverImageSrc: homeLecture1Src,
            description: '상복부 초음파의 기본 이론과 스캔 영상을 온라인으로 학습합니다.',
            difficultyLabel: '입문',
            durationLabel: '온라인 4주',
            formatLabel: '온라인 이론+스캔',
            id: 'online-course-upper-abdomen',
            kind: 'lecture',
            label: '상복부 이론+스캔 동영상',
            slug: 'upper-abdomen-theory-scan-video',
            tags: ['상복부', '온라인', '이론+스캔'],
            tuitionLabel: '온라인 등록 예정',
          },
          {
            coverImageAlt: 'Abdominal PHYSICS 대표 이미지',
            coverImageSrc: homeLecture2Src,
            description: '복부 초음파 물리와 시험 대비 핵심 개념을 정리한 과정입니다.',
            difficultyLabel: '입문-중급',
            durationLabel: '온라인 3주',
            featured: true,
            formatLabel: '온라인 이론+스캔',
            id: 'online-course-abdominal-physics',
            kind: 'lecture',
            label: 'Abdominal PHYSICS',
            slug: 'abdominal-physics',
            tags: ['물리', '온라인', '시험 대비'],
            tuitionLabel: '온라인 등록 예정',
          },
          {
            coverImageAlt: '경동맥 초음파 완성 과정 대표 이미지',
            coverImageSrc: homeLecture3Src,
            description: '두경부 온라인 과정 중 경동맥 초음파에 특화된 완성형 과정입니다.',
            difficultyLabel: '중급',
            durationLabel: '온라인 5주',
            formatLabel: '온라인 이론+스캔',
            id: 'online-course-carotid-ultrasound',
            kind: 'lecture',
            label: '경동맥 초음파 완성 과정',
            slug: 'carotid-ultrasound-complete-course',
            tags: ['경동맥', '온라인', '완성 과정'],
            tuitionLabel: '온라인 등록 예정',
          },
          {
            coverImageAlt: '경부 초음파 핵심 과정 대표 이미지',
            coverImageSrc: homeLecture4Src,
            description: '갑상선, 침샘, 림프절을 중심으로 경부 초음파 핵심을 다룹니다.',
            difficultyLabel: '중급',
            durationLabel: '온라인 4주',
            formatLabel: '온라인 이론+스캔',
            id: 'online-course-neck-ultrasound-core',
            kind: 'lecture',
            label: '경부 초음파 핵심 과정 (갑상선·침샘·림프절)',
            slug: 'neck-ultrasound-core',
            tags: ['경부', '온라인', '갑상선'],
            tuitionLabel: '온라인 등록 예정',
          },
        ],
        coverImageAlt: '온라인과정 이론과 스캔 대표 이미지',
        coverImageSrc: homeLecture4Src,
        curatorNote:
          '이론+스캔 트랙은 반복 시청이 필요한 장면을 짧게 끊어 복습할 수 있도록 설계합니다.',
        description: '기초 이론과 실제 스캔 영상을 함께 학습하는 온라인 과정입니다.',
        id: 'online-course-theory-and-scan',
        kicker: 'Online Library',
        kind: 'collection',
        label: '이론+스캔',
        slug: 'theory-and-scan',
        tags: ['온라인', '이론', '스캔 영상'],
      },
      {
        children: [
          {
            coverImageAlt: 'AB 문제풀이 강의 대표 이미지',
            coverImageSrc: homeLecture5Src,
            description: 'AB 시험 유형에 맞춘 문제풀이 중심 강의입니다.',
            difficultyLabel: '중급',
            durationLabel: '온라인 3주',
            formatLabel: '온라인 시험 대비',
            id: 'online-course-ab-problem-solving',
            kind: 'lecture',
            label: 'AB 문제풀이 강의',
            slug: 'ab-problem-solving',
            tags: ['ARDMS', '문제풀이', '온라인'],
            tuitionLabel: '온라인 등록 예정',
          },
          {
            coverImageAlt: '복부 이론 강좌 고급 대표 이미지',
            coverImageSrc: '/SRDMS_OG.png',
            description: 'ARDMS 대비에 필요한 복부 이론을 고급 수준으로 정리합니다.',
            difficultyLabel: '고급',
            durationLabel: '온라인 4주',
            formatLabel: '온라인 시험 대비',
            id: 'online-course-ab-advanced-theory',
            kind: 'lecture',
            label: '복부 이론 강좌 (고급)',
            slug: 'ab-advanced-theory',
            tags: ['ARDMS', '복부', '고급'],
            tuitionLabel: '온라인 등록 예정',
          },
          ...additionalArdmsExamPrepLectureSeeds,
        ],
        coverImageAlt: '온라인과정 ARDMS 시험 대비 대표 이미지',
        coverImageSrc: homeLecture5Src,
        curatorNote:
          '시험 대비 트랙은 문제풀이와 이론 복습을 병행해 합격 이후 임상 연결까지 함께 준비합니다.',
        description: 'ARDMS 관련 문제풀이와 이론 정리에 집중한 온라인 과정입니다.',
        id: 'online-course-ardms-exam-prep',
        kicker: 'Exam Ready',
        kind: 'collection',
        label: 'ARDMS 시험 대비',
        slug: 'ardms-exam-prep',
        tags: ['ARDMS', '시험 대비', '문제풀이'],
      },
      ...additionalOnlineCourseCategorySeeds,
      {
        coverImageAlt: '온라인과정 SPI 시험 대비 대표 이미지',
        coverImageSrc: '/example.png',
        description: 'SPI 시험 대비를 위한 온라인 특강 과정입니다.',
        difficultyLabel: '입문-중급',
        durationLabel: '온라인 2주',
        formatLabel: '온라인 시험 대비',
        id: 'online-course-spi-exam-prep',
        kind: 'lecture',
        label: 'SPI 시험 대비 (재학생 특강)',
        slug: 'spi-exam-prep',
        tags: ['SPI', '온라인', '특강'],
        tuitionLabel: '온라인 등록 예정',
      },
    ],
    coverImageAlt: '온라인과정 대표 이미지',
    coverImageSrc: homeLecture4Src,
    curatorNote:
      '온라인과정은 반복 시청과 시험 대비 정리를 동시에 할 수 있도록 짧은 주제 단위로 구성합니다.',
    description: '온라인으로 수강 가능한 이론, 스캔, 시험 대비 과정을 유형별로 볼 수 있습니다.',
    id: 'online-courses',
    kicker: 'Online Course',
    kind: 'collection',
    label: '온라인과정',
    slug: 'online-course',
    tags: ['온라인', '시험 대비', '반복 복습'],
  },
];

const getStructuralAncestors = (
  ancestors: readonly ProgramCatalogAncestor[],
): ProgramCatalogAncestor[] => {
  const structuralAncestors = ancestors.filter((ancestor) => !ancestor.isSingleLectureHub);

  return structuralAncestors.length ? structuralAncestors : [...ancestors];
};

const getLastStructuralAncestor = (
  ancestors: readonly ProgramCatalogAncestor[],
): ProgramCatalogAncestor | null => {
  return getStructuralAncestors(ancestors).at(-1) ?? null;
};

const createBreadcrumbItems = (ancestors: ProgramCatalogAncestor[]): ProgramBreadcrumbItem[] => {
  return [{ label: '교육과정', to: routePaths.programs }, ...ancestors].reduce<
    ProgramBreadcrumbItem[]
  >((items, currentItem) => {
    const previousItem = items.at(-1);

    if (previousItem?.label === currentItem.label) {
      items[items.length - 1] = currentItem;
      return items;
    }

    items.push(currentItem);
    return items;
  }, []);
};

// seed 데이터는 사람이 읽기 쉬운 "원본 입력"이고,
// hydrate 단계에서는 실제 URL, breadcrumb 조상 정보, 기본 상세 항목을 채워 넣습니다.
const hydrateProgramCatalogNode = (
  seed: ProgramCatalogNodeSeed,
  pathSegments: string[],
  ancestors: ProgramCatalogAncestor[],
): ProgramCatalogNode => {
  const visibility = seed.visibility ?? 'public';
  const to = routePaths.programCatalog(...pathSegments, seed.slug);
  const nextAncestors = [...ancestors, { label: seed.label, to }];

  if (seed.kind === 'collection') {
    return {
      ancestors,
      children: seed.children.map((child) =>
        hydrateProgramCatalogNode(child, [...pathSegments, seed.slug], nextAncestors),
      ),
      coverImageAlt: seed.coverImageAlt,
      coverImageSrc: seed.coverImageSrc,
      curatorNote: seed.curatorNote,
      description: seed.description,
      id: seed.id,
      isSingleLectureHub: seed.isSingleLectureHub,
      kicker: seed.kicker,
      kind: 'collection',
      label: seed.label,
      tags: seed.tags,
      to,
      visibility,
    };
  }

  const scheduleLabel =
    seed.scheduleLabel ?? createDefaultScheduleLabel(seed.id, seed.formatLabel, seed.durationLabel);
  const format = inferAdminProgramFormatFromLabel(seed.formatLabel);
  const accessPolicy = inferAdminProgramAccessPolicy(seed.formatLabel, scheduleLabel);
  const inferredLearningDates = inferLearningDatesFromSchedule(
    scheduleLabel,
    seed.durationLabel,
    accessPolicy,
  );
  const curriculumTrack =
    seed.curriculumTrack ??
    createDefaultCurriculumTrack(seed.label, seed.tags, seed.formatLabel, scheduleLabel);
  const displayText = deriveProgramDisplayText({
    accessPolicy,
    curriculumTrack,
    format,
    learningEndDate: inferredLearningDates.learningEndDate,
    learningStartDate: inferredLearningDates.learningStartDate,
    operationFallbackLabel: seed.operationPeriodLabel ?? scheduleLabel,
    registrationEndDate: null,
    registrationFallbackLabel: seed.registrationPeriodLabel ?? seed.tuitionLabel,
    registrationStartDate: null,
  });

  return {
    ancestors,
    coverImageAlt: seed.coverImageAlt,
    coverImageSrc: seed.coverImageSrc,
    curriculumTrack,
    discountRateLabel:
      seed.discountRateLabel ??
      createDefaultDiscountRateLabel(
        seed.originalPriceLabel ??
          createDefaultOriginalPriceLabel(
            seed.discountedPriceLabel ??
              seed.priceLabel ??
              createDefaultPriceLabel(seed.formatLabel, seed.durationLabel),
          ),
        seed.discountedPriceLabel ??
          seed.priceLabel ??
          createDefaultPriceLabel(seed.formatLabel, seed.durationLabel),
      ),
    discountedPriceLabel:
      seed.discountedPriceLabel ??
      seed.priceLabel ??
      createDefaultPriceLabel(seed.formatLabel, seed.durationLabel),
    description: seed.description,
    difficultyLabel: seed.difficultyLabel,
    durationLabel: seed.durationLabel,
    faqItems: seed.faqItems ?? createDefaultFaqItems(seed.formatLabel, seed.durationLabel),
    featured: seed.featured ?? false,
    formatLabel: seed.formatLabel,
    hashtagLabels:
      seed.hashtagLabels ?? createDefaultHashtagLabels(seed.formatLabel, seed.difficultyLabel),
    id: seed.id,
    kind: 'lecture',
    label: seed.label,
    learningPoints: seed.learningPoints ?? createDefaultLearningPoints(seed.label, seed.tags),
    monthlyInstallmentLabel:
      seed.monthlyInstallmentLabel ??
      createDefaultMonthlyInstallmentLabel(
        seed.discountedPriceLabel ??
          seed.priceLabel ??
          createDefaultPriceLabel(seed.formatLabel, seed.durationLabel),
      ),
    originalPriceLabel:
      seed.originalPriceLabel ??
      createDefaultOriginalPriceLabel(
        seed.discountedPriceLabel ??
          seed.priceLabel ??
          createDefaultPriceLabel(seed.formatLabel, seed.durationLabel),
      ),
    operationPeriodLabel:
      seed.operationPeriodLabel ?? displayText.operationPeriodLabel ?? undefined,
    priceLabel: seed.priceLabel ?? createDefaultPriceLabel(seed.formatLabel, seed.durationLabel),
    preparationChecklist:
      seed.preparationChecklist ?? createDefaultPreparationChecklist(seed.formatLabel),
    remainingSeatsCount:
      seed.remainingSeatsCount ?? createDefaultRemainingSeatsCount(seed.id, seed.formatLabel),
    remainingSeatsLabel:
      seed.remainingSeatsLabel ??
      createDefaultRemainingSeatsLabel(
        seed.remainingSeatsCount ?? createDefaultRemainingSeatsCount(seed.id, seed.formatLabel),
      ),
    registrationPeriodLabel: seed.registrationPeriodLabel ?? displayText.registrationPeriodLabel,
    recommendedFor:
      seed.recommendedFor ??
      createDefaultRecommendedFor(seed.label, seed.difficultyLabel, seed.formatLabel),
    scheduleLabel: displayText.scheduleLabel,
    stats:
      seed.stats ??
      createDefaultStats(
        seed.formatLabel,
        seed.durationLabel,
        seed.difficultyLabel,
        seed.tuitionLabel,
      ),
    tags: seed.tags,
    to,
    tuitionLabel: seed.tuitionLabel,
    visibility,
  };
};

const hydrateProgramCatalogTree = (seeds: ProgramCatalogNodeSeed[]): ProgramCatalogNode[] => {
  return seeds.map((seed) => hydrateProgramCatalogNode(seed, [], []));
};

const buildManagedProgramPublicPath = (parentCollectionPath: string, slug: string): string => {
  return `${normalizeProgramPath(parentCollectionPath)}/${slug}`.replace(/\/{2,}/g, '/');
};

const toManagedProgramLectureSeed = (
  program: MockManagedProgramCatalogRecord,
): ProgramCatalogLectureSeed => {
  const normalizedCapacity = normalizeManagedCapacity(
    program.format,
    program.capacity,
    program.soldCount,
  );
  const remainingSeats = getManagedRemainingSeats(
    program.format,
    normalizedCapacity,
    program.soldCount,
  );

  return {
    coverImageAlt: program.heroImageAlt,
    coverImageSrc: program.heroImageSrc,
    curriculumTrack: program.curriculumTrack,
    description: program.description,
    difficultyLabel: program.difficultyLabel,
    discountRateLabel: calculateDiscountRateLabel(program.originalPrice, program.price),
    discountedPriceLabel: formatMockPriceLabel(program.price),
    durationLabel: program.durationLabel,
    faqItems: program.faqItems,
    formatLabel: program.formatLabel,
    hashtagLabels: program.hashtagLabels,
    id: program.id,
    kind: 'lecture',
    label: program.title,
    learningPoints: program.learningPoints,
    monthlyInstallmentLabel: buildMonthlyInstallmentLabel(program.price),
    originalPriceLabel: formatMockPriceLabel(program.originalPrice),
    operationPeriodLabel: program.operationPeriodLabel,
    priceLabel: formatMockPriceLabel(program.price),
    preparationChecklist: program.preparationChecklist,
    remainingSeatsCount: remainingSeats === null ? undefined : remainingSeats,
    remainingSeatsLabel:
      remainingSeats === null ? undefined : `수강 가능 인원 ${String(remainingSeats)}명 남음`,
    registrationPeriodLabel: program.registrationPeriodLabel,
    recommendedFor: program.recommendedFor,
    scheduleLabel: program.scheduleLabel,
    slug: program.slug,
    stats: program.stats,
    tags: program.tags,
    tuitionLabel: program.tuitionLabel,
    visibility: toProgramVisibilityFromStatus(program.status),
  };
};

const getProgramCatalogBaseTree = (siteKey: string): ProgramCatalogNode[] => {
  const cachedTree = programCatalogBaseTreeCacheBySite.get(siteKey);

  if (cachedTree) {
    return cachedTree;
  }

  const tree = hydrateProgramCatalogTree(getProgramCatalogSeeds(siteKey));
  const managedPrograms = getManagedPrograms(siteKey);

  managedPrograms.forEach((program) => {
    const normalizedParentPath = normalizeProgramPath(program.parentCollectionPath);
    const parentCollection = findProgramCatalogNodeByPath(normalizedParentPath, tree, true);

    if (!parentCollection || parentCollection.kind !== 'collection') {
      return;
    }

    const parentSegments = parentCollection.to
      .replace(/^\/programs\/?/, '')
      .split('/')
      .filter(Boolean);
    const nextAncestors = [
      ...parentCollection.ancestors,
      { label: parentCollection.label, to: parentCollection.to },
    ];

    parentCollection.children.push(
      hydrateProgramCatalogNode(
        toManagedProgramLectureSeed(program),
        parentSegments,
        nextAncestors,
      ),
    );
  });

  programCatalogBaseTreeCacheBySite.set(siteKey, tree);

  return tree;
};

const buildProgramCatalogPublicTree = (
  nodes: readonly ProgramCatalogNode[],
): ProgramCatalogNode[] => {
  return nodes.map((node) => {
    if (node.kind === 'collection') {
      return {
        ...node,
        children: buildProgramCatalogPublicTree(node.children),
      };
    }

    return node;
  });
};

const getProgramCatalogPublicTree = (siteKey: string): ProgramCatalogNode[] => {
  return buildProgramCatalogPublicTree(getProgramCatalogBaseTree(siteKey));
};

const normalizeProgramPath = (path: string): string => {
  if (!path || path === '/') {
    return routePaths.programs;
  }

  const normalizedPath = path.replace(/\/+$/, '');

  return normalizedPath.length ? normalizedPath : routePaths.programs;
};

interface LectureSeedEntry {
  lecture: ProgramCatalogLectureSeed;
  parentCollectionPath: string;
}

const parsePriceLabelAmount = (label: string | undefined, fallback: number): number => {
  const amount = Number(label?.replace(/[^\d]/g, '') ?? '');

  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
};

const inferAdminProgramFormatFromLabel = (formatLabel: string): AdminProgramFormat => {
  if (formatLabel.includes('실습 포함')) {
    return 'hybrid';
  }

  if (formatLabel.includes('온라인')) {
    return 'online';
  }

  return 'offline';
};

const inferAdminProgramAccessPolicy = (
  formatLabel: string,
  scheduleLabel: string,
): AdminProgramAccessPolicy => {
  if (formatLabel.includes('무제한') || scheduleLabel.includes('무제한')) {
    return 'unlimited';
  }

  if (formatLabel.includes('온라인')) {
    return 'limited-window';
  }

  return 'cohort';
};

const parseDateLabel = (rawValue: string): string | null => {
  const dayMatch = rawValue.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);

  if (dayMatch) {
    return `${dayMatch[1]}-${dayMatch[2]}-${dayMatch[3]}`;
  }

  const monthMatch = rawValue.match(/^(\d{4})\.(\d{2})$/);

  if (!monthMatch) {
    return null;
  }

  return `${monthMatch[1]}-${monthMatch[2]}-01`;
};

const getLastIsoDateOfMonth = (rawValue: string): string | null => {
  const monthMatch = rawValue.match(/^(\d{4})\.(\d{2})$/);

  if (!monthMatch) {
    return null;
  }

  const year = Number(monthMatch[1]);
  const month = Number(monthMatch[2]);
  const lastDay = new Date(Date.UTC(year, month, 0));

  return `${String(lastDay.getUTCFullYear())}-${String(lastDay.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(lastDay.getUTCDate()).padStart(2, '0')}`;
};

const addIsoDays = (isoDate: string, days: number): string | null => {
  const parsedDate = new Date(`${isoDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const nextDate = addUtcDays(parsedDate, days);

  return `${String(nextDate.getUTCFullYear())}-${String(nextDate.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(nextDate.getUTCDate()).padStart(2, '0')}`;
};

const inferLearningDatesFromSchedule = (
  scheduleLabel: string,
  durationLabel: string,
  accessPolicy: AdminProgramAccessPolicy,
): {
  learningEndDate: string | null;
  learningStartDate: string | null;
} => {
  if (accessPolicy === 'unlimited') {
    return {
      learningEndDate: null,
      learningStartDate: null,
    };
  }

  const fullRangeMatch = scheduleLabel.match(
    /(\d{4}\.\d{2}\.\d{2})\s*-\s*(\d{4}\.\d{2}\.\d{2})\s*진행/,
  );

  if (fullRangeMatch) {
    return {
      learningEndDate: parseDateLabel(fullRangeMatch[2]),
      learningStartDate: parseDateLabel(fullRangeMatch[1]),
    };
  }

  const monthRangeMatch = scheduleLabel.match(/(\d{4}\.\d{2})\s*-\s*(\d{4}\.\d{2})\s*진행/);

  if (monthRangeMatch) {
    return {
      learningEndDate: getLastIsoDateOfMonth(monthRangeMatch[2]),
      learningStartDate: parseDateLabel(monthRangeMatch[1]),
    };
  }

  const startOnlyMatch = scheduleLabel.match(/(\d{4}\.\d{2}\.\d{2})\s*시작/);

  if (startOnlyMatch) {
    const learningStartDate = parseDateLabel(startOnlyMatch[1]);
    const weekMatch = durationLabel.match(/(\d+)주/);
    const dayMatch = durationLabel.match(/(\d+)일/);

    if (learningStartDate && weekMatch) {
      return {
        learningEndDate: addIsoDays(learningStartDate, Number(weekMatch[1]) * 7 - 1),
        learningStartDate,
      };
    }

    if (learningStartDate && dayMatch) {
      return {
        learningEndDate: addIsoDays(learningStartDate, Number(dayMatch[1]) - 1),
        learningStartDate,
      };
    }

    return {
      learningEndDate: null,
      learningStartDate,
    };
  }

  if (scheduleLabel.includes('1년간 수강 가능')) {
    return {
      learningEndDate: '2026-12-31',
      learningStartDate: '2026-01-01',
    };
  }

  return {
    learningEndDate: '2026-06-30',
    learningStartDate: '2026-05-01',
  };
};

const collectLectureSeedEntries = (
  nodes: readonly ProgramCatalogNodeSeed[],
  parentCollectionPath: string = routePaths.programs,
): LectureSeedEntry[] => {
  return nodes.flatMap((node) => {
    if (node.kind === 'lecture') {
      return [
        {
          lecture: node,
          parentCollectionPath,
        },
      ];
    }

    const nextPath = routePaths.programCatalog(
      ...normalizeProgramPath(parentCollectionPath)
        .replace(/^\/programs\/?/, '')
        .split('/')
        .filter(Boolean),
      node.slug,
    );

    return collectLectureSeedEntries(node.children, nextPath);
  });
};

const createSiteLinkedProgramRecord = (
  entry: LectureSeedEntry,
): MockSiteLinkedProgramCatalogRecord => {
  const format = inferAdminProgramFormatFromLabel(entry.lecture.formatLabel);
  const accessPolicy = inferAdminProgramAccessPolicy(
    entry.lecture.formatLabel,
    entry.lecture.scheduleLabel ??
      createDefaultScheduleLabel(
        entry.lecture.id,
        entry.lecture.formatLabel,
        entry.lecture.durationLabel,
      ),
  );
  const soldCountSeed = Array.from(entry.lecture.id).reduce((accumulator, character) => {
    return accumulator + character.charCodeAt(0);
  }, 0);
  const soldCount = format === 'online' ? (soldCountSeed % 16) + 12 : (soldCountSeed % 10) + 6;
  const remainingSeats =
    entry.lecture.remainingSeatsCount ??
    createDefaultRemainingSeatsCount(entry.lecture.id, entry.lecture.formatLabel) ??
    null;
  const { learningEndDate, learningStartDate } = inferLearningDatesFromSchedule(
    entry.lecture.scheduleLabel ??
      createDefaultScheduleLabel(
        entry.lecture.id,
        entry.lecture.formatLabel,
        entry.lecture.durationLabel,
      ),
    entry.lecture.durationLabel,
    accessPolicy,
  );

  return {
    accessPolicy,
    capacity: format === 'online' ? null : Math.max((remainingSeats ?? 0) + soldCount, soldCount),
    format,
    id: entry.lecture.id,
    learningEndDate,
    learningStartDate,
    originalPrice: parsePriceLabelAmount(
      entry.lecture.originalPriceLabel ??
        createDefaultOriginalPriceLabel(
          entry.lecture.priceLabel ??
            createDefaultPriceLabel(entry.lecture.formatLabel, entry.lecture.durationLabel),
        ),
      1_290_000,
    ),
    price: parsePriceLabelAmount(
      entry.lecture.priceLabel ??
        createDefaultPriceLabel(entry.lecture.formatLabel, entry.lecture.durationLabel),
      990_000,
    ),
    registrationEndDate: learningStartDate ? addIsoDays(learningStartDate, -1) : null,
    registrationStartDate: learningStartDate ? addIsoDays(learningStartDate, -21) : null,
    soldCount,
    status: entry.lecture.visibility === 'hidden' ? 'hidden' : 'published',
    updatedAt: '2026-03-16',
  };
};

const getSiteLinkedPrograms = (siteKey: string): MockSiteLinkedProgramCatalogRecord[] => {
  const existing = siteLinkedProgramsBySite.get(siteKey) ?? [];
  const existingMap = new Map(existing.map((program) => [program.id, program]));
  const nextPrograms = collectLectureSeedEntries(getProgramCatalogSeeds(siteKey)).map((entry) => {
    const currentRecord = existingMap.get(entry.lecture.id);

    if (currentRecord) {
      return currentRecord;
    }

    return createSiteLinkedProgramRecord(entry);
  });

  siteLinkedProgramsBySite.set(siteKey, nextPrograms);

  return nextPrograms;
};

const getSiteLinkedProgramRecord = (
  siteKey: string,
  programId: string,
): MockSiteLinkedProgramCatalogRecord | null => {
  return getSiteLinkedPrograms(siteKey).find((program) => program.id === programId) ?? null;
};

const isLeafHubCollectionNode = (node: ProgramCatalogCollectionNode): boolean => {
  return (
    node.isSingleLectureHub === true ||
    (node.children.some((child) => child.kind === 'lecture') &&
      node.children.every((child) => child.kind !== 'collection'))
  );
};

const slugifyProgramPathSegment = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

interface ProgramCatalogCollectionSeedMatch {
  depth: number;
  index: number;
  node: ProgramCatalogCollectionSeed;
  parentChildren: ProgramCatalogNodeSeed[];
  parentId: string | null;
  path: string;
  pathSegments: string[];
}

type ProgramMenuMutationFailureReason =
  | 'cannot-move-to-descendant'
  | 'duplicate-slug'
  | 'has-child-menus'
  | 'has-linked-programs'
  | 'menu-not-found'
  | 'parent-not-found'
  | 'parent-has-linked-programs'
  | 'reorder-limit'
  | 'top-level-limit-exceeded'
  | 'unsupported-depth';

type ProgramMenuMutationResult =
  | { ok: true; item: AdminProgramMenuItem }
  | { ok: false; reason: ProgramMenuMutationFailureReason };

type ProgramMoveFailureReason =
  | 'program-not-found'
  | 'target-collection-cannot-contain-programs'
  | 'target-collection-not-found';

type ProgramMoveMutationResult =
  | { ok: true; item: AdminProgramMenuLinkedProgram }
  | { ok: false; reason: ProgramMoveFailureReason };

interface ProgramCatalogLectureSeedMatch {
  index: number;
  node: ProgramCatalogLectureSeed;
  parentCollection: ProgramCatalogCollectionSeed;
  parentPath: string;
}

const findCollectionSeedMatchById = (
  nodes: ProgramCatalogNodeSeed[],
  targetId: string,
  parentId: string | null = null,
  pathSegments: string[] = [],
  depth = 1,
): ProgramCatalogCollectionSeedMatch | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];

    if (node.kind !== 'collection') {
      continue;
    }

    const nextPathSegments = [...pathSegments, node.slug];

    if (node.id === targetId) {
      return {
        depth,
        index,
        node,
        parentChildren: nodes,
        parentId,
        path: routePaths.programCatalog(...nextPathSegments),
        pathSegments: nextPathSegments,
      };
    }

    const nestedMatch = findCollectionSeedMatchById(
      node.children,
      targetId,
      node.id,
      nextPathSegments,
      depth + 1,
    );

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
};

const findLectureSeedMatchById = (
  nodes: ProgramCatalogNodeSeed[],
  targetId: string,
  parentPath: string = routePaths.programs,
): ProgramCatalogLectureSeedMatch | null => {
  for (const node of nodes) {
    if (node.kind !== 'collection') {
      continue;
    }

    const nextPath = routePaths.programCatalog(
      ...normalizeProgramPath(parentPath)
        .replace(/^\/programs\/?/, '')
        .split('/')
        .filter(Boolean),
      node.slug,
    );

    for (let index = 0; index < node.children.length; index += 1) {
      const child = node.children[index];

      if (child.kind === 'lecture' && child.id === targetId) {
        return {
          index,
          node: child,
          parentCollection: node,
          parentPath: nextPath,
        };
      }
    }

    const nestedMatch = findLectureSeedMatchById(node.children, targetId, nextPath);

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
};

const getCollectionSubtreeHeight = (node: ProgramCatalogCollectionSeed): number => {
  const childCollectionHeights = node.children
    .filter((child): child is ProgramCatalogCollectionSeed => child.kind === 'collection')
    .map(getCollectionSubtreeHeight);

  return childCollectionHeights.length ? 1 + Math.max(...childCollectionHeights) : 1;
};

const getDirectCollectionChildren = (
  children: readonly ProgramCatalogNodeSeed[],
): ProgramCatalogCollectionSeed[] => {
  return children.filter(
    (child): child is ProgramCatalogCollectionSeed => child.kind === 'collection',
  );
};

const getDirectLectureChildren = (
  children: readonly ProgramCatalogNodeSeed[],
): ProgramCatalogLectureSeed[] => {
  return children.filter((child): child is ProgramCatalogLectureSeed => child.kind === 'lecture');
};

const hasChildCollectionSeeds = (node: ProgramCatalogCollectionSeed): boolean => {
  return getDirectCollectionChildren(node.children).length > 0;
};

const hasLinkedLectureSeeds = (node: ProgramCatalogCollectionSeed): boolean => {
  return getDirectLectureChildren(node.children).length > 0;
};

const relabelLegacyDetailLectureSeed = (
  node: ProgramCatalogCollectionSeed,
  nextLabel: string,
  nextDescription: string,
): void => {
  const directLectures = getDirectLectureChildren(node.children);

  if (
    directLectures.length === 1 &&
    directLectures[0]?.slug === PROGRAM_DETAIL_SLUG &&
    node.isSingleLectureHub
  ) {
    directLectures[0].label = nextLabel;
    directLectures[0].description = nextDescription;
    directLectures[0].coverImageAlt = `${nextLabel} 대표 이미지`;
    directLectures[0].tags = [nextLabel, '교육과정', '강의'];
  }
};

const ensureUniqueLectureSlug = (
  siblings: readonly ProgramCatalogNodeSeed[],
  desiredSlug: string,
  fallbackLabel: string,
  excludeId?: string,
): string => {
  const normalizedBase =
    slugifyProgramPathSegment(desiredSlug) || slugifyProgramPathSegment(fallbackLabel);
  let nextSlug = normalizedBase || 'lecture';
  let suffix = 2;

  while (
    siblings.some(
      (sibling) =>
        sibling.kind === 'lecture' && sibling.id !== excludeId && sibling.slug === nextSlug,
    )
  ) {
    nextSlug = `${normalizedBase}-${String(suffix)}`;
    suffix += 1;
  }

  return nextSlug;
};

const rewriteManagedProgramParentPaths = (
  siteKey: string,
  previousCollectionPath: string,
  nextCollectionPath: string,
): void => {
  const managedPrograms = getManagedPrograms(siteKey);

  managedPrograms.forEach((program) => {
    const normalizedParentPath = normalizeProgramPath(program.parentCollectionPath);

    if (
      normalizedParentPath === previousCollectionPath ||
      normalizedParentPath.startsWith(`${previousCollectionPath}/`)
    ) {
      program.parentCollectionPath = normalizedParentPath.replace(
        previousCollectionPath,
        nextCollectionPath,
      );
    }
  });
};

const countLectureNodes = (nodes: readonly ProgramCatalogNode[]): number => {
  return nodes.reduce((total, node) => {
    if (node.kind === 'lecture') {
      return total + 1;
    }

    return total + countLectureNodes(node.children);
  }, 0);
};

const toAdminProgramMenuStatus = (visibility: ProgramVisibility): AdminProgramMenuStatus => {
  return visibility === 'public' ? 'published' : 'hidden';
};

const toProgramVisibilityFromStatus = (status: AdminProgramStatus): ProgramVisibility => {
  return status === 'published' ? 'public' : 'hidden';
};

const createProgramMenuCollectionSeed = (
  payload: CreateAdminProgramMenuPayload,
): ProgramCatalogCollectionSeed => {
  return {
    children: [],
    coverImageAlt: `${payload.label} 대표 이미지`,
    coverImageSrc: '/SRDMS_OG.png',
    curatorNote: `${payload.label} 메뉴를 통해 연결되는 교육과정 구성을 관리합니다.`,
    description: payload.description,
    id: createProgramMenuId(),
    kicker: 'Program Menu',
    kind: 'collection',
    label: payload.label,
    slug: payload.slug,
    tags: [payload.label, '교육과정', '메뉴'],
    visibility: payload.status === 'published' ? 'public' : 'hidden',
  };
};

const isVisibleProgramNode = (node: ProgramCatalogNode): boolean => {
  return node.visibility === 'public';
};

const getVisibleChildNodes = (node: ProgramCatalogCollectionNode): ProgramCatalogNode[] => {
  return node.children.filter(isVisibleProgramNode);
};

const collectVisibleLectures = (
  nodes: readonly ProgramCatalogNode[],
): ProgramCatalogLectureNode[] => {
  return nodes.flatMap((node) => {
    if (!isVisibleProgramNode(node)) {
      return [];
    }

    if (node.kind === 'lecture') {
      return [node];
    }

    return collectVisibleLectures(getVisibleChildNodes(node));
  });
};

const selectProgramOverviewFeaturedLectures = (
  lectures: readonly ProgramCatalogLectureNode[],
): ProgramCatalogLectureNode[] => {
  const lectureById = new Map(lectures.map((lecture) => [lecture.id, lecture]));
  const selectedLectures: ProgramCatalogLectureNode[] = [];

  PROGRAM_OVERVIEW_FEATURED_LECTURE_IDS.forEach((lectureId) => {
    const lecture = lectureById.get(lectureId);

    if (!lecture) {
      return;
    }

    selectedLectures.push(lecture);
  });

  if (selectedLectures.length >= PROGRAM_OVERVIEW_FEATURED_LECTURE_LIMIT) {
    return selectedLectures.slice(0, PROGRAM_OVERVIEW_FEATURED_LECTURE_LIMIT);
  }

  const selectedIds = new Set(selectedLectures.map((lecture) => lecture.id));

  lectures
    .filter((lecture) => lecture.featured && !selectedIds.has(lecture.id))
    .forEach((lecture) => {
      if (selectedLectures.length >= PROGRAM_OVERVIEW_FEATURED_LECTURE_LIMIT) {
        return;
      }

      selectedLectures.push(lecture);
      selectedIds.add(lecture.id);
    });

  if (selectedLectures.length >= PROGRAM_OVERVIEW_FEATURED_LECTURE_LIMIT) {
    return selectedLectures;
  }

  lectures.forEach((lecture) => {
    if (selectedLectures.length >= PROGRAM_OVERVIEW_FEATURED_LECTURE_LIMIT) {
      return;
    }

    if (selectedIds.has(lecture.id)) {
      return;
    }

    selectedLectures.push(lecture);
    selectedIds.add(lecture.id);
  });

  return selectedLectures;
};

const collectLectures = (nodes: readonly ProgramCatalogNode[]): ProgramCatalogLectureNode[] => {
  return nodes.flatMap((node) => {
    if (node.kind === 'lecture') {
      return [node];
    }

    return collectLectures(node.children);
  });
};

const collectVisibleCollections = (
  nodes: readonly ProgramCatalogNode[],
  includeTopLevel = true,
): ProgramCatalogCollectionNode[] => {
  return nodes.flatMap((node) => {
    if (!isVisibleProgramNode(node) || node.kind !== 'collection') {
      return [];
    }

    const nestedCollections = collectVisibleCollections(getVisibleChildNodes(node), true);

    return includeTopLevel ? [node, ...nestedCollections] : nestedCollections;
  });
};

const collectAdminCollections = (
  nodes: readonly ProgramCatalogNode[],
  includeTopLevel = true,
): ProgramCatalogCollectionNode[] => {
  return nodes.flatMap((node) => {
    if (node.kind !== 'collection') {
      return [];
    }

    const nestedCollections = collectAdminCollections(node.children, true);

    return includeTopLevel ? [node, ...nestedCollections] : nestedCollections;
  });
};

const findProgramCatalogNodeByPath = (
  path: string,
  nodes: readonly ProgramCatalogNode[],
  includeHidden = false,
): ProgramCatalogNode | null => {
  const normalizedPath = normalizeProgramPath(path);

  for (const node of nodes) {
    if (!includeHidden && !isVisibleProgramNode(node)) {
      continue;
    }

    if (node.to === normalizedPath) {
      return node;
    }

    if (node.kind === 'collection') {
      const nextChildren = includeHidden ? node.children : getVisibleChildNodes(node);
      const nestedMatch = findProgramCatalogNodeByPath(normalizedPath, nextChildren, includeHidden);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
  }

  return null;
};

const toProgramLectureCard = (lecture: ProgramCatalogLectureNode): ProgramLectureCard => {
  const categoryAncestors = getStructuralAncestors(lecture.ancestors);
  const categoryLabel = categoryAncestors.at(-1)?.label ?? '교육과정';

  return {
    categoryLabel,
    difficultyLabel: lecture.difficultyLabel,
    durationLabel: lecture.durationLabel,
    formatLabel: lecture.formatLabel,
    hashtagLabels: lecture.hashtagLabels,
    id: lecture.id,
    priceLabel: lecture.priceLabel,
    remainingSeatsCount: lecture.remainingSeatsCount,
    remainingSeatsLabel: lecture.remainingSeatsLabel,
    scheduleLabel: lecture.scheduleLabel,
    summary: lecture.description,
    tags: lecture.tags,
    thumbnailAlt: lecture.coverImageAlt,
    thumbnailSrc: lecture.coverImageSrc,
    title: lecture.label,
    to: lecture.to,
  };
};

const toProgramCollectionCard = (
  collection: ProgramCatalogCollectionNode,
): ProgramCollectionCard => {
  const lectures = collectVisibleLectures(getVisibleChildNodes(collection));
  const uniqueFormatLabels = Array.from(new Set(lectures.map((lecture) => lecture.formatLabel)));
  const focusTags = Array.from(new Set(lectures.flatMap((lecture) => lecture.tags))).slice(0, 4);

  return {
    coverImageAlt: collection.coverImageAlt,
    coverImageSrc: collection.coverImageSrc,
    description: collection.description,
    formatLabels: uniqueFormatLabels.slice(0, 3),
    id: collection.id,
    lectureCount: lectures.length,
    tags: focusTags.length ? focusTags : collection.tags.slice(0, 4),
    title: collection.label,
    to: collection.to,
  };
};

const buildCollectionStats = (collection: ProgramCatalogCollectionNode): ProgramStat[] => {
  const lectures = collectVisibleLectures(getVisibleChildNodes(collection));
  const childCollections = getVisibleChildNodes(collection).filter(
    (node): node is ProgramCatalogCollectionNode => node.kind === 'collection',
  );
  const uniqueFormats = Array.from(new Set(lectures.map((lecture) => lecture.formatLabel)));

  return [
    { label: '전체 강의', value: `${String(lectures.length)}개` },
    { label: '세부 트랙', value: `${String(childCollections.length)}개` },
    {
      label: '운영 방식',
      value: uniqueFormats.length ? uniqueFormats.slice(0, 2).join(' / ') : '단일 과정',
    },
    { label: '운영 기준', value: '장은희 강사 단독 운영' },
  ];
};

const buildRelatedLectureCardsWithTree = (
  lecture: ProgramCatalogLectureNode,
  tree: ProgramCatalogNode[],
): ProgramLectureCard[] => {
  const siblingCollectionPath = getLastStructuralAncestor(lecture.ancestors)?.to;
  const siblingCollection = siblingCollectionPath
    ? findProgramCatalogNodeByPath(siblingCollectionPath, tree)
    : null;

  if (siblingCollection?.kind === 'collection') {
    const siblingLectures = collectVisibleLectures(getVisibleChildNodes(siblingCollection))
      .filter((candidate) => candidate.id !== lecture.id)
      .slice(0, 3);

    if (siblingLectures.length) {
      return siblingLectures.map(toProgramLectureCard);
    }
  }

  return collectVisibleLectures(tree)
    .filter((candidate) => candidate.id !== lecture.id)
    .slice(0, 3)
    .map(toProgramLectureCard);
};

const buildProgramPageResponse = (siteKey: string, path: string): ProgramPageResponse | null => {
  const tree = getProgramCatalogPublicTree(siteKey);
  const matchedNode = findProgramCatalogNodeByPath(path, tree);

  if (!matchedNode) {
    return null;
  }

  if (matchedNode.kind === 'lecture') {
    const categoryLabel = getLastStructuralAncestor(matchedNode.ancestors)?.label ?? '교육과정';

    return {
      breadcrumbItems: createBreadcrumbItems([
        ...matchedNode.ancestors,
        { label: matchedNode.label, to: matchedNode.to },
      ]),
      categoryLabel,
      curriculumTrack: matchedNode.curriculumTrack,
      description: matchedNode.description,
      difficultyLabel: matchedNode.difficultyLabel,
      discountRateLabel: matchedNode.discountRateLabel,
      discountedPriceLabel: matchedNode.discountedPriceLabel,
      durationLabel: matchedNode.durationLabel,
      faqItems: matchedNode.faqItems,
      formatLabel: matchedNode.formatLabel,
      hashtagLabels: matchedNode.hashtagLabels,
      heroImageAlt: matchedNode.coverImageAlt,
      heroImageSrc: matchedNode.coverImageSrc,
      instructor: programInstructorProfile,
      kicker: `${categoryLabel} | ${matchedNode.formatLabel}`,
      learningPoints: matchedNode.learningPoints,
      monthlyInstallmentLabel: matchedNode.monthlyInstallmentLabel,
      operationPeriodLabel: matchedNode.operationPeriodLabel,
      originalPriceLabel: matchedNode.originalPriceLabel,
      overallRating: 5.0,
      pageKind: 'detail',
      preparationChecklist: matchedNode.preparationChecklist,
      remainingSeatsLabel: matchedNode.remainingSeatsLabel,
      registrationPeriodLabel: matchedNode.registrationPeriodLabel,
      recommendedFor: matchedNode.recommendedFor,
      relatedLectures: buildRelatedLectureCardsWithTree(matchedNode, tree),
      reviewCount: 9999,
      reviews: createDefaultReviews(matchedNode.label),
      scheduleLabel: matchedNode.scheduleLabel,
      stats: matchedNode.stats,
      tags: matchedNode.tags,
      title: matchedNode.label,
      tuitionLabel: matchedNode.tuitionLabel,
    } satisfies ProgramDetailPageResponse;
  }

  const childNodes = getVisibleChildNodes(matchedNode);
  const childCollections = childNodes.filter(
    (node): node is ProgramCatalogCollectionNode => node.kind === 'collection',
  );
  const lectures = collectVisibleLectures(childNodes);
  const focusTags = Array.from(new Set(lectures.flatMap((lecture) => lecture.tags))).slice(0, 6);

  return {
    breadcrumbItems: createBreadcrumbItems([
      ...matchedNode.ancestors,
      { label: matchedNode.label, to: matchedNode.to },
    ]),
    childCollections: childCollections.map(toProgramCollectionCard),
    curatorNote: matchedNode.curatorNote,
    description: matchedNode.description,
    focusTags,
    heroImageAlt: matchedNode.coverImageAlt,
    heroImageSrc: matchedNode.coverImageSrc,
    instructor: programInstructorProfile,
    kicker: matchedNode.kicker,
    lectures: lectures.map(toProgramLectureCard),
    pageKind: 'collection',
    stats: buildCollectionStats(matchedNode),
    title: matchedNode.label,
  } satisfies ProgramCollectionPageResponse;
};

const toAdminManagedProgramDetailItem = (
  siteKey: string,
  program: MockManagedProgramCatalogRecord,
): AdminProgramDetailItem | null => {
  const tree = getProgramCatalogBaseTree(siteKey);
  const parentCollection = findProgramCatalogNodeByPath(program.parentCollectionPath, tree, true);

  if (!parentCollection || parentCollection.kind !== 'collection') {
    return null;
  }

  const normalizedCapacity = normalizeManagedCapacity(
    program.format,
    program.capacity,
    program.soldCount,
  );
  const remainingSeats = getManagedRemainingSeats(
    program.format,
    normalizedCapacity,
    program.soldCount,
  );

  return {
    accessPolicy: program.accessPolicy,
    capacity: normalizedCapacity,
    canDelete: true,
    canDuplicate: true,
    canEdit: true,
    curriculumTrack: program.curriculumTrack,
    description: program.description,
    difficultyLabel: program.difficultyLabel,
    discountRateLabel: calculateDiscountRateLabel(program.originalPrice, program.price),
    discountedPriceLabel: formatMockPriceLabel(program.price),
    durationLabel: program.durationLabel,
    faqItems: cloneData(program.faqItems),
    format: program.format,
    formatLabel: program.formatLabel,
    hashtagLabels: [...program.hashtagLabels],
    heroImageAlt: program.heroImageAlt,
    heroImageSrc: program.heroImageSrc,
    id: program.id,
    learningPoints: [...program.learningPoints],
    learningEndDate: program.learningEndDate,
    learningStartDate: program.learningStartDate,
    monthlyInstallmentLabel: buildMonthlyInstallmentLabel(program.price),
    monthlySoldCount: getMonthlySoldCount(program.soldCount),
    origin: 'managed',
    operationPeriodLabel: program.operationPeriodLabel,
    originalPrice: program.originalPrice,
    originalPriceLabel: formatMockPriceLabel(program.originalPrice),
    parentCollectionLabel: parentCollection.label,
    parentCollectionPath: normalizeProgramPath(program.parentCollectionPath),
    preparationChecklist: [...program.preparationChecklist],
    price: program.price,
    priceLabel: formatMockPriceLabel(program.price),
    publicPath: buildManagedProgramPublicPath(program.parentCollectionPath, program.slug),
    registrationEndDate: program.registrationEndDate,
    registrationPeriodLabel: program.registrationPeriodLabel,
    registrationStartDate: program.registrationStartDate,
    recommendedFor: [...program.recommendedFor],
    remainingSeats,
    remainingSeatsLabel:
      remainingSeats === null
        ? '온라인 상시 판매'
        : `수강 가능 인원 ${String(remainingSeats)}명 남음`,
    scheduleLabel: program.scheduleLabel,
    slug: program.slug,
    soldCount: program.soldCount,
    stats: cloneData(program.stats),
    status: program.status,
    tags: [...program.tags],
    title: program.title,
    tuitionLabel: program.tuitionLabel,
    updatedAt: program.updatedAt,
  };
};

const toAdminSiteProgramDetailItem = (
  siteKey: string,
  program: MockSiteLinkedProgramCatalogRecord,
): AdminProgramDetailItem | null => {
  const tree = getProgramCatalogBaseTree(siteKey);
  const lecture = collectLectures(tree).find((item) => item.id === program.id);
  const parentAncestor = lecture ? getImmediateParentAncestor(lecture) : null;

  if (!lecture) {
    return null;
  }

  const normalizedCapacity = normalizeManagedCapacity(
    program.format,
    program.capacity,
    program.soldCount,
  );
  const remainingSeats = getManagedRemainingSeats(
    program.format,
    normalizedCapacity,
    program.soldCount,
  );

  return {
    accessPolicy: program.accessPolicy,
    capacity: normalizedCapacity,
    canDelete: true,
    canDuplicate: true,
    canEdit: true,
    curriculumTrack: cloneData(lecture.curriculumTrack),
    description: lecture.description,
    difficultyLabel: lecture.difficultyLabel,
    discountRateLabel: calculateDiscountRateLabel(program.originalPrice, program.price),
    discountedPriceLabel: formatMockPriceLabel(program.price),
    durationLabel: lecture.durationLabel,
    faqItems: cloneData(lecture.faqItems),
    format: program.format,
    formatLabel: lecture.formatLabel,
    hashtagLabels: [...lecture.hashtagLabels],
    heroImageAlt: lecture.coverImageAlt,
    heroImageSrc: lecture.coverImageSrc,
    id: program.id,
    learningPoints: [...lecture.learningPoints],
    learningEndDate: program.learningEndDate,
    learningStartDate: program.learningStartDate,
    monthlyInstallmentLabel: buildMonthlyInstallmentLabel(program.price),
    monthlySoldCount: getMonthlySoldCount(program.soldCount),
    origin: 'site',
    operationPeriodLabel: lecture.operationPeriodLabel,
    originalPrice: program.originalPrice,
    originalPriceLabel: formatMockPriceLabel(program.originalPrice),
    parentCollectionLabel: parentAncestor?.label ?? '교육과정',
    parentCollectionPath: parentAncestor?.to ?? routePaths.programs,
    preparationChecklist: [...lecture.preparationChecklist],
    price: program.price,
    priceLabel: formatMockPriceLabel(program.price),
    publicPath: lecture.to,
    registrationEndDate: program.registrationEndDate,
    registrationPeriodLabel: lecture.registrationPeriodLabel,
    registrationStartDate: program.registrationStartDate,
    recommendedFor: [...lecture.recommendedFor],
    remainingSeats,
    remainingSeatsLabel:
      remainingSeats === null
        ? '온라인 상시 판매'
        : `수강 가능 인원 ${String(remainingSeats)}명 남음`,
    scheduleLabel: lecture.scheduleLabel,
    slug: lecture.to.split('/').filter(Boolean).at(-1) ?? lecture.id,
    soldCount: program.soldCount,
    stats: cloneData(lecture.stats),
    status: program.status,
    tags: [...lecture.tags],
    title: lecture.label,
    tuitionLabel: lecture.tuitionLabel,
    updatedAt: program.updatedAt,
  };
};

const toAdminProgramSummaryItem = (program: AdminProgramDetailItem): AdminProgramItem => {
  return {
    capacity: program.capacity,
    format: program.format,
    id: program.id,
    monthlySoldCount: program.monthlySoldCount,
    price: program.price,
    priceLabel: program.priceLabel,
    remainingSeats: program.remainingSeats,
    remainingSeatsLabel:
      program.remainingSeats === null
        ? '온라인 상시 판매'
        : `${String(program.remainingSeats)}석 남음`,
    slug: program.slug,
    soldCount: program.soldCount,
    status: program.status,
    title: program.title,
    updatedAt: program.updatedAt,
  };
};

export const getMockAdminProgramMenus = (siteKey: string): AdminProgramMenuItem[] => {
  return getMockAdminProgramMenuTree(siteKey).items.map((item) => {
    const tree = getProgramCatalogBaseTree(siteKey);
    const node = findProgramCatalogNodeByPath(item.path, tree, true);
    const lectureCount = node?.kind === 'collection' ? countLectureNodes(node.children) : 0;

    return {
      childCollectionCount: item.childCollectionCount,
      depth: item.depth,
      description: item.description,
      id: item.id,
      label: item.label,
      labelPath: item.labelPath,
      lectureCount,
      parentId: item.parentId,
      path: item.path,
      slug: item.slug,
      status: item.status,
    };
  });
};

export const getMockAdminProgramMenuTree = (siteKey: string): AdminProgramMenuTreeResponse => {
  const tree = getProgramCatalogBaseTree(siteKey);
  const items: AdminProgramMenuTreeItem[] = [];

  const visitCollections = (
    nodes: readonly ProgramCatalogNode[],
    depth = 1,
    parentId: string | null = null,
    parentEffectiveStatus: AdminProgramMenuStatus = 'published',
  ): void => {
    nodes.forEach((node) => {
      if (node.kind !== 'collection') {
        return;
      }

      const childCollections = node.children.filter(
        (child): child is ProgramCatalogCollectionNode => child.kind === 'collection',
      );
      const linkedPrograms = node.children.filter((child) => child.kind === 'lecture');
      const status = toAdminProgramMenuStatus(node.visibility);
      const effectiveStatus =
        parentEffectiveStatus === 'hidden' || status === 'hidden' ? 'hidden' : 'published';

      items.push({
        childCollectionCount: childCollections.length,
        depth,
        description: node.description,
        effectiveStatus,
        id: node.id,
        isLeafMenu: childCollections.length === 0,
        label: node.label,
        labelPath: [...node.ancestors.map((ancestor) => ancestor.label), node.label].join(' / '),
        linkedProgramCount: linkedPrograms.length,
        parentId,
        path: node.to,
        slug: node.to.split('/').filter(Boolean).at(-1) ?? '',
        status,
        totalProgramCount: countLectureNodes(node.children),
      });

      visitCollections(node.children, depth + 1, node.id, effectiveStatus);
    });
  };

  visitCollections(tree);

  return {
    items,
    maxDepth: PROGRAM_MENU_MAX_DEPTH,
    topLevelLimit: PROGRAM_MENU_TOP_LEVEL_LIMIT,
  };
};

export const getMockAdminProgramMenuDetail = (
  siteKey: string,
  menuId: string,
): AdminProgramMenuDetailResponse | null => {
  const seeds = getProgramCatalogSeeds(siteKey);
  const match = findCollectionSeedMatchById(seeds, menuId);

  if (!match) {
    return null;
  }

  const treeResponse = getMockAdminProgramMenuTree(siteKey);
  const menu = treeResponse.items.find((item) => item.id === menuId);
  const node = findProgramCatalogNodeByPath(match.path, getProgramCatalogBaseTree(siteKey), true);

  if (!menu || !node || node.kind !== 'collection') {
    return null;
  }

  const descendantCollectionIds = new Set<string>();
  const collectDescendantIds = (collection: ProgramCatalogCollectionSeed): void => {
    getDirectCollectionChildren(collection.children).forEach((child) => {
      descendantCollectionIds.add(child.id);
      collectDescendantIds(child);
    });
  };
  collectDescendantIds(match.node);

  const subtreeHeight = getCollectionSubtreeHeight(match.node);
  const managedPrograms = getManagedPrograms(siteKey);
  const managedProgramMap = new Map(managedPrograms.map((program) => [program.id, program]));
  const sitePrograms = getSiteLinkedPrograms(siteKey);
  const siteProgramMap = new Map(sitePrograms.map((program) => [program.id, program]));
  const linkedPrograms = node.children
    .filter((child): child is ProgramCatalogLectureNode => child.kind === 'lecture')
    .map((lecture) => {
      const managedProgram = managedProgramMap.get(lecture.id);
      const siteProgram = siteProgramMap.get(lecture.id);

      return {
        formatLabel: lecture.formatLabel,
        id: lecture.id,
        origin: managedProgram ? 'managed' : 'site',
        publicPath: lecture.to,
        scheduleLabel: lecture.scheduleLabel,
        slug: lecture.to.split('/').filter(Boolean).at(-1) ?? lecture.label,
        status: toAdminProgramMenuStatus(lecture.visibility),
        title: lecture.label,
        updatedAt: managedProgram?.updatedAt ?? siteProgram?.updatedAt ?? '2026-03-15',
      } satisfies AdminProgramMenuLinkedProgram;
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const collectionSiblings = getDirectCollectionChildren(match.parentChildren);
  const siblingIndex = collectionSiblings.findIndex((item) => item.id === menuId);

  return {
    allowedParentOptions: treeResponse.items
      .filter((candidate) => {
        if (candidate.id === menuId || descendantCollectionIds.has(candidate.id)) {
          return false;
        }

        if (candidate.linkedProgramCount > 0) {
          return false;
        }

        return candidate.depth + subtreeHeight <= PROGRAM_MENU_MAX_DEPTH;
      })
      .map(
        (candidate) =>
          ({
            depth: candidate.depth,
            id: candidate.id,
            isLeafMenu: candidate.isLeafMenu,
            label: candidate.label,
            labelPath: candidate.labelPath,
            path: candidate.path,
          }) satisfies AdminProgramMenuParentOption,
      ),
    canCreateChildMenu: match.depth < PROGRAM_MENU_MAX_DEPTH && !hasLinkedLectureSeeds(match.node),
    canCreateProgram: !hasChildCollectionSeeds(match.node),
    canDelete: !hasChildCollectionSeeds(match.node) && !hasLinkedLectureSeeds(match.node),
    linkedPrograms,
    menu,
    siblingCount: collectionSiblings.length,
    siblingIndex: Math.max(siblingIndex, 0),
  };
};

export const createMockAdminProgramMenu = (
  siteKey: string,
  payload: CreateAdminProgramMenuPayload,
): ProgramMenuMutationResult => {
  const seeds = getProgramCatalogSeeds(siteKey);
  const nextSeed = createProgramMenuCollectionSeed(payload);

  if (payload.parentId === null) {
    if (seeds.some((seed) => seed.kind === 'collection' && seed.slug === payload.slug)) {
      return { ok: false, reason: 'duplicate-slug' };
    }

    if (seeds.filter((seed) => seed.kind === 'collection').length >= PROGRAM_MENU_TOP_LEVEL_LIMIT) {
      return { ok: false, reason: 'top-level-limit-exceeded' };
    }

    seeds.push(nextSeed);
  } else {
    const parentMatch = findCollectionSeedMatchById(seeds, payload.parentId);

    if (!parentMatch) {
      return { ok: false, reason: 'parent-not-found' };
    }

    if (parentMatch.depth >= PROGRAM_MENU_MAX_DEPTH) {
      return { ok: false, reason: 'unsupported-depth' };
    }

    if (hasLinkedLectureSeeds(parentMatch.node)) {
      return { ok: false, reason: 'parent-has-linked-programs' };
    }

    if (
      parentMatch.node.children.some(
        (child) => child.kind === 'collection' && child.slug === payload.slug,
      )
    ) {
      return { ok: false, reason: 'duplicate-slug' };
    }

    parentMatch.node.children.push(nextSeed);
  }

  invalidateProgramCatalogBaseTreeCache(siteKey);
  const createdItem = getMockAdminProgramMenus(siteKey).find((item) => item.id === nextSeed.id);

  if (!createdItem) {
    return { ok: false, reason: 'menu-not-found' };
  }

  return { ok: true, item: createdItem };
};

export const updateMockAdminProgramMenu = (
  siteKey: string,
  menuId: string,
  payload: UpdateAdminProgramMenuPayload,
): ProgramMenuMutationResult => {
  const seeds = getProgramCatalogSeeds(siteKey);
  const targetMatch = findCollectionSeedMatchById(seeds, menuId);

  if (!targetMatch) {
    return { ok: false, reason: 'menu-not-found' };
  }

  if (
    targetMatch.parentChildren.some(
      (sibling, siblingIndex) =>
        sibling.kind === 'collection' &&
        sibling.slug === payload.slug &&
        siblingIndex !== targetMatch.index,
    )
  ) {
    return { ok: false, reason: 'duplicate-slug' };
  }

  const previousPath = targetMatch.path;
  const nextPath = routePaths.programCatalog(
    ...targetMatch.pathSegments.slice(0, -1),
    payload.slug,
  );

  targetMatch.node.label = payload.label;
  targetMatch.node.slug = payload.slug;
  targetMatch.node.description = payload.description;
  targetMatch.node.visibility = payload.status === 'published' ? 'public' : 'hidden';
  targetMatch.node.coverImageAlt = `${payload.label} 대표 이미지`;
  targetMatch.node.curatorNote = `${payload.label} 메뉴를 통해 연결되는 교육과정 구성을 관리합니다.`;
  targetMatch.node.tags = [payload.label, '교육과정', '메뉴'];
  relabelLegacyDetailLectureSeed(targetMatch.node, payload.label, payload.description);

  if (previousPath !== nextPath) {
    rewriteManagedProgramParentPaths(siteKey, previousPath, nextPath);
  }

  invalidateProgramCatalogBaseTreeCache(siteKey);
  const updatedItem = getMockAdminProgramMenus(siteKey).find((item) => item.id === menuId);

  if (!updatedItem) {
    return { ok: false, reason: 'menu-not-found' };
  }

  return { ok: true, item: updatedItem };
};

export const deleteMockAdminProgramMenu = (
  siteKey: string,
  menuId: string,
): ProgramMenuMutationResult => {
  const seeds = getProgramCatalogSeeds(siteKey);
  const targetMatch = findCollectionSeedMatchById(seeds, menuId);

  if (!targetMatch) {
    return { ok: false, reason: 'menu-not-found' };
  }

  if (hasChildCollectionSeeds(targetMatch.node)) {
    return { ok: false, reason: 'has-child-menus' };
  }

  if (hasLinkedLectureSeeds(targetMatch.node)) {
    return { ok: false, reason: 'has-linked-programs' };
  }

  targetMatch.parentChildren.splice(targetMatch.index, 1);

  const deletedSnapshot: AdminProgramMenuItem = {
    childCollectionCount: 0,
    depth: targetMatch.depth,
    description: targetMatch.node.description,
    id: targetMatch.node.id,
    label: targetMatch.node.label,
    labelPath: '',
    lectureCount: 0,
    parentId: targetMatch.parentId,
    path: targetMatch.path,
    slug: targetMatch.node.slug,
    status: toAdminProgramMenuStatus(targetMatch.node.visibility ?? 'public'),
  };

  invalidateProgramCatalogBaseTreeCache(siteKey);
  return { ok: true, item: deletedSnapshot };
};

export const moveMockAdminProgramMenu = (
  siteKey: string,
  menuId: string,
  payload: MoveAdminProgramMenuPayload,
): ProgramMenuMutationResult => {
  const seeds = getProgramCatalogSeeds(siteKey);
  const targetMatch = findCollectionSeedMatchById(seeds, menuId);

  if (!targetMatch) {
    return { ok: false, reason: 'menu-not-found' };
  }

  const subtreeHeight = getCollectionSubtreeHeight(targetMatch.node);
  const descendantCollectionIds = new Set<string>();
  const collectDescendantIds = (collection: ProgramCatalogCollectionSeed): void => {
    getDirectCollectionChildren(collection.children).forEach((child) => {
      descendantCollectionIds.add(child.id);
      collectDescendantIds(child);
    });
  };
  collectDescendantIds(targetMatch.node);

  const previousPath = targetMatch.path;
  let nextPath = targetMatch.path;

  targetMatch.parentChildren.splice(targetMatch.index, 1);

  if (payload.parentId === null) {
    if (
      seeds.some(
        (seed) =>
          seed.kind === 'collection' && seed.id !== menuId && seed.slug === targetMatch.node.slug,
      )
    ) {
      targetMatch.parentChildren.splice(targetMatch.index, 0, targetMatch.node);
      return { ok: false, reason: 'duplicate-slug' };
    }

    if (
      targetMatch.parentId !== null &&
      seeds.filter((seed) => seed.kind === 'collection').length >= PROGRAM_MENU_TOP_LEVEL_LIMIT
    ) {
      targetMatch.parentChildren.splice(targetMatch.index, 0, targetMatch.node);
      return { ok: false, reason: 'top-level-limit-exceeded' };
    }

    seeds.push(targetMatch.node);
    nextPath = routePaths.programCatalog(targetMatch.node.slug);
  } else {
    if (payload.parentId === menuId || descendantCollectionIds.has(payload.parentId)) {
      targetMatch.parentChildren.splice(targetMatch.index, 0, targetMatch.node);
      return { ok: false, reason: 'cannot-move-to-descendant' };
    }

    const parentMatch = findCollectionSeedMatchById(seeds, payload.parentId);

    if (!parentMatch) {
      targetMatch.parentChildren.splice(targetMatch.index, 0, targetMatch.node);
      return { ok: false, reason: 'parent-not-found' };
    }

    if (hasLinkedLectureSeeds(parentMatch.node)) {
      targetMatch.parentChildren.splice(targetMatch.index, 0, targetMatch.node);
      return { ok: false, reason: 'parent-has-linked-programs' };
    }

    if (parentMatch.depth + subtreeHeight > PROGRAM_MENU_MAX_DEPTH) {
      targetMatch.parentChildren.splice(targetMatch.index, 0, targetMatch.node);
      return { ok: false, reason: 'unsupported-depth' };
    }

    if (
      parentMatch.node.children.some(
        (child) => child.kind === 'collection' && child.slug === targetMatch.node.slug,
      )
    ) {
      targetMatch.parentChildren.splice(targetMatch.index, 0, targetMatch.node);
      return { ok: false, reason: 'duplicate-slug' };
    }

    parentMatch.node.children.push(targetMatch.node);
    nextPath = routePaths.programCatalog(...parentMatch.pathSegments, targetMatch.node.slug);
  }

  if (previousPath !== nextPath) {
    rewriteManagedProgramParentPaths(siteKey, previousPath, nextPath);
  }

  invalidateProgramCatalogBaseTreeCache(siteKey);
  const movedItem = getMockAdminProgramMenus(siteKey).find((item) => item.id === menuId);

  if (!movedItem) {
    return { ok: false, reason: 'menu-not-found' };
  }

  return { ok: true, item: movedItem };
};

export const reorderMockAdminProgramMenu = (
  siteKey: string,
  menuId: string,
  payload: ReorderAdminProgramMenuPayload,
): ProgramMenuMutationResult => {
  const seeds = getProgramCatalogSeeds(siteKey);
  const targetMatch = findCollectionSeedMatchById(seeds, menuId);

  if (!targetMatch) {
    return { ok: false, reason: 'menu-not-found' };
  }

  const nextIndex = payload.direction === 'up' ? targetMatch.index - 1 : targetMatch.index + 1;

  if (nextIndex < 0 || nextIndex >= targetMatch.parentChildren.length) {
    return { ok: false, reason: 'reorder-limit' };
  }

  const swapTarget = targetMatch.parentChildren[nextIndex];

  if (swapTarget.kind !== 'collection') {
    return { ok: false, reason: 'reorder-limit' };
  }

  targetMatch.parentChildren[targetMatch.index] = swapTarget;
  targetMatch.parentChildren[nextIndex] = targetMatch.node;

  invalidateProgramCatalogBaseTreeCache(siteKey);
  const reorderedItem = getMockAdminProgramMenus(siteKey).find((item) => item.id === menuId);

  if (!reorderedItem) {
    return { ok: false, reason: 'menu-not-found' };
  }

  return { ok: true, item: reorderedItem };
};

export const getMockAdminProgramCollectionOptions = (
  siteKey: string,
): AdminProgramCollectionOption[] => {
  const tree = getProgramCatalogBaseTree(siteKey);

  return collectAdminCollections(tree, true)
    .filter((collection) => collection.children.every((child) => child.kind !== 'collection'))
    .map((collection) => ({
      depth: collection.ancestors.length + 1,
      description: collection.description,
      id: collection.id,
      label: collection.label,
      labelPath: [...collection.ancestors.map((ancestor) => ancestor.label), collection.label].join(
        ' / ',
      ),
      lectureCount: collection.children.filter((child) => child.kind === 'lecture').length,
      path: collection.to,
    }));
};

export const getMockAdminManagedPrograms = (siteKey: string): AdminProgramDetailItem[] => {
  return getManagedPrograms(siteKey)
    .map((program) => toAdminManagedProgramDetailItem(siteKey, program))
    .filter((program): program is AdminProgramDetailItem => program !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const getMockAdminManagedProgramSummaries = (siteKey: string): AdminProgramItem[] => {
  return getMockAdminManagedPrograms(siteKey).map(toAdminProgramSummaryItem);
};

const getImmediateParentAncestor = (
  lecture: ProgramCatalogLectureNode,
): ProgramCatalogAncestor | null => {
  return lecture.ancestors.at(-1) ?? null;
};

interface EditableProgramValidationTarget {
  accessPolicy: AdminProgramAccessPolicy;
  capacity: number | null;
  curriculumTrack: Pick<ProgramCurriculumTrack, 'sections' | 'summaryItems'>;
  description: string;
  difficultyLabel: string;
  faqItems: readonly ProgramFaqItem[];
  format: AdminProgramFormat;
  heroImageAlt: string;
  heroImageSrc: string;
  learningEndDate: string | null;
  learningPoints: readonly string[];
  learningStartDate: string | null;
  originalPrice: number;
  parentCollectionPath: string;
  preparationChecklist: readonly string[];
  price: number;
  registrationEndDate: string | null;
  registrationStartDate: string | null;
  recommendedFor: readonly string[];
  slug: string;
  stats: readonly ProgramInfoItem[];
  tags: readonly string[];
  title: string;
}

const getMissingFieldLabelsForEditableProgram = (
  program: EditableProgramValidationTarget,
): string[] => {
  const missingLabels: string[] = [];

  if (!program.title.trim()) missingLabels.push('강의명');
  if (!program.slug.trim()) missingLabels.push('공개 URL');
  if (!program.parentCollectionPath.trim()) missingLabels.push('등록 메뉴');
  if (!program.description.trim()) missingLabels.push('소개 문구');
  if (!program.heroImageSrc.trim()) missingLabels.push('대표 이미지');
  if (!program.heroImageAlt.trim()) missingLabels.push('대표 이미지 설명');
  if (!program.difficultyLabel.trim()) missingLabels.push('난이도');
  if (program.originalPrice <= 0) missingLabels.push('정가');
  if (program.price <= 0) missingLabels.push('판매가');
  if (program.originalPrice < program.price) missingLabels.push('가격 정책');
  if (program.format !== 'online' && (program.capacity === null || program.capacity < 0)) {
    missingLabels.push('정원');
  }
  if (!program.tags.length) missingLabels.push('분류 태그');
  if (!program.learningPoints.length) missingLabels.push('학습 포인트');
  if (!program.recommendedFor.length) missingLabels.push('추천 대상');
  if (!program.preparationChecklist.length) missingLabels.push('체크리스트');
  if (program.stats.length < 2) missingLabels.push('요약 정보');
  if (program.faqItems.length < 2) missingLabels.push('FAQ');
  if (program.curriculumTrack.sections.length < 1) missingLabels.push('커리큘럼');
  if (program.curriculumTrack.summaryItems.length < 1) missingLabels.push('커리큘럼 요약');

  if (program.accessPolicy !== 'unlimited') {
    if (!program.learningStartDate || !program.learningEndDate) {
      missingLabels.push('운영 기간');
    }
  }

  if (Boolean(program.registrationStartDate) !== Boolean(program.registrationEndDate)) {
    missingLabels.push('모집 기간');
  }

  return Array.from(new Set(missingLabels));
};

const isManagedProgramPublishReady = (program: MockManagedProgramCatalogRecord): boolean => {
  return getMissingFieldLabelsForEditableProgram(program).length === 0;
};

const getAdminProgramDetailState = (
  siteKey: string,
  programId: string,
): {
  isPublishReady: boolean;
  missingFieldLabels: string[];
  program: AdminProgramDetailItem;
} | null => {
  const managedProgram = getManagedPrograms(siteKey).find((program) => program.id === programId);

  if (managedProgram) {
    const detailItem = toAdminManagedProgramDetailItem(siteKey, managedProgram);

    if (!detailItem) {
      return null;
    }

    const missingFieldLabels = getMissingFieldLabelsForEditableProgram(detailItem);

    return {
      isPublishReady: missingFieldLabels.length === 0,
      missingFieldLabels,
      program: detailItem,
    };
  }

  const siteProgram = getSiteLinkedProgramRecord(siteKey, programId);

  if (!siteProgram) {
    return null;
  }

  const detailItem = toAdminSiteProgramDetailItem(siteKey, siteProgram);

  if (!detailItem) {
    return null;
  }

  const missingFieldLabels = getMissingFieldLabelsForEditableProgram(detailItem);

  return {
    isPublishReady: missingFieldLabels.length === 0,
    missingFieldLabels,
    program: detailItem,
  };
};

const toAdminProgramListItem = (
  siteKey: string,
  lecture: ProgramCatalogLectureNode,
): AdminProgramListItem => {
  const detailState = getAdminProgramDetailState(siteKey, lecture.id);

  if (detailState) {
    return {
      accessPolicy: detailState.program.accessPolicy,
      canDelete: detailState.program.canDelete,
      canDuplicate: detailState.program.canDuplicate,
      canEdit: detailState.program.canEdit,
      format: detailState.program.format,
      formatLabel: detailState.program.formatLabel,
      id: detailState.program.id,
      isPublishReady: detailState.isPublishReady,
      missingFieldCount: detailState.missingFieldLabels.length,
      origin: detailState.program.origin,
      parentCollectionLabel: detailState.program.parentCollectionLabel,
      parentCollectionPath: detailState.program.parentCollectionPath,
      priceLabel: detailState.program.priceLabel,
      publicPath: detailState.program.publicPath,
      remainingSeatsLabel: detailState.program.remainingSeatsLabel,
      scheduleSummary: detailState.program.scheduleLabel,
      slug: detailState.program.slug,
      status: detailState.program.status,
      title: detailState.program.title,
      updatedAt: detailState.program.updatedAt,
    };
  }

  const parentAncestor = getImmediateParentAncestor(lecture);

  return {
    accessPolicy: lecture.formatLabel.includes('무제한')
      ? 'unlimited'
      : lecture.formatLabel.includes('온라인')
        ? 'limited-window'
        : 'cohort',
    canDelete: false,
    canDuplicate: true,
    canEdit: false,
    format: lecture.formatLabel.includes('실습 포함')
      ? 'hybrid'
      : lecture.formatLabel.includes('온라인')
        ? 'online'
        : 'offline',
    formatLabel: lecture.formatLabel,
    id: lecture.id,
    isPublishReady: true,
    missingFieldCount: 0,
    origin: 'site',
    parentCollectionLabel: parentAncestor?.label ?? '교육과정',
    parentCollectionPath: parentAncestor?.to ?? routePaths.programs,
    priceLabel: lecture.priceLabel,
    publicPath: lecture.to,
    remainingSeatsLabel: lecture.remainingSeatsLabel ?? '온라인 상시 판매',
    scheduleSummary: lecture.scheduleLabel,
    slug: lecture.to.split('/').filter(Boolean).at(-1) ?? lecture.id,
    status: lecture.visibility === 'public' ? 'published' : 'hidden',
    title: lecture.label,
    updatedAt: '2026-03-15',
  };
};

const sortAdminProgramListItems = (items: AdminProgramListItem[]): AdminProgramListItem[] => {
  return [...items].sort((left, right) => {
    if (left.origin !== right.origin) {
      return left.origin === 'managed' ? -1 : 1;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
};

const getLecturesForAdminCollectionPath = (
  siteKey: string,
  collectionPath: string | null,
): ProgramCatalogLectureNode[] => {
  const tree = getProgramCatalogBaseTree(siteKey);
  const allLectures = collectLectures(tree);

  if (!collectionPath) {
    return allLectures;
  }

  const normalizedPath = normalizeProgramPath(collectionPath);

  return allLectures.filter((lecture) => lecture.to.startsWith(`${normalizedPath}/`));
};

export const getMockAdminPrograms = (
  siteKey: string,
  options?: {
    collectionPath?: string | null;
    format?: AdminProgramFormat | 'all';
    query?: string;
    status?: AdminProgramStatus | 'all';
  },
): AdminProgramsResponse => {
  const formatFilter = options?.format ?? 'all';
  const query = options?.query?.trim().toLowerCase() ?? '';
  const statusFilter = options?.status ?? 'all';
  const baseItems = getLecturesForAdminCollectionPath(siteKey, options?.collectionPath ?? null).map(
    (lecture) => toAdminProgramListItem(siteKey, lecture),
  );

  const filteredItems = baseItems.filter((item) => {
    if (formatFilter !== 'all' && item.format !== formatFilter) {
      return false;
    }

    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [item.title, item.parentCollectionLabel, item.publicPath, item.scheduleSummary]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return {
    items: sortAdminProgramListItems(filteredItems),
  };
};

export const getMockAdminProgramDetail = (
  siteKey: string,
  programId: string,
): AdminProgramDetailResponse | null => {
  const detailState = getAdminProgramDetailState(siteKey, programId);

  if (!detailState) {
    return null;
  }

  return detailState;
};

const syncSingleLectureHubCollectionFromLecture = (
  collection: ProgramCatalogCollectionSeed,
  lecture: ProgramCatalogLectureSeed,
): void => {
  if (!collection.isSingleLectureHub) {
    return;
  }

  collection.label = lecture.label;
  collection.description = lecture.description;
  collection.coverImageAlt = lecture.coverImageAlt;
  collection.coverImageSrc = lecture.coverImageSrc;
  collection.curatorNote = `${lecture.label} 교육과정 허브에서 강의 목록을 먼저 확인한 뒤 상세 정보로 이어집니다.`;
  collection.tags = [...lecture.tags];
};

const removeEmptySingleLectureHubSeed = (siteKey: string, collectionId: string): void => {
  const seeds = getProgramCatalogSeeds(siteKey);
  const match = findCollectionSeedMatchById(seeds, collectionId);

  if (!match || !match.node.isSingleLectureHub) {
    return;
  }

  if (
    getDirectCollectionChildren(match.node.children).length > 0 ||
    getDirectLectureChildren(match.node.children).length > 0
  ) {
    return;
  }

  match.parentChildren.splice(match.index, 1);
};

const updateSiteLinkedProgramRecordFromPayload = (
  record: MockSiteLinkedProgramCatalogRecord,
  payload: UpsertAdminProgramPayload,
): void => {
  record.accessPolicy = payload.accessPolicy;
  record.capacity = normalizeManagedCapacity(payload.format, payload.capacity, record.soldCount);
  record.format = payload.format;
  record.learningEndDate = payload.learningEndDate;
  record.learningStartDate = payload.learningStartDate;
  record.originalPrice = payload.originalPrice;
  record.price = payload.price;
  record.registrationEndDate = payload.registrationEndDate;
  record.registrationStartDate = payload.registrationStartDate;
  record.updatedAt = '2026-03-16';
};

const applySiteLinkedLectureSeedFromPayload = (
  lecture: ProgramCatalogLectureSeed,
  record: MockSiteLinkedProgramCatalogRecord,
  payload: UpsertAdminProgramPayload,
): void => {
  const derivedText = applyManagedProgramDerivedText({
    accessPolicy: payload.accessPolicy,
    curriculumTrack: payload.curriculumTrack,
    format: payload.format,
    learningEndDate: payload.learningEndDate,
    learningStartDate: payload.learningStartDate,
    registrationEndDate: payload.registrationEndDate,
    registrationStartDate: payload.registrationStartDate,
  });
  const normalizedCapacity = normalizeManagedCapacity(
    payload.format,
    payload.capacity,
    record.soldCount,
  );
  const remainingSeats = getManagedRemainingSeats(
    payload.format,
    normalizedCapacity,
    record.soldCount,
  );

  lecture.coverImageAlt = payload.heroImageAlt;
  lecture.coverImageSrc = payload.heroImageSrc;
  lecture.curriculumTrack = cloneData(payload.curriculumTrack);
  lecture.description = payload.description;
  lecture.difficultyLabel = payload.difficultyLabel;
  lecture.discountRateLabel = calculateDiscountRateLabel(payload.originalPrice, payload.price);
  lecture.discountedPriceLabel = formatMockPriceLabel(payload.price);
  lecture.durationLabel = derivedText.durationLabel;
  lecture.faqItems = cloneData(payload.faqItems);
  lecture.formatLabel = derivedText.formatLabel;
  lecture.hashtagLabels = [...payload.hashtagLabels];
  lecture.label = payload.title;
  lecture.learningPoints = [...payload.learningPoints];
  lecture.monthlyInstallmentLabel = buildMonthlyInstallmentLabel(payload.price);
  lecture.operationPeriodLabel = derivedText.operationPeriodLabel ?? undefined;
  lecture.originalPriceLabel = formatMockPriceLabel(payload.originalPrice);
  lecture.priceLabel = formatMockPriceLabel(payload.price);
  lecture.preparationChecklist = [...payload.preparationChecklist];
  lecture.registrationPeriodLabel = derivedText.registrationPeriodLabel;
  lecture.recommendedFor = [...payload.recommendedFor];
  lecture.remainingSeatsCount = remainingSeats === null ? undefined : remainingSeats;
  lecture.remainingSeatsLabel =
    remainingSeats === null ? undefined : `수강 가능 인원 ${String(remainingSeats)}명 남음`;
  lecture.scheduleLabel = derivedText.scheduleLabel;
  lecture.slug = payload.slug;
  lecture.stats = cloneData(payload.stats);
  lecture.tags = [...payload.tags];
  lecture.tuitionLabel = derivedText.tuitionLabel;
  lecture.visibility = record.status === 'hidden' ? 'hidden' : 'public';
};

const createDefaultManagedDraftRecord = (
  siteKey: string,
  payload: CreateAdminProgramDraftPayload,
): MockManagedProgramCatalogRecord | null => {
  const parentCollection = getAdminProgramTargetCollection(siteKey, payload.parentCollectionPath);

  if (!parentCollection || !canAttachProgramsToCollection(parentCollection)) {
    return null;
  }

  if (hasDuplicateProgramSlugInCollection(parentCollection, payload.slug)) {
    return null;
  }

  const sourceLecture = payload.sourceProgramId
    ? (collectLectures(getProgramCatalogBaseTree(siteKey)).find(
        (lecture) => lecture.id === payload.sourceProgramId,
      ) ?? null)
    : null;
  const derivedText = deriveManagedProgramText(
    payload.format,
    payload.accessPolicy,
    payload.registrationStartDate,
    payload.registrationEndDate,
    payload.learningStartDate,
    payload.learningEndDate,
  );
  const defaultTags = sourceLecture?.tags.length
    ? [...sourceLecture.tags]
    : [parentCollection.label, payload.format === 'online' ? '온라인' : '실습'];

  return {
    accessPolicy: payload.accessPolicy,
    capacity: payload.format === 'online' ? null : payload.capacity,
    curriculumTrack:
      (sourceLecture ? cloneData(sourceLecture.curriculumTrack) : undefined) ??
      createDefaultCurriculumTrack(
        payload.title,
        defaultTags,
        derivedText.formatLabel,
        derivedText.scheduleLabel,
      ),
    description: sourceLecture?.description ?? '',
    difficultyLabel: sourceLecture?.difficultyLabel ?? '입문',
    durationLabel: derivedText.durationLabel,
    faqItems:
      (sourceLecture ? cloneData(sourceLecture.faqItems) : undefined) ??
      createDefaultFaqItems(derivedText.formatLabel, derivedText.durationLabel),
    format: payload.format,
    formatLabel: derivedText.formatLabel,
    hashtagLabels:
      (sourceLecture ? [...sourceLecture.hashtagLabels] : undefined) ??
      createDefaultHashtagLabels(derivedText.formatLabel, '입문'),
    heroImageAlt: sourceLecture?.coverImageAlt ?? '',
    heroImageSrc: sourceLecture?.coverImageSrc ?? '/og-thumbnail.jpg',
    id: createManagedProgramId(),
    learningEndDate: derivedText.effectiveLearningEndDate,
    learningPoints:
      (sourceLecture ? [...sourceLecture.learningPoints] : undefined) ??
      createDefaultLearningPoints(payload.title, defaultTags),
    learningStartDate: derivedText.effectiveLearningStartDate,
    operationPeriodLabel: derivedText.operationPeriodLabel ?? undefined,
    originalPrice: payload.originalPrice,
    parentCollectionPath: normalizeProgramPath(payload.parentCollectionPath),
    preparationChecklist:
      (sourceLecture ? [...sourceLecture.preparationChecklist] : undefined) ??
      createDefaultPreparationChecklist(derivedText.formatLabel),
    price: payload.price,
    registrationEndDate: payload.registrationEndDate,
    registrationPeriodLabel: derivedText.registrationPeriodLabel,
    registrationStartDate: payload.registrationStartDate,
    recommendedFor:
      (sourceLecture ? [...sourceLecture.recommendedFor] : undefined) ??
      createDefaultRecommendedFor(payload.title, '입문', derivedText.formatLabel),
    scheduleLabel: derivedText.scheduleLabel,
    slug: payload.slug,
    soldCount: 0,
    stats:
      (sourceLecture ? cloneData(sourceLecture.stats) : undefined) ??
      createDefaultStats(
        derivedText.formatLabel,
        derivedText.durationLabel,
        '입문',
        derivedText.tuitionLabel,
      ),
    status: 'draft',
    tags: defaultTags,
    title: payload.title,
    tuitionLabel: derivedText.tuitionLabel,
    updatedAt: '2026-03-16',
  };
};

export const createMockAdminProgramDraft = (
  siteKey: string,
  payload: CreateAdminProgramDraftPayload,
): string | null => {
  const nextRecord = createDefaultManagedDraftRecord(siteKey, payload);

  if (!nextRecord) {
    return null;
  }

  getManagedPrograms(siteKey).unshift(nextRecord);
  invalidateProgramCatalogBaseTreeCache(siteKey);
  return nextRecord.id;
};

const getAdminProgramTargetCollection = (
  siteKey: string,
  collectionPath: string,
): ProgramCatalogCollectionNode | null => {
  const tree = getProgramCatalogBaseTree(siteKey);
  const collection = findProgramCatalogNodeByPath(collectionPath, tree, true);

  if (!collection || collection.kind !== 'collection') {
    return null;
  }

  return collection;
};

const canAttachProgramsToCollection = (collection: ProgramCatalogCollectionNode): boolean => {
  return collection.children.every((child) => child.kind !== 'collection');
};

const hasDuplicateProgramSlugInCollection = (
  collection: ProgramCatalogCollectionNode,
  slug: string,
  excludeId?: string,
): boolean => {
  return collection.children.some((child) => {
    if (child.kind !== 'lecture' || child.id === excludeId) {
      return false;
    }

    return child.to.split('/').filter(Boolean).at(-1) === slug;
  });
};

const ensureUniqueLectureSlugInCollectionNode = (
  collection: ProgramCatalogCollectionNode,
  desiredSlug: string,
  fallbackLabel: string,
  excludeId?: string,
): string => {
  const normalizedBase =
    slugifyProgramPathSegment(desiredSlug) || slugifyProgramPathSegment(fallbackLabel);
  let nextSlug = normalizedBase || 'lecture';
  let suffix = 2;

  while (hasDuplicateProgramSlugInCollection(collection, nextSlug, excludeId)) {
    nextSlug = `${normalizedBase}-${String(suffix)}`;
    suffix += 1;
  }

  return nextSlug;
};

export const createMockAdminManagedProgram = (
  siteKey: string,
  payload: UpsertAdminProgramPayload,
): AdminProgramDetailItem | null => {
  const parentCollection = getAdminProgramTargetCollection(siteKey, payload.parentCollectionPath);

  if (!parentCollection) {
    return null;
  }

  if (!canAttachProgramsToCollection(parentCollection)) {
    return null;
  }

  if (hasDuplicateProgramSlugInCollection(parentCollection, payload.slug)) {
    return null;
  }

  const derivedText = applyManagedProgramDerivedText({
    accessPolicy: payload.accessPolicy,
    curriculumTrack: payload.curriculumTrack,
    format: payload.format,
    learningEndDate: payload.learningEndDate,
    learningStartDate: payload.learningStartDate,
    registrationEndDate: payload.registrationEndDate,
    registrationStartDate: payload.registrationStartDate,
  });

  const nextRecord: MockManagedProgramCatalogRecord = {
    accessPolicy: payload.accessPolicy,
    capacity: normalizeManagedCapacity(payload.format, payload.capacity, 0),
    curriculumTrack: cloneData(payload.curriculumTrack),
    description: payload.description,
    difficultyLabel: payload.difficultyLabel,
    durationLabel: derivedText.durationLabel,
    faqItems: cloneData(payload.faqItems),
    format: payload.format,
    formatLabel: derivedText.formatLabel,
    hashtagLabels: [...payload.hashtagLabels],
    heroImageAlt: payload.heroImageAlt,
    heroImageSrc: payload.heroImageSrc,
    id: createManagedProgramId(),
    learningPoints: [...payload.learningPoints],
    learningEndDate: derivedText.effectiveLearningEndDate,
    learningStartDate: derivedText.effectiveLearningStartDate,
    operationPeriodLabel: derivedText.operationPeriodLabel ?? payload.operationPeriodLabel,
    originalPrice: payload.originalPrice,
    parentCollectionPath: normalizeProgramPath(payload.parentCollectionPath),
    preparationChecklist: [...payload.preparationChecklist],
    price: payload.price,
    registrationEndDate: payload.registrationEndDate,
    registrationPeriodLabel: payload.registrationPeriodLabel,
    registrationStartDate: payload.registrationStartDate,
    recommendedFor: [...payload.recommendedFor],
    scheduleLabel: derivedText.scheduleLabel,
    slug: payload.slug,
    soldCount: 0,
    stats: cloneData(payload.stats),
    status: 'draft',
    tags: [...payload.tags],
    title: payload.title,
    tuitionLabel: derivedText.tuitionLabel,
    updatedAt: '2026-03-15',
  };

  getManagedPrograms(siteKey).unshift(nextRecord);
  invalidateProgramCatalogBaseTreeCache(siteKey);

  return toAdminManagedProgramDetailItem(siteKey, nextRecord);
};

export const updateMockAdminManagedProgram = (
  siteKey: string,
  programId: string,
  payload: UpsertAdminProgramPayload,
): AdminProgramDetailItem | null => {
  const managedPrograms = getManagedPrograms(siteKey);
  const targetProgram = managedPrograms.find((program) => program.id === programId);

  if (targetProgram) {
    const nextParentCollection = getAdminProgramTargetCollection(
      siteKey,
      payload.parentCollectionPath,
    );

    if (!nextParentCollection || !canAttachProgramsToCollection(nextParentCollection)) {
      return null;
    }

    if (hasDuplicateProgramSlugInCollection(nextParentCollection, payload.slug, programId)) {
      return null;
    }

    const derivedText = applyManagedProgramDerivedText({
      accessPolicy: payload.accessPolicy,
      curriculumTrack: payload.curriculumTrack,
      format: payload.format,
      learningEndDate: payload.learningEndDate,
      learningStartDate: payload.learningStartDate,
      registrationEndDate: payload.registrationEndDate,
      registrationStartDate: payload.registrationStartDate,
    });

    targetProgram.accessPolicy = payload.accessPolicy;
    targetProgram.capacity = normalizeManagedCapacity(
      payload.format,
      payload.capacity,
      targetProgram.soldCount,
    );
    targetProgram.curriculumTrack = cloneData(payload.curriculumTrack);
    targetProgram.description = payload.description;
    targetProgram.difficultyLabel = payload.difficultyLabel;
    targetProgram.durationLabel = derivedText.durationLabel;
    targetProgram.faqItems = cloneData(payload.faqItems);
    targetProgram.format = payload.format;
    targetProgram.formatLabel = derivedText.formatLabel;
    targetProgram.hashtagLabels = [...payload.hashtagLabels];
    targetProgram.heroImageAlt = payload.heroImageAlt;
    targetProgram.heroImageSrc = payload.heroImageSrc;
    targetProgram.learningPoints = [...payload.learningPoints];
    targetProgram.learningEndDate = derivedText.effectiveLearningEndDate;
    targetProgram.learningStartDate = derivedText.effectiveLearningStartDate;
    targetProgram.operationPeriodLabel =
      derivedText.operationPeriodLabel ?? payload.operationPeriodLabel;
    targetProgram.originalPrice = payload.originalPrice;
    targetProgram.parentCollectionPath = normalizeProgramPath(payload.parentCollectionPath);
    targetProgram.preparationChecklist = [...payload.preparationChecklist];
    targetProgram.price = payload.price;
    targetProgram.registrationEndDate = payload.registrationEndDate;
    targetProgram.registrationPeriodLabel = payload.registrationPeriodLabel;
    targetProgram.registrationStartDate = payload.registrationStartDate;
    targetProgram.recommendedFor = [...payload.recommendedFor];
    targetProgram.scheduleLabel = derivedText.scheduleLabel;
    targetProgram.slug = payload.slug;
    targetProgram.stats = cloneData(payload.stats);
    targetProgram.tags = [...payload.tags];
    targetProgram.title = payload.title;
    targetProgram.tuitionLabel = derivedText.tuitionLabel;
    targetProgram.updatedAt = '2026-03-15';

    invalidateProgramCatalogBaseTreeCache(siteKey);
    return toAdminManagedProgramDetailItem(siteKey, targetProgram);
  }

  const siteProgram = getSiteLinkedProgramRecord(siteKey, programId);
  const nextParentCollection = getAdminProgramTargetCollection(
    siteKey,
    payload.parentCollectionPath,
  );
  const seeds = getProgramCatalogSeeds(siteKey);
  const lectureMatch = findLectureSeedMatchById(seeds, programId);

  if (!siteProgram || !nextParentCollection || !lectureMatch) {
    return null;
  }

  if (!canAttachProgramsToCollection(nextParentCollection)) {
    return null;
  }

  if (hasDuplicateProgramSlugInCollection(nextParentCollection, payload.slug, programId)) {
    return null;
  }

  const targetSeedMatch = findCollectionSeedMatchById(seeds, nextParentCollection.id);

  if (!targetSeedMatch) {
    return null;
  }

  const previousParentId = lectureMatch.parentCollection.id;
  const normalizedNextParentPath = normalizeProgramPath(payload.parentCollectionPath);

  if (normalizeProgramPath(lectureMatch.parentPath) !== normalizedNextParentPath) {
    lectureMatch.parentCollection.children.splice(lectureMatch.index, 1);
    targetSeedMatch.node.children.push(lectureMatch.node);
  }

  updateSiteLinkedProgramRecordFromPayload(siteProgram, payload);
  applySiteLinkedLectureSeedFromPayload(lectureMatch.node, siteProgram, payload);
  syncSingleLectureHubCollectionFromLecture(lectureMatch.parentCollection, lectureMatch.node);
  syncSingleLectureHubCollectionFromLecture(targetSeedMatch.node, lectureMatch.node);
  removeEmptySingleLectureHubSeed(siteKey, previousParentId);

  invalidateProgramCatalogBaseTreeCache(siteKey);
  return toAdminSiteProgramDetailItem(siteKey, siteProgram);
};

export const toggleMockAdminManagedProgramVisibility = (
  siteKey: string,
  programId: string,
): AdminProgramDetailItem | null => {
  const managedPrograms = getManagedPrograms(siteKey);
  const targetProgram = managedPrograms.find((program) => program.id === programId);

  if (targetProgram) {
    targetProgram.status = targetProgram.status === 'published' ? 'hidden' : 'published';
    targetProgram.updatedAt = '2026-03-15';

    invalidateProgramCatalogBaseTreeCache(siteKey);
    return toAdminManagedProgramDetailItem(siteKey, targetProgram);
  }

  const siteProgram = getSiteLinkedProgramRecord(siteKey, programId);
  const seeds = getProgramCatalogSeeds(siteKey);
  const lectureMatch = findLectureSeedMatchById(seeds, programId);

  if (!siteProgram || !lectureMatch) {
    return null;
  }

  siteProgram.status = siteProgram.status === 'published' ? 'hidden' : 'published';
  siteProgram.updatedAt = '2026-03-15';
  lectureMatch.node.visibility = siteProgram.status === 'hidden' ? 'hidden' : 'public';

  invalidateProgramCatalogBaseTreeCache(siteKey);
  return toAdminSiteProgramDetailItem(siteKey, siteProgram);
};

export const publishMockAdminManagedProgram = (
  siteKey: string,
  programId: string,
): AdminProgramDetailItem | null => {
  const managedPrograms = getManagedPrograms(siteKey);
  const targetProgram = managedPrograms.find((program) => program.id === programId);

  if (targetProgram) {
    if (!isManagedProgramPublishReady(targetProgram)) {
      return null;
    }

    targetProgram.status = 'published';
    targetProgram.updatedAt = '2026-03-16';

    invalidateProgramCatalogBaseTreeCache(siteKey);
    return toAdminManagedProgramDetailItem(siteKey, targetProgram);
  }

  const siteProgram = getSiteLinkedProgramRecord(siteKey, programId);
  const seeds = getProgramCatalogSeeds(siteKey);
  const lectureMatch = findLectureSeedMatchById(seeds, programId);
  const detailItem = siteProgram ? toAdminSiteProgramDetailItem(siteKey, siteProgram) : null;

  if (
    !siteProgram ||
    !lectureMatch ||
    !detailItem ||
    getMissingFieldLabelsForEditableProgram(detailItem).length > 0
  ) {
    return null;
  }

  siteProgram.status = 'published';
  siteProgram.updatedAt = '2026-03-16';
  lectureMatch.node.visibility = 'public';

  invalidateProgramCatalogBaseTreeCache(siteKey);
  return toAdminSiteProgramDetailItem(siteKey, siteProgram);
};

export const unpublishMockAdminManagedProgram = (
  siteKey: string,
  programId: string,
): AdminProgramDetailItem | null => {
  const managedPrograms = getManagedPrograms(siteKey);
  const targetProgram = managedPrograms.find((program) => program.id === programId);

  if (targetProgram) {
    targetProgram.status = 'hidden';
    targetProgram.updatedAt = '2026-03-16';

    invalidateProgramCatalogBaseTreeCache(siteKey);
    return toAdminManagedProgramDetailItem(siteKey, targetProgram);
  }

  const siteProgram = getSiteLinkedProgramRecord(siteKey, programId);
  const seeds = getProgramCatalogSeeds(siteKey);
  const lectureMatch = findLectureSeedMatchById(seeds, programId);

  if (!siteProgram || !lectureMatch) {
    return null;
  }

  siteProgram.status = 'hidden';
  siteProgram.updatedAt = '2026-03-16';
  lectureMatch.node.visibility = 'hidden';

  invalidateProgramCatalogBaseTreeCache(siteKey);
  return toAdminSiteProgramDetailItem(siteKey, siteProgram);
};

export const deleteMockAdminManagedProgram = (siteKey: string, programId: string): boolean => {
  const managedPrograms = getManagedPrograms(siteKey);
  const nextPrograms = managedPrograms.filter((program) => program.id !== programId);

  if (nextPrograms.length !== managedPrograms.length) {
    managedProgramsBySite.set(siteKey, nextPrograms);
    invalidateProgramCatalogBaseTreeCache(siteKey);
    return true;
  }

  const sitePrograms = getSiteLinkedPrograms(siteKey);
  const nextSitePrograms = sitePrograms.filter((program) => program.id !== programId);
  const seeds = getProgramCatalogSeeds(siteKey);
  const lectureMatch = findLectureSeedMatchById(seeds, programId);

  if (nextSitePrograms.length === sitePrograms.length || !lectureMatch) {
    return false;
  }

  lectureMatch.parentCollection.children.splice(lectureMatch.index, 1);
  siteLinkedProgramsBySite.set(siteKey, nextSitePrograms);
  removeEmptySingleLectureHubSeed(siteKey, lectureMatch.parentCollection.id);
  invalidateProgramCatalogBaseTreeCache(siteKey);
  return true;
};

export const moveMockAdminProgram = (
  siteKey: string,
  programId: string,
  payload: MoveAdminProgramPayload,
): ProgramMoveMutationResult => {
  const targetCollection = getAdminProgramTargetCollection(siteKey, payload.targetCollectionPath);

  if (!targetCollection) {
    return { ok: false, reason: 'target-collection-not-found' };
  }

  if (!canAttachProgramsToCollection(targetCollection)) {
    return { ok: false, reason: 'target-collection-cannot-contain-programs' };
  }

  const managedPrograms = getManagedPrograms(siteKey);
  const managedProgram = managedPrograms.find((program) => program.id === programId);

  if (managedProgram) {
    managedProgram.parentCollectionPath = normalizeProgramPath(payload.targetCollectionPath);
    managedProgram.slug = ensureUniqueLectureSlugInCollectionNode(
      targetCollection,
      managedProgram.slug,
      managedProgram.title,
      managedProgram.id,
    );
    managedProgram.updatedAt = '2026-03-15';
    invalidateProgramCatalogBaseTreeCache(siteKey);

    return {
      ok: true,
      item: {
        formatLabel: managedProgram.formatLabel,
        id: managedProgram.id,
        origin: 'managed',
        publicPath: buildManagedProgramPublicPath(
          managedProgram.parentCollectionPath,
          managedProgram.slug,
        ),
        scheduleLabel: managedProgram.scheduleLabel,
        slug: managedProgram.slug,
        status: managedProgram.status,
        title: managedProgram.title,
        updatedAt: managedProgram.updatedAt,
      },
    };
  }

  const seeds = getProgramCatalogSeeds(siteKey);
  const lectureMatch = findLectureSeedMatchById(seeds, programId);
  const siteProgram = getSiteLinkedProgramRecord(siteKey, programId);

  if (!lectureMatch) {
    return { ok: false, reason: 'program-not-found' };
  }

  const targetSeedMatch = findCollectionSeedMatchById(seeds, targetCollection.id);

  if (!targetSeedMatch) {
    return { ok: false, reason: 'target-collection-not-found' };
  }

  const previousParentId = lectureMatch.parentCollection.id;

  lectureMatch.parentCollection.children.splice(lectureMatch.index, 1);
  lectureMatch.node.slug = ensureUniqueLectureSlug(
    targetSeedMatch.node.children,
    lectureMatch.node.slug === PROGRAM_DETAIL_SLUG
      ? slugifyProgramPathSegment(lectureMatch.node.label)
      : lectureMatch.node.slug,
    lectureMatch.node.label,
    lectureMatch.node.id,
  );

  targetSeedMatch.node.children.push(lectureMatch.node);
  syncSingleLectureHubCollectionFromLecture(targetSeedMatch.node, lectureMatch.node);
  removeEmptySingleLectureHubSeed(siteKey, previousParentId);
  if (siteProgram) {
    siteProgram.updatedAt = '2026-03-15';
  }
  invalidateProgramCatalogBaseTreeCache(siteKey);

  return {
    ok: true,
    item: {
      formatLabel: lectureMatch.node.formatLabel,
      id: lectureMatch.node.id,
      origin: 'site',
      publicPath: `${normalizeProgramPath(payload.targetCollectionPath)}/${lectureMatch.node.slug}`,
      scheduleLabel: lectureMatch.node.scheduleLabel ?? '일정 추후 안내',
      slug: lectureMatch.node.slug,
      status: toAdminProgramMenuStatus(lectureMatch.node.visibility ?? 'public'),
      title: lectureMatch.node.label,
      updatedAt: siteProgram?.updatedAt ?? '2026-03-15',
    },
  };
};

export const resetMockProgramCatalogData = (): void => {
  managedProgramIdCounter = 1;
  programMenuIdCounter = 1;
  managedProgramsBySite.clear();
  siteLinkedProgramsBySite.clear();
  programCatalogSeedsBySite.clear();
  invalidateProgramCatalogBaseTreeCache();
};

const DEFAULT_PROGRAM_SITE_KEY = 'default';

export const getMockProgramNavigationItems = (
  siteKey = DEFAULT_PROGRAM_SITE_KEY,
): SiteNavigationItem[] => {
  const tree = getProgramCatalogPublicTree(siteKey);

  // 헤더 메뉴는 카탈로그 트리에서 label / to / children 정보만 뽑아
  // SiteNavigationResponse 형태로 변환해서 사용합니다.
  const toSiteNavigationItems = (nodes: readonly ProgramCatalogNode[]): SiteNavigationItem[] => {
    return nodes.flatMap((node) => {
      if (!isVisibleProgramNode(node) || node.kind !== 'collection') {
        return [];
      }

      const childCollections = toSiteNavigationItems(
        getVisibleChildNodes(node).filter(
          (child): child is ProgramCatalogCollectionNode => child.kind === 'collection',
        ),
      );

      return [
        {
          ...(isLeafHubCollectionNode(node) || childCollections.length === 0
            ? {}
            : { children: childCollections }),
          description: node.description,
          id: node.id,
          label: node.label,
          to: node.to,
        },
      ];
    });
  };

  return toSiteNavigationItems(tree);
};

export const getMockProgramsOverview = (
  siteKey = DEFAULT_PROGRAM_SITE_KEY,
): ProgramsOverviewResponse => {
  const tree = getProgramCatalogPublicTree(siteKey);
  const topLevelCollections = collectVisibleCollections(tree, true).filter(
    (collection) => collection.ancestors.length === 0 && !isLeafHubCollectionNode(collection),
  );
  const allVisibleLectures = collectVisibleLectures(tree);
  const featuredLectures =
    selectProgramOverviewFeaturedLectures(allVisibleLectures).map(toProgramLectureCard);

  return {
    categories: topLevelCollections.map(toProgramCollectionCard),
    description:
      '의사과정, 일반과정, 온라인과정을 한 곳에서 비교하고, 각 과정 아래에 연결된 실제 강의까지 한 번에 탐색할 수 있습니다.',
    featuredLectures,
    heroTags: ['임상 적용', '핸즈온 중심', '국제 자격 대비', '장은희 강사 단독 운영'],
    instructor: programInstructorProfile,
    stats: [
      { label: '운영 강의', value: `${String(allVisibleLectures.length)}개` },
      {
        label: '세부 트랙',
        value: `${String(collectVisibleCollections(tree, false).filter((collection) => !isLeafHubCollectionNode(collection)).length)}개`,
      },
      { label: '운영 축', value: `${String(topLevelCollections.length)}개 과정군` },
      { label: '강의 운영', value: '단일 강사 브랜드' },
    ],
    title: '소노스쿨 교육과정 전체 보기',
  };
};

export const getMockProgramPage = (
  path: string,
  siteKey = DEFAULT_PROGRAM_SITE_KEY,
): ProgramPageResponse | null => {
  // 같은 `/programs/...` 경로라도 leaf면 상세, collection이면 목록 페이지 응답을 돌려줍니다.
  return buildProgramPageResponse(siteKey, path);
};

export const getMockProgramSearchLectureItems = (
  siteKey = DEFAULT_PROGRAM_SITE_KEY,
): ProgramSearchIndexResponse['items'] => {
  const tree = getProgramCatalogPublicTree(siteKey);

  return collectVisibleLectures(tree).map((lecture) => {
    const categoryAncestors = getStructuralAncestors(lecture.ancestors);
    const categoryLabel =
      categoryAncestors.length >= 2
        ? `${categoryAncestors.at(-2)?.label ?? ''} · ${categoryAncestors.at(-1)?.label ?? ''}`.trim()
        : (categoryAncestors.at(-1)?.label ?? '교육과정');

    return {
      categoryLabel,
      description: lecture.description,
      id: lecture.id,
      scope: 'lecture' as const,
      tags: Array.from(new Set([...lecture.tags, ...lecture.hashtagLabels])).slice(0, 8),
      thumbnailAlt: lecture.coverImageAlt,
      thumbnailSrc: lecture.coverImageSrc,
      title: lecture.label,
      to: lecture.to,
    };
  });
};
