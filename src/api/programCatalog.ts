import { z } from 'zod';

import { toApiResponseValidationError } from '@/api/errors';
import { http } from '@/api/http';
import type {
  ProgramLectureCatalogResponse,
  ProgramPageResponse,
  ProgramsOverviewResponse,
} from '@/types/programCatalog';
import { sanitizePublicAssetUrl, sanitizeRequiredPublicAssetUrl } from '@/utils/publicAssetUrl';

const DEFAULT_PROGRAM_IMAGE = '/SRDMS_OG.png';
const MAX_CURRICULUM_SECTION_COUNT = 20;

const publicImageSchema = z
  .string()
  .min(1)
  .transform((value) => sanitizeRequiredPublicAssetUrl(value, DEFAULT_PROGRAM_IMAGE));

const optionalPublicImageSchema = z.string().min(1).nullable().optional();
const optionalCropValueSchema = z.number().nullable().optional();

const resolvePreferredProgramImageSrc = (...values: Array<string | null | undefined>): string => {
  const sanitizedValues = values
    .map((value) => sanitizePublicAssetUrl(value))
    .filter((value): value is string => Boolean(value));
  const preferredValue = sanitizedValues.find((value) => value !== DEFAULT_PROGRAM_IMAGE);

  if (preferredValue) {
    return preferredValue;
  }

  return sanitizedValues.length > 0 ? sanitizedValues[0] : DEFAULT_PROGRAM_IMAGE;
};

const programStatSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const breadcrumbItemSchema = z.object({
  label: z.string().min(1),
  to: z.string().min(1),
});

const instructorSchema = z.object({
  careerHighlights: z.array(z.string().trim().min(1)).min(1).max(8),
  headline: z.string().min(1),
  introduction: z.string().min(1),
  name: z.string().min(1),
  profileImageAlt: z.string().min(1),
  profileImageSrc: publicImageSchema,
});

const lectureCardSchema = z
  .object({
    categoryLabel: z.string().min(1),
    difficultyLabel: z.string().min(1),
    durationLabel: z.string().min(1),
    formatLabel: z.string().min(1),
    id: z.string().min(1),
    programId: z.number().int().positive().optional(),
    priceLabel: z.string().min(1),
    originalPriceLabel: z.string().min(1).optional(),
    discountRateLabel: z.string().min(1).optional(),
    discountedPriceLabel: z.string().min(1).optional(),
    remainingSeatsCount: z.number().int().nonnegative().optional(),
    remainingSeatsLabel: z.string().min(1).optional(),
    catalogStatus: z.enum(['OPEN', 'SCHEDULED', 'STARTED', 'CLOSED', 'ENDED', 'FULL']).optional(),
    scheduleLabel: z.string().min(1),
    summary: z.string().min(1),
    thumbnailAlt: z.string().min(1),
    thumbnailCropOffsetX: optionalCropValueSchema,
    thumbnailCropOffsetY: optionalCropValueSchema,
    thumbnailCropZoom: optionalCropValueSchema,
    thumbnailPreviewUrl: optionalPublicImageSchema,
    thumbnailSrc: optionalPublicImageSchema,
    thumbnailUrl: optionalPublicImageSchema,
    title: z.string().min(1),
    to: z.string().min(1),
  })
  .transform(({ thumbnailPreviewUrl, thumbnailSrc, thumbnailUrl, ...item }) => ({
    ...item,
    thumbnailSrc: resolvePreferredProgramImageSrc(thumbnailPreviewUrl, thumbnailUrl, thumbnailSrc),
  }));

const collectionCardSchema = z
  .object({
    coverImageAlt: z.string().min(1),
    coverImageSrc: optionalPublicImageSchema,
    coverImageUrl: optionalPublicImageSchema,
    description: z.string().min(1),
    formatLabels: z.array(z.string().trim().min(1)).max(4),
    id: z.string().min(1),
    lectureCount: z.number().int().nonnegative(),
    thumbnailPreviewUrl: optionalPublicImageSchema,
    thumbnailUrl: optionalPublicImageSchema,
    title: z.string().min(1),
    to: z.string().min(1),
  })
  .transform(({ coverImageSrc, coverImageUrl, thumbnailPreviewUrl, thumbnailUrl, ...item }) => ({
    ...item,
    coverImageSrc: resolvePreferredProgramImageSrc(
      coverImageUrl,
      thumbnailPreviewUrl,
      thumbnailUrl,
      coverImageSrc,
    ),
  }));

const infoItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const optionalNullableTextSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().optional(),
);

const faqItemSchema = z.object({
  answer: z.string().min(1),
  id: z.string().min(1),
  question: z.string().min(1),
});

const qnaSummarySchema = z.object({
  answeredThreadCount: z.number().int().nonnegative(),
  latestThreadCreatedAt: z.string().min(1).nullable().optional(),
  totalThreadCount: z.number().int().nonnegative(),
});

const reviewItemSchema = z.object({
  authorName: z.string().min(1),
  content: z.string().min(1),
  dateLabel: z.string().min(1),
  id: z.string().min(1),
  rating: z.number().min(1).max(5),
});

const curriculumScheduleItemSchema = z.object({
  date: z.string().min(1).nullable(),
  endTime: z.string().min(1).nullable(),
  location: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  startTime: z.string().min(1).nullable(),
});

