import type {
  AdminProgramDraftFormValues,
  AdminProgramFormValues,
} from '@/forms/schemas/adminProgramSchema';
import type {
  AdminProgramCollectionOption,
  AdminProgramDetailItem,
  CreateAdminProgramDraftPayload,
  UpsertAdminProgramPayload,
} from '@/types/adminConsole';
import type { ProgramCurriculumLesson, ProgramCurriculumTrack } from '@/types/programCatalog';
import {
  deriveCurriculumLessonDurationLabel,
  deriveCurriculumSectionDurationLabel,
  deriveProgramDisplayText,
  formatProgramMinutesLabel,
} from '@/utils/programMetadata';

interface AdminProgramPreviewData {
  collectionLabelPath: string;
  curriculumSectionCount: number;
  curriculumSummaryItems: string[];
  description: string;
  difficultyLabel: string;
  discountRateLabel: string;
  durationLabel: string;
  faqCount: number;
  formatLabel: string;
  hashtags: string[];
  heroInfoPills: Array<{ label: string; value: string }>;
  learningPoints: string[];
  operationPeriodLabel: string | null;
  originalPriceLabel: string;
  preparationChecklist: string[];
  priceLabel: string;
  publicPath: string;
  recommendedFor: string[];
  registrationPeriodLabel: string;
  remainingSeatsLabel: string | null;
  scheduleLabel: string;
  statusLabel: string;
  title: string;
  tuitionLabel: string;
}

const DEFAULT_OFFLINE_BASE_DATE = '2026-04-07';
const DEFAULT_LESSON_DURATION_MINUTES = 45;

