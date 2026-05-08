export interface ProgramStat {
  label: string;
  value: string;
}

export interface ProgramBreadcrumbItem {
  label: string;
  to: string;
}

export interface ProgramInstructorProfile {
  name: string;
  headline: string;
  introduction: string;
  profileImageSrc: string;
  profileImageAlt: string;
  careerHighlights: string[];
}

export interface ProgramCollectionCard {
  id: string;
  title: string;
  to: string;
  description: string;
  lectureCount: number;
  formatLabels: string[];
  tags?: string[] | undefined;
  coverImageSrc: string;
  coverImageAlt: string;
}

export interface ProgramLectureCard {
  id: string;
  programId?: number | undefined;
  title: string;
  to: string;
  summary: string;
  categoryLabel: string;
  formatLabel: string;
  durationLabel: string;
  difficultyLabel: string;
  priceLabel: string;
  originalPriceLabel?: string | undefined;
  discountRateLabel?: string | undefined;
  discountedPriceLabel?: string | undefined;
  remainingSeatsCount?: number | undefined;
  remainingSeatsLabel?: string | undefined;
  catalogStatus?: ProgramCatalogStatus | undefined;
  hashtagLabels?: string[] | undefined;
  scheduleLabel: string;
  tags?: string[] | undefined;
  thumbnailSrc: string;
  thumbnailAlt: string;
}

export interface ProgramCollectionPageResponse {
  pageKind: 'collection';
  title: string;
  description: string;
  kicker: string;
  heroImageSrc: string;
  heroImageAlt: string;
  breadcrumbItems: ProgramBreadcrumbItem[];
  stats: ProgramStat[];
  curatorNote: string;
  childCollections: ProgramCollectionCard[];
  lectures: ProgramLectureCard[];
  focusTags?: string[] | undefined;
  instructor: ProgramInstructorProfile;
}

export type ProgramCurriculumLessonDeliveryType =
  | 'online'
  | 'offline'
  | 'practicum'
  | 'problem'
  | 'resource';

export interface ProgramCurriculumScheduleItem {
  absent?: boolean | undefined;
  attendanceCompleted?: boolean | undefined;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  location?: string | null | undefined;
  notes?: string | null | undefined;
  ruleId?: number | null | undefined;
}

export interface ProgramCurriculumLesson {
  deliveryType: ProgramCurriculumLessonDeliveryType;
  description?: string | undefined;
  durationLabel: string;
  durationMinutes: number | null;
  endDate: string | null;
  hasQuiz?: boolean | undefined;
  id: string;
  lectureId?: number | undefined;
  offlineSchedules?: ProgramCurriculumScheduleItem[] | undefined;
  latestProblemAttemptId?: number | null | undefined;
  problemAttempted?: boolean | undefined;
  problemTimeLimitSeconds?: number | null | undefined;
  questionCount?: number | undefined;
  quizAttempted?: boolean | undefined;
  startDate: string | null;
  title: string;
}

export interface ProgramCurriculumSection {
  description: string;
  durationLabel: string;
  id: string;
  lessons: ProgramCurriculumLesson[];
  title: string;
}

export type ProgramCurriculumSummaryKind = 'decimal' | 'disc';

export interface ProgramCurriculumTrack {
  id: string;
  title?: string | undefined;
  sections: ProgramCurriculumSection[];
  summaryItems: string[];
  summaryKind: ProgramCurriculumSummaryKind;
}

export interface ProgramInfoItem {
  label: string;
  value: string;
}

export type ProgramCatalogStatus = 'OPEN' | 'SCHEDULED' | 'STARTED' | 'CLOSED' | 'ENDED' | 'FULL';

export interface ProgramFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ProgramQnaSummary {
  totalThreadCount: number;
  answeredThreadCount: number;
  latestThreadCreatedAt?: string | null | undefined;
}

export interface ProgramReviewItem {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  dateLabel: string;
}

export interface ProgramDetailPageResponse {
  pageKind: 'detail';
  programId?: number | undefined;
  title: string;
  description: string;
  kicker: string;
  heroImageSrc: string;
  heroImageAlt: string;
  breadcrumbItems: ProgramBreadcrumbItem[];
  categoryLabel: string;
  formatLabel: string;
  durationLabel: string;
  difficultyLabel: string;
  tuitionLabel: string;
  originalPriceLabel: string;
  discountRateLabel: string;
  discountedPriceLabel: string;
  monthlyInstallmentLabel: string;
  operationPeriodLabel?: string | undefined;
  remainingSeatsLabel?: string | undefined;
  catalogStatus?: ProgramCatalogStatus | undefined;
  applicationStatusLabel?: string | undefined;
  applicationStatusDescription?: string | undefined;
  enrollmentAvailable?: boolean | undefined;
  availabilityAlertAvailable?: boolean | undefined;
  registrationPeriodLabel: string;
  hashtagLabels?: string[] | undefined;
  scheduleLabel: string;
  tags?: string[] | undefined;
  stats: ProgramInfoItem[];
  learningOutcomes?: ProgramInfoItem[] | undefined;
  learningPoints?: string[] | undefined;
  recommendedFor: string[];
  curriculumTrack: ProgramCurriculumTrack;
  preparationChecklist: string[];
  faqItems: ProgramFaqItem[];
  qnaSummary?: ProgramQnaSummary | undefined;
  overallRating: number;
  reviewCount: number;
  reviews: ProgramReviewItem[];
  instructor: ProgramInstructorProfile;
  relatedLectures: ProgramLectureCard[];
}

export type ProgramPageResponse = ProgramCollectionPageResponse | ProgramDetailPageResponse;

export interface ProgramLectureCatalogResponse {
  items: ProgramLectureCard[];
}

export interface ProgramsOverviewResponse {
  title: string;
  description: string;
  heroTags?: string[] | undefined;
  stats: ProgramStat[];
  categories: ProgramCollectionCard[];
  featuredLectures: ProgramLectureCard[];
  instructor: ProgramInstructorProfile;
}
