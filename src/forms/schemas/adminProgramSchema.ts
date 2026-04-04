import { z } from 'zod';

const numericStringSchema = z.string().trim().regex(/^\d+$/, '숫자만 입력해 주세요.');
const nullableDateStringSchema = z.string().trim();

const programStatSchema = z.object({
  label: z.string().trim().min(1, '항목명을 입력해 주세요.'),
  value: z.string().trim().min(1, '내용을 입력해 주세요.'),
});

const programFaqSchema = z.object({
  answer: z.string().trim().min(1, '답변을 입력해 주세요.'),
  question: z.string().trim().min(1, '질문을 입력해 주세요.'),
});

const programListItemSchema = z.object({
  value: z.string().trim().min(1, '항목 내용을 입력해 주세요.'),
});

const programCurriculumLessonSchema = z.object({
  deliveryType: z.enum(['online', 'offline']),
  description: z.string().trim(),
  durationMinutes: z.string().trim(),
  endDate: nullableDateStringSchema,
  startDate: nullableDateStringSchema,
  title: z.string().trim().min(1, '강의 제목을 입력해 주세요.'),
});

const programCurriculumSectionSchema = z.object({
  description: z.string().trim().min(1, '섹션 설명을 입력해 주세요.'),
  lessons: z
    .array(programCurriculumLessonSchema)
    .min(1, '섹션마다 최소 한 개 이상의 하위 강의가 필요합니다.'),
  title: z.string().trim().min(1, '섹션 제목을 입력해 주세요.'),
});

export const adminProgramDraftSchema = z
  .object({
    accessPolicy: z.enum(['cohort', 'limited-window', 'unlimited']),
    capacity: z.string().trim().optional(),
    format: z.enum(['online', 'offline', 'hybrid']),
    learningEndDate: nullableDateStringSchema,
    learningStartDate: nullableDateStringSchema,
    originalPrice: numericStringSchema,
    parentCollectionPath: z.string().trim().min(1, '등록 메뉴를 선택해 주세요.'),
    price: numericStringSchema,
    registrationEndDate: nullableDateStringSchema,
    registrationStartDate: nullableDateStringSchema,
    slug: z
      .string()
      .trim()
      .min(1, '공개 주소 코드를 입력해 주세요.')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.'),
    sourceProgramId: z.string().trim(),
    title: z.string().trim().min(1, '강의명을 입력해 주세요.').max(120, '강의명이 너무 깁니다.'),
  })
  .superRefine((values, context) => {
    const originalPrice = Number(values.originalPrice);
    const price = Number(values.price);
    const capacity = values.capacity?.trim() ? Number(values.capacity) : null;
    const hasRegistrationStart = Boolean(values.registrationStartDate.trim());
    const hasRegistrationEnd = Boolean(values.registrationEndDate.trim());
    const hasLearningStart = Boolean(values.learningStartDate.trim());
    const hasLearningEnd = Boolean(values.learningEndDate.trim());

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      context.addIssue({
        code: 'custom',
        message: '정가는 1원 이상이어야 합니다.',
        path: ['originalPrice'],
      });
    }

    if (!Number.isFinite(price) || price <= 0) {
      context.addIssue({
        code: 'custom',
        message: '판매가는 1원 이상이어야 합니다.',
        path: ['price'],
      });
    }

    if (Number.isFinite(originalPrice) && Number.isFinite(price) && originalPrice < price) {
      context.addIssue({
        code: 'custom',
        message: '정가는 판매가보다 작을 수 없습니다.',
        path: ['originalPrice'],
      });
    }

    if (values.format !== 'online') {
      if (capacity === null || !Number.isInteger(capacity) || capacity < 0) {
        context.addIssue({
          code: 'custom',
          message: '오프라인/하이브리드 강의는 정원을 입력해 주세요.',
          path: ['capacity'],
        });
      }
    }

    if (hasRegistrationStart !== hasRegistrationEnd) {
      context.addIssue({
        code: 'custom',
        message: '모집 시작일과 종료일은 함께 입력해 주세요.',
        path: ['registrationEndDate'],
      });
    }

    if (values.accessPolicy !== 'unlimited' && (!hasLearningStart || !hasLearningEnd)) {
      context.addIssue({
        code: 'custom',
        message: '운영 기간 또는 시청 가능 기간을 입력해 주세요.',
        path: ['learningEndDate'],
      });
    }

    if (
      (values.format === 'offline' || values.format === 'hybrid') &&
      values.accessPolicy !== 'cohort'
    ) {
      context.addIssue({
        code: 'custom',
        message: '오프라인/하이브리드 강의는 기수형 운영만 선택할 수 있습니다.',
        path: ['accessPolicy'],
      });
    }

    if (values.format === 'online' && values.accessPolicy === 'cohort') {
      context.addIssue({
        code: 'custom',
        message: '온라인 강의는 기간제 또는 무제한 수강으로 등록해 주세요.',
        path: ['accessPolicy'],
      });
    }
  });

