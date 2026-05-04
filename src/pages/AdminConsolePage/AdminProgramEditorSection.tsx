import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { cancelAdminPayment } from '@/api/adminPayments';
import {
  createAdminProgramThumbnailUploadTarget,
  uploadAdminProgramThumbnailFile,
} from '@/api/adminProgramMedia';
import { cancelAdminEnrollment, closeAdminProgram } from '@/api/adminProgramOperations';
import {
  createAdminProgramLive,
  deleteAdminProgramLive,
  publishAdminProgramLive,
  unpublishAdminProgramLive,
  updateAdminProgramLive,
} from '@/api/adminProgramsLive';
import AdminCategoryPicker from '@/components/admin/AdminCategoryPicker/AdminCategoryPicker';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import AdminFieldArray from '@/components/admin/AdminFieldArray/AdminFieldArray';
import { LoadingSpinner } from '@/components/feedback/Loading/LoadingSpinner';
import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import AdminProgramCurriculumSection from '@/pages/AdminConsolePage/AdminProgramCurriculumSection';
import AdminProgramProblemsSection from '@/pages/AdminConsolePage/AdminProgramProblemsSection';
import AdminProgramResourcesSection from '@/pages/AdminConsolePage/AdminProgramResourcesSection';
import {
  adminCategoriesTreeQueryKey,
  useAdminCategoriesTreeQuery,
} from '@/query/useAdminCategoriesQuery';
import { adminPaymentsQueryKey } from '@/query/useAdminPaymentsQuery';
import {
  adminProgramEnrollmentsQueryKey,
  useAdminProgramEnrollmentsQuery,
} from '@/query/useAdminProgramOperationsQuery';
import {
  adminProgramDetailLiveQueryKey,
  adminProgramsLiveQueryKey,
  useAdminProgramDetailLiveQuery,
} from '@/query/useAdminProgramsLiveQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminProgramAccessPolicy,
  AdminProgramDetail,
  AdminProgramLevel,
  AdminProgramOperationStatus,
  AdminProgramType,
  AdminProgramUpsertPayload,
} from '@/types/adminProgramsLive';
import { paymentStatusLabels } from '@/types/payment';

import styles from './AdminConsolePage.module.scss';
import {
  PROGRAM_THUMBNAIL_FILE_ACCEPT,
  validateProgramThumbnailFile,
} from './adminConsolePageShared';

interface AdminProgramEditorSectionProps {
  mode: 'create' | 'duplicate' | 'edit';
  view?: 'curriculum' | 'details' | 'problems' | 'resources';
}

interface AdminProgramSummaryFormItem {
  label: string;
  value: string;
}

interface AdminProgramFaqFormItem {
  answer: string;
  question: string;
}

interface UploadProgressModalState {
  description: string;
  title: string;
}

interface AdminProgramFormState {
  accessPolicy: AdminProgramAccessPolicy;
  categoryId: string;
  checklists: string[];
  discountPercent: string;
  description: string;
  faqs: AdminProgramFaqFormItem[];
  learningEndAt: string;
  learningOutcomes: AdminProgramSummaryFormItem[];
  learningStartAt: string;
  level: '' | AdminProgramLevel;
  maxStudents: string;
  price: string;
  programType: AdminProgramType;
  recommendedFor: string[];
  saleEndAt: string;
  saleStartAt: string;
  slug: string;
  summaryItems: AdminProgramSummaryFormItem[];
  thumbnailPreviewUrl: string;
  thumbnailUrl: string;
  title: string;
}

const INITIAL_FORM_STATE: AdminProgramFormState = {
  accessPolicy: 'UNLIMITED',
  categoryId: '',
  checklists: [],
  discountPercent: '',
  description: '',
  faqs: [],
  learningEndAt: '',
  learningOutcomes: [],
  learningStartAt: '',
  level: '',
  maxStudents: '',
  price: '',
  programType: 'ONLINE',
  recommendedFor: [],
  saleEndAt: '',
  saleStartAt: '',
  slug: '',
  summaryItems: [],
  thumbnailPreviewUrl: '',
  thumbnailUrl: '',
  title: '',
};

const resolveDiscountPercent = (price: number | null, salePrice: number | null): string => {
  if (price === null || salePrice === null || price <= 0 || salePrice >= price) {
    return '';
  }

  const percent = ((price - salePrice) / price) * 100;
  const rounded = Math.round(percent * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const resolveSalePriceFromPercent = (priceValue: string, percentValue: string): number | null => {
  const normalizedPrice = priceValue.trim();
  const normalizedPercent = percentValue.trim();

  if (!normalizedPrice || !normalizedPercent) {
    return null;
  }

  const price = Number(normalizedPrice);
  const percent = Number(normalizedPercent);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(percent) || percent < 0) {
    return null;
  }

  const discountedPrice = Math.round(price * (1 - percent / 100));
  return discountedPrice < 0 ? 0 : discountedPrice;
};

const confirmProgramDelete = (): boolean => {
  return window.confirm(
    '프로그램을 삭제하면 되돌릴 수 없습니다.\n강의 구성이나 수강 이력이 있는 프로그램은 삭제가 실패할 수 있습니다.\n계속하시겠습니까?',
  );
};

const toDateTimeLocal = (value: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${String(year)}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

const extractDatePart = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const [datePart] = trimmed.split('T');
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
};

const extractTimePart = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes('T')) {
    return '';
  }

  const [, timePart = ''] = trimmed.split('T');
  return /^\d{2}:\d{2}$/.test(timePart) ? timePart : '';
};

const combineDateTimeParts = (dateValue: string, timeValue: string): string => {
  const normalizedDate = dateValue.trim();
  const normalizedTime = timeValue.trim();

  if (!normalizedDate) {
    return '';
  }
  if (!normalizedTime) {
    return `${normalizedDate}T`;
  }

  return `${normalizedDate}T${normalizedTime}`;
};

const toIsoStringOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return null;
  }

  return new Date(trimmed).toISOString();
};

const hasPartialDateTime = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed);
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0');
  const minutes = index % 2 === 0 ? '00' : '30';
  const value = `${hours}:${minutes}`;

  return {
    label: value,
    value,
  };
});

interface DateTimeSplitFieldProps {
  dateLabel: string;
  minDate?: string | undefined;
  timeLabel: string;
  value: string;
  onChange: (value: string) => void;
}

interface DatePickerFieldProps {
  label: string;
  min?: string | undefined;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

const DatePickerField = ({ label, min, name, value, onChange }: DatePickerFieldProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input || typeof input.showPicker !== 'function') {
      return;
    }

