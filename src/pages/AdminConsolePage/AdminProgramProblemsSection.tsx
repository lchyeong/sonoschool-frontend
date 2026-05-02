import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import {
  createAdminProblemMediaUploadTarget,
  uploadAdminProblemMediaFile,
} from '@/api/adminProblemMedia';
import { createAdminProblem, deleteAdminProblem, updateAdminProblem } from '@/api/adminProblems';
import AdminDropdownField from '@/components/admin/AdminDropdownField/AdminDropdownField';
import Button from '@/components/ui/Button/Button';
import SectionTabs from '@/components/ui/SectionTabs/SectionTabs';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { useAdminCurriculumQuery } from '@/query/useAdminCurriculumQuery';
import { useAdminProblemAreasQuery } from '@/query/useAdminProblemAreasQuery';
import {
  adminProblemAttemptsQueryKey,
  adminProblemLectureSummariesQueryKey,
  adminProblemQueryKey,
  useAdminProblemAttemptsQuery,
  useAdminProblemLectureSummariesQuery,
  useAdminProblemQuery,
} from '@/query/useAdminProblemQuery';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminCurriculumLecture } from '@/types/adminCurriculum';
import type { AdminProblemAttempt } from '@/types/adminProblemAttempts';
import type {
  AdminProblem,
  AdminProblemMediaType,
  AdminProblemQuestionType,
  AdminProblemUpsertPayload,
} from '@/types/adminProblems';

import styles from './AdminConsolePage.module.scss';

interface AdminProgramProblemsSectionProps {
  enabled: boolean;
  programId: number | null;
}

type ProblemWorkspaceTab = 'editor' | 'attempts';
type ProblemLectureFilter = 'all' | 'withProblem' | 'withoutProblem' | 'attempted';

interface ProblemOptionFormState {
  correct: boolean;
  optionText: string;
}

interface ProblemQuestionFormState {
  explanation: string;
  mediaAssetId: number | null;
  mediaFile: File | null;
  mediaPreviewUrl: string;
  mediaType: AdminProblemMediaType | null;
  mediaUrl: string;
  options: ProblemOptionFormState[];
  problemAreaId: string;
  questionText: string;
  questionType: AdminProblemQuestionType;
}

interface ProblemFormState {
  passCorrectCount: string;
  questions: ProblemQuestionFormState[];
  timeLimitMinutes: string;
  title: string;
}

interface LectureProblemListItem extends AdminCurriculumLecture {
  attemptCount: number;
  averageScore: number | null;
  hasProblem: boolean;
  lastSubmittedAt: string | null;
  lastUpdatedAt: string | null;
  questionCount: number;
  problemId: number | null;
  sectionTitle: string;
}

const questionTypeOptions = [
  { label: '단일 선택', value: 'SINGLE' },
  { label: '복수 선택', value: 'MULTIPLE' },
  { label: 'O/X', value: 'TRUE_FALSE' },
] as const;

const lectureFilterOptions: ReadonlyArray<{ label: string; value: ProblemLectureFilter }> = [
  { label: '전체 강의', value: 'all' },
  { label: '문제 있음', value: 'withProblem' },
  { label: '문제 없음', value: 'withoutProblem' },
  { label: '응시 있음', value: 'attempted' },
];

const questionTypeLabel: Record<AdminProblemQuestionType, string> = {
  MULTIPLE: '복수 선택',
  SINGLE: '단일 선택',
  TRUE_FALSE: 'O/X',
};

const createEmptyOption = (correct = false): ProblemOptionFormState => ({
  correct,
  optionText: '',
});

const createEmptyQuestion = (): ProblemQuestionFormState => ({
  explanation: '',
  mediaAssetId: null,
  mediaFile: null,
  mediaPreviewUrl: '',
  mediaType: null,
  mediaUrl: '',
  options: [createEmptyOption(true), createEmptyOption(false)],
  problemAreaId: '',
  questionText: '',
  questionType: 'SINGLE',
});

const EMPTY_FORM: ProblemFormState = {
  passCorrectCount: '1',
  questions: [createEmptyQuestion()],
  timeLimitMinutes: '30',
  title: '',
};

const moveItem = <T,>(items: readonly T[], index: number, direction: 'up' | 'down'): T[] => {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= items.length) {
    return [...items];
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(index, 1);
  nextItems.splice(targetIndex, 0, item);
  return nextItems;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: 'short',
  });
};

const formatAverageScore = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '-';
  }

  return `${String(Math.round(value))}점`;
};

const renderQuestionMediaPreview = (
  mediaType: AdminProblemMediaType | null,
  mediaUrl: string,
  alt: string,
) => {
  const trimmed = mediaUrl.trim();

  if (!trimmed || !mediaType) {
    return null;
  }

  return (
    <div className={styles['cellStack']}>
      <span className={styles['cellSecondary']}>
        {mediaType === 'IMAGE' ? '이미지 미리보기' : '영상 미리보기'}
      </span>
      {mediaType === 'IMAGE' ? (
        <img
          alt={alt}
          src={trimmed}
          style={{
            borderRadius: '12px',
            maxHeight: '180px',
            maxWidth: '240px',
            objectFit: 'cover',
            width: '100%',
          }}
        />
      ) : (
        <video
          controls
          preload='metadata'
          style={{
            borderRadius: '12px',
            maxHeight: '220px',
            maxWidth: '320px',
            width: '100%',
          }}
        >
          <source src={trimmed} />
        </video>
      )}
    </div>
  );
};

