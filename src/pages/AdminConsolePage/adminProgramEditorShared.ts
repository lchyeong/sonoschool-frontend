import type { AdminProgramFormValues } from '@/forms/schemas/adminProgramSchema';
import { routePaths } from '@/routes/routeRegistry';
import type {
  AdminProgramCollectionOption,
  AdminProgramDetailItem,
  AdminProgramFormat,
  AdminProgramStatus,
} from '@/types/adminConsole';

import { createCurriculumSectionFormValue } from './adminProgramFormShared';

export interface AdminProgramEditorPageMeta {
  description: string;
  eyebrow: string;
  title: string;
}

export const DEFAULT_LESSON_DATE = '2026-04-07';

export const programStatusLabel: Record<AdminProgramStatus, string> = {
  draft: '초안',
  hidden: '숨김',
  published: '게시중',
};

export const programFormatLabel: Record<AdminProgramFormat, string> = {
  hybrid: '하이브리드',
  offline: '오프라인',
  online: '온라인',
};

export const getPreviewStatusLabel = (status: AdminProgramStatus): string => {
  switch (status) {
    case 'published':
      return '즉시 공개';
    case 'hidden':
      return '숨김 저장';
    default:
      return '초안 저장';
  }
};

export const toFieldIndex = (value: number): `${number}` => {
  return String(value) as `${number}`;
};

export const getLeafCollectionOptions = (
  menuItems: readonly {
    depth: number;
    description: string;
    id: string;
    isLeafMenu: boolean;
    label: string;
    labelPath: string;
    linkedProgramCount: number;
    path: string;
  }[],
): AdminProgramCollectionOption[] => {
  return menuItems
    .filter((item) => item.isLeafMenu)
    .map((item) => ({
      depth: item.depth,
      description: item.description,
      id: item.id,
      label: item.label,
      labelPath: item.labelPath,
      lectureCount: item.linkedProgramCount,
      path: item.path,
    }));
};

export const resolveInitialParentCollectionPath = (
  requestedPath: string,
  options: readonly AdminProgramCollectionOption[],
  fallbackPath = '',
): string => {
  if (requestedPath && options.some((option) => option.path === requestedPath)) {
    return requestedPath;
  }

  if (fallbackPath && options.some((option) => option.path === fallbackPath)) {
    return fallbackPath;
  }

  return options[0]?.path || requestedPath || fallbackPath;
};

export const buildFallbackProgramListPath = (parentCollectionPath: string): string => {
  if (!parentCollectionPath) {
    return routePaths.adminPrograms;
  }

  const nextSearchParams = new URLSearchParams({
    menuPath: parentCollectionPath,
  });

  return `${routePaths.adminPrograms}?${nextSearchParams.toString()}`;
};

export const buildEditorPageMeta = (
  mode: 'create' | 'duplicate' | 'edit',
  currentProgram: AdminProgramDetailItem | null,
  sourceProgram: AdminProgramDetailItem | null,
): AdminProgramEditorPageMeta => {
  if (mode === 'create') {
    return {
      description:
        '강의 등록은 전용 페이지에서 바로 시작합니다. 첫 저장 시 내부적으로 초안을 만든 뒤 같은 화면에서 이어서 편집할 수 있습니다.',
      eyebrow: 'Program Create',
      title: '새 강의 등록',
    };
  }

  if (mode === 'duplicate') {
    return {
      description:
        '복제 원본을 기준으로 전체 폼을 채운 상태에서 시작합니다. 필요한 값만 수정한 뒤 바로 저장하거나 게시할 수 있습니다.',
      eyebrow: 'Program Duplicate',
      title: sourceProgram ? `${sourceProgram.title} 복제` : '강의 복제',
    };
  }

  return {
    description:
      '강의 정보는 전용 편집 페이지에서 관리합니다. 초안 저장, 게시, 숨김을 같은 화면에서 처리하고 목록 상태로 다시 돌아갈 수 있습니다.',
    eyebrow: 'Program Editor',
    title: currentProgram ? `${currentProgram.title} 편집` : '강의 편집',
  };
};

export const appendCurriculumSection = (
  append: (value: AdminProgramFormValues['curriculumSections'][number]) => void,
  selectedFormat: AdminProgramFormat,
  sectionIndex: number,
) => {
  append(createCurriculumSectionFormValue(selectedFormat, sectionIndex));
};
