import { z } from 'zod';

import { http } from '@/api/http';
import type { ProgramPageResponse, ProgramsOverviewResponse } from '@/types/programCatalog';

const toZodErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  return issues ? `\n${issues}` : '';
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
  profileImageSrc: z.string().min(1),
});

const lectureCardSchema = z.object({
  categoryLabel: z.string().min(1),
  difficultyLabel: z.string().min(1),
  durationLabel: z.string().min(1),
  formatLabel: z.string().min(1),
  id: z.string().min(1),
  programId: z.number().int().positive().optional(),
  priceLabel: z.string().min(1),
  remainingSeatsCount: z.number().int().nonnegative().optional(),
  remainingSeatsLabel: z.string().min(1).optional(),
  scheduleLabel: z.string().min(1),
  summary: z.string().min(1),
  thumbnailAlt: z.string().min(1),
  thumbnailSrc: z.string().min(1),
  title: z.string().min(1),
  to: z.string().min(1),
});

const collectionCardSchema = z.object({
  coverImageAlt: z.string().min(1),
  coverImageSrc: z.string().min(1),
  description: z.string().min(1),
  formatLabels: z.array(z.string().trim().min(1)).max(4),
  id: z.string().min(1),
  lectureCount: z.number().int().nonnegative(),
  title: z.string().min(1),
  to: z.string().min(1),
});

const infoItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const faqItemSchema = z.object({
  answer: z.string().min(1),
  id: z.string().min(1),
  question: z.string().min(1),
});

const communitySummarySchema = z.object({
  answeredThreadCount: z.number().int().nonnegative(),
  latestThreadCreatedAt: z.string().min(1).nullable(),
  totalThreadCount: z.number().int().nonnegative(),
});

const reviewItemSchema = z.object({
  authorName: z.string().min(1),
  content: z.string().min(1),
  dateLabel: z.string().min(1),
  id: z.string().min(1),
  rating: z.number().min(1).max(5),
});

const curriculumLessonSchema = z.object({
  deliveryType: z.enum(['online', 'offline', 'problem']),
  description: z.string().trim().optional(),
  durationLabel: z.string().min(1),
  durationMinutes: z.number().int().nonnegative().nullable(),
  endDate: z.string().min(1).nullable(),
  hasQuiz: z.boolean().optional(),
  id: z.string().min(1),
  quizAttempted: z.boolean().optional(),
  startDate: z.string().min(1).nullable(),
  title: z.string().min(1),
});

const curriculumSectionSchema = z.object({
  description: z.string().min(1),
  durationLabel: z.string().min(1),
  id: z.string().min(1),
  lessons: z.array(curriculumLessonSchema).min(1).max(16),
  title: z.string().min(1),
});

const curriculumTrackSchema = z.object({
  id: z.string().min(1),
  sections: z.array(curriculumSectionSchema).min(1).max(8),
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

const programCollectionPageResponseSchema = z.object({
  breadcrumbItems: z.array(breadcrumbItemSchema).min(1).max(6),
  childCollections: z.array(collectionCardSchema).max(20),
  curatorNote: z.string().min(1),
  description: z.string().min(1),
  heroImageAlt: z.string().min(1),
  heroImageSrc: z.string().min(1),
  instructor: instructorSchema,
  kicker: z.string().min(1),
  lectures: z.array(lectureCardSchema).min(1).max(120),
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
  communitySummary: communitySummarySchema.optional(),
  formatLabel: z.string().min(1),
  heroImageAlt: z.string().min(1),
  heroImageSrc: z.string().min(1),
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
    throw new Error(
      `[programCatalog] Invalid overview response.${toZodErrorMessage(parsed.error)}`,
    );
  }

  return parsed.data;
};

export const fetchProgramPage = async (path: string): Promise<ProgramPageResponse> => {
  const responseData = await http.get<unknown>('/api/v1/program-pages/page', {
    params: { path },
  });

  const parsed = programPageResponseSchema.safeParse(responseData);

  if (!parsed.success) {
    throw new Error(`[programCatalog] Invalid page response.${toZodErrorMessage(parsed.error)}`);
  }

  return parsed.data;
};