    input.showPicker();
  };

  return (
    <div
      className={styles['datePickerShell']}
      onClick={() => {
        openPicker();
        inputRef.current?.focus();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
          inputRef.current?.focus();
        }
      }}
      role='button'
      tabIndex={0}
    >
      <TextField
        className={styles['dateInput']}
        label={label}
        min={min}
        name={name}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onClick={() => {
          openPicker();
        }}
        ref={inputRef}
        type='date'
        value={value}
      />
    </div>
  );
};

const DateTimeSplitField = ({
  dateLabel,
  minDate,
  timeLabel,
  value,
  onChange,
}: DateTimeSplitFieldProps) => {
  const dateValue = extractDatePart(value);
  const timeValue = extractTimePart(value);

  return (
    <div className={styles['dateTimeFieldRow']}>
      <div className={styles['dateTimeDateField']}>
        <DatePickerField
          label={dateLabel}
          min={minDate}
          name={`${dateLabel}-date`}
          onChange={(nextDateValue) => {
            onChange(combineDateTimeParts(nextDateValue, timeValue));
          }}
          value={dateValue}
        />
      </div>

      <div className={styles['dateTimeTimeField']}>
        <AdminDropdownField
          compact
          disabled={!dateValue}
          label={timeLabel}
          onChange={(nextValue) => {
            onChange(combineDateTimeParts(dateValue, nextValue));
          }}
          options={[{ label: '시간 선택', value: '' }, ...TIME_OPTIONS]}
          value={timeValue}
        />
      </div>
    </div>
  );
};

const buildFormStateFromDetail = (detail: AdminProgramDetail): AdminProgramFormState => {
  return {
    accessPolicy: detail.accessPolicy ?? 'UNLIMITED',
    categoryId: String(detail.categoryId),
    checklists: [...detail.checklists],
    discountPercent: resolveDiscountPercent(detail.price, detail.salePrice),
    description: detail.description ?? '',
    faqs: detail.faqs.map((item) => ({
      answer: item.answer,
      question: item.question,
    })),
    learningEndAt: toDateTimeLocal(detail.learningEndAt),
    learningOutcomes:
      detail.learningOutcomes.length > 0
        ? detail.learningOutcomes.map((item) => ({
            label: item.label,
            value: item.value,
          }))
        : detail.learningPoints.map((item, index) => ({
            label: `학습 성과 ${String(index + 1)}`,
            value: item,
          })),
    learningStartAt: toDateTimeLocal(detail.learningStartAt),
    level: detail.level ?? '',
    maxStudents: detail.maxStudents === null ? '' : String(detail.maxStudents),
    price: String(detail.price),
    programType: detail.programType,
    recommendedFor: [...detail.recommendedFor],
    saleEndAt: toDateTimeLocal(detail.saleEndAt),
    saleStartAt: toDateTimeLocal(detail.saleStartAt),
    slug: detail.slug,
    summaryItems: detail.summaryItems.map((item) => ({
      label: item.label,
      value: item.value,
    })),
    thumbnailPreviewUrl: detail.thumbnailPreviewUrl ?? detail.thumbnailUrl ?? '',
    thumbnailUrl: detail.thumbnailUrl ?? '',
    title: detail.title,
  };
};

const normalizeFormState = (formState: AdminProgramFormState): AdminProgramFormState => formState;

const sanitizeStringList = (items: readonly string[]): string[] => {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
};

const sanitizeSummaryItems = (
  items: readonly AdminProgramSummaryFormItem[],
): AdminProgramSummaryFormItem[] => {
  return items
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0);
};

