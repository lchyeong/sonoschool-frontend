import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  createAdminProgramLive,
  deleteAdminProgramLive,
  hideAdminProgramLive,
  publishAdminProgramLive,
  updateAdminProgramLive,
} from '@/api/adminProgramsLive';
import AdminCategoryPicker from '@/components/admin/AdminCategoryPicker/AdminCategoryPicker';
import AdminFieldArray from '@/components/admin/AdminFieldArray/AdminFieldArray';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { adminCategoriesTreeQueryKey, useAdminCategoriesTreeQuery } from '@/query/useAdminCategoriesQuery';
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
  AdminProgramType,
  AdminProgramUpsertPayload,
} from '@/types/adminProgramsLive';

import styles from './AdminConsolePage.module.scss';

interface AdminProgramEditorSectionProps {
  mode: 'create' | 'duplicate' | 'edit';
}

interface AdminProgramSummaryFormItem {
  label: string;
  value: string;
}

interface AdminProgramFaqFormItem {
  answer: string;
  question: string;
}

interface AdminProgramFormState {
  accessDays: string;
  accessPolicy: AdminProgramAccessPolicy;
  categoryId: string;
  checklists: string[];
  description: string;
  faqs: AdminProgramFaqFormItem[];
  instructorBio: string;
  instructorName: string;
  learningEndAt: string;
  learningPoints: string[];
  learningStartAt: string;
  level: '' | AdminProgramLevel;
  maxStudents: string;
  price: string;
  programType: AdminProgramType;
  recommendedFor: string[];
  saleEndAt: string;
  salePrice: string;
  saleStartAt: string;
  slug: string;
  summaryItems: AdminProgramSummaryFormItem[];
  thumbnailUrl: string;
  title: string;
}

const INITIAL_FORM_STATE: AdminProgramFormState = {
  accessDays: '',
  accessPolicy: 'UNLIMITED',
  categoryId: '',
  checklists: [],
  description: '',
  faqs: [],
  instructorBio: '',
  instructorName: '',
  learningEndAt: '',
  learningPoints: [],
  learningStartAt: '',
  level: '',
  maxStudents: '',
  price: '',
  programType: 'ONLINE',
  recommendedFor: [],
  saleEndAt: '',
  salePrice: '',
  saleStartAt: '',
  slug: '',
  summaryItems: [],
  thumbnailUrl: '',
  title: '',
};

const confirmProgramDelete = (): boolean => {
  return window.confirm(
    '강의를 삭제하면 되돌릴 수 없습니다.\n커리큘럼이나 수강 이력이 있는 강의는 삭제가 실패할 수 있습니다.\n계속하시겠습니까?',
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
  timeLabel: string;
  value: string;
  onChange: (value: string) => void;
}

interface DatePickerFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

const DatePickerField = ({ label, name, value, onChange }: DatePickerFieldProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    input?.showPicker?.();
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
    accessDays: detail.accessDays === null ? '' : String(detail.accessDays),
    accessPolicy: detail.accessPolicy ?? 'UNLIMITED',
    categoryId: String(detail.categoryId),
    checklists: [...detail.checklists],
    description: detail.description ?? '',
    faqs: detail.faqs.map((item) => ({
      answer: item.answer,
      question: item.question,
    })),
    instructorBio: detail.instructorBio ?? '',
    instructorName: detail.instructorName ?? '',
    learningEndAt: toDateTimeLocal(detail.learningEndAt),
    learningPoints: [...detail.learningPoints],
    learningStartAt: toDateTimeLocal(detail.learningStartAt),
    level: detail.level ?? '',
    maxStudents: detail.maxStudents === null ? '' : String(detail.maxStudents),
    price: String(detail.price),
    programType: detail.programType,
    recommendedFor: [...detail.recommendedFor],
    saleEndAt: toDateTimeLocal(detail.saleEndAt),
    salePrice: detail.salePrice === null ? '' : String(detail.salePrice),
    saleStartAt: toDateTimeLocal(detail.saleStartAt),
    slug: detail.slug,
    summaryItems: detail.summaryItems.map((item) => ({
      label: item.label,
      value: item.value,
    })),
    thumbnailUrl: detail.thumbnailUrl ?? '',
    title: detail.title,
  };
};

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