export const adminProgramSchema = z
  .object({
    accessPolicy: z.enum(['cohort', 'limited-window', 'unlimited']),
    capacity: z.string().trim().optional(),
    curriculumSections: z
      .array(programCurriculumSectionSchema)
      .min(1, '최소 한 개 이상의 커리큘럼 섹션이 필요합니다.'),
    curriculumSummaryItemsInput: z
      .string()
      .trim()
      .min(1, '커리큘럼 요약 항목을 한 줄 이상 입력해 주세요.'),
    curriculumSummaryKind: z.enum(['decimal', 'disc']),
    curriculumTitle: z.string().trim(),
    description: z.string(),
    difficultyLabel: z.string().trim().min(1, '난이도 라벨을 입력해 주세요.'),
    faqItems: z.array(programFaqSchema).min(2, 'FAQ는 최소 2개 이상 작성해 주세요.'),
    format: z.enum(['online', 'offline', 'hybrid']),
    hashtagLabelsInput: z.string().trim(),
    heroImageAlt: z.string(),
    heroImageSrc: z.string().trim().min(1, '대표 이미지 경로를 입력해 주세요.'),
    learningEndDate: nullableDateStringSchema,
    learningPoints: z
      .array(programListItemSchema)
      .min(1, '학습 성과는 최소 1개 이상 추가해 주세요.'),
    learningStartDate: nullableDateStringSchema,
    originalPrice: numericStringSchema,
    parentCollectionPath: z.string().trim().min(1, '등록 위치를 선택해 주세요.'),
    preparationChecklist: z
      .array(programListItemSchema)
      .min(1, '수강 전 체크리스트는 최소 1개 이상 추가해 주세요.'),
    price: numericStringSchema,
    recommendedFor: z
      .array(programListItemSchema)
      .min(1, '추천 대상은 최소 1개 이상 추가해 주세요.'),
    registrationEndDate: nullableDateStringSchema,
    registrationStartDate: nullableDateStringSchema,
    slug: z
      .string()
      .trim()
      .min(1, '공개 주소 코드를 입력해 주세요.')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.'),
    stats: z.array(programStatSchema).min(2, '핵심 요약 항목을 최소 2개 이상 입력해 주세요.'),
    tagsInput: z.string().trim().min(1, '검색/분류 태그를 한 줄 이상 입력해 주세요.'),
    title: z.string().trim().min(1, '강의명을 입력해 주세요.').max(120, '강의명이 너무 깁니다.'),
  })
  .superRefine((values, context) => {
    const originalPrice = Number(values.originalPrice);
    const price = Number(values.price);
    const capacity = values.capacity?.trim() ? Number(values.capacity) : null;
    const hasRegistrationStart = Boolean(values.registrationStartDate.trim());
    const hasRegistrationEnd = Boolean(values.registrationEndDate.trim());
    const hasLearningStart = Boolean(values.learningStartDate.trim());
    const hasLearningEnd = Boolean(values.learningEndDate.trim());
    let hybridOfflineLessonCount = 0;
    let hybridOnlineLessonCount = 0;

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      context.addIssue({
        code: 'custom',
        message: '정가는 1원 이상이어야 합니다.',
        path: ['originalPrice'],
      });
    }

    if (!Number.isFinite(price) || price <= 0) {
      context.addIssue({
        code: 'custom',
        message: '판매가는 1원 이상이어야 합니다.',
        path: ['price'],
      });
    }

    if (Number.isFinite(originalPrice) && Number.isFinite(price) && originalPrice < price) {
      context.addIssue({
        code: 'custom',
        message: '정가는 판매가보다 작을 수 없습니다.',
        path: ['originalPrice'],
      });
    }

    if (values.format !== 'online') {
      if (capacity === null || !Number.isInteger(capacity) || capacity < 0) {
        context.addIssue({
          code: 'custom',
          message: '오프라인/하이브리드 강의는 정원을 입력해 주세요.',
          path: ['capacity'],
        });
      }
    }

    if (hasRegistrationStart !== hasRegistrationEnd) {
      context.addIssue({
        code: 'custom',
        message: '모집 시작일과 종료일은 함께 입력해 주세요.',
        path: ['registrationEndDate'],
      });
    }

    if (
      (values.format === 'offline' || values.format === 'hybrid') &&
      values.accessPolicy !== 'cohort'
    ) {
      context.addIssue({
        code: 'custom',
        message: '오프라인/하이브리드 강의는 기수형 운영만 선택할 수 있습니다.',
        path: ['accessPolicy'],
      });
    }

    if (values.format === 'online' && values.accessPolicy === 'cohort') {
      context.addIssue({
        code: 'custom',
        message: '온라인 강의는 기간제 또는 무제한 수강으로 등록해 주세요.',
        path: ['accessPolicy'],
      });
    }

    values.curriculumSections.forEach((section, sectionIndex) => {
      section.lessons.forEach((lesson, lessonIndex) => {
        const deliveryType =
          values.format === 'hybrid'
            ? lesson.deliveryType
            : values.format === 'online'
              ? 'online'
              : 'offline';

        if (values.format === 'online' && lesson.deliveryType !== 'online') {
          context.addIssue({
            code: 'custom',
            message: '온라인 강의의 하위 강의는 모두 온라인형이어야 합니다.',
            path: ['curriculumSections', sectionIndex, 'lessons', lessonIndex, 'deliveryType'],
          });
        }

        if (values.format === 'offline' && lesson.deliveryType !== 'offline') {
          context.addIssue({
            code: 'custom',
            message: '오프라인 강의의 하위 강의는 모두 오프라인형이어야 합니다.',
            path: ['curriculumSections', sectionIndex, 'lessons', lessonIndex, 'deliveryType'],
          });
        }

        if (deliveryType === 'online') {
          hybridOnlineLessonCount += 1;
          const durationMinutes = Number(lesson.durationMinutes);

          if (
            !lesson.durationMinutes.trim() ||
            !Number.isInteger(durationMinutes) ||
            durationMinutes <= 0
          ) {
            context.addIssue({
              code: 'custom',
              message: '온라인 하위 강의 시간은 1분 이상의 숫자로 입력해 주세요.',
              path: ['curriculumSections', sectionIndex, 'lessons', lessonIndex, 'durationMinutes'],
            });
          }

          return;
        }

        hybridOfflineLessonCount += 1;
        const hasLessonStart = Boolean(lesson.startDate.trim());
        const hasLessonEnd = Boolean(lesson.endDate.trim());

        if (hasLessonStart !== hasLessonEnd) {
          context.addIssue({
            code: 'custom',
            message: '오프라인 하위 강의는 시작일과 종료일을 함께 입력해 주세요.',
            path: ['curriculumSections', sectionIndex, 'lessons', lessonIndex, 'endDate'],
          });
        }

        if (!hasLessonStart || !hasLessonEnd) {
          context.addIssue({
            code: 'custom',
            message: '오프라인 하위 강의 운영 기간을 입력해 주세요.',
            path: ['curriculumSections', sectionIndex, 'lessons', lessonIndex, 'endDate'],
          });
          return;
        }

        if (lesson.startDate > lesson.endDate) {
          context.addIssue({
            code: 'custom',
            message: '하위 강의 종료일은 시작일보다 빠를 수 없습니다.',
            path: ['curriculumSections', sectionIndex, 'lessons', lessonIndex, 'endDate'],
          });
          return;
        }
      });
    });

    if (values.format === 'hybrid' && (!hybridOnlineLessonCount || !hybridOfflineLessonCount)) {
      context.addIssue({
        code: 'custom',
        message: '하이브리드 강의는 온라인형과 오프라인형 하위 강의를 모두 포함해야 합니다.',
        path: ['curriculumSections'],
      });
    }

    if (values.accessPolicy !== 'unlimited') {
      if (values.format === 'online') {
        if (!hasLearningStart || !hasLearningEnd) {
          context.addIssue({
            code: 'custom',
            message: '시청 가능 기간을 입력해 주세요.',
            path: ['learningEndDate'],
          });
        }
      } else if (hybridOfflineLessonCount === 0) {
        context.addIssue({
          code: 'custom',
          message: '하위 강의 일정에서 운영 기간을 계산할 수 있도록 날짜를 입력해 주세요.',
          path: ['curriculumSections'],
        });
      }
    }
  });

export type AdminProgramDraftFormValues = z.infer<typeof adminProgramDraftSchema>;
export type AdminProgramFormValues = z.infer<typeof adminProgramSchema>;
