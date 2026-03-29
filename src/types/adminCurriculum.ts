export interface AdminCurriculumLecture {
  description: string | null;
  durationSeconds: number | null;
  id: number;
  preview: boolean;
  practicumEnabled: boolean;
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
  preview: boolean;
  practicumEnabled: boolean;
  sortOrder: number;
  title: string;
}

export interface AdminSortOrderItem {
  id: number;
  sortOrder: number;
}