const toProgramPayload = (formState: AdminProgramFormState): AdminProgramUpsertPayload => {
  const resolvedAccessDays =
    formState.accessPolicy === 'FIXED_DURATION' && formState.accessDays.trim()
      ? Number(formState.accessDays)
      : null;
  const resolvedLearningStartAt =
    formState.accessPolicy === 'COHORT' ? toIsoStringOrNull(formState.learningStartAt) : null;
  const resolvedLearningEndAt =
    formState.accessPolicy === 'COHORT' ? toIsoStringOrNull(formState.learningEndAt) : null;

  return {
    accessDays: resolvedAccessDays,
    accessPolicy: formState.accessPolicy,
    categoryId: Number(formState.categoryId),
    checklists: sanitizeStringList(formState.checklists),
    description: formState.description.trim() || null,
    faqs: sanitizeFaqs(formState.faqs),
    instructorBio: formState.instructorBio.trim() || null,
    instructorName: formState.instructorName.trim() || null,
    learningEndAt: resolvedLearningEndAt,
    learningPoints: sanitizeStringList(formState.learningPoints),
    learningStartAt: resolvedLearningStartAt,
    level: formState.level || null,
    maxStudents: formState.maxStudents.trim() ? Number(formState.maxStudents) : null,
    price: Number(formState.price),
    programType: formState.programType,
    recommendedFor: sanitizeStringList(formState.recommendedFor),
    saleEndAt: toIsoStringOrNull(formState.saleEndAt),
    salePrice: formState.salePrice.trim() ? Number(formState.salePrice) : null,
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
    return '강의명을 입력해 주세요.';
  }
  if (!formState.price.trim() || Number(formState.price) < 0) {
    return '가격을 올바르게 입력해 주세요.';
  }
  if (formState.salePrice.trim() && Number(formState.salePrice) < 0) {
    return '할인가를 올바르게 입력해 주세요.';
  }
  if (formState.maxStudents.trim() && Number(formState.maxStudents) < 1) {
    return '정원은 1 이상이어야 합니다.';
  }
  if (formState.accessDays.trim() && Number(formState.accessDays) < 1) {
    return '수강일수는 1 이상이어야 합니다.';
  }
  if (hasPartialDateTime(formState.saleStartAt) || hasPartialDateTime(formState.saleEndAt)) {
    return '판매 시작일과 종료일의 날짜와 시간을 모두 선택해 주세요.';
  }
  if (hasPartialDateTime(formState.learningStartAt) || hasPartialDateTime(formState.learningEndAt)) {
    return '수강 시작일과 종료일의 날짜와 시간을 모두 선택해 주세요.';
  }
  if (formState.accessPolicy === 'FIXED_DURATION' && !formState.accessDays.trim()) {
    return '고정 기간 수강은 수강일수를 입력해 주세요.';
  }
  if (
    formState.accessPolicy === 'COHORT' &&
    (!formState.learningStartAt.trim() || !formState.learningEndAt.trim())
  ) {
    return '기수형 수강은 수강 시작일과 종료일을 모두 입력해 주세요.';
  }
  if (
    formState.accessPolicy === 'COHORT' &&
    formState.learningStartAt.trim() &&
    formState.learningEndAt.trim() &&
    new Date(formState.learningStartAt).getTime() > new Date(formState.learningEndAt).getTime()
  ) {
    return '수강 시작일은 종료일보다 늦을 수 없습니다.';
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
    return '요약 항목명과 내용을 모두 입력해 주세요.';
  }

  return null;
};

const buildEditorTitle = (
  mode: AdminProgramEditorSectionProps['mode'],
  detail: AdminProgramDetail | null,
): string => {
  if (mode === 'create') {
    return '새 강의 등록';
  }
  if (mode === 'duplicate') {
    return detail ? `${detail.title} 복제` : '강의 복제';
  }
  return detail ? `${detail.title} 수정` : '강의 수정';
};

