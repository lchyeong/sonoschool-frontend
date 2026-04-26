export type AdminLectureType = 'VIDEO' | 'OFFLINE' | 'PRACTICUM' | 'PROBLEM' | 'RESOURCE';

export interface AdminLectureOfflineSchedule {
  date: string;
  endTime: string;
  id: number;
  location: string | null;
  notes: string | null;
  startTime: string;
}

export interface AdminCurriculumLecture {
  description: string | null;
  durationSeconds: number | null;
  id: number;
  lectureType: AdminLectureType;
  offlineSchedules: AdminLectureOfflineSchedule[];
  problemOnly?: boolean;
  preview: boolean;
  practicumEnabled?: boolean;
  published: boolean;
  sectionId: number;
  sortOrder: number;
  title: string;
  videoId: number | null;
}

export interface AdminCurriculumSection {
  description: string | null;
  id: number;
  lectures: AdminCurriculumLecture[];
  sortOrder: number;
  title: string;
}

export interface AdminSectionUpsertPayload {
  description: string | null;
  sortOrder: number;
  title: string;
}

export interface AdminLectureUpsertPayload {
  description: string | null;
  durationSeconds: number | null;
  lectureType: AdminLectureType;
  problemOnly?: boolean;
  preview: boolean;
  practicumEnabled?: boolean;
  sortOrder: number;
  title: string;
}

export interface AdminLectureOfflineScheduleUpsertPayload {
  date: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  startTime: string;
}

export interface AdminLectureOfflineSchedulesReplacePayload {
  offlineSchedules: AdminLectureOfflineScheduleUpsertPayload[];
}

export type AdminLectureDeleteAction = 'DELETE' | 'ARCHIVE';

export interface AdminLectureDeleteImpact {
  documentCount: number;
  hasHistory: boolean;
  lectureId: number;
  lectureTitle: string;
  problemAttemptCount: number;
  progressCount: number;
  recommendedAction: AdminLectureDeleteAction;
  reservationCount: number;
}

export interface AdminSortOrderItem {
  id: number;
  sortOrder: number;
}
