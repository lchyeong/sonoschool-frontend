import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  createAdminLecture,
  createAdminSection,
  deleteAdminLecture,
  deleteAdminSection,
  publishAdminLecture,
  reorderAdminLectures,
  reorderAdminSections,
  unpublishAdminLecture,
  updateAdminLecture,
  updateAdminSection,
} from '@/api/adminCurriculum';
import {
  createAdminPracticumSlot,
  deleteAdminPracticumSlot,
  fetchAdminPracticumSlots,
} from '@/api/adminPracticum';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { adminCurriculumQueryKey, useAdminCurriculumQuery } from '@/query/useAdminCurriculumQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type {
  AdminCurriculumLecture,
  AdminCurriculumSection,
  AdminLectureUpsertPayload,
  AdminSectionUpsertPayload,
  AdminSortOrderItem,
} from '@/types/adminCurriculum';
import type { AdminPracticumSlotPayload, PracticumSlot } from '@/types/practicum';
import { classNames } from '@/utils/classNames';

import styles from './AdminProgramCurriculumSection.module.scss';

interface AdminProgramCurriculumSectionProps {
  embedded?: boolean;
  enabled: boolean;
  programId: number | null;
}

interface SectionFormState {
  description: string;
  title: string;
}

interface LectureFormState {
  description: string;
  durationSeconds: string;
  preview: boolean;
  practicumEnabled: boolean;
  title: string;
}

interface PracticumSlotFormState {
  location: string;
  startAt: string;
}

const EMPTY_SECTION_FORM: SectionFormState = {
  description: '',
  title: '',
};

const EMPTY_LECTURE_FORM: LectureFormState = {
  description: '',
  durationSeconds: '',
  preview: false,
  practicumEnabled: false,
  title: '',
};

const EMPTY_PRACTICUM_SLOT_FORM: PracticumSlotFormState = {
  location: '',
  startAt: '',
};

const normalizeDescription = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseDurationSeconds = (value: string): number | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
};

const validateSectionForm = (formState: SectionFormState): string | null => {
  if (!formState.title.trim()) {
    return '섹션명을 입력해 주세요.';
  }

  return null;
};

const validateLectureForm = (formState: LectureFormState): string | null => {
  if (!formState.title.trim()) {
    return '강의명을 입력해 주세요.';
  }

  if (
    formState.durationSeconds.trim() &&
    parseDurationSeconds(formState.durationSeconds) === null
  ) {
    return '강의 길이는 0 이상의 숫자로 입력해 주세요.';
  }

  return null;
};

const toSectionPayload = (
  formState: SectionFormState,
  sortOrder: number,
): AdminSectionUpsertPayload => {
  return {
    description: normalizeDescription(formState.description),
    sortOrder,
    title: formState.title.trim(),
  };
};

const toLecturePayload = (
  formState: LectureFormState,
  sortOrder: number,
): AdminLectureUpsertPayload => {
  return {
    description: normalizeDescription(formState.description),
    durationSeconds: parseDurationSeconds(formState.durationSeconds),
    preview: formState.preview,
    practicumEnabled: formState.practicumEnabled,
    sortOrder,
    title: formState.title.trim(),
  };
};

const adminPracticumSlotsQueryKey = (lectureId: number) =>
  ['admin', 'practicumSlots', lectureId] as const;

const toAdminPracticumSlotPayload = (
  formState: PracticumSlotFormState,
): AdminPracticumSlotPayload | null => {
  const trimmedStartAt = formState.startAt.trim();

  if (!trimmedStartAt) {
    return null;
  }

  const parsedDate = new Date(trimmedStartAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    location: normalizeDescription(formState.location),
    startAt: parsedDate.toISOString(),
  };
};

const formatPracticumDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const buildReorderItems = (
  items: ReadonlyArray<{ id: number }>,
  targetId: number,
  direction: 'up' | 'down',
): AdminSortOrderItem[] | null => {
  const currentIndex = items.findIndex((item) => item.id === targetId);
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return null;
  }

  const reorderedItems = [...items];
  const [currentItem] = reorderedItems.splice(currentIndex, 1);
  reorderedItems.splice(nextIndex, 0, currentItem);

  return reorderedItems.map((item, index) => ({
    id: item.id,
    sortOrder: index,
  }));
};

