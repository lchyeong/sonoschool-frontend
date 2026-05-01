import type { CSSProperties } from 'react';

import type { ProgramCurriculumLessonDeliveryType } from '@/types/programCatalog';

export type LessonStatusStyle = CSSProperties & {
  '--lesson-check-icon'?: string;
};

export type PlayerIconStyle = CSSProperties & {
  '--player-icon': string;
};

export interface QualityOption {
  label: string;
  levelIndex: number | 'auto';
}

export type SidebarPanel = 'curriculum' | 'qna';
export type QuizSidebarPanel = 'curriculum' | 'qna';
export type SettingsPanel = 'quality' | 'speed';

export interface QuizClockAnchor {
  elapsedSeconds: number;
  receivedAtMs: number;
  remainingSeconds: number | null;
  startedAt: string | null;
}

export const PLAYBACK_SPEED_OPTIONS = [0.8, 1, 1.25, 1.5] as const;
export const DEFAULT_QUALITY_OPTIONS: QualityOption[] = [{ label: '자동', levelIndex: 'auto' }];
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
export const FIXED_PLAYER_CALENDAR_CELL_COUNT = 42;
export const PROGRESS_SAVE_INTERVAL_SECONDS = 30;
export const PROGRESS_SAVE_MIN_DELTA_SECONDS = 20;
export const PROGRESS_EXIT_SAVE_MIN_DELTA_SECONDS = 5;
export const PROBLEM_SESSION_SAVE_INTERVAL_SECONDS = 10;
export const PLAYER_CONTROLS_AUTO_HIDE_MS = 2400;

export const LESSON_TYPE_LABELS: Record<ProgramCurriculumLessonDeliveryType, string> = {
  offline: '오프라인 강의',
  online: '동영상 강의',
  practicum: '실습예약',
  problem: '문제 풀이 강의',
  resource: '첨부파일 강의',
};

export const PLAYER_LESSON_TYPE_LABELS: Record<ProgramCurriculumLessonDeliveryType, string> = {
  offline: '오프라인',
  online: '영상',
  practicum: '실습예약',
  problem: '문제풀이',
  resource: '첨부파일',
};
