import { Fragment, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createAdminQuestionReply, deleteAdminQuestionReply } from '@/api/qna';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import Pagination from '@/components/ui/Pagination/Pagination';
import SectionTabs from '@/components/ui/SectionTabs/SectionTabs';
import { TextAreaField } from '@/components/ui/TextField/TextField';
import { adminQuestionsQueryKey, useAdminQuestionsQuery } from '@/query/useQnaQueries';
import { useToastStore } from '@/stores/useToastStore';
import type { QuestionReplyItem, QuestionScope } from '@/types/qna';

import styles from './AdminConsolePage.module.scss';

type ScopeFilterValue = 'ALL' | QuestionScope;
type AnsweredFilterValue = 'ALL' | 'ANSWERED' | 'WAITING';

const QNA_SCOPE_LABELS: Record<QuestionScope, string> = {
  GLOBAL: '운영 Q&A',
  PROGRAM: '프로그램 Q&A',
};

const ANSWERED_FILTER_OPTIONS: Array<{ label: string; value: AnsweredFilterValue }> = [
  { label: '전체', value: 'ALL' },
  { label: '답변 대기', value: 'WAITING' },
  { label: '답변 완료', value: 'ANSWERED' },
];

const SCOPE_FILTER_OPTIONS: Array<{ label: string; value: ScopeFilterValue }> = [
  { label: '전체', value: 'ALL' },
  { label: '운영', value: 'GLOBAL' },
  { label: '프로그램', value: 'PROGRAM' },
];

const QNA_PAGE_SIZE = 6;

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));
};

const AdminQnaSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilterValue>('ALL');
  const [answeredFilter, setAnsweredFilter] = useState<AnsweredFilterValue>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const allQuestionsQuery = useAdminQuestionsQuery();
  const questionsQuery = useAdminQuestionsQuery({
    answered: answeredFilter === 'ANSWERED' ? true : answeredFilter === 'WAITING' ? false : null,
    keyword,
    scope: scopeFilter,
  });
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const totalPages = Math.max(1, Math.ceil(questions.length / QNA_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuestions = useMemo(() => {
    return questions.slice((currentPage - 1) * QNA_PAGE_SIZE, currentPage * QNA_PAGE_SIZE);
  }, [currentPage, questions]);
  const allQuestions = useMemo(() => allQuestionsQuery.data ?? [], [allQuestionsQuery.data]);
  const pendingCount = useMemo(() => {
    return allQuestions.filter((question) => !question.answered).length;
  }, [allQuestions]);
  const answeredCount = useMemo(() => {
    return allQuestions.filter((question) => question.answered).length;
  }, [allQuestions]);
  const globalCount = useMemo(() => {
    return allQuestions.filter((question) => question.scope === 'GLOBAL').length;
  }, [allQuestions]);
  const programCount = useMemo(() => {
    return allQuestions.filter((question) => question.scope === 'PROGRAM').length;
  }, [allQuestions]);

  const scopeFilterOptions = useMemo(
    () =>
      SCOPE_FILTER_OPTIONS.map((option) => ({
        ...option,
        count:
          option.value === 'ALL'
            ? undefined
            : option.value === 'GLOBAL'
              ? globalCount
              : programCount,
      })),
    [globalCount, programCount],
  );

  const answeredFilterOptions = useMemo(
    () =>
      ANSWERED_FILTER_OPTIONS.map((option) => ({
        ...option,
        count:
          option.value === 'ALL'
            ? undefined
            : option.value === 'WAITING'
              ? pendingCount
              : answeredCount,
      })),
    [answeredCount, pendingCount],
  );

  const replyMutation = useMutation({
    mutationFn: async ({
      content,
      questionId,
      replaceReplyId,
    }: {
      content: string;
      questionId: number;
      replaceReplyId?: number | undefined;
    }) => {
      if (typeof replaceReplyId === 'number') {
        await deleteAdminQuestionReply(replaceReplyId);
      }

      return await createAdminQuestionReply(questionId, { content });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '답변 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setReplyContent('');
      setEditingReplyId(null);
      await queryClient.invalidateQueries({
        queryKey: adminQuestionsQueryKey(),
      });
      showToast({
        message: '답변을 저장했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: number) => deleteAdminQuestionReply(replyId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '답변 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQuestionsQueryKey(),
      });
      showToast({
        message: '답변을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const handleSubmitReply = (questionId: number) => {
    const trimmed = replyContent.trim();

    if (!trimmed) {
      showToast({
        message: '답변 내용을 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    const question = questions.find((item) => item.id === questionId);
    const existingReplyId = question?.replies[0]?.id ?? null;

    void replyMutation.mutateAsync({
      content: trimmed,
      questionId,
      replaceReplyId: editingReplyId ?? existingReplyId ?? undefined,
    });
  };

  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestionId((current) => (current === questionId ? null : questionId));
    setReplyContent('');
    setEditingReplyId(null);
  };

  const handleStartEditReply = (reply: QuestionReplyItem) => {
    setEditingReplyId(reply.id);
    setReplyContent(reply.content);
  };

  const buildQuestionLocationLabel = (scope: QuestionScope, programTitle: string | null) => {
    if (scope === 'PROGRAM') {
      return programTitle
        ? `${QNA_SCOPE_LABELS[scope]} · ${programTitle}`
        : QNA_SCOPE_LABELS[scope];
    }

    return QNA_SCOPE_LABELS[scope];
  };

  return (
    <div className={styles['workspace']}>
      <div className={styles['qnaFilterPanel']}>
        <div className={styles['qnaTabStack']}>
          <SectionTabs
            ariaLabel='Q&A 유형'
            items={scopeFilterOptions}
            onChange={(nextValue) => {
              setScopeFilter(nextValue);
              setSelectedQuestionId(null);
              setEditingReplyId(null);
              setReplyContent('');
              setPage(1);
            }}
            value={scopeFilter}
          />
          <SectionTabs
            ariaLabel='답변 상태'
            items={answeredFilterOptions}
            onChange={(nextValue) => {
              setAnsweredFilter(nextValue);
              setSelectedQuestionId(null);
              setEditingReplyId(null);
              setReplyContent('');
              setPage(1);
            }}
            value={answeredFilter}
          />
        </div>
        <UnifiedSearchBar
          className={styles['adminSearchBarWide']}
          inputAriaLabel='Q&A 검색'
          onChange={(nextValue) => {
            setKeyword(nextValue);
            setSelectedQuestionId(null);
            setEditingReplyId(null);
            setReplyContent('');
            setPage(1);
          }}
          onSubmit={() => undefined}
          placeholder='제목, 내용, 작성자, 프로그램명 검색'
          value={keyword}
        />
      </div>

      {questionsQuery.isLoading ? <p>Q&A를 불러오는 중입니다.</p> : null}
      {questionsQuery.isError ? <p>Q&A 목록을 불러오지 못했습니다.</p> : null}

      {!questionsQuery.isLoading && !questionsQuery.isError ? (
        <div className={styles['qnaWorkspace']}>
          <section className={styles['qnaListPanel']}>
            <div className={styles['qnaTableWrap']}>
              <table className={styles['qnaTable']}>
                <colgroup>
                  <col className={styles['qnaStatusCol']} />
                  <col />
                  <col className={styles['qnaAuthorCol']} />
                  <col className={styles['qnaDateCol']} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope='col'>상태</th>
                    <th scope='col'>질문</th>
                    <th scope='col'>작성자</th>
                    <th scope='col'>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuestions.length ? (
                    paginatedQuestions.map((question) => {
                      const isActive = question.id === selectedQuestionId;
                      const primaryReply = question.replies.at(0) ?? null;
                      const hasPrimaryReply = primaryReply !== null;

                      return (
                        <Fragment key={question.id}>
                          <tr className={styles['qnaTableRow']} data-active={isActive}>
                            <td>
                              <span
                                className={styles['qnaStatusBadge']}
                                data-tone={question.answered ? 'answered' : 'waiting'}
                              >
                                {question.answered ? '답변 완료' : '답변 대기'}
                              </span>
                            </td>
                            <td className={styles['qnaTableTitleCell']}>
                              <button
                                className={styles['qnaTableTitleButton']}
                                onClick={() => {
                                  handleToggleQuestion(question.id);
                                }}
                                type='button'
                              >
                                <span className={styles['qnaTableTitle']}>{question.title}</span>
                                <span className={styles['qnaTableMeta']}>
                                  {buildQuestionLocationLabel(
                                    question.scope,
                                    question.programTitle,
                                  )}
                                  {' · 답변 '}
                                  {hasPrimaryReply ? '1개' : '0개'}
                                </span>
                              </button>
                            </td>
                            <td>{question.authorName}</td>
                            <td>{formatDateTime(question.createdAt)}</td>
                          </tr>

                          {isActive ? (
                            <tr className={styles['qnaInlineDetailRow']}>
                              <td colSpan={4}>
                                <div className={styles['qnaInlineDetail']}>
                                  <section className={styles['qnaInlineQuestion']}>
                                    <div className={styles['qnaSectionHeader']}>
                                      <h3 className={styles['qnaQuestionTitle']}>
                                        {question.title}
                                      </h3>
                                      <p className={styles['qnaPanelMeta']}>
                                        {question.authorName} · {formatDateTime(question.createdAt)}
                                      </p>
                                    </div>
                                    <p className={styles['qnaQuestionContent']}>
                                      {question.content}
                                    </p>
                                  </section>

                                  <section className={styles['qnaInlineReplies']}>
                                    <div className={styles['qnaSectionHeader']}>
                                      <h3 className={styles['qnaReplySectionTitle']}>답변</h3>
                                      {editingReplyId !== null ? (
                                        <button
                                          className={styles['qnaTextButton']}
                                          onClick={() => {
                                            setEditingReplyId(null);
                                            setReplyContent('');
                                          }}
                                          type='button'
                                        >
                                          수정 취소
                                        </button>
                                      ) : null}
                                    </div>

                                    {primaryReply !== null ? (
                                      <div className={styles['qnaReplyList']}>
                                        <article
                                          className={styles['qnaReplyCard']}
                                          key={primaryReply.id}
                                        >
                                          <div className={styles['qnaReplyCardHeader']}>
                                            <div className={styles['qnaReplyMetaStack']}>
                                              <strong>{primaryReply.authorName}</strong>
                                              <span>{formatDateTime(primaryReply.createdAt)}</span>
                                            </div>
                                            <div className={styles['qnaReplyActions']}>
                                              <button
                                                className={styles['tableActionButton']}
                                                disabled={replyMutation.isPending}
                                                onClick={() => {
                                                  handleStartEditReply(primaryReply);
                                                }}
                                                type='button'
                                              >
                                                답변 수정
                                              </button>
                                              <button
                                                className={styles['tableActionButtonDanger']}
                                                disabled={deleteReplyMutation.isPending}
                                                onClick={() => {
                                                  deleteReplyMutation.mutate(primaryReply.id);
                                                }}
                                                type='button'
                                              >
                                                삭제
                                              </button>
                                            </div>
                                          </div>
                                          <p className={styles['qnaReplyCardContent']}>
                                            {primaryReply.content}
                                          </p>
                                        </article>
                                      </div>
                                    ) : (
                                      <p className={styles['qnaEmptyState']}>
                                        아직 등록된 답변이 없습니다.
                                      </p>
                                    )}

                                    <div className={styles['qnaReplyComposerInline']}>
                                      <TextAreaField
                                        label={
                                          editingReplyId === null && !hasPrimaryReply
                                            ? '답변 달기'
                                            : '답변 수정'
                                        }
                                        name={`admin-qna-reply-${String(question.id)}`}
                                        onChange={(event) => {
                                          setReplyContent(event.target.value);
                                        }}
                                        placeholder='답변을 입력해 주세요.'
                                        rows={3}
                                        value={replyContent}
                                      />
                                      <div className={styles['qnaActionRow']}>
                                        <Button
                                          disabled={replyMutation.isPending}
                                          onClick={() => {
                                            handleSubmitReply(question.id);
                                          }}
                                          type='button'
                                        >
                                          {replyMutation.isPending
                                            ? '저장 중...'
                                            : editingReplyId === null && !hasPrimaryReply
                                              ? '답변 등록'
                                              : '답변 수정'}
                                        </Button>
                                      </div>
                                    </div>
                                  </section>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['qnaEmptyTableCell']} colSpan={4}>
                        조건에 맞는 질문이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles['qnaPagination']}>
              <Pagination
                ariaLabel='문의 답변 페이지 이동'
                currentPage={currentPage}
                onChange={(nextPage) => {
                  setPage(nextPage);
                  setSelectedQuestionId(null);
                  setEditingReplyId(null);
                  setReplyContent('');
                }}
                totalPages={totalPages}
              />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default AdminQnaSection;