const formatLectureMeta = (lecture: AdminCurriculumLecture): string => {
  if (lecture.videoId === null) {
    return '영상 미연결';
  }

  return `영상 ID ${String(lecture.videoId)}`;
};

const buildVideoUploadPath = (programId: number, lectureId?: number): string => {
  const searchParams = new URLSearchParams({
    programId: String(programId),
  });

  if (typeof lectureId === 'number') {
    searchParams.set('lectureId', String(lectureId));
  }

  return `${routePaths.adminVideos}?${searchParams.toString()}`;
};

const buildQuizManagementPath = (programId: number, lectureId: number): string => {
  const searchParams = new URLSearchParams({
    lectureId: String(lectureId),
  });

  return `${routePaths.adminProgramQuizzes(String(programId))}?${searchParams.toString()}`;
};

const LectureCard = ({
  canMoveDown,
  canMoveUp,
  lecture,
  onDelete,
  onManageQuiz,
  onManageVideo,
  onMove,
  onSave,
  onTogglePublish,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  lecture: AdminCurriculumLecture;
  onDelete: (lectureId: number) => void;
  onManageQuiz: (lectureId: number) => void;
  onManageVideo: (lectureId: number) => void;
  onMove: (lectureId: number, direction: 'up' | 'down') => void;
  onSave: (lectureId: number, payload: AdminLectureUpsertPayload) => void;
  onTogglePublish: (lectureId: number, published: boolean) => void;
}) => {
  const [formState, setFormState] = useState<LectureFormState>({
    description: lecture.description ?? '',
    durationSeconds: lecture.durationSeconds === null ? '' : String(lecture.durationSeconds),
    preview: lecture.preview,
    practicumEnabled: lecture.practicumEnabled,
    title: lecture.title,
  });
  const [practicumSlotForm, setPracticumSlotForm] =
    useState<PracticumSlotFormState>(EMPTY_PRACTICUM_SLOT_FORM);
  const showToast = useToastStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const practicumSlotsQuery = useQuery({
    enabled: lecture.practicumEnabled,
    queryFn: () => fetchAdminPracticumSlots(lecture.id),
    queryKey: adminPracticumSlotsQueryKey(lecture.id),
  });
  const createPracticumSlotMutation = useMutation({
    mutationFn: (payload: AdminPracticumSlotPayload) =>
      createAdminPracticumSlot(lecture.id, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 슬롯을 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setPracticumSlotForm(EMPTY_PRACTICUM_SLOT_FORM);
      await queryClient.invalidateQueries({ queryKey: adminPracticumSlotsQueryKey(lecture.id) });
      showToast({
        message: '실습 슬롯을 추가했습니다.',
        variant: 'success',
      });
    },
  });
  const deletePracticumSlotMutation = useMutation({
    mutationFn: (slotId: number) => deleteAdminPracticumSlot(slotId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '실습 슬롯을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPracticumSlotsQueryKey(lecture.id) });
      showToast({
        message: '실습 슬롯을 삭제했습니다.',
        variant: 'success',
      });
    },
  });
  const practicumSlots = practicumSlotsQuery.data ?? [];
  const pendingPracticumActivation = formState.practicumEnabled && !lecture.practicumEnabled;

  return (
    <article className={styles['lectureCard']}>
      <div className={styles['lectureHeader']}>
        <div>
          <h4 className={styles['lectureTitle']}>{lecture.title}</h4>
          <div className={styles['badgeRow']}>
            <span
              className={styles['statusBadge']}
              data-tone={lecture.published ? 'published' : 'draft'}
            >
              {lecture.published ? '공개중' : '비공개'}
            </span>
            <span className={styles['statusBadge']} data-tone='neutral'>
              {formatLectureMeta(lecture)}
            </span>
            <span className={styles['statusBadge']} data-tone='neutral'>
              {lecture.practicumEnabled ? '실습 예약 사용' : '실습 예약 없음'}
            </span>
          </div>
        </div>

        <div className={styles['buttonRow']}>
          <Button
            disabled={!canMoveUp}
            onClick={() => {
              onMove(lecture.id, 'up');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            위로 이동
          </Button>
          <Button
            disabled={!canMoveDown}
            onClick={() => {
              onMove(lecture.id, 'down');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            아래로 이동
          </Button>
          <Button
            onClick={() => {
              onTogglePublish(lecture.id, lecture.published);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            {lecture.published ? '발행 해제' : '발행'}
          </Button>
          <Button
            onClick={() => {
              onManageQuiz(lecture.id);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            퀴즈 관리
          </Button>
          <Button
            onClick={() => {
              onManageVideo(lecture.id);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            {lecture.videoId === null ? '영상 연결' : '영상 변경'}
          </Button>
          <Button
            onClick={() => {
              onDelete(lecture.id);
            }}
            size='sm'
            type='button'
            variant='danger'
          >
            삭제
          </Button>
        </div>
      </div>

      <div className={styles['fieldGrid']}>
        <TextField
          label='강의명'
          name={`lecture-title-${String(lecture.id)}`}
          onChange={(event) => {
            setFormState((current) => ({
              ...current,
              title: event.target.value,
            }));
          }}
          value={formState.title}
        />
        <TextAreaField
          label='강의 설명'
          name={`lecture-description-${String(lecture.id)}`}
          onChange={(event) => {
            setFormState((current) => ({
              ...current,
              description: event.target.value,
            }));
          }}
          rows={3}
          value={formState.description}
        />
        <TextField
          label='강의 길이(초)'
          name={`lecture-duration-${String(lecture.id)}`}
          onChange={(event) => {
            setFormState((current) => ({
              ...current,
              durationSeconds: event.target.value,
            }));
          }}
          value={formState.durationSeconds}
        />

        <label className={styles['checkboxRow']}>
          <input
            checked={formState.preview}
            onChange={(event) => {
              setFormState((current) => ({
                ...current,
                preview: event.target.checked,
              }));
            }}
            type='checkbox'
          />
          미리보기 허용
        </label>

        <label className={styles['checkboxRow']}>
          <input
            checked={formState.practicumEnabled}
            onChange={(event) => {
              setFormState((current) => ({
                ...current,
                practicumEnabled: event.target.checked,
              }));
            }}
            type='checkbox'
          />
          실습 예약 사용
        </label>

        <div className={styles['buttonRow']}>
          <Button
            onClick={() => {
              onSave(lecture.id, toLecturePayload(formState, lecture.sortOrder));
            }}
            size='sm'
            type='button'
          >
            강의 저장
          </Button>
        </div>
      </div>

      {pendingPracticumActivation ? (
        <div className={styles['subsection']}>
          <h5 className={styles['subsectionTitle']}>실습 슬롯</h5>
          <p className={styles['helperText']}>
            강의를 먼저 저장하면 이 아래에서 1시간 단위 실습 슬롯을 등록할 수 있습니다.
          </p>
        </div>
      ) : null}

      {lecture.practicumEnabled ? (
        <div className={styles['subsection']}>
          <h5 className={styles['subsectionTitle']}>실습 슬롯</h5>
          <p className={styles['helperText']}>
            같은 시간대는 강의가 달라도 전체 합산 2명까지만 예약됩니다.
          </p>

          {practicumSlotsQuery.isLoading ? (
            <p className={styles['helperText']}>실습 슬롯을 불러오는 중입니다.</p>
          ) : null}
          {practicumSlotsQuery.isError ? (
            <p className={styles['errorText']}>
              {practicumSlotsQuery.error instanceof Error
                ? practicumSlotsQuery.error.message
                : '실습 슬롯을 불러오지 못했습니다.'}
            </p>
          ) : null}

          {practicumSlots.length ? (
            <div className={styles['practicumSlotList']}>
              {practicumSlots.map((slot: PracticumSlot) => (
                <div className={styles['practicumSlotCard']} key={slot.id}>
                  <div>
                    <strong className={styles['practicumSlotTitle']}>
                      {formatPracticumDateTime(slot.startAt)} ~{' '}
                      {formatPracticumDateTime(slot.endAt)}
                    </strong>
                    <div className={styles['badgeRow']}>
                      <span className={styles['statusBadge']} data-tone='neutral'>
                        예약 {slot.reservedCount}/{slot.maxCapacity}
                      </span>
                      <span className={styles['statusBadge']} data-tone='neutral'>
                        {slot.location?.trim() || '장소 미정'}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      deletePracticumSlotMutation.mutate(slot.id);
                    }}
                    size='sm'
                    type='button'
                    variant='danger'
                  >
                    슬롯 삭제
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            !practicumSlotsQuery.isLoading &&
            !practicumSlotsQuery.isError && (
              <p className={styles['emptyState']}>등록된 실습 슬롯이 없습니다.</p>
            )
          )}

          <div className={styles['practicumSlotForm']}>
            <TextField
              label='실습 시작 시각'
              name={`practicum-start-${String(lecture.id)}`}
              onChange={(event) => {
                setPracticumSlotForm((current) => ({
                  ...current,
                  startAt: event.target.value,
                }));
              }}
              type='datetime-local'
              value={practicumSlotForm.startAt}
            />
            <TextField
              label='실습 장소'
              name={`practicum-location-${String(lecture.id)}`}
              onChange={(event) => {
                setPracticumSlotForm((current) => ({
                  ...current,
                  location: event.target.value,
                }));
              }}
              value={practicumSlotForm.location}
            />
            <div className={styles['buttonRow']}>
              <Button
                onClick={() => {
                  const payload = toAdminPracticumSlotPayload(practicumSlotForm);
                  if (!payload) {
                    showToast({
                      message: '실습 시작 시각을 올바르게 입력해 주세요.',
                      variant: 'error',
                    });
                    return;
                  }
                  createPracticumSlotMutation.mutate(payload);
                }}
                size='sm'
                type='button'
              >
                실습 슬롯 추가
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
};

const SectionCard = ({
  canMoveDown,
  canMoveUp,
  onCreateLecture,
  onDeleteLecture,
  onDeleteSection,
  onManageLectureQuiz,
  onManageLectureVideo,
  onMoveLecture,
  onMoveSection,
  onSaveLecture,
  onSaveSection,
  onToggleLecturePublish,
  section,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  onCreateLecture: (sectionId: number, payload: AdminLectureUpsertPayload) => boolean;
  onDeleteLecture: (lectureId: number) => void;
  onDeleteSection: (sectionId: number) => void;
  onManageLectureQuiz: (lectureId: number) => void;
  onManageLectureVideo: (lectureId: number) => void;
  onMoveLecture: (sectionId: number, lectureId: number, direction: 'up' | 'down') => void;
  onMoveSection: (sectionId: number, direction: 'up' | 'down') => void;
  onSaveLecture: (lectureId: number, payload: AdminLectureUpsertPayload) => void;
  onSaveSection: (sectionId: number, payload: AdminSectionUpsertPayload) => void;
  onToggleLecturePublish: (lectureId: number, published: boolean) => void;
  section: AdminCurriculumSection;
}) => {
  const [sectionForm, setSectionForm] = useState<SectionFormState>({
    description: section.description ?? '',
    title: section.title,
  });
  const [newLectureForm, setNewLectureForm] = useState<LectureFormState>(EMPTY_LECTURE_FORM);

  return (
    <article className={styles['sectionCard']}>
      <div className={styles['cardHeader']}>
        <div>
          <h3 className={styles['cardTitle']}>{section.title}</h3>
          <p className={styles['cardMeta']}>강의 {String(section.lectures.length)}개</p>
        </div>

        <div className={styles['buttonRow']}>
          <Button
            disabled={!canMoveUp}
            onClick={() => {
              onMoveSection(section.id, 'up');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            위로 이동
          </Button>
          <Button
            disabled={!canMoveDown}
            onClick={() => {
              onMoveSection(section.id, 'down');
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            아래로 이동
          </Button>
          <Button
            disabled={section.lectures.length > 0}
            onClick={() => {
              onDeleteSection(section.id);
            }}
            size='sm'
            type='button'
            variant='danger'
          >
            섹션 삭제
          </Button>
        </div>
      </div>

      <div className={styles['fieldGrid']}>
        <TextField
          label='섹션명'
          name={`section-title-${String(section.id)}`}
          onChange={(event) => {
            setSectionForm((current) => ({
              ...current,
              title: event.target.value,
            }));
          }}
          value={sectionForm.title}
        />
        <TextAreaField
          label='섹션 설명'
          name={`section-description-${String(section.id)}`}
          onChange={(event) => {
            setSectionForm((current) => ({
              ...current,
              description: event.target.value,
            }));
          }}
          rows={3}
          value={sectionForm.description}
        />
        <div className={styles['buttonRow']}>
          <Button
            onClick={() => {
              onSaveSection(section.id, toSectionPayload(sectionForm, section.sortOrder));
            }}
            size='sm'
            type='button'
          >
            섹션 저장
          </Button>
        </div>
      </div>

      <div className={styles['subsection']}>
        <h4 className={styles['subsectionTitle']}>강의 목록</h4>

        {section.lectures.length ? (
          <div className={styles['lectureList']}>
            {section.lectures.map((lecture, index) => (
              <LectureCard
                canMoveDown={index < section.lectures.length - 1}
                canMoveUp={index > 0}
                key={lecture.id}
                lecture={lecture}
                onDelete={onDeleteLecture}
                onManageQuiz={onManageLectureQuiz}
                onManageVideo={onManageLectureVideo}
                onMove={(lectureId, direction) => {
                  onMoveLecture(section.id, lectureId, direction);
                }}
                onSave={onSaveLecture}
                onTogglePublish={onToggleLecturePublish}
              />
            ))}
          </div>
        ) : (
          <p className={styles['emptyState']}>등록된 강의가 없습니다.</p>
        )}
      </div>

      <div className={styles['subsection']}>
        <h4 className={styles['subsectionTitle']}>새 강의 추가</h4>
        <div className={styles['fieldGrid']}>
          <TextField
            label='새 강의명'
            name={`new-lecture-title-${String(section.id)}`}
            onChange={(event) => {
              setNewLectureForm((current) => ({
                ...current,
                title: event.target.value,
              }));
            }}
            value={newLectureForm.title}
          />
          <TextAreaField
            label='새 강의 설명'
            name={`new-lecture-description-${String(section.id)}`}
            onChange={(event) => {
              setNewLectureForm((current) => ({
                ...current,
                description: event.target.value,
              }));
            }}
            rows={3}
            value={newLectureForm.description}
          />
          <TextField
            label='새 강의 길이(초)'
            name={`new-lecture-duration-${String(section.id)}`}
            onChange={(event) => {
              setNewLectureForm((current) => ({
                ...current,
                durationSeconds: event.target.value,
              }));
            }}
            value={newLectureForm.durationSeconds}
          />

          <label className={styles['checkboxRow']}>
            <input
              checked={newLectureForm.preview}
              onChange={(event) => {
                setNewLectureForm((current) => ({
                  ...current,
                  preview: event.target.checked,
                }));
              }}
              type='checkbox'
            />
            미리보기 허용
          </label>

          <label className={styles['checkboxRow']}>
            <input
              checked={newLectureForm.practicumEnabled}
              onChange={(event) => {
                setNewLectureForm((current) => ({
                  ...current,
                  practicumEnabled: event.target.checked,
                }));
              }}
              type='checkbox'
            />
            실습 예약 사용
          </label>

          <div className={styles['buttonRow']}>
            <Button
              onClick={() => {
                const didStart = onCreateLecture(
                  section.id,
                  toLecturePayload(newLectureForm, section.lectures.length),
                );
                if (didStart) {
                  setNewLectureForm(EMPTY_LECTURE_FORM);
                }
              }}
              size='sm'
              type='button'
            >
              강의 추가
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

const AdminProgramCurriculumSection = ({
  embedded = false,
  enabled,
  programId,
}: AdminProgramCurriculumSectionProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);
  const curriculumQuery = useAdminCurriculumQuery(programId, enabled);
  const [newSectionForm, setNewSectionForm] = useState<SectionFormState>(EMPTY_SECTION_FORM);

  const invalidateCurriculum = async () => {
    await queryClient.invalidateQueries({ queryKey: adminCurriculumQueryKey(programId) });
  };

  const createSectionMutation = useMutation({
    mutationFn: (payload: AdminSectionUpsertPayload) =>
      createAdminSection(programId as number, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션을 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setNewSectionForm(EMPTY_SECTION_FORM);
      await invalidateCurriculum();
      showToast({
        message: '섹션을 추가했습니다.',
        variant: 'success',
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({
      payload,
      sectionId,
    }: {
      payload: AdminSectionUpsertPayload;
      sectionId: number;
    }) => updateAdminSection(sectionId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션을 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '섹션을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: number) => deleteAdminSection(sectionId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션을 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '섹션을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: (items: readonly AdminSortOrderItem[]) =>
      reorderAdminSections(programId as number, items),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '섹션 순서를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
    },
  });

  const createLectureMutation = useMutation({
    mutationFn: ({
      payload,
      sectionId,
    }: {
      payload: AdminLectureUpsertPayload;
      sectionId: number;
    }) => createAdminLecture(sectionId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의를 추가하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '강의를 추가했습니다.',
        variant: 'success',
      });
    },
  });

  const updateLectureMutation = useMutation({
    mutationFn: ({
      lectureId,
      payload,
    }: {
      lectureId: number;
      payload: AdminLectureUpsertPayload;
    }) => updateAdminLecture(lectureId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '강의를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteLectureMutation = useMutation({
    mutationFn: (lectureId: number) => deleteAdminLecture(lectureId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
      showToast({
        message: '강의를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const toggleLecturePublishMutation = useMutation({
    mutationFn: ({ lectureId, published }: { lectureId: number; published: boolean }) => {
      if (published) {
        return unpublishAdminLecture(lectureId);
      }

      return publishAdminLecture(lectureId);
    },
    onError: (error: unknown, variables) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : variables.published
              ? '강의 발행을 해제하지 못했습니다.'
              : '강의를 발행하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      await invalidateCurriculum();
      showToast({
        message: variables.published ? '강의 발행을 해제했습니다.' : '강의를 발행했습니다.',
        variant: 'success',
      });
    },
  });

  const reorderLecturesMutation = useMutation({
    mutationFn: ({
      items,
      sectionId,
    }: {
      items: readonly AdminSortOrderItem[];
      sectionId: number;
    }) => reorderAdminLectures(sectionId, items),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 순서를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await invalidateCurriculum();
    },
  });

  if (!enabled || programId === null) {
    return (
      <section className={classNames(styles['section'], embedded && styles['sectionEmbedded'])}>
        <div className={styles['header']}>
          <div>
            {!embedded ? <h2 className={styles['title']}>커리큘럼 관리</h2> : null}
            <p className={styles['description']}>
              커리큘럼은 프로그램 기본정보를 먼저 저장한 뒤 관리할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const sections = curriculumQuery.data ?? [];

  const handleCreateSection = () => {
    const validationMessage = validateSectionForm(newSectionForm);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    createSectionMutation.mutate(toSectionPayload(newSectionForm, sections.length));
  };

  const handleSaveSection = (sectionId: number, payload: AdminSectionUpsertPayload) => {
    const validationMessage = validateSectionForm({
      description: payload.description ?? '',
      title: payload.title,
    });

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    updateSectionMutation.mutate({ payload, sectionId });
  };

  const handleCreateLecture = (sectionId: number, payload: AdminLectureUpsertPayload): boolean => {
    const validationMessage = validateLectureForm({
      description: payload.description ?? '',
      durationSeconds: payload.durationSeconds === null ? '' : String(payload.durationSeconds),
      preview: payload.preview,
      practicumEnabled: payload.practicumEnabled,
      title: payload.title,
    });

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return false;
    }

    createLectureMutation.mutate({ payload, sectionId });
    return true;
  };

  const handleSaveLecture = (lectureId: number, payload: AdminLectureUpsertPayload) => {
    const validationMessage = validateLectureForm({
      description: payload.description ?? '',
      durationSeconds: payload.durationSeconds === null ? '' : String(payload.durationSeconds),
      preview: payload.preview,
      practicumEnabled: payload.practicumEnabled,
      title: payload.title,
    });

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    updateLectureMutation.mutate({ lectureId, payload });
  };

  const handleMoveSection = (sectionId: number, direction: 'up' | 'down') => {
    const items = buildReorderItems(sections, sectionId, direction);

    if (!items) {
      return;
    }

    reorderSectionsMutation.mutate(items);
  };

  const handleMoveLecture = (sectionId: number, lectureId: number, direction: 'up' | 'down') => {
    const section = sections.find((currentSection) => currentSection.id === sectionId);

    if (!section) {
      return;
    }

    const items = buildReorderItems(section.lectures, lectureId, direction);

    if (!items) {
      return;
    }

    reorderLecturesMutation.mutate({ items, sectionId });
  };

  return (
    <section className={classNames(styles['section'], embedded && styles['sectionEmbedded'])}>
      <div className={styles['header']}>
        <div>
          {!embedded ? <h2 className={styles['title']}>커리큘럼 관리</h2> : null}
          {!embedded ? (
            <p className={styles['description']}>
              섹션과 강의를 편집하고 공개 상태를 관리합니다. 영상 연결은 별도 업로드 화면에서
              진행합니다.
            </p>
          ) : null}
        </div>

        <Button
          onClick={() => {
            void navigate(buildVideoUploadPath(programId));
          }}
          type='button'
          variant='secondary'
        >
          영상 업로드 화면
        </Button>
      </div>

      {curriculumQuery.isPending ? (
        <p className={styles['helperText']}>커리큘럼을 불러오는 중입니다.</p>
      ) : null}

      {curriculumQuery.isError ? (
        <p className={styles['helperText']}>
          {curriculumQuery.error instanceof Error
            ? curriculumQuery.error.message
            : '커리큘럼을 불러오지 못했습니다.'}
        </p>
      ) : null}

      {!curriculumQuery.isPending && !curriculumQuery.isError ? (
        <>
          <div className={styles['createCard']}>
            <div className={styles['fieldGrid']}>
              <TextField
                label='새 섹션명'
                name='new-section-title'
                onChange={(event) => {
                  setNewSectionForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                }}
                value={newSectionForm.title}
              />
              <TextAreaField
                label='새 섹션 설명'
                name='new-section-description'
                onChange={(event) => {
                  setNewSectionForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                rows={3}
                value={newSectionForm.description}
              />
              <div className={styles['buttonRow']}>
                <Button onClick={handleCreateSection} type='button'>
                  섹션 추가
                </Button>
              </div>
            </div>
          </div>

          <div className={styles['sectionList']}>
            {sections.length ? (
              sections.map((section, index) => (
                <SectionCard
                  canMoveDown={index < sections.length - 1}
                  canMoveUp={index > 0}
                  key={section.id}
                  onCreateLecture={handleCreateLecture}
                  onDeleteLecture={(lectureId) => {
                    deleteLectureMutation.mutate(lectureId);
                  }}
                  onManageLectureQuiz={(lectureId) => {
                    void navigate(buildQuizManagementPath(programId, lectureId));
                  }}
                  onManageLectureVideo={(lectureId) => {
                    void navigate(buildVideoUploadPath(programId, lectureId));
                  }}
                  onDeleteSection={(sectionId) => {
                    deleteSectionMutation.mutate(sectionId);
                  }}
                  onMoveLecture={handleMoveLecture}
                  onMoveSection={handleMoveSection}
                  onSaveLecture={handleSaveLecture}
                  onSaveSection={handleSaveSection}
                  onToggleLecturePublish={(lectureId, published) => {
                    toggleLecturePublishMutation.mutate({ lectureId, published });
                  }}
                  section={section}
                />
              ))
            ) : (
              <p className={styles['emptyState']}>등록된 섹션이 없습니다.</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
};

export default AdminProgramCurriculumSection;