export const slugifyAdminProgram = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const splitListInput = (value: string): string[] => {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const getListValues = (items: readonly { value: string }[]): string[] => {
  return items.map((item) => item.value.trim()).filter((item) => item.length > 0);
};

export const formatWonLabel = (value: number): string => {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
};

const formatWonLabelWithSpace = (value: number): string => {
  return `${new Intl.NumberFormat('ko-KR').format(value)} 원`;
};

export const calculateDiscountRateLabel = (originalPrice: number, price: number): string => {
  if (originalPrice <= 0 || originalPrice <= price) {
    return '0%';
  }

  const discountRate = Math.round(((originalPrice - price) / originalPrice) * 100);
  return `${String(discountRate)}%`;
};

const parseIsoDate = (value: string): Date | null => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addIsoDays = (value: string, days: number): string => {
  const parsed = parseIsoDate(value);

  if (!parsed) {
    return value;
  }

  const nextDate = new Date(parsed);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return `${String(nextDate.getUTCFullYear())}-${String(nextDate.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(nextDate.getUTCDate()).padStart(2, '0')}`;
};

const buildAdminProgramPublicPath = (collectionPath: string, slug: string): string => {
  const normalizedCollectionPath = collectionPath.replace(/\/$/, '').trim();
  const normalizedSlug = slug.trim();

  if (!normalizedCollectionPath || !normalizedSlug) {
    return '';
  }

  return `${normalizedCollectionPath}/${normalizedSlug}`;
};

const createListItem = (value: string) => ({ value });

const createCurriculumLessonFormValue = (
  deliveryType: 'offline' | 'online',
  lessonIndex: number,
  sectionIndex: number,
) => {
  const baseTitle =
    sectionIndex === 0
      ? lessonIndex === 0
        ? '기본 루틴 잡기'
        : '프로브 운용 기준 정리'
      : lessonIndex === 0
        ? '핵심 판독 포인트'
        : '증례 기반 피드백';

  if (deliveryType === 'online') {
    return {
      deliveryType,
      description:
        lessonIndex === 0
          ? '핵심 개념과 사례를 온라인 영상으로 먼저 익힙니다.'
          : '앞선 내용을 바탕으로 반복 복습과 적용 포인트를 정리합니다.',
      durationMinutes: String(DEFAULT_LESSON_DURATION_MINUTES + lessonIndex * 15),
      endDate: '',
      startDate: '',
      title: baseTitle,
    };
  }

  const startDate = addIsoDays(DEFAULT_OFFLINE_BASE_DATE, sectionIndex * 7 + lessonIndex * 2);

  return {
    deliveryType,
    description:
      lessonIndex === 0
        ? '현장에서 바로 적용할 기본 자세와 순서를 오프라인으로 익힙니다.'
        : '실습 위주 피드백으로 자주 막히는 장면을 정리합니다.',
    durationMinutes: '',
    endDate: startDate,
    startDate,
    title: baseTitle,
  };
};

export const createCurriculumSectionFormValue = (
  format: AdminProgramFormValues['format'],
  sectionIndex: number,
) => {
  const defaultDeliveryType = format === 'online' ? 'online' : 'offline';
  const lessons =
    format === 'hybrid'
      ? [
          createCurriculumLessonFormValue('online', 0, sectionIndex),
          createCurriculumLessonFormValue('offline', 1, sectionIndex),
        ]
      : [
          createCurriculumLessonFormValue(defaultDeliveryType, 0, sectionIndex),
          createCurriculumLessonFormValue(defaultDeliveryType, 1, sectionIndex),
        ];

  return {
    description:
      sectionIndex === 0
        ? '검사 시작 전에 반드시 정리해야 하는 기준과 학습 흐름을 다룹니다.'
        : '현장에서 자주 막히는 장면을 기준으로 적용 포인트를 연결합니다.',
    lessons,
    title: sectionIndex === 0 ? '기본 루틴 정리' : '핵심 포인트 심화',
  };
};

const createCurriculumLessonPayload = (
  lesson: AdminProgramFormValues['curriculumSections'][number]['lessons'][number],
  format: AdminProgramFormValues['format'],
  sectionIndex: number,
  lessonIndex: number,
  idBase: string,
): ProgramCurriculumLesson => {
  const deliveryType =
    format === 'hybrid' ? lesson.deliveryType : format === 'online' ? 'online' : 'offline';
  const durationMinutes =
    deliveryType === 'online' && lesson.durationMinutes.trim()
      ? Number(lesson.durationMinutes)
      : null;
  const startDate = deliveryType === 'offline' ? lesson.startDate.trim() || null : null;
  const endDate = deliveryType === 'offline' ? lesson.endDate.trim() || null : null;
  const lessonPayload: ProgramCurriculumLesson = {
    deliveryType,
    ...(lesson.description.trim() ? { description: lesson.description.trim() } : {}),
    durationLabel: '',
    durationMinutes,
    endDate,
    id: `${idBase}-section-${String(sectionIndex + 1)}-lesson-${String(lessonIndex + 1)}`,
    startDate,
    title: lesson.title.trim(),
  };

  lessonPayload.durationLabel = deriveCurriculumLessonDurationLabel(lessonPayload);
  return lessonPayload;
};

export const buildCurriculumTrackFromFormValues = (
  values: Pick<
    AdminProgramFormValues,
    | 'curriculumSections'
    | 'curriculumSummaryItemsInput'
    | 'curriculumSummaryKind'
    | 'curriculumTitle'
    | 'format'
    | 'slug'
    | 'title'
  >,
): ProgramCurriculumTrack => {
  const idBase = values.slug.trim() || slugifyAdminProgram(values.title) || 'draft-program';
  const sections = values.curriculumSections.map((section, sectionIndex) => {
    const lessons = section.lessons.map((lesson, lessonIndex) =>
      createCurriculumLessonPayload(lesson, values.format, sectionIndex, lessonIndex, idBase),
    );
    const sectionPayload = {
      description: section.description.trim(),
      durationLabel: '',
      id: `${idBase}-section-${String(sectionIndex + 1)}`,
      lessons,
      title: section.title.trim(),
    };

    sectionPayload.durationLabel = deriveCurriculumSectionDurationLabel(sectionPayload);
    return sectionPayload;
  });

  return {
    id: `${idBase}-track`,
    sections,
    summaryItems: splitListInput(values.curriculumSummaryItemsInput),
    summaryKind: values.curriculumSummaryKind,
    ...(values.curriculumTitle.trim() ? { title: values.curriculumTitle.trim() } : {}),
  };
};

export const deriveLearningDatesFromCurriculumSections = (
  values: Pick<
    AdminProgramFormValues,
    | 'accessPolicy'
    | 'curriculumSections'
    | 'curriculumSummaryItemsInput'
    | 'curriculumSummaryKind'
    | 'curriculumTitle'
    | 'format'
    | 'learningEndDate'
    | 'learningStartDate'
    | 'slug'
    | 'title'
  >,
) => {
  const curriculumTrack = buildCurriculumTrackFromFormValues(values);
  const derivedText = deriveProgramDisplayText({
    accessPolicy: values.accessPolicy,
    curriculumTrack,
    format: values.format,
    learningEndDate: values.learningEndDate.trim() || null,
    learningStartDate: values.learningStartDate.trim() || null,
    registrationEndDate: null,
    registrationStartDate: null,
  });

  return {
    curriculumTrack,
    learningEndDate: derivedText.effectiveLearningEndDate ?? '',
    learningStartDate: derivedText.effectiveLearningStartDate ?? '',
  };
};

export const syncCurriculumSectionsForFormat = (
  sections: AdminProgramFormValues['curriculumSections'],
  format: AdminProgramFormValues['format'],
): AdminProgramFormValues['curriculumSections'] => {
  const syncedSections = sections.map((section, sectionIndex) => ({
    ...section,
    lessons: section.lessons.map((lesson, lessonIndex) => {
      const nextLesson = { ...lesson };

      if (format === 'online') {
        nextLesson.deliveryType = 'online';
        if (!nextLesson.durationMinutes.trim()) {
          nextLesson.durationMinutes = String(DEFAULT_LESSON_DURATION_MINUTES + lessonIndex * 15);
        }
      } else if (format === 'offline') {
        nextLesson.deliveryType = 'offline';
        if (!nextLesson.startDate.trim()) {
          nextLesson.startDate = addIsoDays(
            DEFAULT_OFFLINE_BASE_DATE,
            sectionIndex * 7 + lessonIndex * 2,
          );
        }
        if (!nextLesson.endDate.trim()) {
          nextLesson.endDate = nextLesson.startDate;
        }
      } else {
        if (nextLesson.deliveryType === 'online' && !nextLesson.durationMinutes.trim()) {
          nextLesson.durationMinutes = String(DEFAULT_LESSON_DURATION_MINUTES + lessonIndex * 15);
        }

        if (nextLesson.deliveryType === 'offline' && !nextLesson.startDate.trim()) {
          nextLesson.startDate = addIsoDays(
            DEFAULT_OFFLINE_BASE_DATE,
            sectionIndex * 7 + lessonIndex * 2,
          );
        }

        if (nextLesson.deliveryType === 'offline' && !nextLesson.endDate.trim()) {
          nextLesson.endDate = nextLesson.startDate;
        }
      }

      return nextLesson;
    }),
  }));

  if (format !== 'hybrid') {
    return syncedSections;
  }

  const hybridHasOnlineLesson = syncedSections.some((section) =>
    section.lessons.some((lesson) => lesson.deliveryType === 'online'),
  );
  const hybridHasOfflineLesson = syncedSections.some((section) =>
    section.lessons.some((lesson) => lesson.deliveryType === 'offline'),
  );

  if (hybridHasOnlineLesson && hybridHasOfflineLesson) {
    return syncedSections;
  }

  let assignedOnline = false;
  let assignedOffline = false;

  return syncedSections.map((section, sectionIndex) => ({
    ...section,
    lessons: section.lessons.map((lesson, lessonIndex) => {
      const nextLesson = { ...lesson };

      if (!assignedOnline) {
        nextLesson.deliveryType = 'online';
        nextLesson.durationMinutes =
          nextLesson.durationMinutes.trim() || String(DEFAULT_LESSON_DURATION_MINUTES);
        assignedOnline = true;
        return nextLesson;
      }

      if (!assignedOffline) {
        nextLesson.deliveryType = 'offline';
        nextLesson.startDate =
          nextLesson.startDate.trim() ||
          addIsoDays(DEFAULT_OFFLINE_BASE_DATE, sectionIndex * 7 + lessonIndex * 2);
        nextLesson.endDate = nextLesson.endDate.trim() || nextLesson.startDate;
        assignedOffline = true;
        return nextLesson;
      }

      return nextLesson;
    }),
  }));
};

export const deriveProgramText = (
  values: Pick<
    AdminProgramFormValues,
    | 'accessPolicy'
    | 'curriculumSections'
    | 'curriculumSummaryItemsInput'
    | 'curriculumSummaryKind'
    | 'curriculumTitle'
    | 'format'
    | 'learningEndDate'
    | 'learningStartDate'
    | 'registrationEndDate'
    | 'registrationStartDate'
    | 'slug'
    | 'title'
  >,
) => {
  const curriculumTrack = buildCurriculumTrackFromFormValues(values);

  return deriveProgramDisplayText({
    accessPolicy: values.accessPolicy,
    curriculumTrack,
    format: values.format,
    learningEndDate: values.learningEndDate.trim() || null,
    learningStartDate: values.learningStartDate.trim() || null,
    registrationEndDate: values.registrationEndDate.trim() || null,
    registrationStartDate: values.registrationStartDate.trim() || null,
  });
};

export const createDefaultAdminProgramDraftValues = (
  collectionPath = '',
): AdminProgramDraftFormValues => {
  return {
    accessPolicy: 'cohort',
    capacity: '24',
    format: 'offline',
    learningEndDate: '',
    learningStartDate: '',
    originalPrice: '990000',
    parentCollectionPath: collectionPath,
    price: '890000',
    registrationEndDate: '',
    registrationStartDate: '',
    slug: '',
    sourceProgramId: '',
    title: '',
  };
};

export const createDefaultAdminProgramFormValues = (
  collectionPath = '',
): AdminProgramFormValues => {
  return {
    accessPolicy: 'cohort',
    capacity: '24',
    curriculumSections: [
      createCurriculumSectionFormValue('offline', 0),
      createCurriculumSectionFormValue('offline', 1),
    ],
    curriculumSummaryItemsInput: '프로브 운용 기준\n핵심 해부학 체크\n증례 기반 적용',
    curriculumSummaryKind: 'disc',
    curriculumTitle: '실전 적용 트랙',
    description: '',
    difficultyLabel: '입문',
    faqItems: [
      {
        answer:
          '강의 시작 전 메일로 준비물과 학습 안내를 전달하며, 첫 세션에서 전체 학습 흐름을 다시 안내합니다.',
        question: '수업 전에 미리 준비해야 할 것이 있나요?',
      },
      {
        answer: '각 세션 후 체크리스트를 다시 확인할 수 있도록 복습 포인트를 정리해 드립니다.',
        question: '복습은 어떤 방식으로 진행되나요?',
      },
    ],
    format: 'offline',
    hashtagLabelsInput: '오프라인 정규\n입문',
    heroImageAlt: '',
    heroImageSrc: '/og-thumbnail.jpg',
    learningEndDate: '',
    learningPoints: [
      createListItem('실무에서 바로 적용할 수 있는 스캔 순서를 구조적으로 익힙니다.'),
      createListItem('프로브 각도와 화면 확보 기준을 반복해서 정리합니다.'),
      createListItem('판독과 보고 흐름을 한 번에 연결합니다.'),
    ],
    learningStartDate: '',
    originalPrice: '990000',
    parentCollectionPath: collectionPath,
    preparationChecklist: [
      createListItem('편한 복장과 개인 필기 도구를 준비합니다.'),
      createListItem('궁금한 임상 질문을 2~3개 정리해 옵니다.'),
      createListItem('강의 후 바로 복습할 수 있도록 체크리스트를 메모합니다.'),
    ],
    price: '890000',
    recommendedFor: [
      createListItem('기초 루틴을 처음부터 다시 정리하고 싶은 수강생'),
      createListItem('현장 적용 중심으로 학습 흐름을 점검하고 싶은 분'),
      createListItem('핸즈온 피드백이 필요한 입문자'),
    ],
    registrationEndDate: '',
    registrationStartDate: '',
    slug: '',
    stats: [
      { label: '핵심 역량', value: '스캔 순서와 프로브 운용 기준을 한 번에 정리' },
      { label: '실전 포인트', value: '실습 중 자주 막히는 장면을 증례 중심으로 피드백' },
      { label: '학습 결과', value: '검사 전후 보고 흐름까지 자연스럽게 연결' },
    ],
    tagsInput: '복부\n기초\n실습',
    title: '',
  };
};

export const toAdminProgramDraftPayload = (
  values: AdminProgramDraftFormValues,
): CreateAdminProgramDraftPayload => {
  return {
    accessPolicy: values.accessPolicy,
    capacity:
      values.format === 'online' || !values.capacity?.trim() ? null : Number(values.capacity),
    format: values.format,
    learningEndDate: values.learningEndDate.trim() || null,
    learningStartDate: values.learningStartDate.trim() || null,
    originalPrice: Number(values.originalPrice),
    parentCollectionPath: values.parentCollectionPath,
    price: Number(values.price),
    registrationEndDate: values.registrationEndDate.trim() || null,
    registrationStartDate: values.registrationStartDate.trim() || null,
    slug: values.slug.trim(),
    sourceProgramId: values.sourceProgramId.trim() ? values.sourceProgramId.trim() : null,
    title: values.title.trim(),
  };
};

export const toAdminProgramPayload = (
  values: AdminProgramFormValues,
): UpsertAdminProgramPayload => {
  const curriculumTrack = buildCurriculumTrackFromFormValues(values);
  const derivedText = deriveProgramDisplayText({
    accessPolicy: values.accessPolicy,
    curriculumTrack,
    format: values.format,
    learningEndDate: values.learningEndDate.trim() || null,
    learningStartDate: values.learningStartDate.trim() || null,
    registrationEndDate: values.registrationEndDate.trim() || null,
    registrationStartDate: values.registrationStartDate.trim() || null,
  });

  return {
    accessPolicy: values.accessPolicy,
    capacity:
      values.format === 'online' || !values.capacity?.trim() ? null : Number(values.capacity),
    curriculumTrack,
    description: values.description.trim(),
    difficultyLabel: values.difficultyLabel.trim(),
    faqItems: values.faqItems.map((item, index) => ({
      answer: item.answer.trim(),
      id: `${values.slug || 'draft-program'}-faq-${String(index + 1)}`,
      question: item.question.trim(),
    })),
    format: values.format,
    hashtagLabels: splitListInput(values.hashtagLabelsInput),
    heroImageAlt: values.heroImageAlt.trim(),
    heroImageSrc: values.heroImageSrc.trim(),
    learningEndDate: derivedText.effectiveLearningEndDate,
    learningPoints: getListValues(values.learningPoints),
    learningStartDate: derivedText.effectiveLearningStartDate,
    originalPrice: Number(values.originalPrice),
    operationPeriodLabel: derivedText.operationPeriodLabel ?? undefined,
    parentCollectionPath: values.parentCollectionPath,
    preparationChecklist: getListValues(values.preparationChecklist),
    price: Number(values.price),
    recommendedFor: getListValues(values.recommendedFor),
    registrationEndDate: values.registrationEndDate.trim() || null,
    registrationPeriodLabel: derivedText.registrationPeriodLabel,
    registrationStartDate: values.registrationStartDate.trim() || null,
    slug: values.slug.trim(),
    stats: values.stats.map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
    })),
    tags: splitListInput(values.tagsInput),
    title: values.title.trim(),
  };
};

