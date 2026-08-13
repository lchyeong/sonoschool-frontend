import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminQuestionReply,
  deleteAdminQuestion,
  deleteAdminQuestionReply,
  reorderAdminQuestionNotices,
  updateAdminQuestion,
  updateAdminQuestionReply,
} from '@/api/qna';
import Pagination from '@/components/ui/Pagination/Pagination';
import { adminQuestionsQueryKey, useAdminQuestionsQuery } from '@/query/useQnaQueries';
import { useToastStore } from '@/stores/useToastStore';
import type { QuestionItem } from '@/types/qna';
import { validateQnaQuestionDraft } from '@/utils/qna';

import styles from './AdminConsolePage.module.scss';
import AdminQnaFilterPanel from './AdminQnaFilterPanel';
import AdminQnaTable from './AdminQnaTable';
import {
  ANSWERED_FILTER_OPTIONS,
  QNA_PAGE_SIZE,
  SCOPE_FILTER_OPTIONS,
  paginateQuestions,
  sortNoticeQuestions,
  summarizeQna,
  type AnsweredFilterValue,
  type ScopeFilterValue,
} from './adminQnaUtils';

const AdminQnaSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilterValue>('ALL');
  const [answeredFilter, setAnsweredFilter] = useState<AnsweredFilterValue>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [questionPrivateQuestion, setQuestionPrivateQuestion] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const allQuestionsQuery = useAdminQuestionsQuery();
  const questionsQuery = useAdminQuestionsQuery({
    answered: answeredFilter === 'ANSWERED' ? true : answeredFilter === 'WAITING' ? false : null,
    keyword,
    scope: scopeFilter,
  });

  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const allQuestions = useMemo(() => allQuestionsQuery.data ?? [], [allQuestionsQuery.data]);
  const noticeQuestions = useMemo(() => {
    return sortNoticeQuestions(allQuestions.filter((question) => question.notice));
  }, [allQuestions]);
  const qnaSummary = useMemo(() => summarizeQna(allQuestions), [allQuestions]);
  const totalPages = Math.max(1, Math.ceil(questions.length / QNA_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuestions = useMemo(() => {
    return paginateQuestions(questions, currentPage);
  }, [currentPage, questions]);

  const resetSelection = () => {
    setEditingQuestionId(null);
    setQuestionTitle('');
    setQuestionContent('');
    setQuestionPrivateQuestion(false);
    setSelectedQuestionId(null);
    setReplyContent('');
  };

  const refreshAdminQuestions = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminQuestionsQueryKey(),
      refetchType: 'active',
    });
  };

  const scopeFilterOptions = useMemo(
    () =>
      SCOPE_FILTER_OPTIONS.map((option) => {
        if (option.value === 'ALL') {
          return option;
        }

        return {
          ...option,
          count: option.value === 'GLOBAL' ? qnaSummary.globalCount : qnaSummary.programCount,
        };
      }),
    [qnaSummary.globalCount, qnaSummary.programCount],
  );

  const answeredFilterOptions = useMemo(
    () =>
      ANSWERED_FILTER_OPTIONS.map((option) => {
        if (option.value === 'ALL') {
          return option;
        }

        return {
          ...option,
          count: option.value === 'WAITING' ? qnaSummary.pendingCount : qnaSummary.answeredCount,
        };
      }),
    [qnaSummary.answeredCount, qnaSummary.pendingCount],
  );

  const replyMutation = useMutation({
    mutationFn: async ({
      content,
      questionId,
      replyId,
    }: {
      content: string;
      questionId: number;
      replyId?: number | undefined;
    }) => {
      if (typeof replyId === 'number') {
        return await updateAdminQuestionReply(replyId, { content });
      }

      return await createAdminQuestionReply(questionId, { content });
    },
    onError: (error: unknown, variables) => {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : typeof variables.replyId === 'number'
              ? '답변 수정에 실패했습니다.'
              : '답변 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (reply, variables) => {
      setReplyContent(reply.content);
      await refreshAdminQuestions();
      showToast({
        message:
          typeof variables.replyId === 'number' ? '답변을 수정했습니다.' : '답변을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({
      content,
      privateQuestion,
      questionId,
      title,
    }: {
      content: string;
      privateQuestion: boolean;
      questionId: number;
      title: string;
    }) =>
      updateAdminQuestion(questionId, {
        content,
        privateQuestion,
        title,
      }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '질문 수정에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setEditingQuestionId(null);
      setQuestionTitle('');
      setQuestionContent('');
      setQuestionPrivateQuestion(false);
      await refreshAdminQuestions();
      showToast({
        message: '질문을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: number) => deleteAdminQuestion(questionId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '질문 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, questionId) => {
      setSelectedQuestionId((current) => (current === questionId ? null : current));
      setEditingQuestionId((current) => (current === questionId ? null : current));
      setQuestionTitle('');
      setQuestionContent('');
      setQuestionPrivateQuestion(false);
      await refreshAdminQuestions();
      showToast({
        message: '질문을 삭제했습니다.',
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
      setReplyContent('');
      await refreshAdminQuestions();
      showToast({
        message: '답변을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const reorderNoticeMutation = useMutation({
    mutationFn: ({ direction, questionId }: { direction: 'down' | 'up'; questionId: number }) => {
      const currentIndex = noticeQuestions.findIndex((question) => question.id === questionId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= noticeQuestions.length) {
        return Promise.resolve();
      }

      const nextQuestions = [...noticeQuestions];
      const [movedQuestion] = nextQuestions.splice(currentIndex, 1);

      nextQuestions.splice(targetIndex, 0, movedQuestion);

      return reorderAdminQuestionNotices(
        nextQuestions.map((question, index) => ({
          id: question.id,
          sortOrder: index,
        })),
      );
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지 순서를 변경하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQuestionsQueryKey(),
      });
      showToast({
        message: '공지 순서를 변경했습니다.',
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
    const primaryReply = question?.replies.at(0) ?? null;

    void replyMutation.mutateAsync({
      content: trimmed,
      questionId,
      replyId: primaryReply?.id ?? undefined,
    });
  };

  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestionId((current) => (current === questionId ? null : questionId));
    setEditingQuestionId(null);
    setQuestionTitle('');
    setQuestionContent('');
    setQuestionPrivateQuestion(false);
    const question = questions.find((item) => item.id === questionId);
    setReplyContent(question?.replies.at(0)?.content ?? '');
  };

  const handleStartEditQuestion = (question: QuestionItem) => {
    setEditingQuestionId(question.id);
    setQuestionTitle(question.title);
    setQuestionContent(question.content);
    setQuestionPrivateQuestion(question.privateQuestion);
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setQuestionTitle('');
    setQuestionContent('');
    setQuestionPrivateQuestion(false);
  };

  const handleSubmitQuestion = (questionId: number) => {
    const title = questionTitle.trim();
    const content = questionContent.trim();
    const validationError = validateQnaQuestionDraft(title, content);

    if (validationError) {
      showToast({
        message: validationError,
        variant: 'error',
      });
      return;
    }

    void updateQuestionMutation.mutateAsync({
      content,
      privateQuestion: questionPrivateQuestion,
      questionId,
      title,
    });
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (!window.confirm('이 질문을 삭제하시겠습니까?')) {
      return;
    }

    void deleteQuestionMutation.mutateAsync(questionId);
  };

  return (
    <div className={styles['workspace']}>
      <AdminQnaFilterPanel
        answeredFilter={answeredFilter}
        answeredFilterOptions={answeredFilterOptions}
        keyword={keyword}
        onAnsweredFilterChange={(nextValue) => {
          setAnsweredFilter(nextValue);
          resetSelection();
          setPage(1);
        }}
        onKeywordChange={(nextValue) => {
          setKeyword(nextValue);
          resetSelection();
          setPage(1);
        }}
        onScopeFilterChange={(nextValue) => {
          setScopeFilter(nextValue);
          resetSelection();
          setPage(1);
        }}
        scopeFilter={scopeFilter}
        scopeFilterOptions={scopeFilterOptions}
      />

      {questionsQuery.isLoading ? <p>Q&A를 불러오는 중입니다.</p> : null}
      {questionsQuery.isError ? <p>Q&A 목록을 불러오지 못했습니다.</p> : null}

      {!questionsQuery.isLoading && !questionsQuery.isError ? (
        <div className={styles['qnaWorkspace']}>
          <section className={styles['qnaListPanel']}>
            <AdminQnaTable
              editingQuestionId={editingQuestionId}
              isDeletingQuestion={deleteQuestionMutation.isPending}
              isDeletingReply={deleteReplyMutation.isPending}
              isReorderingNotice={reorderNoticeMutation.isPending}
              isSavingQuestion={updateQuestionMutation.isPending}
              isSavingReply={replyMutation.isPending}
              noticeQuestions={noticeQuestions}
              onCancelEditQuestion={handleCancelEditQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onDeleteReply={(replyId) => {
                deleteReplyMutation.mutate(replyId);
              }}
              onQuestionContentChange={setQuestionContent}
              onQuestionPrivateQuestionChange={setQuestionPrivateQuestion}
              onQuestionTitleChange={setQuestionTitle}
              onReplyContentChange={setReplyContent}
              onReorderNotice={(questionId, direction) => {
                reorderNoticeMutation.mutate({ direction, questionId });
              }}
              onStartEditQuestion={handleStartEditQuestion}
              onSubmitQuestion={handleSubmitQuestion}
              onSubmitReply={handleSubmitReply}
              onToggleQuestion={handleToggleQuestion}
              questions={paginatedQuestions}
              questionContent={questionContent}
              questionPrivateQuestion={questionPrivateQuestion}
              questionTitle={questionTitle}
              replyContent={replyContent}
              selectedQuestionId={selectedQuestionId}
            />

            <div className={styles['qnaPagination']}>
              <Pagination
                ariaLabel='문의 답변 페이지 이동'
                currentPage={currentPage}
                onChange={(nextPage) => {
                  setPage(nextPage);
                  resetSelection();
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