const programTypeOptions = [
  { value: 'ONLINE', label: '온라인' },
  { value: 'OFFLINE', label: '오프라인' },
  { value: 'HYBRID', label: '하이브리드' },
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
  { value: 'COHORT', label: '기수형' },
] as const;

const AdminProgramEditorSection = ({ mode }: AdminProgramEditorSectionProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const editingProgramId = mode === 'edit' ? Number(params['programId']) : null;
  const duplicateSourceProgramId = mode === 'duplicate' ? Number(params['sourceProgramId']) : null;
  const targetProgramId = mode === 'edit' ? editingProgramId : duplicateSourceProgramId;
  const categoriesTreeQuery = useAdminCategoriesTreeQuery();
  const detailQuery = useAdminProgramDetailLiveQuery(
    Number.isFinite(targetProgramId) ? targetProgramId : null,
    mode !== 'create',
  );
  const [formState, setFormState] = useState<AdminProgramFormState>(INITIAL_FORM_STATE);

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

    setFormState(duplicatedState);
  }, [detailQuery.data, mode]);

  const invalidateProgramQueries = async (programId?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProgramsLiveQueryKey() }),
      queryClient.invalidateQueries({ queryKey: adminCategoriesTreeQueryKey() }),
      programId !== undefined
        ? queryClient.invalidateQueries({ queryKey: adminProgramDetailLiveQueryKey(programId) })
        : Promise.resolve(),
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
        message: error instanceof Error ? error.message : '강의 저장에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (response) => {
      await invalidateProgramQueries(response.id);
      showToast({
        message: mode === 'edit' ? '강의를 수정했습니다.' : '강의를 등록했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminProgramEdit(String(response.id)));
    },
  });

  const publishMutation = useMutation({
    mutationFn: (programId: number) => publishAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 공개 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateProgramQueries(editingProgramId ?? undefined);
      showToast({
        message: '강의를 공개했습니다.',
        variant: 'success',
      });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (programId: number) => hideAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 숨김 처리에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateProgramQueries(editingProgramId ?? undefined);
      showToast({
        message: '강의를 숨김 처리했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (programId: number) => deleteAdminProgramLive(programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateProgramQueries();
      showToast({
        message: '강의를 삭제했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminPrograms);
    },
  });

  const editorTitle = useMemo(
    () => buildEditorTitle(mode, detailQuery.data ?? null),
    [detailQuery.data, mode],
  );

  const isLoading = categoriesTreeQuery.isPending || (mode !== 'create' && detailQuery.isPending);
  const hasError = categoriesTreeQuery.isError || (mode !== 'create' && detailQuery.isError);
  const errorMessage =
    categoriesTreeQuery.error instanceof Error
      ? categoriesTreeQuery.error.message
      : detailQuery.error instanceof Error
        ? detailQuery.error.message
        : '강의 편집 화면을 준비하지 못했습니다.';

  const isEditMode = mode === 'edit' && editingProgramId !== null && Number.isFinite(editingProgramId);
  const currentDetail = detailQuery.data ?? null;
  const deleteBlockedReason = currentDetail?.deleteBlockedReason ?? null;
  const deletable = currentDetail?.deletable !== false;

  const updateField = <T extends keyof AdminProgramFormState>(field: T, value: AdminProgramFormState[T]) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateStringListItem = (
    field: 'learningPoints' | 'recommendedFor' | 'checklists',
    index: number,
    value: string,
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addStringListItem = (field: 'learningPoints' | 'recommendedFor' | 'checklists') => {
    setFormState((current) => ({
      ...current,
      [field]: [...current[field], ''],
    }));
  };

  const removeStringListItem = (
    field: 'learningPoints' | 'recommendedFor' | 'checklists',
    index: number,
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateSummaryItem = (
    index: number,
    key: keyof AdminProgramSummaryFormItem,
    value: string,
  ) => {
    setFormState((current) => ({
      ...current,
      summaryItems: current.summaryItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addSummaryItem = () => {
    setFormState((current) => ({
      ...current,
      summaryItems: [...current.summaryItems, { label: '', value: '' }],
    }));
  };

  const removeSummaryItem = (index: number) => {
    setFormState((current) => ({
      ...current,
      summaryItems: current.summaryItems.filter((_, itemIndex) => itemIndex !== index),
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

  if (isLoading) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>강의 편집 화면을 준비하는 중입니다.</h1>
        <p className={styles['stateDescription']}>카테고리와 강의 상세를 불러오고 있습니다.</p>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>강의 편집 화면을 불러오지 못했습니다.</h1>
        <p className={styles['stateDescription']}>{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className={styles['workspace']}>
      <div className={styles['pageHeader']}>
        <h1 className={styles['pageTitle']}>{editorTitle}</h1>
      </div>

      <div className={styles['actionRow']}>
        <Link className={styles['tableActionButton']} to={routePaths.adminPrograms}>
          목록으로 돌아가기
        </Link>
        {isEditMode && currentDetail ? (
          <>
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
              variant='secondary'
            >
              삭제
            </Button>
          </>
        ) : null}
      </div>

      {isEditMode && currentDetail && !deletable && deleteBlockedReason ? (
        <p className={styles['helperText']}>{deleteBlockedReason}</p>
      ) : null}

      <div className={styles['formShell']}>
        <div className={styles['form']}>
          <AdminCategoryPicker
            helperText='카테고리 관리와 같은 3단 구조에서 가장 하위 카테고리를 선택해 주세요.'
            label='카테고리'
            onChange={(nextValue) => {
              updateField('categoryId', nextValue);
            }}
            tree={categoriesTreeQuery.data ?? []}
            value={formState.categoryId}
          />

          <div className={styles['inlineFieldGrid']}>
            <TextField
              label='강의명'
              name='title'
              onChange={(event) => {
                updateField('title', event.target.value);
              }}
              value={formState.title}
            />
            <div className={styles['metaNotice']}>
              <p className={styles['metaNoticeLabel']}>주소 식별자</p>
              <p className={styles['metaNoticeText']}>
                강의 저장 시 서버에서 자동으로 관리합니다.
              </p>
            </div>
          </div>

          <div className={styles['compactFieldRow']}>
            <AdminDropdownField
              compact
              label='강의 형태'
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
                  accessDays: policy === 'FIXED_DURATION' ? current.accessDays : '',
                  accessPolicy: policy,
                  learningEndAt: policy === 'COHORT' ? current.learningEndAt : '',
                  learningStartAt: policy === 'COHORT' ? current.learningStartAt : '',
                }));
              }}
              options={accessPolicyOptions}
              value={formState.accessPolicy}
            />
          </div>

          <TextAreaField
            label='강의 소개'
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
                  운영 화면에는 이미지 주소를 노출하지 않고 현재 연결된 이미지만 보여줍니다.
                </p>
              </div>
              {formState.thumbnailUrl ? (
                <button
                  className={styles['tableActionButton']}
                  onClick={() => {
                    updateField('thumbnailUrl', '');
                  }}
                  type='button'
                >
                  이미지 제거
                </button>
              ) : null}
            </div>

            {formState.thumbnailUrl ? (
              <div className={styles['thumbnailPreview']}>
                <img
                  alt={formState.title ? `${formState.title} 대표 이미지` : '강의 대표 이미지'}
                  className={styles['thumbnailPreviewImage']}
                  src={formState.thumbnailUrl}
                />
              </div>
            ) : (
              <div className={styles['thumbnailEmptyState']}>등록된 대표 이미지가 없습니다.</div>
            )}
          </div>

          <div className={styles['inlineFieldGrid']}>
            <TextField
              label='강사명'
              name='instructorName'
              onChange={(event) => {
                updateField('instructorName', event.target.value);
              }}
              value={formState.instructorName}
            />
          </div>

          <TextAreaField
            label='강사 소개'
            name='instructorBio'
            onChange={(event) => {
              updateField('instructorBio', event.target.value);
            }}
            value={formState.instructorBio}
          />

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
              label='할인가'
              name='salePrice'
              onChange={(event) => {
                updateField('salePrice', event.target.value);
              }}
              value={formState.salePrice}
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
            {formState.accessPolicy === 'FIXED_DURATION' ? (
              <div className={styles['compactTextField']}>
                <TextField
                  label='수강일수'
                  name='accessDays'
                  onChange={(event) => {
                    updateField('accessDays', event.target.value);
                  }}
                  value={formState.accessDays}
                />
              </div>
            ) : null}
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

            {formState.accessPolicy === 'COHORT' ? (
              <div className={styles['dateTimeGroup']}>
                <p className={styles['dateTimeGroupTitle']}>수강 기간</p>
                <DateTimeSplitField
                  dateLabel='수강 시작일'
                  onChange={(nextValue) => {
                    updateField('learningStartAt', nextValue);
                  }}
                  timeLabel='시작 시간'
                  value={formState.learningStartAt}
                />
                <DateTimeSplitField
                  dateLabel='수강 종료일'
                  onChange={(nextValue) => {
                    updateField('learningEndAt', nextValue);
                  }}
                  timeLabel='종료 시간'
                  value={formState.learningEndAt}
                />
              </div>
            ) : null}
          </div>

          {formState.accessPolicy === 'UNLIMITED' ? (
            <p className={styles['policyHint']}>무제한 수강은 수강일수와 수강 기간을 따로 입력하지 않습니다.</p>
          ) : null}
          {formState.accessPolicy === 'FIXED_DURATION' ? (
            <p className={styles['policyHint']}>고정 기간 수강은 수강일수만 입력합니다.</p>
          ) : null}
          {formState.accessPolicy === 'COHORT' ? (
            <p className={styles['policyHint']}>기수형 수강은 시작일과 종료일을 함께 지정합니다.</p>
          ) : null}

          <AdminFieldArray
            addLabel='학습 포인트 추가'
            emptyMessage='등록된 학습 포인트가 없습니다.'
            helperText='사용자에게 보여줄 핵심 학습 포인트를 항목별로 추가합니다.'
            items={formState.learningPoints}
            label='학습 포인트'
            onAdd={() => {
              addStringListItem('learningPoints');
            }}
            onRemove={(index) => {
              removeStringListItem('learningPoints', index);
            }}
            renderItem={(item, index) => (
              <TextField
                label={`학습 포인트 ${index + 1}`}
                name={`learning-point-${index}`}
                onChange={(event) => {
                  updateStringListItem('learningPoints', index, event.target.value);
                }}
                value={item}
              />
            )}
          />

          <AdminFieldArray
            addLabel='추천 대상 추가'
            emptyMessage='등록된 추천 대상이 없습니다.'
            helperText='이 강의를 추천할 대상 유형을 하나씩 정리합니다.'
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
                label={`추천 대상 ${index + 1}`}
                name={`recommended-for-${index}`}
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
                label={`체크리스트 ${index + 1}`}
                name={`checklist-${index}`}
                onChange={(event) => {
                  updateStringListItem('checklists', index, event.target.value);
                }}
                value={item}
              />
            )}
          />

          <AdminFieldArray
            addLabel='요약 항목 추가'
            emptyMessage='등록된 요약 항목이 없습니다.'
            helperText='항목명과 내용을 각각 입력해 카드 형태 요약 정보를 구성합니다.'
            items={formState.summaryItems}
            label='요약 항목'
            onAdd={addSummaryItem}
            onRemove={removeSummaryItem}
            renderItem={(item, index) => (
              <div className={styles['inlineFieldGrid']}>
                <TextField
                  label='항목명'
                  name={`summary-label-${index}`}
                  onChange={(event) => {
                    updateSummaryItem(index, 'label', event.target.value);
                  }}
                  value={item.label}
                />
                <TextField
                  label='내용'
                  name={`summary-value-${index}`}
                  onChange={(event) => {
                    updateSummaryItem(index, 'value', event.target.value);
                  }}
                  value={item.value}
                />
              </div>
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
                  name={`faq-question-${index}`}
                  onChange={(event) => {
                    updateFaqItem(index, 'question', event.target.value);
                  }}
                  value={item.question}
                />
                <TextAreaField
                  label='답변'
                  name={`faq-answer-${index}`}
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
              {saveMutation.isPending ? '저장 중...' : mode === 'edit' ? '강의 저장' : '강의 등록'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminProgramEditorSection;
