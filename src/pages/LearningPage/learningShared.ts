import type { LearningPlayerSnapshot } from '@/types/mypage';
import type { ProgramCurriculumLesson } from '@/types/programCatalog';

export interface FlattenedLesson extends ProgramCurriculumLesson {
  sectionId: string;
  sectionIndex: number;
  sectionTitle: string;
}

export interface FlattenedQuizItem {
  id: string;
  kind: 'quiz';
  lesson: FlattenedLesson;
  sectionId: string;
  sectionIndex: number;
  sectionTitle: string;
  title: string;
}

export interface FlattenedLessonItem {
  id: string;
  kind: 'lesson';
  lesson: FlattenedLesson;
  sectionId: string;
  sectionIndex: number;
  sectionTitle: string;
  title: string;
}

export type FlattenedPlayerItem = FlattenedLessonItem | FlattenedQuizItem;

export const buildQuizItemId = (lessonId: string) => `${lessonId}__quiz`;

export const isQuizItemId = (itemId: string) => itemId.endsWith('__quiz');

export const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR');
};

export const formatDateRange = (startValue?: string | null, endValue?: string | null) => {
  const startDate = formatDate(startValue);
  const endDate = formatDate(endValue);

  if (startDate === '-' && endDate === '-') {
    return '-';
  }

  return `${startDate} ~ ${endDate === '-' ? '기간 제한 없음' : endDate}`;
};

export const formatSeconds = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = Math.max(0, value % 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const flattenLessons = (
  sections: readonly { id: string; title: string; lessons: ProgramCurriculumLesson[] }[],
): FlattenedLesson[] => {
  return sections.flatMap((section, sectionIndex) => {
    return section.lessons.map((lesson) => ({
      ...lesson,
      sectionId: section.id,
      sectionIndex,
      sectionTitle: section.title,
    }));
  });
};

export const flattenPlayerItems = (
  sections: readonly { id: string; title: string; lessons: ProgramCurriculumLesson[] }[],
): FlattenedPlayerItem[] => {
  return flattenLessons(sections).flatMap((lesson) => {
    const lessonItem: FlattenedLessonItem = {
      id: lesson.id,
      kind: 'lesson',
      lesson,
      sectionId: lesson.sectionId,
      sectionIndex: lesson.sectionIndex,
      sectionTitle: lesson.sectionTitle,
      title: lesson.title,
    };

    if (!lesson.hasQuiz) {
      return [lessonItem];
    }

    return [
      lessonItem,
      {
        id: buildQuizItemId(lesson.id),
        kind: 'quiz',
        lesson,
        sectionId: lesson.sectionId,
        sectionIndex: lesson.sectionIndex,
        sectionTitle: lesson.sectionTitle,
        title: `${lesson.title} 확인 퀴즈`,
      } satisfies FlattenedQuizItem,
    ];
  });
};

export const getDefaultLessonId = (
  snapshot: LearningPlayerSnapshot | undefined,
  lessons: FlattenedLesson[],
) => {
  return snapshot?.currentLessonId || lessons[0]?.id || null;
};

export const getDefaultPlayerItemId = (
  snapshot: LearningPlayerSnapshot | undefined,
  items: FlattenedPlayerItem[],
) => {
  const currentLessonId = snapshot?.currentLessonId;

  if (currentLessonId && items.some((item) => item.id === currentLessonId)) {
    return currentLessonId;
  }

  return items[0]?.id || null;
};
