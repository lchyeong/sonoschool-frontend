import { Fragment, useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/errors';
import {
  createProgramQnaReply,
  createProgramQnaThread,
  deleteProgramQnaThread,
  fetchProgramQna,
  programQnaQueryKey,
  updateProgramQnaThread,
} from '@/api/programQna';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import {
  QNA_CONTENT_MAX_LENGTH,
  QNA_LIST_CONTENT_PREVIEW_LENGTH,
  QNA_REPLY_MAX_LENGTH,
  QNA_TITLE_MAX_LENGTH,
} from '@/constants/qna';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type {
  ProgramQnaAuthorType,
  ProgramQnaReplyItem,
  ProgramQnaThreadItem,
} from '@/types/programQna';
import { classNames } from '@/utils/classNames';
import {
  buildQnaPreview,
  maskQnaAuthorName,
  resolveQnaAuthorName,
  validateQnaQuestionDraft,
} from '@/utils/qna';

import styles from './ProgramQnaPanel.module.scss';

type QnaVariant = 'board' | 'panel';
type BoardLayout = 'table' | 'compact';
type BoardStatusFilter = 'all' | 'answered' | 'waiting';
type QnaDetailDisplay = 'questionAndAnswers' | 'answersOnly';
type QnaReplySource = 'all' | 'adminOnly';

const BOARD_PAGE_SIZE = 6;
const EMPTY_THREADS: ProgramQnaThreadItem[] = [];

interface ProgramQnaPanelProps {
  allowReplies?: boolean;
  answerSource?: QnaReplySource;
  boardLayout?: BoardLayout;
  detailDisplay?: QnaDetailDisplay;
  enabled?: boolean;
  exclusiveWriteMode?: boolean;
  hideBoardTitle?: boolean;
  programId: number | null;
  programThreadCount?: number | null;
  showBoardSummary?: boolean;
  title?: string;
  variant?: QnaVariant;
}

const AUTHOR_TYPE_LABELS: Record<ProgramQnaAuthorType, string> = {
  ADMIN: '관리자',
  ENROLLED: '수강생',
  MEMBER: '회원',
};

const formatDateTime = (value: string) => {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
};

const formatDate = (value: string) => {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
  }).format(timestamp);
};

const matchesSearchKeyword = (thread: ProgramQnaThreadItem, keyword: string) => {
  if (!keyword) {
    return true;
  }

  return `${thread.title} ${thread.content} ${thread.authorName} ${thread.programTitle ?? ''}`
    .toLowerCase()
    .includes(keyword);
};

const getThreadReplies = (thread: ProgramQnaThreadItem, answerSource: QnaReplySource) => {
  return answerSource === 'adminOnly'
    ? thread.replies.filter((reply) => reply.adminReply)
    : thread.replies;
};

const getThreadReplyCount = (thread: ProgramQnaThreadItem, answerSource: QnaReplySource) => {
  return answerSource === 'adminOnly'
    ? getThreadReplies(thread, answerSource).length
    : thread.replyCount;
};

const isThreadAnswered = (thread: ProgramQnaThreadItem, answerSource: QnaReplySource) => {
  return answerSource === 'adminOnly'
    ? getThreadReplies(thread, answerSource).length > 0
    : thread.answered;
};

const matchesStatusFilter = (
  thread: ProgramQnaThreadItem,
  statusFilter: BoardStatusFilter,
  answerSource: QnaReplySource,
) => {
  if (statusFilter === 'all') {
    return true;
  }

  const answered = isThreadAnswered(thread, answerSource);
  return statusFilter === 'answered' ? answered : !answered;
};