export const toAdminProgramFormValues = (
  program: AdminProgramDetailItem,
): AdminProgramFormValues => {
  return {
    accessPolicy: program.accessPolicy,
    capacity: program.capacity === null ? '' : String(program.capacity),
    curriculumSections: program.curriculumTrack.sections.map((section) => ({
      description: section.description,
      lessons: section.lessons.map((lesson) => ({
        deliveryType: lesson.deliveryType,
        description: lesson.description ?? '',
        durationMinutes: lesson.durationMinutes === null ? '' : String(lesson.durationMinutes),
        endDate: lesson.endDate ?? '',
        startDate: lesson.startDate ?? '',
        title: lesson.title,
      })),
      title: section.title,
    })),
    curriculumSummaryItemsInput: program.curriculumTrack.summaryItems.join('\n'),
    curriculumSummaryKind: program.curriculumTrack.summaryKind,
    curriculumTitle: program.curriculumTrack.title ?? '',
    description: program.description,
    difficultyLabel: program.difficultyLabel,
    faqItems: program.faqItems.map((item) => ({
      answer: item.answer,
      question: item.question,
    })),
    format: program.format,
    hashtagLabelsInput: program.hashtagLabels.join('\n'),
    heroImageAlt: program.heroImageAlt,
    heroImageSrc: program.heroImageSrc,
    learningEndDate: program.learningEndDate ?? '',
    learningPoints: program.learningPoints.map(createListItem),
    learningStartDate: program.learningStartDate ?? '',
    originalPrice: String(program.originalPrice),
    parentCollectionPath: program.parentCollectionPath,
    preparationChecklist: program.preparationChecklist.map(createListItem),
    price: String(program.price),
    recommendedFor: program.recommendedFor.map(createListItem),
    registrationEndDate: program.registrationEndDate ?? '',
    registrationStartDate: program.registrationStartDate ?? '',
    slug: program.slug,
    stats: program.stats.map((item) => ({
      label: item.label,
      value: item.value,
    })),
    tagsInput: program.tags.join('\n'),
    title: program.title,
  };
};

