import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createAdminQuestionReply, deleteAdminQuestionReply } from '@/api/qna';
import Button from '@/components/ui/Button/Button';
import { TextAreaField } from '@/components/ui/TextField/TextField';
import { adminQuestionsQueryKey, useAdminQuestionsQuery } from '@/query/useQnaQueries';
import { useToastStore } from '@/stores/useToastStore';

import styles from './AdminConsolePage.module.scss';

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const AdminQnaSection = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const questionsQuery = useAdminQuestionsQuery();
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const resolvedSelectedQuestionId = useMemo(() => {
    if (
      selectedQuestionId !== null &&
      questions.some((question) => question.id === selectedQuestionId)
    ) {
      return selectedQuestionId;
    }

    return questions[0]?.id ?? null;
  }, [questions, selectedQuestionId]);
  const selectedQuestion =
    questions.find((question) => question.id === resolvedSelectedQuestionId) ?? null;

  const pendingCount = useMemo(() => {
    return questions.filter((question) => !question.answered).length;
  }, [questions]);

  const replyMutation = useMutation({
    mutationFn: ({ content, questionId }: { questionId: number; content: string }) => {
      return createAdminQuestionReply(questionId, { content });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '답변 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setReplyContent('');
      await queryClient.invalidateQueries({ queryKey: adminQuestionsQueryKey() });
      showToast({
        message: '답변을 등록했습니다.',
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
      await queryClient.invalidateQueries({ queryKey: adminQuestionsQueryKey() });
      showToast({
        message: '답변을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const handleSubmitReply = () => {
    if (!selectedQuestion) {
      return;
    }

    const trimmed = replyContent.trim();

    if (!trimmed) {
      showToast({
        message: '답변 내용을 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    void replyMutation.mutateAsync({
      content: trimmed,
      questionId: selectedQuestion.id,
    });
  };

  const handleSelectQuestion = (questionId: number) => {
    setSelectedQuestionId(questionId);
    setReplyContent('');
  };

  return (
    <div className={styles['workspace']}>
      <section className={styles['hero']}>
        <div className={styles['heroCopy']}>
          <h1 className={styles['title']}>문의 답변 관리</h1>
          <p className={styles['description']}>
            운영 Q&A와 과정 Q&A를 한 화면에서 확인하고, 답변 대기 질문부터 처리합니다.
          </p>
        </div>
        <div className={styles['heroActionGroup']}>
          <span className={styles['sessionPill']}>답변 대기 {String(pendingCount)}건</span>
        </div>
      </section>

      {questionsQuery.isLoading ? <p>Q&A를 불러오는 중입니다.</p> : null}
      {questionsQuery.isError ? <p>Q&A 목록을 불러오지 못했습니다.</p> : null}

      {!questionsQuery.isLoading && !questionsQuery.isError ? (
        <div className={styles['qnaWorkspace']}>
          <section className={styles['qnaListPanel']}>
            <header className={styles['qnaPanelHeader']}>
              <h2 className={styles['qnaPanelTitle']}>전체 질문</h2>
              <p className={styles['qnaPanelMeta']}>운영/과정 질문 통합 목록</p>
            </header>

            <div className={styles['qnaList']}>
              {questions.map((question) => {
                const isActive = question.id === selectedQuestion?.id;

                return (
                  <button
                    className={styles['qnaListItem']}
                    data-active={isActive}
                    key={question.id}
                    onClick={() => {
                      handleSelectQuestion(question.id);
                    }}
                    type='button'
                  >
                    <div className={styles['qnaListItemHeader']}>
                      <span className={styles['qnaScopeBadge']}>
                        {question.scope === 'GLOBAL' ? '운영 Q&A' : '과정 Q&A'}
                      </span>
                      <span
                        className={styles['qnaStatusBadge']}
                        data-tone={question.answered ? 'answered' : 'waiting'}
                      >
                        {question.answered ? '답변 완료' : '답변 대기'}
                      </span>
                    </div>
                    <strong className={styles['qnaListItemTitle']}>{question.title}</strong>
                    <p className={styles['qnaListItemMeta']}>
                      {question.authorName}
                      {question.programTitle ? ` · ${question.programTitle}` : ''}
                      {' · '}
                      {formatDateTime(question.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles['qnaDetailPanel']}>
            {selectedQuestion ? (
              <>
                <header className={styles['qnaPanelHeader']}>
                  <div className={styles['qnaDetailHeader']}>
                    <span className={styles['qnaScopeBadge']}>
                      {selectedQuestion.scope === 'GLOBAL' ? '운영 Q&A' : '과정 Q&A'}
                    </span>
                    <span
                      className={styles['qnaStatusBadge']}
                      data-tone={selectedQuestion.answered ? 'answered' : 'waiting'}
                    >
                      {selectedQuestion.answered ? '답변 완료' : '답변 대기'}
                    </span>
                  </div>
                  <h2 className={styles['qnaPanelTitle']}>{selectedQuestion.title}</h2>
                  <p className={styles['qnaPanelMeta']}>
                    {selectedQuestion.authorName}
                    {selectedQuestion.programTitle ? ` · ${selectedQuestion.programTitle}` : ''}
                    {' · '}
                    {formatDateTime(selectedQuestion.createdAt)}
                  </p>
                </header>

                <div className={styles['qnaBody']}>
                  <article className={styles['qnaQuestionCard']}>
                    <p className={styles['qnaQuestionLabel']}>질문 내용</p>
                    <p className={styles['qnaQuestionContent']}>{selectedQuestion.content}</p>
                  </article>

                  <section className={styles['qnaReplySection']}>
                    <h3 className={styles['qnaReplySectionTitle']}>등록된 답변</h3>
                    <div className={styles['qnaReplyList']}>
                      {selectedQuestion.replies.length ? (
                        selectedQuestion.replies.map((reply) => {
                          return (
                            <article className={styles['qnaReplyCard']} key={reply.id}>
                              <div className={styles['qnaReplyCardHeader']}>
                                <div className={styles['qnaReplyMetaStack']}>
                                  <strong>{reply.authorName}</strong>
                                  <span>{formatDateTime(reply.createdAt)}</span>
                                </div>
                                <button
                                  className={styles['tableActionButtonDanger']}
                                  disabled={deleteReplyMutation.isPending}
                                  onClick={() => {
                                    deleteReplyMutation.mutate(reply.id);
                                  }}
                                  type='button'
                                >
                                  삭제
                                </button>
                              </div>
                              <p className={styles['qnaReplyCardContent']}>{reply.content}</p>
                            </article>
                          );
                        })
                      ) : (
                        <p className={styles['qnaEmptyState']}>아직 등록된 답변이 없습니다.</p>
                      )}
                    </div>
                  </section>

                  <div className={styles['formShell']}>
                    <div className={styles['form']}>
                      <TextAreaField
                        label='관리자 답변'
                        name='admin-qna-reply'
                        onChange={(event) => {
                          setReplyContent(event.target.value);
                        }}
                        placeholder='운영 안내나 과정별 답변을 입력해 주세요.'
                        rows={6}
                        value={replyContent}
                      />

                      <div className={styles['qnaActionRow']}>
                        <Button
                          disabled={replyMutation.isPending}
                          onClick={handleSubmitReply}
                          type='button'
                        >
                          {replyMutation.isPending ? '등록 중...' : '답변 등록'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles['qnaEmptyState']}>표시할 질문이 없습니다.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default AdminQnaSection;