const curriculumLessonSchema = z.object({
  deliveryType: z.enum(['online', 'offline', 'practicum', 'problem', 'resource']),
  description: optionalNullableTextSchema,
  durationLabel: z.string().min(1),
  durationMinutes: z.number().int().nonnegative().nullable(),
  endDate: z.string().min(1).nullable(),
  hasQuiz: z.boolean().optional(),
  id: z.string().min(1),
  lectureId: z.number().int().positive().optional(),
  offlineSchedules: z.array(curriculumScheduleItemSchema).optional(),
  problemAttempted: z.boolean().optional(),
  problemTimeLimitSeconds: z.number().int().positive().nullable().optional(),
  questionCount: z.number().int().nonnegative().optional(),
  quizAttempted: z.boolean().optional(),
  startDate: z.string().min(1).nullable(),
  title: z.string().min(1),
});

const curriculumSectionSchema = z.object({
  description: z.string().min(1),
  durationLabel: z.string().min(1),
  id: z.string().min(1),
  lessons: z.array(curriculumLessonSchema).max(16),
  title: z.string().min(1),
});

const curriculumTrackSchema = z.object({
  id: z.string().min(1),
  sections: z.array(curriculumSectionSchema).max(MAX_CURRICULUM_SECTION_COUNT),
  summaryItems: z.array(z.string().trim().min(1)).min(1).max(8),
  summaryKind: z.enum(['decimal', 'disc']),
  title: z.string().min(1).optional(),
});

const programsOverviewResponseSchema = z.object({
  categories: z.array(collectionCardSchema).min(1).max(10),
  description: z.string().min(1),
  featuredLectures: z.array(lectureCardSchema).max(8),
  instructor: instructorSchema,
  stats: z.array(programStatSchema).min(1).max(6),
  title: z.string().min(1),
});

const programLectureCatalogResponseSchema = z.object({
  items: z.array(lectureCardSchema).min(1).max(200),
});

const programCollectionPageResponseSchema = z.object({
  breadcrumbItems: z.array(breadcrumbItemSchema).min(1).max(6),
  childCollections: z.array(collectionCardSchema).max(20),
  curatorNote: z.string().min(1),
  description: z.string().min(1),
  heroImageAlt: z.string().min(1),
  heroImageSrc: publicImageSchema,
  instructor: instructorSchema,
  kicker: z.string().min(1),
  lectures: z.array(lectureCardSchema).max(120),
  pageKind: z.literal('collection'),
  stats: z.array(programStatSchema).min(1).max(6),
  title: z.string().min(1),
});

const programDetailPageResponseSchema = z.object({
  breadcrumbItems: z.array(breadcrumbItemSchema).min(1).max(6),
  categoryLabel: z.string().min(1),
  curriculumTrack: curriculumTrackSchema,
  description: z.string().min(1),
  difficultyLabel: z.string().min(1),
  discountRateLabel: z.string().min(1),
  discountedPriceLabel: z.string().min(1),
  durationLabel: z.string().min(1),
  faqItems: z.array(faqItemSchema).min(1).max(8),
  qnaSummary: qnaSummarySchema.optional(),
  formatLabel: z.string().min(1),
  heroImageAlt: z.string().min(1),
  heroImageCropOffsetX: optionalCropValueSchema,
  heroImageCropOffsetY: optionalCropValueSchema,
  heroImageCropZoom: optionalCropValueSchema,
  heroImageSrc: publicImageSchema,
  instructor: instructorSchema,
  kicker: z.string().min(1),
  learningOutcomes: z.array(infoItemSchema).min(1).max(8).optional(),
  learningPoints: z.array(z.string().trim().min(1)).min(1).max(8).optional(),
  monthlyInstallmentLabel: z.string().min(1),
  operationPeriodLabel: z.string().min(1).optional(),
  originalPriceLabel: z.string().min(1),
  overallRating: z.number().min(0).max(5),
  pageKind: z.literal('detail'),
  programId: z.number().int().positive().optional(),
  catalogStatus: z.enum(['OPEN', 'SCHEDULED', 'STARTED', 'CLOSED', 'ENDED', 'FULL']).optional(),
  applicationStatusLabel: z.string().min(1).optional(),
  applicationStatusDescription: z.string().min(1).optional(),
  enrollmentAvailable: z.boolean().optional(),
  availabilityAlertAvailable: z.boolean().optional(),
  preparationChecklist: z.array(z.string().trim().min(1)).min(1).max(8),
  remainingSeatsLabel: z.string().min(1).optional(),
  registrationPeriodLabel: z.string().min(1),
  recommendedFor: z.array(z.string().trim().min(1)).min(1).max(8),
  relatedLectures: z.array(lectureCardSchema).max(6),
  reviewCount: z.number().int().nonnegative(),
  reviews: z.array(reviewItemSchema).max(20),
  scheduleLabel: z.string().min(1),
  stats: z.array(infoItemSchema).min(1).max(8),
  title: z.string().min(1),
  tuitionLabel: z.string().min(1),
});

const programPageResponseSchema = z.union([
  programCollectionPageResponseSchema,
  programDetailPageResponseSchema,
]);

export const fetchProgramsOverview = async (): Promise<ProgramsOverviewResponse> => {
  const responseData = await http.get<unknown>('/api/v1/program-pages/overview');

  const parsed = programsOverviewResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programCatalog.overview',
      userMessage: '교육과정 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};

export const fetchProgramLectureCatalog = async (): Promise<ProgramLectureCatalogResponse> => {
  const responseData = await http.get<unknown>('/api/v1/program-pages/lectures');

  const parsed = programLectureCatalogResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programCatalog.lectures',
      userMessage: '교육과정 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};

export const fetchProgramPage = async (path: string): Promise<ProgramPageResponse> => {
  const responseData = await http.get<unknown>('/api/v1/program-pages/page', {
    params: { path },
  });

  const parsed = programPageResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw toApiResponseValidationError({
      source: 'programCatalog.page',
      userMessage: '교육과정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      zodError: parsed.error,
    });
  }

  return parsed.data;
};