export const toDuplicateAdminProgramFormValues = (
  program: AdminProgramDetailItem,
  parentCollectionPath = program.parentCollectionPath,
): AdminProgramFormValues => {
  return {
    ...toAdminProgramFormValues(program),
    parentCollectionPath,
    slug: `${program.slug}-copy`,
  };
};

export const toAdminProgramDraftPayloadFromFormValues = (
  values: AdminProgramFormValues,
  sourceProgramId: string | null = null,
): CreateAdminProgramDraftPayload => {
  const curriculumTrack = buildCurriculumTrackFromFormValues(values);
  const derivedText = deriveProgramDisplayText({
    accessPolicy: values.accessPolicy,
    curriculumTrack,
    format: values.format,
    learningEndDate: values.learningEndDate.trim() || null,
    learningStartDate: values.learningStartDate.trim() || null,
    registrationEndDate: values.registrationEndDate.trim() || null,
    registrationStartDate: values.registrationStartDate.trim() || null,
  });

  return {
    accessPolicy: values.accessPolicy,
    capacity:
      values.format === 'online' || !values.capacity?.trim() ? null : Number(values.capacity),
    format: values.format,
    learningEndDate: derivedText.effectiveLearningEndDate,
    learningStartDate: derivedText.effectiveLearningStartDate,
    originalPrice: Number(values.originalPrice),
    parentCollectionPath: values.parentCollectionPath,
    price: Number(values.price),
    registrationEndDate: values.registrationEndDate.trim() || null,
    registrationStartDate: values.registrationStartDate.trim() || null,
    slug: values.slug.trim(),
    sourceProgramId,
    title: values.title.trim(),
  };
};

