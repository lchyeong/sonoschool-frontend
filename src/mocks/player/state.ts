import {
  getMockLearningPlayerSnapshot,
  getMockLectureStream,
  resetMockMyPageData,
} from '@/mocks/data/mypage';
import { getPlayerMockScenario, type PlayerMockScenario } from '@/mocks/player/runtime';
import type {
  LearningPlayerSnapshot,
  LectureProgressSaveResponse,
  ProtectedLectureStream,
} from '@/types/mypage';
import type { ProgramCurriculumLesson } from '@/types/programCatalog';

const cloneData = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const scenarioEnrollmentId: Record<PlayerMockScenario, number | null> = {
  empty: null,
  offline: 103,
  practicum: 107,
  problem: 107,
  resource: 107,
  video: 110,
};

const scenarioDeliveryType: Partial<
  Record<PlayerMockScenario, ProgramCurriculumLesson['deliveryType']>
> = {
  offline: 'offline',
  practicum: 'practicum',
  problem: 'problem',
  resource: 'resource',
  video: 'online',
};

let activeScenario: PlayerMockScenario | null = null;
const progressByLectureId = new Map<number, LectureProgressSaveResponse>();

const ensureScenarioState = (): PlayerMockScenario => {
  const scenario = getPlayerMockScenario();

  if (activeScenario !== scenario) {
    resetMockMyPageData();
    progressByLectureId.clear();
    activeScenario = scenario;
  }

  return scenario;
};

const flattenLessons = (snapshot: LearningPlayerSnapshot): ProgramCurriculumLesson[] => {
  return snapshot.curriculumTrack.sections.flatMap((section) => section.lessons);
};

const selectScenarioLessonId = (
  snapshot: LearningPlayerSnapshot,
  scenario: PlayerMockScenario,
): string | null => {
  const targetDeliveryType = scenarioDeliveryType[scenario];

  if (!targetDeliveryType) {
    return snapshot.currentLessonId;
  }

  return (
    flattenLessons(snapshot).find((lesson) => lesson.deliveryType === targetDeliveryType)?.id ??
    null
  );
};

const applyProgressOverrides = (snapshot: LearningPlayerSnapshot): LearningPlayerSnapshot => {
  if (progressByLectureId.size === 0) {
    return snapshot;
  }

  const nextProgressByLessonId = { ...(snapshot.lessonProgressByLessonId ?? {}) };

  Object.entries(snapshot.lessonPlaybackById).forEach(([lessonId, source]) => {
    const progress = progressByLectureId.get(source.lectureId);

    if (!progress) {
      return;
    }

    const previousProgressPercent =
      lessonId in nextProgressByLessonId ? nextProgressByLessonId[lessonId].progressPercent : 0;

    nextProgressByLessonId[lessonId] = {
      completed: progress.completed,
      completedAt: progress.completedAt,
      lastWatchedAt: progress.lastWatchedAt,
      lectureId: progress.lectureId,
      progressPercent: progress.completed ? 100 : Math.max(previousProgressPercent, 1),
      watchedSeconds: progress.watchedSeconds,
    };
  });

  return {
    ...snapshot,
    lessonProgressByLessonId: nextProgressByLessonId,
  };
};

export const getMockedLearningPlayerSnapshot = (
  enrollmentId: number,
): LearningPlayerSnapshot | null => {
  const scenario = ensureScenarioState();

  if (scenario === 'empty') {
    return null;
  }

  const scenarioSourceEnrollmentId = scenarioEnrollmentId[scenario] ?? enrollmentId;
  const snapshot =
    getMockLearningPlayerSnapshot(scenarioSourceEnrollmentId) ??
    getMockLearningPlayerSnapshot(enrollmentId);

  if (!snapshot) {
    return null;
  }

  const nextSnapshot = applyProgressOverrides(cloneData(snapshot));
  const currentLessonId = selectScenarioLessonId(nextSnapshot, scenario);

  const baseSnapshot = {
    ...nextSnapshot,
    currentLessonId,
    resumeAtSeconds: currentLessonId
      ? (nextSnapshot.lessonProgressByLessonId?.[currentLessonId]?.watchedSeconds ?? 0)
      : 0,
  };

  if (!nextSnapshot.enrollment) {
    return baseSnapshot;
  }

  return {
    ...baseSnapshot,
    enrollment: {
      ...nextSnapshot.enrollment,
      active: true,
      status: 'ACTIVE',
    },
  };
};

export const getMockedLectureStream = (
  lectureId: number,
  deviceId?: string | null,
): ProtectedLectureStream | null => {
  ensureScenarioState();
  return getMockLectureStream(lectureId, deviceId);
};

export const saveMockedLectureProgress = (
  lectureId: number,
  watchedSeconds: number,
): LectureProgressSaveResponse => {
  ensureScenarioState();

  const now = new Date().toISOString();
  const response: LectureProgressSaveResponse = {
    completed: watchedSeconds >= 60,
    completedAt: watchedSeconds >= 60 ? now : null,
    lastWatchedAt: now,
    lectureId,
    watchedSeconds,
  };

  progressByLectureId.set(lectureId, response);

  return response;
};
