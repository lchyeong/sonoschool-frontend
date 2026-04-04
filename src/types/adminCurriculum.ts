export type AdminLectureType = 'VIDEO' | 'OFFLINE' | 'PRACTICUM' | 'PROBLEM' | 'RESOURCE';

export interface AdminLectureOfflineScheduleRule {
  endDate: string;
  endTime: string;
  id: number;
  location: string | null;
  notes: string | null;
  startDate: string;
  startTime: string;
  weekdays: string[];
}

export interface AdminCurriculumLecture {
  description: string | null;
  durationSeconds: number | null;
  id: number;
  lectureType: AdminLectureType;
  offlineScheduleRule: AdminLectureOfflineScheduleRule | null;
  offlineSession?: {
    endAt: string;
    id?: number;
    location: string | null;
    notes: string | null;
    startAt: string;
  } | null;
  preview: boolean;
  practicumEnabled?: boolean;
  practicumDescription: string | null;
  practicumTitle: string | null;
  published: boolean;
  quizOnly?: boolean;
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
  preview: boolean;
  practicumEnabled?: boolean;
  practicumDescription: string | null;
  practicumTitle: string | null;
  quizOnly?: boolean;
  sortOrder: number;
  title: string;
}

export interface AdminLectureOfflineScheduleRuleUpsertPayload {
  endDate: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  startDate: string;
  startTime: string;
  weekdays: string[];
}

export interface AdminSortOrderItem {
  id: number;
  sortOrder: number;
}