const buildHeroInfoPills = (
  preview: Pick<
    AdminProgramPreviewData,
    | 'curriculumSectionCount'
    | 'difficultyLabel'
    | 'durationLabel'
    | 'formatLabel'
    | 'operationPeriodLabel'
    | 'registrationPeriodLabel'
  >,
  format: AdminProgramFormValues['format'],
) => {
  const pills = [
    { label: '난이도', value: preview.difficultyLabel },
    { label: '모집 기간', value: preview.registrationPeriodLabel },
  ];

  if (format !== 'online' && preview.operationPeriodLabel) {
    pills.push({ label: '운영 기간', value: preview.operationPeriodLabel });
  }

  pills.push(
    { label: '강의 기간', value: preview.durationLabel },
    { label: '커리큘럼', value: `이론 및 실습 ${String(preview.curriculumSectionCount)}개` },
    { label: '수업 구분', value: preview.formatLabel },
  );

  return pills;
};

export const buildAdminProgramPreviewData = (
  values: AdminProgramFormValues,
  collectionOptions: AdminProgramCollectionOption[],
  statusLabel: string,
): AdminProgramPreviewData => {
  const originalPrice = Number(values.originalPrice);
  const price = Number(values.price);
  const selectedCollection =
    collectionOptions.find((option) => option.path === values.parentCollectionPath) ?? null;
  const collectionLabelPath = selectedCollection?.labelPath ?? '등록 위치를 선택해 주세요.';
  const publicPath = buildAdminProgramPublicPath(values.parentCollectionPath, values.slug);
  const derivedText = deriveProgramText(values);
  const remainingSeatsLabel =
    values.format === 'online'
      ? null
      : (() => {
          const capacity = values.capacity?.trim() ? Number(values.capacity) : 0;

          if (!Number.isFinite(capacity)) {
            return null;
          }

          return `수강 가능 인원 ${String(Math.max(capacity, 0))}명 기준`;
        })();

  const preview: AdminProgramPreviewData = {
    collectionLabelPath,
    curriculumSectionCount: values.curriculumSections.length,
    curriculumSummaryItems: splitListInput(values.curriculumSummaryItemsInput),
    description: values.description.trim(),
    difficultyLabel: values.difficultyLabel.trim(),
    discountRateLabel: calculateDiscountRateLabel(originalPrice, price),
    durationLabel: derivedText.durationLabel,
    faqCount: values.faqItems.length,
    formatLabel: derivedText.formatLabel,
    hashtags: splitListInput(values.hashtagLabelsInput).length
      ? splitListInput(values.hashtagLabelsInput)
      : splitListInput(values.tagsInput),
    heroInfoPills: [],
    learningPoints: getListValues(values.learningPoints),
    operationPeriodLabel: derivedText.operationPeriodLabel,
    originalPriceLabel: formatWonLabelWithSpace(originalPrice || 0),
    preparationChecklist: getListValues(values.preparationChecklist),
    priceLabel: formatWonLabel(price || 0),
    publicPath,
    recommendedFor: getListValues(values.recommendedFor),
    registrationPeriodLabel: derivedText.registrationPeriodLabel,
    remainingSeatsLabel,
    scheduleLabel: derivedText.scheduleLabel,
    statusLabel,
    title: values.title.trim(),
    tuitionLabel: derivedText.tuitionLabel,
  };

  preview.heroInfoPills = buildHeroInfoPills(preview, values.format);
  return preview;
};