const hasQuestionMedia = (
  question: Pick<ProblemQuestionFormState, 'mediaAssetId' | 'mediaUrl'>,
) => {
  return question.mediaAssetId !== null || Boolean(question.mediaUrl.trim());
};

const createFormState = (problem: AdminProblem | null): ProblemFormState => {
  if (!problem) {
    return EMPTY_FORM;
  }

  return {
    passCorrectCount: String(problem.passCorrectCount),
    questions: [...problem.questions]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((question) => ({
        explanation: question.explanation ?? '',
        mediaAssetId: question.mediaAssetId ?? null,
        mediaFile: null,
        mediaPreviewUrl: question.mediaPreviewUrl ?? question.mediaUrl ?? '',
        mediaType: question.mediaType ?? null,
        mediaUrl: question.mediaAssetId ? '' : (question.mediaUrl ?? ''),
        options: [...question.options]
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((option) => ({
            correct: option.correct,
            optionText: option.optionText,
          })),
        problemAreaId: String(question.problemAreaId),
        questionText: question.questionText,
        questionType: question.questionType,
      })),
    timeLimitMinutes: problem.timeLimitSeconds
      ? String(Math.ceil(problem.timeLimitSeconds / 60))
      : '',
    title: problem.title,
  };
};

const toPayload = (
  formState: ProblemFormState,
  fallbackTitle: string,
): AdminProblemUpsertPayload => ({
  passCorrectCount: Number(formState.passCorrectCount),
  timeLimitSeconds: formState.timeLimitMinutes.trim()
    ? Math.max(1, Math.floor(Number(formState.timeLimitMinutes) * 60))
    : null,
  questions: formState.questions.map((question, questionIndex) => ({
    explanation: question.explanation.trim() || null,
    mediaAssetId: question.mediaAssetId,
    mediaType: hasQuestionMedia(question) ? question.mediaType : null,
    mediaUrl: question.mediaAssetId !== null ? null : question.mediaUrl.trim() || null,
    problemAreaId: Number(question.problemAreaId),
    options: question.options.map((option, optionIndex) => ({
      correct: option.correct,
      mediaType: null,
      mediaUrl: null,
      optionText: option.optionText.trim(),
      sortOrder: optionIndex,
    })),
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    sortOrder: questionIndex,
  })),
  title: formState.title.trim() || fallbackTitle.trim() || '문제',
});

const validateForm = (formState: ProblemFormState): string | null => {
  if (!formState.passCorrectCount.trim() || Number.isNaN(Number(formState.passCorrectCount))) {
    return '합격 기준 문항 수를 숫자로 입력해 주세요.';
  }

  if (Number(formState.passCorrectCount) < 0) {
    return '합격 기준 문항 수는 0 이상이어야 합니다.';
  }

  if (
    formState.timeLimitMinutes.trim() &&
    (Number.isNaN(Number(formState.timeLimitMinutes)) || Number(formState.timeLimitMinutes) <= 0)
  ) {
    return '제한시간은 비워두거나 1분 이상 숫자로 입력해 주세요.';
  }

  if (formState.questions.length < 1) {
    return '문항을 하나 이상 추가해 주세요.';
  }

  for (const [questionIndex, question] of formState.questions.entries()) {
    if (!question.questionText.trim()) {
      return `${String(questionIndex + 1)}번 문항 내용을 입력해 주세요.`;
    }

    if (!question.problemAreaId.trim()) {
      return `${String(questionIndex + 1)}번 문항의 문제 영역을 선택해 주세요.`;
    }

    if (question.options.length < 2) {
      return `${String(questionIndex + 1)}번 문항은 보기 2개 이상이 필요합니다.`;
    }

    const correctCount = question.options.filter((option) => option.correct).length;

    if (correctCount < 1) {
      return `${String(questionIndex + 1)}번 문항의 정답을 하나 이상 선택해 주세요.`;
    }

    if (question.questionType !== 'MULTIPLE' && correctCount !== 1) {
      return `${String(questionIndex + 1)}번 문항은 정답을 1개만 선택할 수 있습니다.`;
    }

    for (const [optionIndex, option] of question.options.entries()) {
      if (!option.optionText.trim()) {
        return `${String(questionIndex + 1)}번 문항의 ${String(optionIndex + 1)}번 보기를 입력해 주세요.`;
      }
    }
  }

  return null;
};

const confirmQuizDelete = () => {
  return window.confirm('문제를 삭제하면 되돌릴 수 없습니다. 계속하시겠습니까?');
};

