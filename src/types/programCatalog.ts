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
  tags: string[];
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
  remainingSeatsCount?: number | undefined;
  remainingSeatsLabel?: string | undefined;
  hashtagLabels: string[];
  scheduleLabel: string;
  tags: string[];
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
  focusTags: string[];
  instructor: ProgramInstructorProfile;
}

export type ProgramCurriculumLessonDeliveryType = 'online' | 'offline';

export interface ProgramCurriculumLesson {
  deliveryType: ProgramCurriculumLessonDeliveryType;
  description?: string | undefined;
  durationLabel: string;
  durationMinutes: number | null;
  endDate: string | null;
  id: string;
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

export interface ProgramFaqItem {
  id: string;
  question: string;
  answer: string;
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
  registrationPeriodLabel: string;
  hashtagLabels: string[];
  scheduleLabel: string;
  tags: string[];
  stats: ProgramInfoItem[];
  learningPoints: string[];
  recommendedFor: string[];
  curriculumTrack: ProgramCurriculumTrack;
  preparationChecklist: string[];
  faqItems: ProgramFaqItem[];
  overallRating: number;
  reviewCount: number;
  reviews: ProgramReviewItem[];
  instructor: ProgramInstructorProfile;
  relatedLectures: ProgramLectureCard[];
}

export type ProgramPageResponse = ProgramCollectionPageResponse | ProgramDetailPageResponse;

export interface ProgramsOverviewResponse {
  title: string;
  description: string;
  heroTags: string[];
  stats: ProgramStat[];
  categories: ProgramCollectionCard[];
  featuredLectures: ProgramLectureCard[];
  instructor: ProgramInstructorProfile;
}