const sanitizeFaqs = (items: readonly AdminProgramFaqFormItem[]): AdminProgramFaqFormItem[] => {
  return items
    .map((item) => ({
      answer: item.answer.trim(),
      question: item.question.trim(),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const calculateAccessDaysFromLearningRange = (
  learningStartAt: string,
  learningEndAt: string,
): number | null => {
  if (!learningStartAt.trim() || !learningEndAt.trim()) {
    return null;
  }

  const startTime = new Date(learningStartAt).getTime();
  const endTime = new Date(learningEndAt).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return null;
  }

  return Math.max(1, Math.ceil((endTime - startTime) / MS_PER_DAY));
};

const toProgramPayload = (formState: AdminProgramFormState): AdminProgramUpsertPayload => {
  const resolvedAccessDays =
    formState.accessPolicy === 'FIXED_DURATION'
      ? calculateAccessDaysFromLearningRange(formState.learningStartAt, formState.learningEndAt)
      : null;

  return {
    accessDays: resolvedAccessDays,
    accessPolicy: formState.accessPolicy,
    categoryId: Number(formState.categoryId),
    checklists: sanitizeStringList(formState.checklists),
    description: formState.description.trim() || null,
    faqs: sanitizeFaqs(formState.faqs),
    learningEndAt: toIsoStringOrNull(formState.learningEndAt),
    learningOutcomes: sanitizeSummaryItems(formState.learningOutcomes),
    learningPoints: [],
    learningStartAt: toIsoStringOrNull(formState.learningStartAt),
    level: formState.level || null,
    maxStudents: formState.maxStudents.trim() ? Number(formState.maxStudents) : null,
    price: Number(formState.price),
    programType: formState.programType,
    recommendedFor: sanitizeStringList(formState.recommendedFor),
    saleEndAt: toIsoStringOrNull(formState.saleEndAt),
    salePrice: resolveSalePriceFromPercent(formState.price, formState.discountPercent),
    saleStartAt: toIsoStringOrNull(formState.saleStartAt),
    slug: formState.slug.trim(),
    summaryItems: sanitizeSummaryItems(formState.summaryItems),
    thumbnailUrl: formState.thumbnailUrl.trim() || null,
    title: formState.title.trim(),
  };
};

const validateFormState = (formState: AdminProgramFormState): string | null => {
  if (!formState.categoryId.trim()) {
    return '카테고리를 선택해 주세요.';
  }
  if (!formState.title.trim()) {
    return '프로그램명을 입력해 주세요.';
  }
  if (!formState.price.trim() || Number(formState.price) < 0) {
    return '가격을 올바르게 입력해 주세요.';
  }
  if (formState.discountPercent.trim()) {
    const discountPercent = Number(formState.discountPercent);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return '할인율을 0 이상 100 이하로 입력해 주세요.';
    }
  }
  if (formState.maxStudents.trim() && Number(formState.maxStudents) < 1) {
    return '정원은 1 이상이어야 합니다.';
  }
  if (hasPartialDateTime(formState.saleStartAt) || hasPartialDateTime(formState.saleEndAt)) {
    return '판매 시작일과 종료일의 날짜와 시간을 모두 선택해 주세요.';
  }
  if (
    hasPartialDateTime(formState.learningStartAt) ||
    hasPartialDateTime(formState.learningEndAt)
  ) {
    return '수강 시작일과 종료일의 날짜와 시간을 모두 선택해 주세요.';
  }
  if (
    formState.accessPolicy === 'FIXED_DURATION' &&
    calculateAccessDaysFromLearningRange(formState.learningStartAt, formState.learningEndAt) ===
      null
  ) {
    return '고정 기간 수강은 수강 시작일과 종료일을 올바르게 입력해 주세요.';
  }

  const faqErrors = formState.faqs.some((item) => {
    const hasQuestion = item.question.trim().length > 0;
    const hasAnswer = item.answer.trim().length > 0;
    return hasQuestion !== hasAnswer;
  });

  if (faqErrors) {
    return 'FAQ 질문과 답변을 모두 입력해 주세요.';
  }

  const summaryErrors = formState.summaryItems.some((item) => {
    const hasLabel = item.label.trim().length > 0;
    const hasValue = item.value.trim().length > 0;
    return hasLabel !== hasValue;
  });

  if (summaryErrors) {
    return '핵심 포인트 제목과 설명을 모두 입력해 주세요.';
  }

  const learningOutcomeErrors = formState.learningOutcomes.some((item) => {
    const hasLabel = item.label.trim().length > 0;
    const hasValue = item.value.trim().length > 0;
    return hasLabel !== hasValue;
  });

  if (learningOutcomeErrors) {
    return '학습 성과 제목과 설명을 모두 입력해 주세요.';
  }

  return null;
};

const buildEditorTitle = (
  mode: AdminProgramEditorSectionProps['mode'],
  detail: AdminProgramDetail | null,
  view: NonNullable<AdminProgramEditorSectionProps['view']>,
): string => {
  if (mode === 'create') {
    return '새 프로그램 등록';
  }
  if (view === 'curriculum') {
    return detail ? `${detail.title} 강의 구성` : '강의 구성 관리';
  }
  if (view === 'problems') {
    return detail ? `${detail.title} 문제` : '강의 문제';
  }
  if (view === 'resources') {
    return detail ? `${detail.title} 자료` : '프로그램 자료';
  }
  if (mode === 'duplicate') {
    return detail ? `${detail.title} 복제` : '프로그램 복제';
  }
  return detail ? `${detail.title} 수정` : '프로그램 수정';
};

const programTypeOptions = [
  { value: 'ONLINE', label: '온라인' },
  { value: 'OFFLINE', label: '오프라인' },
  { value: 'HYBRID', label: '하이브리드' },
  { value: 'PROBLEM_SOLVING', label: '문제풀이' },
] as const;

const levelOptions = [
  { value: '', label: '선택 안 함' },
  { value: 'BEGINNER', label: '입문' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '심화' },
] as const;

const accessPolicyOptions = [
  { value: 'UNLIMITED', label: '무제한' },
  { value: 'FIXED_DURATION', label: '고정 기간' },
] as const;

const programTypeLabel: Record<AdminProgramType, string> = {
  HYBRID: '하이브리드',
  OFFLINE: '오프라인',
  ONLINE: '온라인',
  PROBLEM_SOLVING: '문제풀이',
};

const accessPolicyLabel: Record<AdminProgramAccessPolicy, string> = {
  FIXED_DURATION: '고정 기간',
  UNLIMITED: '무제한',
};

const catalogStatusLabel: Record<
  'CLOSED' | 'ENDED' | 'FULL' | 'OPEN' | 'SCHEDULED' | 'STARTED',
  string
> = {
  CLOSED: '판매 종료',
  ENDED: '과정 종료',
  FULL: '정원 마감',
  OPEN: '판매중',
  SCHEDULED: '판매 예정',
  STARTED: '개강됨',
};

const enrollmentStatusLabel: Record<'ACTIVE' | 'CANCELLED' | 'EXPIRED', string> = {
  ACTIVE: '수강중',
  CANCELLED: '취소',
  EXPIRED: '만료',
};

const operationStatusLabel: Record<AdminProgramOperationStatus, string> = {
  CLOSURE_CONFIRMED: '폐강',
  NORMAL: '정상 운영',
};

const formatEnrollmentStatusLabel = (value: string): string => {
  if (Object.prototype.hasOwnProperty.call(enrollmentStatusLabel, value)) {
    return enrollmentStatusLabel[value as keyof typeof enrollmentStatusLabel];
  }

  return value;
};

const formatCurrentStudentStatus = (detail: AdminProgramDetail): string => {
  const activeEnrollmentCount = detail.activeEnrollmentCount ?? detail.currentStudents;

  if (detail.programType === 'OFFLINE' && detail.maxStudents !== null) {
    return `수강생 ${String(activeEnrollmentCount)}/${String(detail.maxStudents)}명`;
  }

  return `수강생 ${String(activeEnrollmentCount)}명`;
};

const AdminProgramEditorSection = ({ mode, view = 'details' }: AdminProgramEditorSectionProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const normalizedView = view === 'problems' || view === 'resources' ? 'curriculum' : view;
  const showToast = useToastStore((state) => state.showToast);
  const isCurriculumView = normalizedView === 'curriculum';
  const isDetailView = !isCurriculumView;
  const problemsSectionRef = useRef<HTMLDivElement | null>(null);
  const resourcesSectionRef = useRef<HTMLDivElement | null>(null);
  const editingProgramId = mode === 'edit' ? Number(params['programId']) : null;
  const duplicateSourceProgramId = mode === 'duplicate' ? Number(params['sourceProgramId']) : null;
  const targetProgramId = mode === 'edit' ? editingProgramId : duplicateSourceProgramId;
  const categoriesTreeQuery = useAdminCategoriesTreeQuery(isDetailView);
  const detailQuery = useAdminProgramDetailLiveQuery(
    Number.isFinite(targetProgramId) ? targetProgramId : null,
    mode !== 'create',
  );
  const managedProgramId =
    mode === 'edit' && editingProgramId !== null && Number.isFinite(editingProgramId)
      ? editingProgramId
      : null;
  const programEnrollmentsQuery = useAdminProgramEnrollmentsQuery(
    managedProgramId,
    mode === 'edit',
  );
  const [formState, setFormState] = useState<AdminProgramFormState>(INITIAL_FORM_STATE);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadProgressModal, setUploadProgressModal] = useState<UploadProgressModalState | null>(
    null,
  );
  const [memberActionReason, setMemberActionReason] = useState('사용자 요청 취소');
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    const nextState = buildFormStateFromDetail(detailQuery.data);

    const duplicatedState =
      mode === 'duplicate'
        ? {
            ...nextState,
            slug: '',
            title: `${nextState.title} 복제본`,
          }
        : nextState;

    queueMicrotask(() => {
      setFormState(normalizeFormState(duplicatedState));
    });
  }, [detailQuery.data, mode]);

  const openLectureWorkspace = (lectureId: number, target: 'problem' | 'resource') => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('lectureId', String(lectureId));
    setSearchParams(nextSearchParams, { replace: true });

    window.requestAnimationFrame(() => {
      const targetNode =
        target === 'problem' ? problemsSectionRef.current : resourcesSectionRef.current;
      targetNode?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const invalidateProgramQueries = async (programId?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
      queryClient.invalidateQueries({ queryKey: adminCategoriesTreeQueryKey() }),
      programId !== undefined
        ? queryClient.invalidateQueries({ queryKey: adminProgramDetailLiveQueryKey(programId) })
        : Promise.resolve(),
    ]);
  };

  const invalidateProgramOperationQueries = async (programId: number) => {
    await Promise.all([
      invalidateProgramQueries(programId),
      queryClient.invalidateQueries({ queryKey: adminProgramEnrollmentsQueryKey(programId) }),
      queryClient.invalidateQueries({ queryKey: adminPaymentsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: ['adminEnrollments'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: AdminProgramUpsertPayload) => {
      if (mode === 'edit' && editingProgramId !== null && Number.isFinite(editingProgramId)) {
        return updateAdminProgramLive(editingProgramId, payload);
      }

      return createAdminProgramLive(payload);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 저장에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (response) => {
      await invalidateProgramQueries(response.id);
      showToast({
        message: mode === 'edit' ? '프로그램을 수정했습니다.' : '프로그램을 등록했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminProgramEdit(String(response.id)));
    },
  });

  const publishMutation = useMutation({
    mutationFn: (programId: number) => publishAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 공개 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateProgramQueries(editingProgramId ?? undefined);
      showToast({
        message: '프로그램을 공개했습니다.',
        variant: 'success',
      });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (programId: number) => unpublishAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 숨김 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateProgramQueries(editingProgramId ?? undefined);
      showToast({
        message: '프로그램을 숨김 처리했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (programId: number) => deleteAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateProgramQueries();
      showToast({
        message: '프로그램을 삭제했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminPrograms);
    },
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: number; reason: string }) =>
      cancelAdminPayment(paymentId, { reason }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '결제 취소 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      if (managedProgramId !== null) {
        await invalidateProgramOperationQueries(managedProgramId);
      }
      showToast({
        message: '결제 취소를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const cancelEnrollmentMutation = useMutation({
    mutationFn: ({ enrollmentId, reason }: { enrollmentId: number; reason: string }) =>
      cancelAdminEnrollment(enrollmentId, { reason }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '수강 취소 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      if (managedProgramId !== null) {
        await invalidateProgramOperationQueries(managedProgramId);
      }
      showToast({
        message: '수강 취소를 반영했습니다.',
        variant: 'success',
      });
    },
  });

  const closeProgramMutation = useMutation({
    mutationFn: () => {
      if (managedProgramId === null) {
        throw new Error('프로그램 정보를 확인할 수 없습니다.');
      }

      return closeAdminProgram(managedProgramId);
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 폐강 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      if (managedProgramId !== null) {
        await invalidateProgramOperationQueries(managedProgramId);
      }
      showToast({
        message: '프로그램을 폐강 처리했습니다.',
        variant: 'success',
      });
    },
  });

  const editorTitle = useMemo(
    () => buildEditorTitle(mode, detailQuery.data ?? null, normalizedView),
    [detailQuery.data, mode, normalizedView],
  );

  const isLoading =
    (isDetailView && categoriesTreeQuery.isPending) || (mode !== 'create' && detailQuery.isPending);
  const hasError =
    (isDetailView && categoriesTreeQuery.isError) || (mode !== 'create' && detailQuery.isError);
  const errorMessage =
    categoriesTreeQuery.error instanceof Error && isDetailView
      ? categoriesTreeQuery.error.message
      : detailQuery.error instanceof Error
        ? detailQuery.error.message
        : '프로그램 편집 화면을 준비하지 못했습니다.';

  const isEditMode =
    mode === 'edit' && editingProgramId !== null && Number.isFinite(editingProgramId);
  const currentDetail = detailQuery.data ?? null;
  const currentEnrollments = useMemo(
    () => programEnrollmentsQuery.data ?? [],
    [programEnrollmentsQuery.data],
  );
  const deleteBlockedReason = currentDetail?.deleteBlockedReason ?? null;
  const deletable = currentDetail?.deletable !== false;
  const activeEnrollmentCount =
    currentDetail?.activeEnrollmentCount ?? currentDetail?.currentStudents ?? 0;
  const operationStatus = currentDetail?.operationStatus ?? 'NORMAL';
  const isClosureConfirmed = operationStatus === 'CLOSURE_CONFIRMED';

  const updateField = <T extends keyof AdminProgramFormState>(
    field: T,
    value: AdminProgramFormState[T],
  ) => {
    setFormState((current) =>
      normalizeFormState({
        ...current,
        [field]: value,
      }),
    );
  };

  const updateStringListItem = (
    field: 'recommendedFor' | 'checklists',
    index: number,
    value: string,
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addStringListItem = (field: 'recommendedFor' | 'checklists') => {
    setFormState((current) => ({
      ...current,
      [field]: [...current[field], ''],
    }));
  };

  const removeStringListItem = (field: 'recommendedFor' | 'checklists', index: number) => {
    setFormState((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateStructuredInfoItem = (
    field: 'learningOutcomes' | 'summaryItems',
    index: number,
    key: keyof AdminProgramSummaryFormItem,
    value: string,
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addStructuredInfoItem = (field: 'learningOutcomes' | 'summaryItems') => {
    setFormState((current) => ({
      ...current,
      [field]: [...current[field], { label: '', value: '' }],
    }));
  };

  const removeStructuredInfoItem = (field: 'learningOutcomes' | 'summaryItems', index: number) => {
    setFormState((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateFaqItem = (index: number, key: keyof AdminProgramFaqFormItem, value: string) => {
    setFormState((current) => ({
      ...current,
      faqs: current.faqs.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addFaqItem = () => {
    setFormState((current) => ({
      ...current,
      faqs: [...current.faqs, { answer: '', question: '' }],
    }));
  };

  const removeFaqItem = (index: number) => {
    setFormState((current) => ({
      ...current,
      faqs: current.faqs.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleThumbnailFileChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    const validationMessage = validateProgramThumbnailFile(file);
    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    setIsUploadingThumbnail(true);
    setUploadProgressModal({
      description: '대표 이미지 업로드가 끝날 때까지 잠시 기다려 주세요.',
      title: '대표 이미지 업로드 중',
    });

    try {
      const uploadTarget = await createAdminProgramThumbnailUploadTarget({
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        filename: file.name,
      });

      await uploadAdminProgramThumbnailFile(uploadTarget.uploadUrl, file);

      setFormState((current) => ({
        ...current,
        thumbnailPreviewUrl: uploadTarget.previewUrl,
        thumbnailUrl: uploadTarget.storageUrl,
      }));

      showToast({
        message: '대표 이미지를 업로드했습니다.',
        variant: 'success',
      });
    } catch (error: unknown) {
      showToast({
        message: error instanceof Error ? error.message : '대표 이미지 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setIsUploadingThumbnail(false);
      setUploadProgressModal(null);
    }
  };

  const handleSubmit = () => {
    const validationMessage = validateFormState(formState);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    saveMutation.mutate(toProgramPayload(formState));
  };

  const handleCancelPayment = (paymentId: number) => {
    if (!memberActionReason.trim()) {
      showToast({
        message: '취소 사유를 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    cancelPaymentMutation.mutate({
      paymentId,
      reason: memberActionReason.trim(),
    });
  };

  const handleCancelEnrollment = (enrollmentId: number) => {
    if (!memberActionReason.trim()) {
      showToast({
        message: '취소 사유를 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    cancelEnrollmentMutation.mutate({
      enrollmentId,
      reason: memberActionReason.trim(),
    });
  };

  const handleCloseProgram = () => {
    closeProgramMutation.mutate();
  };

  if (isLoading) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>프로그램 편집 화면을 준비하는 중입니다.</h1>
        <p className={styles['stateDescription']}>
          {isCurriculumView
            ? '프로그램 상세와 강의 구성, 강의별 문제/자료를 불러오고 있습니다.'
            : '카테고리와 프로그램 상세를 불러오고 있습니다.'}
        </p>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>프로그램 편집 화면을 불러오지 못했습니다.</h1>
        <p className={styles['stateDescription']}>{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className={styles['workspace']}>
      <section className={styles['editorShell']}>
        <div className={styles['editorToolbar']}>
          <Link className={styles['tableActionButton']} to={routePaths.adminPrograms}>
            목록으로 돌아가기
          </Link>

          {isEditMode && currentDetail ? (
            <div className={styles['editorToolbarActions']}>
              {currentDetail.published ? (
                <Button
                  disabled={hideMutation.isPending}
                  onClick={() => {
                    hideMutation.mutate(currentDetail.id);
                  }}
                  type='button'
                  variant='secondary'
                >
                  숨김 처리
                </Button>
              ) : (
                <Button
                  disabled={publishMutation.isPending}
                  onClick={() => {
                    publishMutation.mutate(currentDetail.id);
                  }}
                  type='button'
                >
                  공개 처리
                </Button>
              )}
              <Button
                disabled={deleteMutation.isPending || !deletable}
                onClick={() => {
                  if (!confirmProgramDelete()) {
                    return;
                  }
                  deleteMutation.mutate(currentDetail.id);
                }}
                title={deleteBlockedReason ?? undefined}
                type='button'
                variant='danger'
              >
                삭제
              </Button>
            </div>
          ) : null}
        </div>

        <div className={styles['editorHeaderCompact']}>
          <div className={styles['pageHeader']}>
            <h1 className={styles['pageTitle']}>{editorTitle}</h1>
          </div>

          {currentDetail ? (
            <div className={styles['editorMetaRow']}>
              <span
                className={currentDetail.published ? styles['badgeSuccess'] : styles['badgeDanger']}
              >
                {currentDetail.published ? '공개중' : '숨김'}
              </span>
              <span className={styles['badgeAccent']}>
                {catalogStatusLabel[currentDetail.catalogStatus]}
              </span>
              <span
                className={
                  currentDetail.operationStatus === 'CLOSURE_CONFIRMED'
                    ? styles['badgeDanger']
                    : styles['badge']
                }
              >
                {currentDetail.operationStatus === 'CLOSURE_CONFIRMED'
                  ? '폐강'
                  : operationStatusLabel[currentDetail.operationStatus ?? 'NORMAL']}
              </span>
              <span className={styles['badge']}>{programTypeLabel[currentDetail.programType]}</span>
              <span className={styles['badge']}>
                {currentDetail.accessPolicy
                  ? accessPolicyLabel[currentDetail.accessPolicy]
                  : '수강 정책 미설정'}
              </span>
            </div>
          ) : null}
        </div>

        {deleteBlockedReason ? (
          <p className={styles['editorDangerHint']}>{deleteBlockedReason}</p>
        ) : null}
      </section>

      <section className={styles['editorWorkspacePanel']}>
        {uploadProgressModal ? (
          <Modal
            description={uploadProgressModal.description}
            onClose={() => {
              return;
            }}
            title={uploadProgressModal.title}
          >
            <div className={styles['loadingModalBody']}>
              <LoadingSpinner />
              <p className={styles['loadingModalText']}>{uploadProgressModal.description}</p>
            </div>
          </Modal>
        ) : null}

        {isEditMode && currentDetail ? (
          <nav aria-label='프로그램 편집 보기' className={styles['workspaceTabs']}>
            <div className={styles['workspaceTabGroup']}>
              <Link
                aria-current={isDetailView ? 'page' : undefined}
                className={isDetailView ? styles['workspaceTabActive'] : styles['workspaceTab']}
                to={routePaths.adminProgramEdit(String(currentDetail.id))}
              >
                수정
              </Link>
              <Link
                aria-current={isCurriculumView ? 'page' : undefined}
                className={isCurriculumView ? styles['workspaceTabActive'] : styles['workspaceTab']}
                to={routePaths.adminProgramCurriculum(String(currentDetail.id))}
              >
                강의 구성
              </Link>
            </div>
            <div className={styles['workspaceTabStat']} role='status'>
              {formatCurrentStudentStatus(currentDetail)}
            </div>
          </nav>
        ) : null}

        <div className={styles['workspaceBody']}>
          {isDetailView ? (
            <>
              <div className={styles['formShell']}>
                <div className={styles['form']}>
                  <AdminCategoryPicker
                    helperText='프로그램 카테고리 관리와 같은 3단 구조에서 가장 하위 카테고리를 선택해 주세요.'
                    label='카테고리'
                    onChange={(nextValue) => {
                      updateField('categoryId', nextValue);
                    }}
                    tree={categoriesTreeQuery.data ?? []}
                    value={formState.categoryId}
                  />

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='프로그램명'
                      name='title'
                      onChange={(event) => {
                        updateField('title', event.target.value);
                      }}
                      value={formState.title}
                    />
                    <div className={styles['metaNotice']}>
                      <p className={styles['metaNoticeLabel']}>주소 식별자</p>
                      <p className={styles['metaNoticeText']}>
                        프로그램 저장 시 서버에서 자동으로 관리합니다.
                      </p>
                    </div>
                  </div>

                  <div className={styles['compactFieldRow']}>
                    <AdminDropdownField
                      compact
                      label='프로그램 형태'
                      onChange={(nextValue) => {
                        updateField('programType', nextValue as AdminProgramType);
                      }}
                      options={programTypeOptions}
                      value={formState.programType}
                    />
                    <AdminDropdownField
                      compact
                      label='난이도'
                      onChange={(nextValue) => {
                        updateField('level', nextValue as AdminProgramFormState['level']);
                      }}
                      options={levelOptions}
                      value={formState.level}
                    />
                    <AdminDropdownField
                      compact
                      label='수강 정책'
                      onChange={(nextValue) => {
                        const policy = nextValue as AdminProgramAccessPolicy;
                        setFormState((current) => ({
                          ...current,
                          accessPolicy: policy,
                          learningEndAt: policy === 'UNLIMITED' ? '' : current.learningEndAt,
                          learningStartAt: policy === 'UNLIMITED' ? '' : current.learningStartAt,
                        }));
                      }}
                      options={accessPolicyOptions}
                      value={formState.accessPolicy}
                    />
                  </div>

                  <TextAreaField
                    label='프로그램 소개'
                    name='description'
                    onChange={(event) => {
                      updateField('description', event.target.value);
                    }}
                    value={formState.description}
                  />

                  <div className={styles['mediaField']}>
                    <div className={styles['mediaFieldHeader']}>
                      <div className={styles['mediaFieldCopy']}>
                        <p className={styles['fieldLabel']}>대표 이미지</p>
                        <p className={styles['mediaFieldHint']}>
                          프로그램 카드와 상세 상단에 노출될 이미지를 업로드합니다.
                        </p>
                      </div>
                    </div>
                    <input
                      accept={PROGRAM_THUMBNAIL_FILE_ACCEPT}
                      className={styles['thumbnailFileInput']}
                      name='program-thumbnail-file'
                      onChange={(event) => {
                        void handleThumbnailFileChange(event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                      ref={thumbnailInputRef}
                      type='file'
                    />

                    <div className={styles['thumbnailUploadPanel']}>
                      <div className={styles['thumbnailPreviewPanel']}>
                        {formState.thumbnailPreviewUrl ? (
                          <div className={styles['thumbnailPreview']}>
                            <img
                              alt={
                                formState.title
                                  ? `${formState.title} 대표 이미지`
                                  : '프로그램 대표 이미지'
                              }
                              className={styles['thumbnailPreviewImage']}
                              src={formState.thumbnailPreviewUrl}
                            />
                          </div>
                        ) : (
                          <div className={styles['thumbnailEmptyState']}>
                            등록된 대표 이미지가 없습니다.
                          </div>
                        )}
                      </div>

                      <div className={styles['thumbnailPreviewMeta']}>
                        <p className={styles['thumbnailPreviewTitle']}>대표 이미지 미리보기</p>
                        <div className={styles['thumbnailActionRow']}>
                          <Button
                            disabled={isUploadingThumbnail}
                            onClick={() => {
                              thumbnailInputRef.current?.click();
                            }}
                            size='sm'
                            type='button'
                            variant='primary'
                          >
                            {isUploadingThumbnail ? '업로드 중...' : '파일 선택'}
                          </Button>
                          {formState.thumbnailPreviewUrl ? (
                            <Button
                              disabled={isUploadingThumbnail}
                              onClick={() => {
                                setFormState((current) => ({
                                  ...current,
                                  thumbnailPreviewUrl: '',
                                  thumbnailUrl: '',
                                }));
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              이미지 제거
                            </Button>
                          ) : null}
                        </div>
                        <p className={styles['thumbnailFileCaption']}>
                          허용 형식 · {PROGRAM_THUMBNAIL_FILE_ACCEPT.replaceAll(',', ', ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles['inlineFieldGrid']}>
                    <TextField
                      label='정가'
                      name='price'
                      onChange={(event) => {
                        updateField('price', event.target.value);
                      }}
                      value={formState.price}
                    />
                    <TextField
                      label='할인율(%)'
                      name='discountPercent'
                      onChange={(event) => {
                        updateField('discountPercent', event.target.value);
                      }}
                      value={formState.discountPercent}
                    />
                  </div>

                  <div className={styles['compactFieldRow']}>
                    <div className={styles['compactTextField']}>
                      <TextField
                        label='정원'
                        name='maxStudents'
                        onChange={(event) => {
                          updateField('maxStudents', event.target.value);
                        }}
                        value={formState.maxStudents}
                      />
                    </div>
                  </div>

                  <div className={styles['dateTimeRow']}>
                    <div className={styles['dateTimeGroup']}>
                      <p className={styles['dateTimeGroupTitle']}>판매 기간</p>
                      <DateTimeSplitField
                        dateLabel='판매 시작일'
                        onChange={(nextValue) => {
                          updateField('saleStartAt', nextValue);
                        }}
                        timeLabel='시작 시간'
                        value={formState.saleStartAt}
                      />
                      <DateTimeSplitField
                        dateLabel='판매 종료일'
                        onChange={(nextValue) => {
                          updateField('saleEndAt', nextValue);
                        }}
                        timeLabel='종료 시간'
                        value={formState.saleEndAt}
                      />
                    </div>
                    <div className={styles['dateTimeGroup']}>
                      <p className={styles['dateTimeGroupTitle']}>수강 기간</p>
                      <DateTimeSplitField
                        dateLabel='수강 시작일'
                        onChange={(nextValue) => {
                          setFormState((current) => ({
                            ...current,
                            accessPolicy: 'FIXED_DURATION',
                            learningStartAt: nextValue,
                          }));
                        }}
                        timeLabel='시작 시간'
                        value={formState.learningStartAt}
                      />
                      <DateTimeSplitField
                        dateLabel='수강 종료일'
                        onChange={(nextValue) => {
                          setFormState((current) => ({
                            ...current,
                            accessPolicy: 'FIXED_DURATION',
                            learningEndAt: nextValue,
                          }));
                        }}
                        timeLabel='종료 시간'
                        value={formState.learningEndAt}
                      />
                    </div>
                  </div>

                  <p className={styles['policyHint']}>
                    {formState.programType === 'OFFLINE'
                      ? '오프라인 프로그램은 개강일이 지나면 관리자 화면에서 개강됨 상태로 표시됩니다.'
                      : '온라인·하이브리드 프로그램은 판매 종료일을 비워 두면 상시 판매로 운영할 수 있습니다.'}
                  </p>

                  {formState.accessPolicy === 'UNLIMITED' ? (
                    <p className={styles['policyHint']}>
                      무제한 수강은 수강 가능일수 제한을 두지 않습니다.
                    </p>
                  ) : null}
                  {formState.accessPolicy === 'FIXED_DURATION' ? (
                    <p className={styles['policyHint']}>
                      고정 기간 수강 가능일수는 수강 시작일과 종료일 기준으로 자동 계산합니다.
                    </p>
                  ) : null}
                  <AdminFieldArray
                    addLabel='핵심 포인트 추가'
                    emptyMessage='등록된 핵심 포인트가 없습니다.'
                    helperText='강의 소개 첫 영역에 노출할 제목과 설명 카드를 입력합니다.'
                    items={formState.summaryItems}
                    label='핵심 포인트'
                    onAdd={() => {
                      addStructuredInfoItem('summaryItems');
                    }}
                    onRemove={(index) => {
                      removeStructuredInfoItem('summaryItems', index);
                    }}
                    renderItem={(item, index) => (
                      <div className={styles['summaryPointFieldGroup']}>
                        <TextField
                          label='핵심 포인트 제목'
                          name={`summary-label-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'summaryItems',
                              index,
                              'label',
                              event.target.value,
                            );
                          }}
                          value={item.label}
                        />
                        <TextAreaField
                          label='핵심 포인트 설명'
                          name={`summary-value-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'summaryItems',
                              index,
                              'value',
                              event.target.value,
                            );
                          }}
                          rows={4}
                          value={item.value}
                        />
                      </div>
                    )}
                  />

                  <AdminFieldArray
                    addLabel='학습 성과 추가'
                    emptyMessage='등록된 학습 성과가 없습니다.'
                    helperText='이 강의를 듣고 나면 할 수 있게 되는 제목과 설명을 입력합니다.'
                    items={formState.learningOutcomes}
                    label='학습 성과'
                    onAdd={() => {
                      addStructuredInfoItem('learningOutcomes');
                    }}
                    onRemove={(index) => {
                      removeStructuredInfoItem('learningOutcomes', index);
                    }}
                    renderItem={(item, index) => (
                      <div className={styles['summaryPointFieldGroup']}>
                        <TextField
                          label='학습 성과 제목'
                          name={`learning-outcome-label-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'learningOutcomes',
                              index,
                              'label',
                              event.target.value,
                            );
                          }}
                          value={item.label}
                        />
                        <TextAreaField
                          label='학습 성과 설명'
                          name={`learning-outcome-value-${String(index)}`}
                          onChange={(event) => {
                            updateStructuredInfoItem(
                              'learningOutcomes',
                              index,
                              'value',
                              event.target.value,
                            );
                          }}
                          rows={4}
                          value={item.value}
                        />
                      </div>
                    )}
                  />

                  <AdminFieldArray
                    addLabel='추천 대상 추가'
                    emptyMessage='등록된 추천 대상이 없습니다.'
                    helperText='이 프로그램을 추천할 대상 유형을 하나씩 정리합니다.'
                    items={formState.recommendedFor}
                    label='추천 대상'
                    onAdd={() => {
                      addStringListItem('recommendedFor');
                    }}
                    onRemove={(index) => {
                      removeStringListItem('recommendedFor', index);
                    }}
                    renderItem={(item, index) => (
                      <TextField
                        label={`추천 대상 ${String(index + 1)}`}
                        name={`recommended-for-${String(index)}`}
                        onChange={(event) => {
                          updateStringListItem('recommendedFor', index, event.target.value);
                        }}
                        value={item}
                      />
                    )}
                  />

                  <AdminFieldArray
                    addLabel='체크리스트 추가'
                    emptyMessage='등록된 체크리스트가 없습니다.'
                    helperText='수강 전 준비사항을 체크리스트로 추가합니다.'
                    items={formState.checklists}
                    label='수강 체크리스트'
                    onAdd={() => {
                      addStringListItem('checklists');
                    }}
                    onRemove={(index) => {
                      removeStringListItem('checklists', index);
                    }}
                    renderItem={(item, index) => (
                      <TextField
                        label={`체크리스트 ${String(index + 1)}`}
                        name={`checklist-${String(index)}`}
                        onChange={(event) => {
                          updateStringListItem('checklists', index, event.target.value);
                        }}
                        value={item}
                      />
                    )}
                  />

                  <AdminFieldArray
                    addLabel='FAQ 추가'
                    emptyMessage='등록된 FAQ가 없습니다.'
                    helperText='질문과 답변을 각각 입력해 자주 묻는 질문 영역을 구성합니다.'
                    items={formState.faqs}
                    label='FAQ'
                    onAdd={addFaqItem}
                    onRemove={removeFaqItem}
                    renderItem={(item, index) => (
                      <div className={styles['faqFieldGrid']}>
                        <TextField
                          label='질문'
                          name={`faq-question-${String(index)}`}
                          onChange={(event) => {
                            updateFaqItem(index, 'question', event.target.value);
                          }}
                          value={item.question}
                        />
                        <TextAreaField
                          label='답변'
                          name={`faq-answer-${String(index)}`}
                          onChange={(event) => {
                            updateFaqItem(index, 'answer', event.target.value);
                          }}
                          value={item.answer}
                        />
                      </div>
                    )}
                  />

                  <div className={styles['actionRow']}>
                    <Button disabled={saveMutation.isPending} onClick={handleSubmit} type='button'>
                      {saveMutation.isPending
                        ? '저장 중...'
                        : mode === 'edit'
                          ? '수정 저장'
                          : '프로그램 등록'}
                    </Button>
                  </div>
                </div>
              </div>

              {isEditMode && currentDetail ? (
                <div className={styles['stackList']}>
                  <section className={styles['panelWide']}>
                    <div className={styles['panelToolbar']}>
                      <div>
                        <h2 className={styles['panelTitle']}>현재 수강생</h2>
                        <p className={styles['metaText']}>
                          전화 CS 후 결제 취소 또는 수강 취소를 바로 처리할 수 있습니다.
                        </p>
                      </div>
                      <div className={styles['metaRow']}>
                        <span className={styles['badgeAccent']}>
                          {String(activeEnrollmentCount)}명
                        </span>
                      </div>
                    </div>

                    <div className={styles['replyComposer']}>
                      <p className={styles['helperText']}>
                        회원별 취소 처리 전에 공통 취소 사유를 먼저 입력해 주세요.
                      </p>
                      <TextAreaField
                        label='취소 사유'
                        name='memberActionReason'
                        onChange={(event) => {
                          setMemberActionReason(event.target.value);
                        }}
                        value={memberActionReason}
                      />
                    </div>

                    {programEnrollmentsQuery.isPending ? (
                      <p className={styles['helperText']}>현재 수강생 목록을 불러오는 중입니다.</p>
                    ) : null}

                    {programEnrollmentsQuery.isError ? (
                      <p className={styles['helperText']}>
                        {programEnrollmentsQuery.error instanceof Error
                          ? programEnrollmentsQuery.error.message
                          : '현재 수강생 목록을 불러오지 못했습니다.'}
                      </p>
                    ) : null}

                    {!programEnrollmentsQuery.isPending && !programEnrollmentsQuery.isError ? (
                      currentEnrollments.length > 0 ? (
                        <div className={styles['tableWrap']}>
                          <table
                            className={`${styles['table']} ${styles['programEnrollmentTable']}`}
                          >
                            <thead>
                              <tr>
                                <th scope='col'>회원</th>
                                <th scope='col'>연락처</th>
                                <th scope='col'>수강 상태</th>
                                <th scope='col'>결제 상태</th>
                                <th scope='col'>수강 기간</th>
                                <th scope='col'>처리</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentEnrollments.map((item) => (
                                <tr key={item.enrollmentId}>
                                  <td>
                                    <div className={styles['cellStack']}>
                                      <strong className={styles['cellPrimary']}>
                                        {item.userName}
                                      </strong>
                                      <span className={styles['cellSecondary']}>
                                        아이디 {item.loginId}
                                      </span>
                                    </div>
                                  </td>
                                  <td>{item.phoneNumber}</td>
                                  <td>
                                    <span className={styles['badgeSuccess']}>
                                      {formatEnrollmentStatusLabel(item.enrollmentStatus)}
                                    </span>
                                  </td>
                                  <td>
                                    <div className={styles['cellStack']}>
                                      {item.paymentId ? (
                                        <>
                                          <span className={styles['badgeAccent']}>
                                            {item.paymentStatus
                                              ? paymentStatusLabels[item.paymentStatus]
                                              : '결제 정보 확인 필요'}
                                          </span>
                                          <span className={styles['cellSecondary']}>
                                            결제 ID {String(item.paymentId)}
                                          </span>
                                        </>
                                      ) : (
                                        <span className={styles['cellSecondary']}>
                                          결제 정보 없음
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <div className={styles['cellStack']}>
                                      <span
                                        className={`${styles['cellSecondary']} ${styles['cellNoWrap']}`}
                                      >
                                        {formatDateTime(item.enrolledAt)} ~{' '}
                                        {formatDateTime(item.expireAt)}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className={styles['tableActionGroup']}>
                                      {item.canCancelPayment && item.paymentId !== null ? (
                                        <Button
                                          disabled={cancelPaymentMutation.isPending}
                                          onClick={() => {
                                            handleCancelPayment(item.paymentId as number);
                                          }}
                                          size='sm'
                                          type='button'
                                          variant='danger'
                                        >
                                          결제 취소
                                        </Button>
                                      ) : null}
                                      {item.canCancelEnrollment ? (
                                        <Button
                                          disabled={cancelEnrollmentMutation.isPending}
                                          onClick={() => {
                                            handleCancelEnrollment(item.enrollmentId);
                                          }}
                                          size='sm'
                                          type='button'
                                          variant='danger'
                                        >
                                          수강 취소
                                        </Button>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={styles['helperText']}>현재 수강 중인 회원이 없습니다.</p>
                      )
                    ) : null}
                  </section>

                  <section className={styles['replyCard']}>
                    <p className={styles['replyLabel']}>폐강 처리</p>
                    <p className={styles['itemTitle']}>{currentDetail.title}</p>
                    <div className={styles['metaRow']}>
                      <span
                        className={isClosureConfirmed ? styles['badgeDanger'] : styles['badge']}
                      >
                        {isClosureConfirmed ? '폐강' : operationStatusLabel[operationStatus]}
                      </span>
                      <span className={styles['badgeAccent']}>
                        신청 수강생 {String(activeEnrollmentCount)}명
                      </span>
                    </div>
                    <p className={styles['itemDescription']}>
                      모집 종료 후 신청 수강생이 2명 미만이면 매일 새벽 3시 10분에 자동 폐강됩니다.
                    </p>
                    <p className={styles['itemDescription']}>
                      자동 처리 전에도 필요하면 여기서 바로 수동 폐강할 수 있습니다.
                    </p>
                    {currentDetail.closedAt ? (
                      <p className={styles['itemDescription']}>
                        폐강 일시 {formatDateTime(currentDetail.closedAt)}
                      </p>
                    ) : null}

                    <div className={styles['replyComposer']}>
                      <Button
                        disabled={
                          closeProgramMutation.isPending ||
                          currentDetail.programType !== 'OFFLINE' ||
                          isClosureConfirmed
                        }
                        onClick={handleCloseProgram}
                        type='button'
                        variant='danger'
                      >
                        {closeProgramMutation.isPending ? '폐강 처리 중...' : '프로그램 폐강 처리'}
                      </Button>
                      {currentDetail.programType !== 'OFFLINE' ? (
                        <p className={styles['helperText']}>
                          오프라인 프로그램만 폐강 처리할 수 있습니다.
                        </p>
                      ) : null}
                    </div>
                  </section>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles['stackList']}>
              <AdminProgramCurriculumSection
                allowPastOfflineScheduleDates={mode === 'edit'}
                embedded
                enabled={isEditMode}
                onOpenLectureWorkspace={openLectureWorkspace}
                programLearningEndAt={currentDetail?.learningEndAt ?? null}
                programLearningStartAt={currentDetail?.learningStartAt ?? null}
                programType={currentDetail?.programType ?? null}
                programId={isEditMode && currentDetail ? currentDetail.id : null}
              />
              <div ref={problemsSectionRef}>
                <AdminProgramProblemsSection
                  enabled={isEditMode}
                  programId={isEditMode && currentDetail ? currentDetail.id : null}
                />
              </div>
              <div ref={resourcesSectionRef}>
                <AdminProgramResourcesSection
                  enabled={isEditMode}
                  initialDocuments={currentDetail?.documents ?? []}
                  key={
                    currentDetail
                      ? `${String(currentDetail.id)}:${currentDetail.documents.map((document) => String(document.id)).join(',')}`
                      : 'program-documents-empty'
                  }
                  programId={isEditMode && currentDetail ? currentDetail.id : null}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

export default AdminProgramEditorSection;