export const buildCurriculumSectionPreviewMeta = (
  section: AdminProgramFormValues['curriculumSections'][number],
) => {
  const previewSection = {
    description: section.description.trim(),
    durationLabel: '',
    id: 'preview-section',
    lessons: section.lessons.map((lesson, lessonIndex) => {
      const deliveryType = lesson.deliveryType;
      const previewLesson: ProgramCurriculumLesson = {
        deliveryType,
        ...(lesson.description.trim() ? { description: lesson.description.trim() } : {}),
        durationLabel: '',
        durationMinutes:
          deliveryType === 'online' && lesson.durationMinutes.trim()
            ? Number(lesson.durationMinutes)
            : null,
        endDate: deliveryType === 'offline' ? lesson.endDate.trim() || null : null,
        id: `preview-lesson-${String(lessonIndex + 1)}`,
        startDate: deliveryType === 'offline' ? lesson.startDate.trim() || null : null,
        title: lesson.title.trim(),
      };

      previewLesson.durationLabel = deriveCurriculumLessonDurationLabel(previewLesson);
      return previewLesson;
    }),
    title: section.title.trim(),
  };

  const onlineMinutesTotal = previewSection.lessons.reduce((total, lesson) => {
    return lesson.deliveryType === 'online' ? total + (lesson.durationMinutes ?? 0) : total;
  }, 0);
  const hasMixedDelivery =
    previewSection.lessons.some((lesson) => lesson.deliveryType === 'online') &&
    previewSection.lessons.some((lesson) => lesson.deliveryType === 'offline');

  previewSection.durationLabel = deriveCurriculumSectionDurationLabel(previewSection);

  return {
    durationLabel: previewSection.durationLabel,
    lessonCountLabel: `${String(previewSection.lessons.length)}강`,
    onlineSummaryLabel:
      hasMixedDelivery && onlineMinutesTotal > 0
        ? `온라인 총 ${formatProgramMinutesLabel(onlineMinutesTotal)}`
        : null,
  };
};