const ProgramQnaPanelContent = ({
  allowReplies = true,
  answerSource = 'all',
  boardLayout = 'table',
  detailDisplay = 'questionAndAnswers',
  enabled = true,
  exclusiveWriteMode = false,
  hideBoardTitle = false,
  resolvedProgramId,
  programThreadCount = null,
  showBoardSummary = true,
  title = 'Q&A',
  variant = 'panel',
}: Omit<ProgramQnaPanelProps, 'programId'> & { resolvedProgramId: number }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentDisplayName = useAuthStore((state) => state.displayName);
  const isBoardVariant = variant === 'board';
  const isCompactBoard = isBoardVariant && boardLayout === 'compact';
  const replyCountLabel = allowReplies ? '답글' : '답변';
  const waitingStatusLabel = detailDisplay === 'answersOnly' ? '미답변' : '답변대기';
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null);
  const [expandedContentThreadId, setExpandedContentThreadId] = useState<number | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
  const [editingThreadContent, setEditingThreadContent] = useState('');
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [openReplyThreadIds, setOpenReplyThreadIds] = useState<number[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim().toLowerCase());
  const showBoardReadContent = !(isBoardVariant && exclusiveWriteMode && isWriteFormOpen);

  const qnaQuery = useQuery({
    enabled,
    queryFn: () => fetchProgramQna(resolvedProgramId, { page: 0, size: 20 }),
    queryKey: programQnaQueryKey(resolvedProgramId),
  });

  const invalidateQna = async () => {
    await queryClient.invalidateQueries({
      queryKey: programQnaQueryKey(resolvedProgramId),
    });
  };

  const createThreadMutation = useMutation({
    mutationFn: (payload: { content: string; title: string }) =>
      createProgramQnaThread(resolvedProgramId, {
        content: payload.content,
        title: payload.title,
      }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : 'Q&A 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setThreadTitle('');
      setThreadContent('');
      setIsWriteFormOpen(false);
      await invalidateQna();
      showToast({
        message: 'Q&A를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: ({ content, threadId }: { content: string; threadId: number }) =>
      createProgramQnaReply(resolvedProgramId, threadId, { content }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : 'Q&A 답글 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      setReplyDrafts((current) => ({
        ...current,
        [variables.threadId]: '',
      }));
      await invalidateQna();
      showToast({
        message: '답글을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateThreadMutation = useMutation({
    mutationFn: ({
      content,
      threadId,
      title,
    }: {
      content: string;
      threadId: number;
      title: string;
    }) => updateProgramQnaThread(resolvedProgramId, threadId, { content, title }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : 'Q&A를 수정하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setEditingThreadId(null);
      setEditingThreadTitle('');
      setEditingThreadContent('');
      await invalidateQna();
      showToast({
        message: 'Q&A를 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: number) => deleteProgramQnaThread(resolvedProgramId, threadId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : 'Q&A를 삭제하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, threadId) => {
      setEditingThreadId((current) => (current === threadId ? null : current));
      setEditingThreadTitle('');
      setEditingThreadContent('');
      setExpandedThreadId((current) => (current === threadId ? null : current));
      setExpandedContentThreadId((current) => (current === threadId ? null : current));
      setOpenReplyThreadIds((current) => current.filter((value) => value !== threadId));
      await invalidateQna();
      showToast({
        message: 'Q&A를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const threads = qnaQuery.data?.content ?? EMPTY_THREADS;
  const visibleThreads = useMemo(() => {
    return threads.filter((thread) => {
      return (
        matchesSearchKeyword(thread, deferredSearchKeyword) &&
        (!isBoardVariant || matchesStatusFilter(thread, statusFilter, answerSource))
      );
    });
  }, [answerSource, deferredSearchKeyword, isBoardVariant, statusFilter, threads]);

  const resolvedProgramThreadCount = qnaQuery.data?.totalElements ?? programThreadCount ?? null;
  const shouldTreatQueryErrorAsEmptyState =
    qnaQuery.error instanceof ApiError &&
    (qnaQuery.error.status === 404 || qnaQuery.error.code === 'QUESTION_404');

  const headerMeta = useMemo(() => {
    if (resolvedProgramThreadCount !== null) {
      return `프로그램 전체 Q&A ${String(resolvedProgramThreadCount)}개`;
    }

    return '프로그램별 Q&A를 확인할 수 있습니다.';
  }, [resolvedProgramThreadCount]);

  const totalPages = Math.max(1, Math.ceil(visibleThreads.length / BOARD_PAGE_SIZE));
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const activeExpandedThreadId =
    expandedThreadId !== null && visibleThreads.some((thread) => thread.id === expandedThreadId)
      ? expandedThreadId
      : null;
  const activeExpandedContentThreadId =
    expandedContentThreadId !== null &&
    visibleThreads.some((thread) => thread.id === expandedContentThreadId)
      ? expandedContentThreadId
      : null;
  const paginatedThreads = useMemo(() => {
    if (!isBoardVariant) {
      return visibleThreads;
    }

    return visibleThreads.slice(
      (normalizedCurrentPage - 1) * BOARD_PAGE_SIZE,
      normalizedCurrentPage * BOARD_PAGE_SIZE,
    );
  }, [isBoardVariant, normalizedCurrentPage, visibleThreads]);

  const toggleReplyComposer = (threadId: number) => {
    setOpenReplyThreadIds((current) => {
      return current.includes(threadId)
        ? current.filter((value) => value !== threadId)
        : [...current, threadId];
    });
  };

  const toggleThreadAnswers = (threadId: number) => {
    setExpandedThreadId((current) => (current === threadId ? null : threadId));
  };

  const toggleThreadContent = (threadId: number) => {
    setExpandedContentThreadId((current) => (current === threadId ? null : threadId));
  };

  const handleStartThreadEdit = (thread: ProgramQnaThreadItem) => {
    setEditingThreadId(thread.id);
    setEditingThreadTitle(thread.title);
    setEditingThreadContent(thread.content);
    setExpandedThreadId(thread.id);
    setIsWriteFormOpen(false);
  };

  const handleCancelThreadEdit = () => {
    setEditingThreadId(null);
    setEditingThreadTitle('');
    setEditingThreadContent('');
  };

  const handleSubmitThreadEdit = (threadId: number) => {
    const trimmedTitle = editingThreadTitle.trim();
    const trimmedContent = editingThreadContent.trim();
    const validationError = validateQnaQuestionDraft(trimmedTitle, trimmedContent);

    if (validationError) {
      showToast({
        message: validationError,
        variant: 'error',
      });
      return;
    }

    void updateThreadMutation.mutateAsync({
      content: trimmedContent,
      threadId,
      title: trimmedTitle,
    });
  };

  const handleDeleteThread = (thread: ProgramQnaThreadItem) => {
    if (!window.confirm('작성한 질문을 삭제하시겠습니까?')) {
      return;
    }

    void deleteThreadMutation.mutateAsync(thread.id);
  };

  const handleToggleWriteForm = () => {
    if (!isAuthenticated) {
      void navigate(routePaths.login);
      return;
    }

    handleCancelThreadEdit();
    setIsWriteFormOpen((current) => !current);
  };

  const validateThreadDraft = () => {
    const validationError = validateQnaQuestionDraft(threadTitle.trim(), threadContent.trim());

    if (validationError) {
      showToast({
        message: validationError,
        variant: 'error',
      });
      return false;
    }

    return true;
  };

  const renderThreadManagementActions = (thread: ProgramQnaThreadItem) => {
    if (!isAuthenticated || !thread.mine || editingThreadId === thread.id) {
      return null;
    }

    return (
      <div className={styles['threadActionRow']}>
        <Button
          disabled={updateThreadMutation.isPending || deleteThreadMutation.isPending}
          onClick={() => {
            handleStartThreadEdit(thread);
          }}
          size='sm'
          type='button'
          variant='secondary'
        >
          수정
        </Button>
        <Button
          disabled={updateThreadMutation.isPending || deleteThreadMutation.isPending}
          onClick={() => {
            handleDeleteThread(thread);
          }}
          size='sm'
          type='button'
          variant='danger'
        >
          삭제
        </Button>
      </div>
    );
  };

  const renderThreadDetailContent = (
    thread: ProgramQnaThreadItem,
    isReplyComposerOpen: boolean,
    expandedLayoutClassName?: string,
  ) => {
    const replies = getThreadReplies(thread, answerSource);
    const isAnswersOnly = detailDisplay === 'answersOnly';
    const isEditingThread = editingThreadId === thread.id;

    return (
      <div className={classNames(styles['detailInner'], expandedLayoutClassName)}>
        {!isAnswersOnly || isEditingThread ? (
          <div className={styles['detailQuestion']}>
            <p className={styles['detailLabel']}>{isEditingThread ? '질문 수정' : '질문 내용'}</p>
            {isEditingThread ? (
              <div className={styles['threadEditor']}>
                <input
                  className={styles['input']}
                  maxLength={QNA_TITLE_MAX_LENGTH}
                  onChange={(event) => {
                    setEditingThreadTitle(event.target.value);
                  }}
                  placeholder='제목'
                  value={editingThreadTitle}
                />
                <textarea
                  className={styles['textarea']}
                  maxLength={QNA_CONTENT_MAX_LENGTH}
                  onChange={(event) => {
                    setEditingThreadContent(event.target.value);
                  }}
                  placeholder={`내용 (${String(QNA_CONTENT_MAX_LENGTH)}자 이내)`}
                  value={editingThreadContent}
                />
                <div className={styles['threadActionRow']}>
                  <Button
                    disabled={updateThreadMutation.isPending || deleteThreadMutation.isPending}
                    onClick={() => {
                      handleCancelThreadEdit();
                    }}
                    size='sm'
                    type='button'
                    variant='secondary'
                  >
                    취소
                  </Button>
                  <Button
                    disabled={
                      updateThreadMutation.isPending ||
                      editingThreadTitle.trim().length === 0 ||
                      editingThreadContent.trim().length === 0
                    }
                    onClick={() => {
                      handleSubmitThreadEdit(thread.id);
                    }}
                    size='sm'
                    type='button'
                  >
                    {updateThreadMutation.isPending ? '저장 중...' : '수정 저장'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className={styles['detailText']}>{thread.content}</p>
                {renderThreadManagementActions(thread)}
              </>
            )}
          </div>
        ) : null}

        <div className={styles['detailAnswer']}>
          <p className={styles['detailLabel']}>{isAnswersOnly ? '답변' : '문의에 대한 답변'}</p>
          {replies.length ? (
            <div className={styles['detailReplyList']}>
              {replies.map((reply: ProgramQnaReplyItem) => (
                <div className={styles['replyBlock']} key={reply.id}>
                  <div className={styles['replyMetaRow']}>
                    <div className={styles['replyMetaPrimary']}>
                      <strong>
                        {maskQnaAuthorName(
                          resolveQnaAuthorName(reply.authorName, reply.mine, currentDisplayName),
                        )}
                      </strong>
                      {reply.adminReply ? (
                        <span className={styles['replyBadge']}>관리자 답변</span>
                      ) : null}
                    </div>
                    <span>{formatDateTime(reply.createdAt)}</span>
                  </div>
                  <p className={styles['detailText']}>{reply.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles['detailText']}>
              {isAnswersOnly ? '아직 미답변입니다.' : '아직 등록된 답변이 없습니다.'}
            </p>
          )}
        </div>

        {allowReplies && isAuthenticated ? (
          <div className={styles['detailActions']}>
            <Button
              className={styles['replyToggle']}
              onClick={() => {
                toggleReplyComposer(thread.id);
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              {isReplyComposerOpen
                ? '답글 입력 닫기'
                : `답글 남기기 (${String(thread.replyCount)})`}
            </Button>

            {isReplyComposerOpen ? (
              <div className={styles['replyComposer']}>
                <textarea
                  className={styles['textarea']}
                  maxLength={QNA_REPLY_MAX_LENGTH}
                  onChange={(event) => {
                    setReplyDrafts((current) => ({
                      ...current,
                      [thread.id]: event.target.value,
                    }));
                  }}
                  placeholder='답글을 입력해 주세요.'
                  value={replyDrafts[thread.id] ?? ''}
                />
                <div className={styles['actionRow']}>
                  <span className={styles['fieldHint']}>현재 질문에 답글로 등록됩니다.</span>
                  <Button
                    disabled={
                      createReplyMutation.isPending ||
                      (replyDrafts[thread.id] ?? '').trim().length === 0
                    }
                    onClick={() => {
                      void createReplyMutation.mutateAsync({
                        content: (replyDrafts[thread.id] ?? '').trim(),
                        threadId: thread.id,
                      });
                    }}
                    size='sm'
                    type='button'
                  >
                    답글 등록
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className={classNames(styles['panel'], isBoardVariant && styles['panelBoard'])}>
      {isBoardVariant ? (
        <>
          {!hideBoardTitle || showBoardSummary ? (
            <div className={styles['boardHeader']}>
              {!hideBoardTitle ? (
                <div className={styles['boardTitleBlock']}>
                  <h3 className={styles['boardTitle']}>강의 Q&A</h3>
                </div>
              ) : null}
              {showBoardSummary ? (
                <p className={styles['boardSummary']}>
                  총 {String(resolvedProgramThreadCount ?? threads.length)}건 중 검색 결과{' '}
                  {String(visibleThreads.length)}건
                </p>
              ) : null}
            </div>
          ) : null}

          {showBoardReadContent ? (
            <div className={styles['boardToolbar']}>
              <UnifiedSearchBar
                className={styles['boardSearchBar']}
                inputAriaLabel='Q&A 검색'
                leading={
                  <select
                    aria-label='질문 상태 필터'
                    className={styles['filterSelect']}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as BoardStatusFilter);
                      setCurrentPage(1);
                    }}
                    value={statusFilter}
                  >
                    <option value='all'>전체</option>
                    <option value='answered'>답변완료</option>
                    <option value='waiting'>답변대기</option>
                  </select>
                }
                onChange={(nextValue) => {
                  setSearchInput(nextValue);
                }}
                onSubmit={() => {
                  setSearchKeyword(searchInput);
                  setCurrentPage(1);
                }}
                placeholder='제목, 내용, 작성자를 검색해 주세요.'
                value={searchInput}
              />
            </div>
          ) : null}
        </>
      ) : (
        <header className={styles['header']}>
          <div>
            <h3 className={styles['title']}>{title}</h3>
            <p className={styles['description']}>
              비수강생과 수강생 모두 참여할 수 있으며, 작성자 구분이 함께 표시됩니다.
            </p>
          </div>
          <p className={styles['meta']}>{headerMeta}</p>
        </header>
      )}

      {!isAuthenticated && !isBoardVariant ? (
        <div className={styles['loginPrompt']}>
          <p className={styles['loginHint']}>
            Q&A 작성과 답글 등록은 로그인 후 사용할 수 있습니다.
          </p>
          <div>
            <Link to={routePaths.login}>로그인하러 가기</Link>
          </div>
        </div>
      ) : isAuthenticated && (!isBoardVariant || isWriteFormOpen) ? (
        <div className={classNames(styles['composer'], isBoardVariant && styles['composerBoard'])}>
          {isBoardVariant ? (
            <div className={styles['writerHeader']}>
              <h4 className={styles['writerTitle']}>질문 작성</h4>
            </div>
          ) : null}
          <div className={styles['composerFields']}>
            <input
              className={styles['input']}
              maxLength={QNA_TITLE_MAX_LENGTH}
              onChange={(event) => {
                setThreadTitle(event.target.value);
              }}
              placeholder='제목'
              value={threadTitle}
            />
            <textarea
              className={styles['textarea']}
              maxLength={QNA_CONTENT_MAX_LENGTH}
              onChange={(event) => {
                setThreadContent(event.target.value);
              }}
              placeholder={`내용 (${String(QNA_CONTENT_MAX_LENGTH)}자 이내)`}
              value={threadContent}
            />
          </div>
          <div className={styles['actionRow']}>
            <Button
              className={isBoardVariant ? styles['footerActionButton'] : undefined}
              disabled={
                createThreadMutation.isPending ||
                threadTitle.trim().length === 0 ||
                threadContent.trim().length === 0
              }
              onClick={() => {
                if (!validateThreadDraft()) {
                  return;
                }

                void createThreadMutation.mutateAsync({
                  content: threadContent.trim(),
                  title: threadTitle.trim(),
                });
              }}
              size='sm'
              type='button'
              variant='primary'
            >
              {createThreadMutation.isPending ? '등록 중...' : '등록'}
            </Button>
            {isBoardVariant ? (
              <Button
                className={styles['footerActionButton']}
                onClick={() => {
                  setIsWriteFormOpen(false);
                }}
                size='sm'
                type='button'
                variant='secondary'
              >
                작성 닫기
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {qnaQuery.isLoading ? (
        isBoardVariant ? (
          <div aria-busy='true' className={styles['stateBox']}>
            강의 Q&A를 불러오는 중입니다.
          </div>
        ) : (
          <p className={styles['emptyState']}>Q&A를 불러오는 중입니다.</p>
        )
      ) : null}
      {qnaQuery.isError && !shouldTreatQueryErrorAsEmptyState ? (
        isBoardVariant ? (
          <div className={styles['stateBox']}>강의 Q&A를 불러오지 못했습니다.</div>
        ) : (
          <p className={styles['errorText']}>Q&A를 불러오지 못했습니다.</p>
        )
      ) : null}

      {!isBoardVariant &&
      !qnaQuery.isLoading &&
      (!qnaQuery.isError || shouldTreatQueryErrorAsEmptyState) &&
      visibleThreads.length === 0 ? (
        <p className={styles['emptyState']}>
          {deferredSearchKeyword ? '검색 결과가 없습니다.' : '등록된 질문이 없습니다.'}
        </p>
      ) : null}

      {isBoardVariant &&
      showBoardReadContent &&
      !qnaQuery.isLoading &&
      (!qnaQuery.isError || shouldTreatQueryErrorAsEmptyState) ? (
        <>
          {isCompactBoard ? (
            paginatedThreads.length ? (
              <div className={styles['compactBoardList']}>
                {paginatedThreads.map((thread, index) => {
                  const rowNumber =
                    visibleThreads.length - ((normalizedCurrentPage - 1) * BOARD_PAGE_SIZE + index);
                  const isExpanded = activeExpandedThreadId === thread.id;
                  const isContentExpanded = activeExpandedContentThreadId === thread.id;
                  const isReplyComposerOpen = openReplyThreadIds.includes(thread.id);

                  return (
                    <article
                      className={classNames(
                        styles['threadCard'],
                        styles['threadCardBoardCompact'],
                        isExpanded && styles['threadCardBoardCompactAnswerExpanded'],
                      )}
                      key={thread.id}
                    >
                      <div className={styles['compactThreadButton']}>
                        <div className={styles['compactThreadPrimary']}>
                          <div className={styles['compactThreadTopRow']}>
                            <span className={styles['compactThreadNumber']}>
                              {String(rowNumber)}
                            </span>
                            <button
                              aria-controls={`program-qna-detail-${String(thread.id)}`}
                              aria-expanded={isExpanded}
                              className={classNames(
                                styles['boardStatusBadge'],
                                styles['compactAnswerToggle'],
                              )}
                              data-tone={
                                isThreadAnswered(thread, answerSource) ? 'answered' : 'waiting'
                              }
                              onClick={() => {
                                toggleThreadAnswers(thread.id);
                              }}
                              type='button'
                            >
                              {isThreadAnswered(thread, answerSource)
                                ? '답변완료'
                                : waitingStatusLabel}
                            </button>
                            <span className={styles['compactThreadDate']}>
                              {formatDate(thread.createdAt)}
                            </span>
                          </div>
                          <button
                            aria-controls={`program-qna-content-${String(thread.id)}`}
                            aria-expanded={isContentExpanded}
                            className={styles['compactThreadContentButton']}
                            onClick={() => {
                              toggleThreadContent(thread.id);
                            }}
                            type='button'
                          >
                            <span className={styles['compactThreadTextBlock']}>
                              <strong className={styles['compactThreadTitle']}>
                                {thread.title}
                              </strong>
                              <span
                                className={styles['compactThreadPreview']}
                                data-expanded={isContentExpanded ? 'true' : 'false'}
                                id={`program-qna-content-${String(thread.id)}`}
                              >
                                {thread.content}
                              </span>
                            </span>
                          </button>
                          {isContentExpanded ? renderThreadManagementActions(thread) : null}
                        </div>
                        <div className={styles['compactThreadMeta']}>
                          <div className={styles['badgeRow']}>
                            <span
                              className={styles['authorBadge']}
                              data-author-type={thread.authorType}
                            >
                              {AUTHOR_TYPE_LABELS[thread.authorType]}
                            </span>
                            <span className={styles['compactThreadAuthor']}>
                              {maskQnaAuthorName(
                                resolveQnaAuthorName(
                                  thread.authorName,
                                  thread.mine,
                                  currentDisplayName,
                                ),
                              )}
                            </span>
                          </div>
                          <button
                            aria-controls={`program-qna-detail-${String(thread.id)}`}
                            aria-expanded={isExpanded}
                            className={styles['compactThreadMetaSecondary']}
                            onClick={() => {
                              toggleThreadAnswers(thread.id);
                            }}
                            type='button'
                          >
                            <span className={styles['compactThreadReplyCount']}>
                              {replyCountLabel} {String(getThreadReplyCount(thread, answerSource))}
                            </span>
                            <span className={styles['compactThreadChevron']} aria-hidden='true' />
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div
                          className={styles['compactThreadDetail']}
                          id={`program-qna-detail-${String(thread.id)}`}
                        >
                          {renderThreadDetailContent(
                            thread,
                            isReplyComposerOpen,
                            styles['detailInnerCompact'],
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles['stateBox']}>
                {deferredSearchKeyword || statusFilter !== 'all'
                  ? '검색 조건에 맞는 질문이 없습니다.'
                  : '등록된 질문이 없습니다.'}
              </div>
            )
          ) : (
            <div className={styles['tableWrap']}>
              <table className={styles['boardTable']}>
                <colgroup>
                  <col className={styles['numberCol']} />
                  <col className={styles['statusCol']} />
                  <col />
                  <col className={styles['authorCol']} />
                  <col className={styles['dateCol']} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope='col'>번호</th>
                    <th scope='col'>상태</th>
                    <th scope='col'>제목</th>
                    <th scope='col'>작성자</th>
                    <th scope='col'>작성일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedThreads.length ? (
                    paginatedThreads.map((thread, index) => {
                      const rowNumber =
                        visibleThreads.length -
                        ((normalizedCurrentPage - 1) * BOARD_PAGE_SIZE + index);
                      const isExpanded = activeExpandedThreadId === thread.id;
                      const isReplyComposerOpen = openReplyThreadIds.includes(thread.id);

                      return (
                        <Fragment key={thread.id}>
                          <tr className={styles['questionRow']}>
                            <td>{String(rowNumber)}</td>
                            <td>
                              <span
                                className={styles['boardStatusBadge']}
                                data-tone={
                                  isThreadAnswered(thread, answerSource) ? 'answered' : 'waiting'
                                }
                              >
                                {isThreadAnswered(thread, answerSource)
                                  ? '답변완료'
                                  : waitingStatusLabel}
                              </span>
                            </td>
                            <td className={styles['titleCell']}>
                              <button
                                aria-controls={`program-qna-detail-${String(thread.id)}`}
                                aria-expanded={isExpanded}
                                className={styles['titleButton']}
                                onClick={() => {
                                  setExpandedThreadId((current) =>
                                    current === thread.id ? null : thread.id,
                                  );
                                }}
                                type='button'
                              >
                                <span className={styles['titleText']} title={thread.title}>
                                  {thread.title}
                                </span>
                                <span className={styles['previewText']}>
                                  {buildQnaPreview(thread.content, QNA_LIST_CONTENT_PREVIEW_LENGTH)}
                                </span>
                              </button>
                            </td>
                            <td className={styles['authorCell']}>
                              <span
                                className={styles['authorText']}
                                title={resolveQnaAuthorName(
                                  thread.authorName,
                                  thread.mine,
                                  currentDisplayName,
                                )}
                              >
                                {maskQnaAuthorName(
                                  resolveQnaAuthorName(
                                    thread.authorName,
                                    thread.mine,
                                    currentDisplayName,
                                  ),
                                )}
                              </span>
                            </td>
                            <td>{formatDate(thread.createdAt)}</td>
                          </tr>

                          {isExpanded ? (
                            <tr className={styles['detailRow']}>
                              <td colSpan={5}>
                                <div id={`program-qna-detail-${String(thread.id)}`}>
                                  {renderThreadDetailContent(thread, isReplyComposerOpen)}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['emptyRow']} colSpan={5}>
                        {deferredSearchKeyword || statusFilter !== 'all'
                          ? '검색 조건에 맞는 질문이 없습니다.'
                          : '등록된 질문이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles['boardFooter']}>
            {totalPages > 1 ? (
              <div className={styles['pagination']}>
                <button
                  className={styles['pageNavButton']}
                  disabled={normalizedCurrentPage === 1}
                  onClick={() => {
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  type='button'
                >
                  {'<'}
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                  return (
                    <button
                      className={styles['pageButton']}
                      data-active={pageNumber === normalizedCurrentPage}
                      key={pageNumber}
                      onClick={() => {
                        setCurrentPage(pageNumber);
                      }}
                      type='button'
                    >
                      {String(pageNumber)}
                    </button>
                  );
                })}

                <button
                  className={styles['pageNavButton']}
                  disabled={normalizedCurrentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  type='button'
                >
                  {'>'}
                </button>
              </div>
            ) : (
              <div />
            )}

            <Button
              className={styles['writeButton']}
              onClick={handleToggleWriteForm}
              size='md'
              type='button'
            >
              {isWriteFormOpen ? '작성 닫기' : '글쓰기'}
            </Button>
          </div>
        </>
      ) : null}

      {!isBoardVariant && !qnaQuery.isError && visibleThreads.length > 0 ? (
        <div className={styles['threadList']}>
          {visibleThreads.map((thread) => {
            const isReplyComposerOpen = openReplyThreadIds.includes(thread.id);
            const isEditingThread = editingThreadId === thread.id;

            return (
              <article className={styles['threadCard']} key={thread.id}>
                <div className={styles['threadHeader']}>
                  <div className={styles['badgeRow']}>
                    <span className={styles['authorBadge']} data-author-type={thread.authorType}>
                      {AUTHOR_TYPE_LABELS[thread.authorType]}
                    </span>
                    <span
                      className={styles['statusBadge']}
                      data-tone={thread.answered ? 'answered' : 'waiting'}
                    >
                      {thread.answered ? '답변 완료' : '미해결'}
                    </span>
                  </div>
                  <div className={styles['metaRow']}>
                    <p className={styles['threadMeta']}>
                      {resolveQnaAuthorName(thread.authorName, thread.mine, currentDisplayName)} ·{' '}
                      {formatDateTime(thread.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  {isEditingThread ? (
                    <div className={styles['threadEditor']}>
                      <p className={styles['detailLabel']}>질문 수정</p>
                      <input
                        className={styles['input']}
                        maxLength={QNA_TITLE_MAX_LENGTH}
                        onChange={(event) => {
                          setEditingThreadTitle(event.target.value);
                        }}
                        placeholder='제목'
                        value={editingThreadTitle}
                      />
                      <textarea
                        className={styles['textarea']}
                        maxLength={QNA_CONTENT_MAX_LENGTH}
                        onChange={(event) => {
                          setEditingThreadContent(event.target.value);
                        }}
                        placeholder={`내용 (${String(QNA_CONTENT_MAX_LENGTH)}자 이내)`}
                        value={editingThreadContent}
                      />
                      <div className={styles['threadActionRow']}>
                        <Button
                          disabled={
                            updateThreadMutation.isPending || deleteThreadMutation.isPending
                          }
                          onClick={() => {
                            handleCancelThreadEdit();
                          }}
                          size='sm'
                          type='button'
                          variant='secondary'
                        >
                          취소
                        </Button>
                        <Button
                          disabled={
                            updateThreadMutation.isPending ||
                            editingThreadTitle.trim().length === 0 ||
                            editingThreadContent.trim().length === 0
                          }
                          onClick={() => {
                            handleSubmitThreadEdit(thread.id);
                          }}
                          size='sm'
                          type='button'
                        >
                          {updateThreadMutation.isPending ? '저장 중...' : '수정 저장'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className={styles['threadTitle']}>{thread.title}</h4>
                      <p className={styles['threadBody']}>{thread.content}</p>
                    </>
                  )}
                </div>

                {renderThreadManagementActions(thread)}

                {thread.replies.length > 0 ? (
                  <div className={styles['replyList']}>
                    {thread.replies.map((reply) => (
                      <article className={styles['replyCard']} key={reply.id}>
                        <div className={styles['replyHeader']}>
                          <div className={styles['badgeRow']}>
                            <span
                              className={styles['authorBadge']}
                              data-author-type={reply.authorType}
                            >
                              {AUTHOR_TYPE_LABELS[reply.authorType]}
                            </span>
                            {reply.adminReply ? (
                              <span className={styles['replyBadge']}>관리자 답글</span>
                            ) : null}
                          </div>
                          <p className={styles['replyMeta']}>
                            {resolveQnaAuthorName(reply.authorName, reply.mine, currentDisplayName)}{' '}
                            · {formatDateTime(reply.createdAt)}
                          </p>
                        </div>
                        <p className={styles['replyBody']}>{reply.content}</p>
                      </article>
                    ))}
                  </div>
                ) : null}

                {isAuthenticated ? (
                  <>
                    <Button
                      className={styles['replyToggle']}
                      onClick={() => {
                        toggleReplyComposer(thread.id);
                      }}
                      size='sm'
                      type='button'
                      variant='secondary'
                    >
                      {isReplyComposerOpen
                        ? '답글 입력 닫기'
                        : `답글 남기기 (${String(thread.replyCount)})`}
                    </Button>

                    {isReplyComposerOpen ? (
                      <div className={styles['replyComposer']}>
                        <textarea
                          className={styles['textarea']}
                          maxLength={QNA_REPLY_MAX_LENGTH}
                          onChange={(event) => {
                            setReplyDrafts((current) => ({
                              ...current,
                              [thread.id]: event.target.value,
                            }));
                          }}
                          placeholder='답글을 입력해 주세요.'
                          value={replyDrafts[thread.id] ?? ''}
                        />
                        <div className={styles['actionRow']}>
                          <span className={styles['fieldHint']}>현재 Q&A에 답글로 등록됩니다.</span>
                          <Button
                            disabled={
                              createReplyMutation.isPending ||
                              (replyDrafts[thread.id] ?? '').trim().length === 0
                            }
                            onClick={() => {
                              void createReplyMutation.mutateAsync({
                                content: (replyDrafts[thread.id] ?? '').trim(),
                                threadId: thread.id,
                              });
                            }}
                            size='sm'
                            type='button'
                          >
                            답글 등록
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export const ProgramQnaPanel = ({ programId, ...props }: ProgramQnaPanelProps) => {
  const resolvedProgramId = programId ?? null;

  if (resolvedProgramId === null) {
    return <p className={styles['emptyState']}>Q&A를 연결할 프로그램 정보를 찾지 못했습니다.</p>;
  }

  return (
    <ProgramQnaPanelContent
      {...props}
      key={`${String(resolvedProgramId)}-${props.variant ?? 'panel'}-${props.boardLayout ?? 'table'}`}
      resolvedProgramId={resolvedProgramId}
    />
  );
};

export default ProgramQnaPanel;
