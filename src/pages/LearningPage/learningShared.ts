import type { LearningPlayerSnapshot } from '@/types/mypage';
import type { ProgramCurriculumLesson } from '@/types/programCatalog';

export interface FlattenedLesson extends ProgramCurriculumLesson {
  sectionId: string;
  sectionIndex: number;
  sectionTitle: string;
}

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

export const getDefaultLessonId = (
  snapshot: LearningPlayerSnapshot | undefined,
  lessons: FlattenedLesson[],
) => {
  return snapshot?.currentLessonId || lessons[0]?.id || null;
};