const ProblemAttemptsPanel = ({ problemId }: { problemId: number | null }) => {
  const attemptsQuery = useAdminProblemAttemptsQuery(problemId, problemId !== null);
  const attempts = attemptsQuery.data ?? [];
  const topAttempt = attempts.at(0) ?? null;
  const passCount = attempts.filter((attempt) => attempt.passed).length;
  const averageScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
      : 0;

  if (problemId === null) {
    return (
      <div className={styles['quizEmptyState']}>
        <strong className={styles['itemTitle']}>응시 결과가 없습니다.</strong>
        <p className={styles['helperText']}>문제를 먼저 등록해야 응시 결과를 집계할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles['stackList']}>
      <div className={styles['summaryGrid']}>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>응시 수</p>
          <strong className={styles['summaryValue']}>{String(attempts.length)}건</strong>
        </article>
        <article className={styles['summaryCard']} data-tone='accent'>
          <p className={styles['summaryLabel']}>통과 수</p>
          <strong className={styles['summaryValue']}>{String(passCount)}건</strong>
        </article>
        <article className={styles['summaryCard']} data-tone='brand'>
          <p className={styles['summaryLabel']}>평균 점수</p>
          <strong className={styles['summaryValue']}>{String(averageScore)}점</strong>
        </article>
        <article className={styles['summaryCard']} data-tone='accent'>
          <p className={styles['summaryLabel']}>최근 제출</p>
          <strong className={styles['summaryValue']}>
            {topAttempt ? formatDateTime(topAttempt.submittedAt) : '-'}
          </strong>
        </article>
      </div>

      <section className={styles['panel']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h3 className={styles['panelTitle']}>수강생 응시 결과</h3>
            <p className={styles['metaText']}>문항 편집과 분리된 운영 조회 영역입니다.</p>
          </div>
        </div>

        {attemptsQuery.isPending ? (
          <p className={styles['helperText']}>응시 내역을 불러오는 중입니다.</p>
        ) : null}
        {attemptsQuery.isError ? (
          <p className={styles['helperText']}>
            {attemptsQuery.error instanceof Error
              ? attemptsQuery.error.message
              : '응시 내역을 불러오지 못했습니다.'}
          </p>
        ) : null}

        {!attemptsQuery.isPending && !attemptsQuery.isError ? (
          attempts.length ? (
            <div className={styles['tableWrap']}>
              <table className={styles['table']}>
                <thead>
                  <tr>
                    <th scope='col'>이름</th>
                    <th scope='col'>아이디</th>
                    <th scope='col'>점수</th>
                    <th scope='col'>합격 기준</th>
                    <th scope='col'>결과</th>
                    <th scope='col'>제출 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt: AdminProblemAttempt) => (
                    <tr key={attempt.id}>
                      <td>{attempt.displayName}</td>
                      <td>{attempt.loginId}</td>
                      <td>{String(attempt.score)}점</td>
                      <td>{String(attempt.passCorrectCount)}문항</td>
                      <td>{attempt.passed ? '통과' : '미통과'}</td>
                      <td>{formatDateTime(attempt.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles['helperText']}>아직 제출된 문제 응시 기록이 없습니다.</p>
          )
        ) : null}
      </section>
    </div>
  );
};

const ProblemEditor = ({
  lectureId,
  lectureTitle,
  programId,
  problem,
}: {
  lectureId: number;
  lectureTitle: string;
  programId: number;
  problem: AdminProblem | null;
}) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const problemAreasQuery = useAdminProblemAreasQuery(true);
  const [formState, setFormState] = useState<ProblemFormState>(() => createFormState(problem));
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  useEffect(() => {
    setFormState(createFormState(problem));
  }, [problem]);

  useEffect(() => {
    setSelectedQuestionIndex(0);
  }, [problem?.id]);

  useEffect(() => {
    if (selectedQuestionIndex >= formState.questions.length) {
      setSelectedQuestionIndex(Math.max(0, formState.questions.length - 1));
    }
  }, [formState.questions.length, selectedQuestionIndex]);

  const selectedQuestion = formState.questions.at(selectedQuestionIndex) ?? null;
  const problemAreaOptions = useMemo(
    () =>
      (problemAreasQuery.data ?? []).map((area) => ({
        label: area.name,
        value: String(area.id),
      })),
    [problemAreasQuery.data],
  );

  const refreshProblem = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProblemQueryKey(lectureId) }),
      queryClient.invalidateQueries({ queryKey: adminProblemLectureSummariesQueryKey(programId) }),
      queryClient.invalidateQueries({
        queryKey: adminProblemAttemptsQueryKey(problem?.id ?? null),
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminProblemUpsertPayload) => createAdminProblem(lectureId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제를 등록하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshProblem();
      showToast({
        message: '문제를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      payload,
      problemId,
    }: {
      payload: AdminProblemUpsertPayload;
      problemId: number;
    }) => updateAdminProblem(problemId, payload),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshProblem();
      showToast({
        message: '문제를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (problemId: number) => deleteAdminProblem(problemId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '문제를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await refreshProblem();
      showToast({
        message: '문제를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const preparePayload = async (): Promise<AdminProblemUpsertPayload> => {
    const nextQuestions = await Promise.all(
      formState.questions.map(async (question) => {
        if (!question.mediaFile) {
          return question;
        }

        const uploadTarget = await createAdminProblemMediaUploadTarget({
          contentType: question.mediaFile.type || 'application/octet-stream',
          fileSize: question.mediaFile.size,
          filename: question.mediaFile.name,
        });

        await uploadAdminProblemMediaFile(uploadTarget.uploadUrl, question.mediaFile);

        return {
          ...question,
          mediaAssetId: uploadTarget.assetId,
          mediaFile: null,
          mediaPreviewUrl: uploadTarget.previewUrl,
          mediaType: uploadTarget.mediaType,
          mediaUrl: '',
        };
      }),
    );

    setFormState((current) => ({
      ...current,
      questions: current.questions.map((question, index) => ({
        ...question,
        mediaAssetId: nextQuestions[index]?.mediaAssetId ?? question.mediaAssetId,
        mediaFile: null,
        mediaPreviewUrl: nextQuestions[index]?.mediaPreviewUrl ?? question.mediaPreviewUrl,
        mediaType: nextQuestions[index]?.mediaType ?? question.mediaType,
        mediaUrl: nextQuestions[index]?.mediaUrl ?? question.mediaUrl,
      })),
    }));

    return toPayload(
      {
        ...formState,
        questions: nextQuestions,
      },
      lectureTitle,
    );
  };

  const handleSubmit = async () => {
    const validationMessage = validateForm(formState);

    if (validationMessage) {
      showToast({
        message: validationMessage,
        variant: 'error',
      });
      return;
    }

    try {
      setIsUploadingMedia(true);
      const payload = await preparePayload();

      if (problem) {
        updateMutation.mutate({ payload, problemId: problem.id });
        return;
      }

      createMutation.mutate(payload);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : '문제 미디어 업로드에 실패했습니다.',
        variant: 'error',
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || isUploadingMedia;

  return (
    <div className={styles['stackList']}>
      <div className={styles['panel']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h3 className={styles['panelTitle']}>문제 기본 정보</h3>
            <p className={styles['metaText']}>
              {problem
                ? '현재 등록된 문제를 수정하는 화면입니다.'
                : '선택한 강의에 새 문제를 등록합니다.'}
            </p>
          </div>
          <div className={styles['actionRow']}>
            <Button disabled={isSubmitting} onClick={() => void handleSubmit()} type='button'>
              {isSubmitting
                ? problem
                  ? '저장 중...'
                  : '등록 중...'
                : problem
                  ? '문제 저장'
                  : '문제 등록'}
            </Button>
            {problem ? (
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (!confirmQuizDelete()) {
                    return;
                  }
                  deleteMutation.mutate(problem.id);
                }}
                type='button'
                variant='danger'
              >
                삭제
              </Button>
            ) : null}
          </div>
        </div>

        <div className={styles['stackListCompact']}>
          <div className={styles['compactFieldRow']}>
            <div className={styles['compactTextField']}>
              <TextField
                label='합격 기준 문항 수'
                name='problem-pass-correct-count'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    passCorrectCount: event.target.value,
                  }));
                }}
                value={formState.passCorrectCount}
              />
            </div>
            <div className={styles['compactTextField']}>
              <TextField
                label='제한시간(분)'
                name='problem-time-limit-minutes'
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    timeLimitMinutes: event.target.value,
                  }));
                }}
                value={formState.timeLimitMinutes}
              />
            </div>
          </div>
        </div>
      </div>

      <section className={styles['panel']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h3 className={styles['panelTitle']}>문항 편집</h3>
            <p className={styles['metaText']}>문항 목록에서 선택한 항목만 상세 편집합니다.</p>
          </div>
          <Button
            onClick={() => {
              setFormState((current) => {
                const nextQuestions = [...current.questions, createEmptyQuestion()];
                return {
                  ...current,
                  questions: nextQuestions,
                };
              });
              setSelectedQuestionIndex(formState.questions.length);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            문항 추가
          </Button>
        </div>

        <div className={styles['quizQuestionWorkspace']}>
          <aside className={styles['quizQuestionListPanel']}>
            <div className={styles['quizQuestionList']}>
              {formState.questions.map((question, questionIndex) => {
                const isSelected = questionIndex === selectedQuestionIndex;
                const summaryText = question.questionText.trim() || '문항 내용을 입력하세요.';

                return (
                  <button
                    className={styles['quizQuestionButton']}
                    data-selected={isSelected}
                    key={`question-nav-${String(questionIndex)}`}
                    onClick={() => {
                      setSelectedQuestionIndex(questionIndex);
                    }}
                    type='button'
                  >
                    <div className={styles['searchResultHeader']}>
                      <strong className={styles['cellPrimary']}>
                        문항 {String(questionIndex + 1)}
                      </strong>
                      <div className={styles['metaRow']}>
                        <span className={styles['badge']}>
                          {questionTypeLabel[question.questionType]}
                        </span>
                        {question.mediaType ? (
                          <span className={styles['badgeAccent']}>
                            {question.mediaType === 'IMAGE' ? '이미지' : '영상'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles['cellStack']}>
                      <span className={styles['cellSecondary']}>{summaryText}</span>
                      <span className={styles['cellSecondary']}>
                        보기 {String(question.options.length)}개
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className={styles['quizQuestionDetailPanel']}>
            {selectedQuestion ? (
              <div className={styles['stackList']}>
                <div className={styles['panelToolbar']}>
                  <div>
                    <h4 className={styles['itemTitle']}>
                      문항 {String(selectedQuestionIndex + 1)} 상세 편집
                    </h4>
                    <p className={styles['metaText']}>
                      {questionTypeLabel[selectedQuestion.questionType]} · 보기{' '}
                      {String(selectedQuestion.options.length)}개
                    </p>
                  </div>
                  <div className={styles['actionRow']}>
                    <Button
                      disabled={selectedQuestionIndex === 0}
                      onClick={() => {
                        setFormState((current) => ({
                          ...current,
                          questions: moveItem(current.questions, selectedQuestionIndex, 'up'),
                        }));
                        setSelectedQuestionIndex((current) => Math.max(0, current - 1));
                      }}
                      size='sm'
                      type='button'
                      variant='secondary'
                    >
                      위로
                    </Button>
                    <Button
                      disabled={selectedQuestionIndex === formState.questions.length - 1}
                      onClick={() => {
                        setFormState((current) => ({
                          ...current,
                          questions: moveItem(current.questions, selectedQuestionIndex, 'down'),
                        }));
                        setSelectedQuestionIndex((current) =>
                          Math.min(formState.questions.length - 1, current + 1),
                        );
                      }}
                      size='sm'
                      type='button'
                      variant='secondary'
                    >
                      아래로
                    </Button>
                    <Button
                      disabled={formState.questions.length === 1}
                      onClick={() => {
                        setFormState((current) => ({
                          ...current,
                          questions: current.questions.filter(
                            (_, index) => index !== selectedQuestionIndex,
                          ),
                        }));
                        setSelectedQuestionIndex((current) => Math.max(0, current - 1));
                      }}
                      size='sm'
                      type='button'
                      variant='danger'
                    >
                      문항 삭제
                    </Button>
                  </div>
                </div>

                <TextAreaField
                  label='문항 내용'
                  name={`problem-question-text-${String(selectedQuestionIndex)}`}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      questions: current.questions.map((item, index) =>
                        index === selectedQuestionIndex
                          ? { ...item, questionText: event.target.value }
                          : item,
                      ),
                    }));
                  }}
                  rows={3}
                  value={selectedQuestion.questionText}
                />

                <div className={styles['compactFieldRow']}>
                  <AdminDropdownField
                    compact
                    label='문항 유형'
                    onChange={(nextValue) => {
                      setFormState((current) => ({
                        ...current,
                        questions: current.questions.map((item, index) =>
                          index === selectedQuestionIndex
                            ? { ...item, questionType: nextValue as AdminProblemQuestionType }
                            : item,
                        ),
                      }));
                    }}
                    options={questionTypeOptions}
                    value={selectedQuestion.questionType}
                  />
                  <AdminDropdownField
                    compact
                    label='문제 영역'
                    onChange={(nextValue) => {
                      setFormState((current) => ({
                        ...current,
                        questions: current.questions.map((item, index) =>
                          index === selectedQuestionIndex
                            ? { ...item, problemAreaId: nextValue }
                            : item,
                        ),
                      }));
                    }}
                    options={[{ label: '영역 선택', value: '' }, ...problemAreaOptions]}
                    value={selectedQuestion.problemAreaId}
                  />
                </div>

                <div className={styles['cellStack']}>
                  <span className={styles['cellPrimary']}>문항 미디어</span>
                  <span className={styles['cellSecondary']}>
                    이미지 또는 짧은 영상을 선택하면 저장 시 S3에 업로드됩니다.
                  </span>
                  <input
                    accept='image/*,video/*'
                    hidden
                    id={`problem-question-media-${String(selectedQuestionIndex)}`}
                    name={`problem-question-media-${String(selectedQuestionIndex)}`}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;

                      if (!file) {
                        return;
                      }

                      setFormState((current) => ({
                        ...current,
                        questions: current.questions.map((item, index) =>
                          index === selectedQuestionIndex
                            ? {
                                ...item,
                                mediaAssetId: null,
                                mediaFile: file,
                                mediaPreviewUrl: URL.createObjectURL(file),
                                mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                                mediaUrl: '',
                              }
                            : item,
                        ),
                      }));
                      event.target.value = '';
                    }}
                    type='file'
                  />
                  <div className={styles['actionRow']}>
                    <Button
                      onClick={() => {
                        document
                          .getElementById(`problem-question-media-${String(selectedQuestionIndex)}`)
                          ?.click();
                      }}
                      size='sm'
                      type='button'
                      variant='secondary'
                    >
                      {selectedQuestion.mediaFile ||
                      selectedQuestion.mediaAssetId ||
                      selectedQuestion.mediaUrl
                        ? '파일 변경'
                        : '파일 선택'}
                    </Button>
                  </div>
                  <div className={styles['curriculumStatGrid']}>
                    <div className={styles['curriculumStatCard']}>
                      <span className={styles['curriculumStatLabel']}>현재 상태</span>
                      <strong className={styles['curriculumStatValue']}>
                        {selectedQuestion.mediaFile
                          ? '업로드 대기'
                          : selectedQuestion.mediaAssetId || selectedQuestion.mediaUrl
                            ? '업로드 완료'
                            : '파일 미선택'}
                      </strong>
                    </div>
                    <div className={styles['curriculumStatCard']}>
                      <span className={styles['curriculumStatLabel']}>선택 파일</span>
                      <strong className={styles['curriculumStatValue']}>
                        {selectedQuestion.mediaFile?.name ??
                          (selectedQuestion.mediaAssetId || selectedQuestion.mediaUrl
                            ? '업로드된 미디어가 연결되어 있습니다.'
                            : '아직 선택한 파일이 없습니다.')}
                      </strong>
                    </div>
                  </div>
                  {selectedQuestion.mediaType &&
                  (selectedQuestion.mediaPreviewUrl || selectedQuestion.mediaUrl)
                    ? renderQuestionMediaPreview(
                        selectedQuestion.mediaType,
                        selectedQuestion.mediaPreviewUrl || selectedQuestion.mediaUrl,
                        `${String(selectedQuestionIndex + 1)}번 문항 미디어 미리보기`,
                      )
                    : null}
                  {selectedQuestion.mediaType || selectedQuestion.mediaUrl ? (
                    <div className={styles['actionRow']}>
                      <Button
                        onClick={() => {
                          setFormState((current) => ({
                            ...current,
                            questions: current.questions.map((item, index) =>
                              index === selectedQuestionIndex
                                ? {
                                    ...item,
                                    mediaAssetId: null,
                                    mediaFile: null,
                                    mediaPreviewUrl: '',
                                    mediaType: null,
                                    mediaUrl: '',
                                  }
                                : item,
                            ),
                          }));
                        }}
                        size='sm'
                        type='button'
                        variant='secondary'
                      >
                        미디어 제거
                      </Button>
                    </div>
                  ) : null}
                </div>

                <TextAreaField
                  label='해설'
                  name={`problem-question-explanation-${String(selectedQuestionIndex)}`}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      questions: current.questions.map((item, index) =>
                        index === selectedQuestionIndex
                          ? { ...item, explanation: event.target.value }
                          : item,
                      ),
                    }));
                  }}
                  rows={3}
                  value={selectedQuestion.explanation}
                />

                <div className={styles['panel']}>
                  <div className={styles['panelToolbar']}>
                    <div>
                      <h5 className={styles['cellPrimary']}>보기</h5>
                      <p className={styles['metaText']}>정답 보기에는 체크를 남겨 주세요.</p>
                    </div>
                    <Button
                      onClick={() => {
                        setFormState((current) => ({
                          ...current,
                          questions: current.questions.map((item, index) =>
                            index === selectedQuestionIndex
                              ? { ...item, options: [...item.options, createEmptyOption(false)] }
                              : item,
                          ),
                        }));
                      }}
                      size='sm'
                      type='button'
                      variant='secondary'
                    >
                      보기 추가
                    </Button>
                  </div>

                  <div className={styles['stackListCompact']}>
                    {selectedQuestion.options.map((option, optionIndex) => (
                      <article
                        className={styles['stackItem']}
                        key={`option-${String(selectedQuestionIndex)}-${String(optionIndex)}`}
                      >
                        <div className={styles['panelToolbar']}>
                          <strong className={styles['cellPrimary']}>
                            보기 {String(optionIndex + 1)}
                          </strong>
                          <div className={styles['actionRow']}>
                            <Button
                              disabled={optionIndex === 0}
                              onClick={() => {
                                setFormState((current) => ({
                                  ...current,
                                  questions: current.questions.map((item, index) =>
                                    index === selectedQuestionIndex
                                      ? {
                                          ...item,
                                          options: moveItem(item.options, optionIndex, 'up'),
                                        }
                                      : item,
                                  ),
                                }));
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              위로
                            </Button>
                            <Button
                              disabled={optionIndex === selectedQuestion.options.length - 1}
                              onClick={() => {
                                setFormState((current) => ({
                                  ...current,
                                  questions: current.questions.map((item, index) =>
                                    index === selectedQuestionIndex
                                      ? {
                                          ...item,
                                          options: moveItem(item.options, optionIndex, 'down'),
                                        }
                                      : item,
                                  ),
                                }));
                              }}
                              size='sm'
                              type='button'
                              variant='secondary'
                            >
                              아래로
                            </Button>
                            <Button
                              disabled={selectedQuestion.options.length <= 2}
                              onClick={() => {
                                setFormState((current) => ({
                                  ...current,
                                  questions: current.questions.map((item, index) =>
                                    index === selectedQuestionIndex
                                      ? {
                                          ...item,
                                          options: item.options.filter(
                                            (_, currentOptionIndex) =>
                                              currentOptionIndex !== optionIndex,
                                          ),
                                        }
                                      : item,
                                  ),
                                }));
                              }}
                              size='sm'
                              type='button'
                              variant='danger'
                            >
                              보기 삭제
                            </Button>
                          </div>
                        </div>

                        <TextField
                          label='보기 내용'
                          name={`problem-option-text-${String(selectedQuestionIndex)}-${String(optionIndex)}`}
                          onChange={(event) => {
                            setFormState((current) => ({
                              ...current,
                              questions: current.questions.map((item, index) =>
                                index === selectedQuestionIndex
                                  ? {
                                      ...item,
                                      options: item.options.map(
                                        (currentOption, currentOptionIndex) =>
                                          currentOptionIndex === optionIndex
                                            ? { ...currentOption, optionText: event.target.value }
                                            : currentOption,
                                      ),
                                    }
                                  : item,
                              ),
                            }));
                          }}
                          value={option.optionText}
                        />

                        <label className={styles['checkboxRow']}>
                          <input
                            checked={option.correct}
                            onChange={(event) => {
                              const checked = event.target.checked;

                              setFormState((current) => ({
                                ...current,
                                questions: current.questions.map((item, index) => {
                                  if (index !== selectedQuestionIndex) {
                                    return item;
                                  }

                                  return {
                                    ...item,
                                    options: item.options.map(
                                      (currentOption, currentOptionIndex) => {
                                        if (item.questionType !== 'MULTIPLE' && checked) {
                                          return {
                                            ...currentOption,
                                            correct: currentOptionIndex === optionIndex,
                                          };
                                        }

                                        return currentOptionIndex === optionIndex
                                          ? { ...currentOption, correct: checked }
                                          : currentOption;
                                      },
                                    ),
                                  };
                                }),
                              }));
                            }}
                            type='checkbox'
                          />
                          정답 보기
                        </label>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles['helperText']}>편집할 문항을 선택해 주세요.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const AdminProgramProblemsSection = ({ enabled, programId }: AdminProgramProblemsSectionProps) => {
  const curriculumQuery = useAdminCurriculumQuery(programId, enabled);
  const summariesQuery = useAdminProblemLectureSummariesQuery(programId, enabled);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<ProblemLectureFilter>('all');
  const [activeTab, setActiveTab] = useState<ProblemWorkspaceTab>('editor');
  const [attemptsLectureId, setAttemptsLectureId] = useState<number | null>(null);

  const summariesByLectureId = useMemo(() => {
    return new Map(
      (summariesQuery.data ?? []).map((summary) => [summary.lectureId, summary] as const),
    );
  }, [summariesQuery.data]);

  const lectures = useMemo<LectureProblemListItem[]>(() => {
    const sections = curriculumQuery.data ?? [];

    return sections.flatMap((section) =>
      section.lectures.map((lecture) => {
        const summary = summariesByLectureId.get(lecture.id);
        return {
          ...lecture,
          attemptCount: summary?.attemptCount ?? 0,
          averageScore: summary?.averageScore ?? null,
          hasProblem: summary?.hasProblem ?? false,
          lastSubmittedAt: summary?.lastSubmittedAt ?? null,
          lastUpdatedAt: summary?.lastUpdatedAt ?? null,
          questionCount: summary?.questionCount ?? 0,
          problemId: summary?.problemId ?? null,
          sectionTitle: section.title,
        };
      }),
    );
  }, [curriculumQuery.data, summariesByLectureId]);

  const visibleLectures = useMemo(() => {
    return lectures.filter((lecture) => {
      switch (filter) {
        case 'withProblem':
          return lecture.hasProblem;
        case 'withoutProblem':
          return !lecture.hasProblem;
        case 'attempted':
          return lecture.attemptCount > 0;
        default:
          return true;
      }
    });
  }, [filter, lectures]);

  const requestedLectureParam = searchParams.get('lectureId');
  const requestedLectureId = requestedLectureParam === null ? null : Number(requestedLectureParam);
  const selectedLectureId =
    requestedLectureId !== null &&
    visibleLectures.some((lecture) => lecture.id === requestedLectureId)
      ? requestedLectureId
      : (visibleLectures[0]?.id ?? null);
  const selectedLecture =
    visibleLectures.find((lecture) => lecture.id === selectedLectureId) ?? null;
  const visibleActiveTab =
    activeTab === 'attempts' && attemptsLectureId === selectedLectureId ? 'attempts' : 'editor';
  const problemQuery = useAdminProblemQuery(
    selectedLectureId,
    enabled && visibleActiveTab === 'editor',
  );

  useEffect(() => {
    if (!visibleLectures.length) {
      return;
    }

    if (requestedLectureId !== selectedLectureId) {
      setSearchParams({ lectureId: String(selectedLectureId) }, { replace: true });
    }
  }, [requestedLectureId, selectedLectureId, setSearchParams, visibleLectures.length]);

  if (!enabled || programId === null) {
    return (
      <p className={styles['helperText']}>문제는 프로그램을 먼저 저장한 뒤 관리할 수 있습니다.</p>
    );
  }

  if (curriculumQuery.isPending || summariesQuery.isPending) {
    return <p className={styles['helperText']}>문제 관리 화면을 준비하는 중입니다.</p>;
  }

  if (curriculumQuery.isError) {
    return (
      <p className={styles['helperText']}>
        {curriculumQuery.error instanceof Error
          ? curriculumQuery.error.message
          : '강의 목록을 불러오지 못했습니다.'}
      </p>
    );
  }

  if (summariesQuery.isError) {
    return (
      <p className={styles['helperText']}>
        {summariesQuery.error instanceof Error
          ? summariesQuery.error.message
          : '문제 현황을 불러오지 못했습니다.'}
      </p>
    );
  }

  if (!lectures.length) {
    return <p className={styles['helperText']}>먼저 강의 구성에서 강의를 추가해 주세요.</p>;
  }

  return (
    <div className={styles['stackList']}>
      <section className={styles['panel']}>
        <div className={styles['panelToolbar']}>
          <div>
            <h2 className={styles['panelTitle']}>강의별 문제 현황</h2>
            <p className={styles['metaText']}>
              프로그램 안의 강의를 한 번에 보고, 필요한 강의만 아래에서 상세 관리합니다.
            </p>
          </div>
        </div>

        <div className={styles['quizFilterRow']}>
          {lectureFilterOptions.map((option) => (
            <button
              className={styles['quizFilterButton']}
              data-selected={filter === option.value}
              key={option.value}
              onClick={() => {
                setFilter(option.value);
                setActiveTab('editor');
                setAttemptsLectureId(null);
              }}
              type='button'
            >
              {option.label}
            </button>
          ))}
        </div>

        {visibleLectures.length ? (
          <div className={styles['searchResultList']}>
            {visibleLectures.map((lecture) => {
              const isSelected = lecture.id === selectedLectureId;

              return (
                <button
                  className={`${styles['searchResultCard']} ${styles['quizLectureCard']}`}
                  data-selected={isSelected}
                  key={lecture.id}
                  onClick={() => {
                    setActiveTab('editor');
                    setAttemptsLectureId(null);
                    setSearchParams({ lectureId: String(lecture.id) }, { replace: true });
                  }}
                  type='button'
                >
                  <div className={styles['quizLectureMain']}>
                    <div className={styles['searchResultHeader']}>
                      <strong className={styles['cellPrimary']}>{lecture.title}</strong>
                      <span className={styles['cellSecondary']}>{lecture.sectionTitle}</span>
                    </div>
                    <div className={styles['metaRow']}>
                      {lecture.hasProblem ? (
                        <span className={styles['badgeSuccess']}>문제 있음</span>
                      ) : (
                        <span className={styles['badge']}>문제 없음</span>
                      )}
                      {lecture.attemptCount > 0 ? (
                        <span className={styles['badgeAccent']}>
                          응시 {String(lecture.attemptCount)}건
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles['quizLectureStats']}>
                    <span className={styles['quizLectureStat']}>
                      문항 {String(lecture.questionCount)}개
                    </span>
                    <span className={styles['quizLectureStat']}>
                      평균 {formatAverageScore(lecture.averageScore)}
                    </span>
                    <span className={styles['quizLectureStat']}>
                      {lecture.videoId === null ? '영상 미연결' : '영상 연결됨'}
                    </span>
                    <span className={styles['quizLectureStat']}>
                      최근 제출 {formatDateTime(lecture.lastSubmittedAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className={styles['helperText']}>조건에 맞는 강의가 없습니다.</p>
        )}
      </section>

      <section className={styles['panel']}>
        <div className={styles['panelToolbar']}>
          <div className={styles['quizDetailHeader']}>
            <h2 className={styles['panelTitle']}>상세 관리</h2>
            {selectedLecture ? (
              <div className={styles['quizDetailSelection']}>
                <span className={styles['cellSecondary']}>-</span>
                <strong className={styles['cellPrimary']}>{selectedLecture.title}</strong>
                <span className={styles['cellSecondary']}>{selectedLecture.sectionTitle}</span>
              </div>
            ) : null}
          </div>
          {selectedLecture ? (
            <div className={styles['metaRow']}>
              {selectedLecture.published ? (
                <span className={styles['badgeSuccess']}>공개중</span>
              ) : (
                <span className={styles['badge']}>비공개</span>
              )}
              {selectedLecture.hasProblem ? (
                <span className={styles['badgeAccent']}>운영중</span>
              ) : (
                <span className={styles['badge']}>미구성</span>
              )}
            </div>
          ) : null}
        </div>

        {selectedLecture ? (
          <>
            <SectionTabs
              ariaLabel='문제 관리 작업'
              items={[
                { label: '문항 편집', value: 'editor' },
                { label: '응시 결과', value: 'attempts' },
              ]}
              onChange={(nextTab) => {
                if (nextTab === 'editor') {
                  setActiveTab('editor');
                  setAttemptsLectureId(null);
                  return;
                }

                setAttemptsLectureId(selectedLecture.id);
                setActiveTab('attempts');
              }}
              value={visibleActiveTab}
            />

            <div className={styles['editorTabBody']}>
              {visibleActiveTab === 'editor' ? (
                problemQuery.isPending ? (
                  <p className={styles['helperText']}>문제를 불러오는 중입니다.</p>
                ) : problemQuery.isError ? (
                  <p className={styles['helperText']}>
                    {problemQuery.error instanceof Error
                      ? problemQuery.error.message
                      : '문제를 불러오지 못했습니다.'}
                  </p>
                ) : (
                  <ProblemEditor
                    lectureId={selectedLecture.id}
                    lectureTitle={selectedLecture.title}
                    programId={programId}
                    problem={problemQuery.data ?? null}
                  />
                )
              ) : null}

              {visibleActiveTab === 'attempts' ? (
                <ProblemAttemptsPanel problemId={selectedLecture.problemId} />
              ) : null}
            </div>
          </>
        ) : (
          <p className={styles['helperText']}>강의를 선택해 주세요.</p>
        )}
      </section>
    </div>
  );
};

export default AdminProgramProblemsSection;
