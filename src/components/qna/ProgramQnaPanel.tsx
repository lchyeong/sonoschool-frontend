import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/errors';
import {
  createProgramQnaReply,
  createProgramQnaThread,
  deleteProgramQnaThread,
  fetchProgramQna,
  programQnaQueryKey,
  updateProgramQnaThread,
} from '@/api/programQna';
import checkWhiteIconSrc from '@/assets/icons/lucide_check_white_20.svg';
import closeIconSrc from '@/assets/icons/lucide_x.svg';
import squarePenIconSrc from '@/assets/icons/mypage-menu-square-pen.svg';
import Modal from '@/components/overlay/Modal/Modal';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import {
  QNA_CONTENT_MAX_LENGTH,
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
import { maskQnaAuthorName, resolveQnaAuthorName, validateQnaQuestionDraft } from '@/utils/qna';

import styles from './ProgramQnaPanel.module.scss';

type QnaVariant = 'board' | 'panel';
type BoardLayout = 'table' | 'compact';
type BoardStatusFilter = 'all' | 'answered' | 'waiting';
type QnaDetailDisplay = 'questionAndAnswers' | 'answersOnly';
type QnaReplySource = 'all' | 'adminOnly';

const BOARD_PAGE_SIZE = 8;
const COMPACT_BOARD_PAGE_SIZE = 4;
const COMPACT_BOARD_MEDIA_QUERY = '(width < 768px)';
const EMPTY_THREADS: ProgramQnaThreadItem[] = [];
const BOARD_STATUS_FILTER_OPTIONS: Array<{ label: string; value: BoardStatusFilter }> = [
  { label: '전체 상태', value: 'all' },
  { label: '답변 완료', value: 'answered' },
  { label: '답변 대기', value: 'waiting' },
];

interface ProgramQnaPanelProps {
  allowReplies?: boolean;
  allowUnauthenticatedWriteOpen?: boolean;
  answerSource?: QnaReplySource;
  boardLayout?: BoardLayout;
  defaultWriteOpen?: boolean;
  detailDisplay?: QnaDetailDisplay;
  enabled?: boolean;
  exclusiveWriteMode?: boolean;
  hideBoardTitle?: boolean;
  programId: number | null;
  programThreadCount?: number | null;
  onCompactDetailActiveChange?: ((isActive: boolean) => void) | undefined;
  showBoardSummary?: boolean;
  title?: string;
  variant?: QnaVariant;
}

const AUTHOR_TYPE_LABELS: Record<ProgramQnaAuthorType, string> = {
  ADMIN: '관리자',
  ENROLLED: '수강생',
  MEMBER: '회원',
};

const getShouldUseCompactBoard = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(COMPACT_BOARD_MEDIA_QUERY).matches;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? '오후' : '오전';
  const displayHour = hours % 12 || 12;

  return `${String(year)}.${month}.${day}. ${meridiem} ${String(displayHour)}:${minutes}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(year)}.${month}.${day}.`;
};

const buildPrivateCheckStyle = () => {
  return {
    '--qna-private-check-icon': `url("${checkWhiteIconSrc}")`,
  } as CSSProperties & Record<'--qna-private-check-icon', string>;
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
  allowUnauthenticatedWriteOpen = false,
  answerSource = 'all',
  boardLayout = 'table',
  defaultWriteOpen = false,
  detailDisplay = 'questionAndAnswers',
  enabled = true,
  exclusiveWriteMode = false,
  hideBoardTitle = false,
  onCompactDetailActiveChange,
  resolvedProgramId,
  programThreadCount = null,
  showBoardSummary = true,
  title = 'Q&A',
  variant = 'panel',
}: Omit<ProgramQnaPanelProps, 'programId'> & { resolvedProgramId: number }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentDisplayName = useAuthStore((state) => state.displayName);
  const currentRole = useAuthStore((state) => state.role);
  const isBoardVariant = variant === 'board';
  const [matchesCompactBoardMedia, setMatchesCompactBoardMedia] =
    useState(getShouldUseCompactBoard);
  const resolvedBoardLayout =
    boardLayout === 'table' && matchesCompactBoardMedia ? 'compact' : boardLayout;
  const isCompactBoard = isBoardVariant && resolvedBoardLayout === 'compact';
  const waitingStatusLabel = detailDisplay === 'answersOnly' ? '미답변' : '답변 대기';
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
  const [editingThreadContent, setEditingThreadContent] = useState('');
  const [editingThreadPrivateQuestion, setEditingThreadPrivateQuestion] = useState(false);
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(defaultWriteOpen);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [threadPrivateQuestion, setThreadPrivateQuestion] = useState(false);
  const [openReplyThreadIds, setOpenReplyThreadIds] = useState<number[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const statusFilterIndex = BOARD_STATUS_FILTER_OPTIONS.findIndex(
    (option) => option.value === statusFilter,
  );
  const [pendingDeleteThread, setPendingDeleteThread] = useState<ProgramQnaThreadItem | null>(null);
  const privateCheckStyle = useMemo(() => buildPrivateCheckStyle(), []);
  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim().toLowerCase());
  const showBoardReadContent = !(
    isBoardVariant &&
    exclusiveWriteMode &&
    isWriteFormOpen &&
    !isCompactBoard
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COMPACT_BOARD_MEDIA_QUERY);
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setMatchesCompactBoardMedia(event.matches);
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

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
    mutationFn: (payload: { content: string; privateQuestion: boolean; title: string }) =>
      createProgramQnaThread(resolvedProgramId, {
        content: payload.content,
        privateQuestion: payload.privateQuestion,
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
      setThreadPrivateQuestion(false);
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
      privateQuestion,
      threadId,
      title,
    }: {
      content: string;
      privateQuestion: boolean;
      threadId: number;
      title: string;
    }) => updateProgramQnaThread(resolvedProgramId, threadId, { content, privateQuestion, title }),
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
      setEditingThreadPrivateQuestion(false);
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
      setOpenReplyThreadIds((current) => current.filter((value) => value !== threadId));
      setPendingDeleteThread(null);
      await invalidateQna();
      showToast({
        message: 'Q&A를 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const threads = qnaQuery.data?.content ?? EMPTY_THREADS;
  const searchedThreads = useMemo(() => {
    return threads.filter((thread) => matchesSearchKeyword(thread, deferredSearchKeyword));
  }, [deferredSearchKeyword, threads]);
  const visibleThreads = useMemo(() => {
    return searchedThreads.filter((thread) => {
      return !isBoardVariant || matchesStatusFilter(thread, statusFilter, answerSource);
    });
  }, [answerSource, isBoardVariant, searchedThreads, statusFilter]);
  const statusFilterCounts = useMemo(() => {
    return searchedThreads.reduce(
      (counts, thread) => {
        if (isThreadAnswered(thread, answerSource)) {
          counts.answered += 1;
        } else {
          counts.waiting += 1;
        }

        counts.all += 1;
        return counts;
      },
      {
        all: 0,
        answered: 0,
        waiting: 0,
      },
    );
  }, [answerSource, searchedThreads]);

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

  const pageSize = isCompactBoard ? COMPACT_BOARD_PAGE_SIZE : BOARD_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(visibleThreads.length / pageSize));
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const activeExpandedThreadId =
    expandedThreadId !== null && visibleThreads.some((thread) => thread.id === expandedThreadId)
      ? expandedThreadId
      : null;
  const activeCompactDetailThread =
    isCompactBoard && activeExpandedThreadId !== null
      ? (visibleThreads.find((thread) => thread.id === activeExpandedThreadId) ?? null)
      : null;

  useEffect(() => {
    onCompactDetailActiveChange?.(
      activeCompactDetailThread !== null || (isCompactBoard && isWriteFormOpen),
    );
  }, [activeCompactDetailThread, isCompactBoard, isWriteFormOpen, onCompactDetailActiveChange]);
  const paginatedThreads = useMemo(() => {
    if (!isBoardVariant) {
      return visibleThreads;
    }

    if (isCompactBoard) {
      return visibleThreads.slice(0, normalizedCurrentPage * COMPACT_BOARD_PAGE_SIZE);
    }

    return visibleThreads.slice(
      (normalizedCurrentPage - 1) * pageSize,
      normalizedCurrentPage * pageSize,
    );
  }, [isBoardVariant, isCompactBoard, normalizedCurrentPage, pageSize, visibleThreads]);

  const toggleReplyComposer = (threadId: number) => {
    setOpenReplyThreadIds((current) => {
      return current.includes(threadId)
        ? current.filter((value) => value !== threadId)
        : [...current, threadId];
    });
  };

  const handleStartThreadEdit = (thread: ProgramQnaThreadItem) => {
    setEditingThreadId(thread.id);
    setEditingThreadTitle(thread.title);
    setEditingThreadContent(thread.content);
    setEditingThreadPrivateQuestion(thread.privateQuestion);
    setExpandedThreadId(thread.id);
    setIsWriteFormOpen(false);
  };

  const handleCancelThreadEdit = () => {
    setEditingThreadId(null);
    setEditingThreadTitle('');
    setEditingThreadContent('');
    setEditingThreadPrivateQuestion(false);
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
      privateQuestion: editingThreadPrivateQuestion,
      threadId,
      title: trimmedTitle,
    });
  };

  const handleDeleteThread = (thread: ProgramQnaThreadItem) => {
    setPendingDeleteThread(thread);
  };

  const handleCancelDeleteThread = () => {
    if (deleteThreadMutation.isPending) {
      return;
    }

    setPendingDeleteThread(null);
  };

  const handleConfirmDeleteThread = () => {
    if (!pendingDeleteThread) {
      return;
    }

    void deleteThreadMutation.mutateAsync(pendingDeleteThread.id);
  };

  const canReadThread = (thread: ProgramQnaThreadItem) => {
    return !thread.privateQuestion || thread.mine || currentRole === 'ROLE_ADMIN';
  };

  const handleToggleThread = (thread: ProgramQnaThreadItem) => {
    if (!canReadThread(thread)) {
      showToast({
        message: '비밀글은 작성자와 관리자만 확인할 수 있습니다.',
        variant: 'error',
      });
      return;
    }

    setExpandedThreadId((current) => (current === thread.id ? null : thread.id));
  };

  const handleOpenCompactThread = (thread: ProgramQnaThreadItem) => {
    if (!canReadThread(thread)) {
      showToast({
        message: '비밀글은 작성자와 관리자만 확인할 수 있습니다.',
        variant: 'error',
      });
      return;
    }

    setExpandedThreadId(thread.id);
  };

  const handleToggleWriteForm = () => {
    if (!isAuthenticated && !allowUnauthenticatedWriteOpen) {
      void navigate(routePaths.login, { state: { from: location } });
      return;
    }

    handleCancelThreadEdit();
    setIsWriteFormOpen((current) => {
      const nextValue = !current;

      if (nextValue && isCompactBoard) {
        setExpandedThreadId(null);
      }

      return nextValue;
    });
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

  const handleSubmitNewThread = () => {
    if (!isAuthenticated) {
      void navigate(routePaths.login, { state: { from: location } });
      return;
    }

    if (!validateThreadDraft()) {
      return;
    }

    void createThreadMutation.mutateAsync({
      content: threadContent.trim(),
      privateQuestion: threadPrivateQuestion,
      title: threadTitle.trim(),
    });
  };

  const renderThreadManagementActions = (
    thread: ProgramQnaThreadItem,
    options?: { compact?: boolean },
  ) => {
    if (!isAuthenticated || !thread.mine || editingThreadId === thread.id) {
      return null;
    }

    return (
      <div
        className={classNames(
          styles['threadActionRow'],
          options?.compact && styles['compactDetailActionRow'],
        )}
      >
        <Button
          className={options?.compact ? styles['compactDetailEditButton'] : undefined}
          disabled={updateThreadMutation.isPending || deleteThreadMutation.isPending}
          onClick={() => {
            handleStartThreadEdit(thread);
          }}
          size='sm'
          type='button'
          variant='secondary'
        >
          {options?.compact ? '수정하기' : '수정'}
        </Button>
        <Button
          className={options?.compact ? styles['compactDetailDeleteButton'] : undefined}
          disabled={updateThreadMutation.isPending || deleteThreadMutation.isPending}
          onClick={() => {
            handleDeleteThread(thread);
          }}
          size='sm'
          type='button'
          variant='danger'
        >
          {options?.compact ? '질문 삭제' : '삭제'}
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
                <label className={styles['privateOption']}>
                  <input
                    checked={editingThreadPrivateQuestion}
                    onChange={(event) => {
                      setEditingThreadPrivateQuestion(event.currentTarget.checked);
                    }}
                    style={privateCheckStyle}
                    type='checkbox'
                  />
                  <span>비밀글로 등록</span>
                </label>
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

  const renderBoardTableDetailContent = (thread: ProgramQnaThreadItem) => {
    const replies = getThreadReplies(thread, answerSource);
    const primaryReply =
      replies.find((reply) => reply.adminReply) ?? (replies.length ? replies[0] : null);

    if (editingThreadId === thread.id) {
      return renderThreadDetailContent(thread, openReplyThreadIds.includes(thread.id));
    }

    return (
      <>
        {thread.mine ? (
          <div className={styles['ownQuestionToolbar']}>
            <span className={styles['ownQuestionLabel']}>내 질문</span>
            <div className={styles['ownQuestionActions']}>
              <button
                className={styles['ownQuestionActionButton']}
                disabled={updateThreadMutation.isPending || deleteThreadMutation.isPending}
                onClick={() => {
                  handleStartThreadEdit(thread);
                }}
                type='button'
              >
                수정하기
              </button>
              <button
                className={styles['ownQuestionActionButton']}
                disabled={updateThreadMutation.isPending || deleteThreadMutation.isPending}
                onClick={() => {
                  handleDeleteThread(thread);
                }}
                type='button'
              >
                질문 삭제
              </button>
            </div>
          </div>
        ) : null}

        <div className={styles['detailPanel']}>
          <section className={styles['questionBlock']}>
            <span className={styles['questionIcon']}>Q</span>
            <strong className={styles['questionLabel']}>질문</strong>
            <p className={styles['questionContent']}>{thread.content}</p>
            <time className={styles['detailDate']} dateTime={thread.createdAt}>
              {formatDateTime(thread.createdAt)}
            </time>
          </section>

          <div className={styles['detailDivider']} />

          {primaryReply ? (
            <section className={styles['replyPanel']}>
              <span className={styles['answerIcon']}>A</span>
              <strong className={styles['replyAuthor']}>답변</strong>
              <div className={styles['replyBody']}>
                {primaryReply.adminReply ? (
                  <span className={styles['replyBadge']}>관리자 답변</span>
                ) : null}
                <p className={styles['replyContent']}>{primaryReply.content}</p>
              </div>
              <time className={styles['detailDate']} dateTime={primaryReply.createdAt}>
                {formatDateTime(primaryReply.createdAt)}
              </time>
            </section>
          ) : (
            <p className={styles['waitingText']}>아직 등록된 답변이 없습니다.</p>
          )}
        </div>
      </>
    );
  };

  const renderCompactDetail = (thread: ProgramQnaThreadItem) => {
    const replies = getThreadReplies(thread, answerSource);
    const isAnswered = isThreadAnswered(thread, answerSource);
    const isEditingThread = editingThreadId === thread.id;
    const isReplyComposerOpen = openReplyThreadIds.includes(thread.id);

    return (
      <article
        className={styles['compactDetail']}
        aria-labelledby={`qna-detail-${String(thread.id)}`}
      >
        <div className={styles['compactDetailScroll']}>
          <h3 className={styles['compactDetailProgramTitle']}>{thread.programTitle ?? title}</h3>
          <div className={styles['compactDetailNav']}>
            <button
              aria-label='Q&A 목록으로 돌아가기'
              className={styles['compactDetailIconButton']}
              onClick={() => {
                handleCancelThreadEdit();
                setExpandedThreadId(null);
              }}
              type='button'
            >
              <svg aria-hidden='true' fill='none' viewBox='0 0 24 24'>
                <path
                  d='M19 12H5M12 19L5 12L12 5'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                />
              </svg>
            </button>
            <button
              aria-label='Q&A 상세 닫기'
              className={styles['compactDetailIconButton']}
              onClick={() => {
                handleCancelThreadEdit();
                setExpandedThreadId(null);
              }}
              type='button'
            >
              <svg aria-hidden='true' fill='none' viewBox='0 0 24 24'>
                <path
                  d='M18 6L6 18M6 6L18 18'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                />
              </svg>
            </button>
          </div>

          {isEditingThread ? (
            <div className={styles['compactDetailEditor']}>
              <label
                className={styles['compactWriteLabel']}
                htmlFor='program-qna-compact-edit-title'
              >
                제목
              </label>
              <input
                className={classNames(styles['input'], styles['compactDetailEditTitleInput'])}
                id='program-qna-compact-edit-title'
                maxLength={QNA_TITLE_MAX_LENGTH}
                onChange={(event) => {
                  setEditingThreadTitle(event.target.value);
                }}
                placeholder='질문 내용을 한 줄로 요약해주세요.'
                value={editingThreadTitle}
              />
              <label
                className={styles['compactWriteLabel']}
                htmlFor='program-qna-compact-edit-content'
              >
                내용
              </label>
              <textarea
                className={classNames(styles['textarea'], styles['compactDetailEditContentInput'])}
                id='program-qna-compact-edit-content'
                maxLength={QNA_CONTENT_MAX_LENGTH}
                onChange={(event) => {
                  setEditingThreadContent(event.target.value);
                }}
                placeholder='강의와 관련하여 궁금한 내용을 작성해주세요.'
                value={editingThreadContent}
              />
              <label className={styles['privateOption']}>
                <input
                  checked={editingThreadPrivateQuestion}
                  onChange={(event) => {
                    setEditingThreadPrivateQuestion(event.currentTarget.checked);
                  }}
                  style={privateCheckStyle}
                  type='checkbox'
                />
                <span>비밀글로 등록</span>
              </label>
            </div>
          ) : (
            <>
              <span
                className={classNames(styles['boardStatusBadge'], styles['compactAnswerToggle'])}
                data-tone={isAnswered ? 'answered' : 'waiting'}
              >
                {isAnswered ? '답변완료' : waitingStatusLabel}
              </span>
              <h3 className={styles['compactDetailTitle']} id={`qna-detail-${String(thread.id)}`}>
                {thread.content || thread.title}
              </h3>
              <div className={styles['compactDetailMeta']}>
                <span>
                  {maskQnaAuthorName(
                    resolveQnaAuthorName(thread.authorName, thread.mine, currentDisplayName),
                  )}
                </span>
                <span>{formatDateTime(thread.createdAt)}</span>
              </div>
              <p className={styles['compactDetailBody']}>{thread.content}</p>

              <div className={styles['compactDetailDivider']} />

              {replies.length ? (
                <div className={styles['compactDetailReplies']}>
                  {replies.map((reply: ProgramQnaReplyItem) => (
                    <section className={styles['compactDetailReply']} key={reply.id}>
                      <div className={styles['compactReplyHeader']}>
                        <div className={styles['compactReplyInstructor']}>
                          <svg aria-hidden='true' fill='none' viewBox='0 0 24 24'>
                            <path
                              d='M9 17L4 12L9 7M4 12H16C18.2091 12 20 13.7909 20 16V17'
                              stroke='currentColor'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth='2'
                            />
                          </svg>
                          <strong>
                            {maskQnaAuthorName(
                              resolveQnaAuthorName(
                                reply.authorName,
                                reply.mine,
                                currentDisplayName,
                              ),
                            )}
                          </strong>
                        </div>
                        {reply.adminReply ? (
                          <span className={styles['compactInstructorBadge']}>강사 답변</span>
                        ) : null}
                      </div>
                      <time className={styles['compactReplyDate']} dateTime={reply.createdAt}>
                        {formatDateTime(reply.createdAt)}
                      </time>
                      <p className={styles['compactDetailBody']}>{reply.content}</p>
                    </section>
                  ))}
                </div>
              ) : (
                <p className={styles['compactDetailEmpty']}>
                  {detailDisplay === 'answersOnly'
                    ? '아직 미답변입니다.'
                    : '아직 등록된 답변이 없습니다.'}
                </p>
              )}
            </>
          )}
        </div>

        {isEditingThread ? (
          <div className={styles['compactDetailActionRow']}>
            <Button
              className={styles['compactDetailEditButton']}
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
              className={styles['compactDetailDeleteButton']}
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
        ) : (
          renderThreadManagementActions(thread, { compact: true })
        )}

        {!isEditingThread && allowReplies && isAuthenticated ? (
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
          </div>
        ) : null}
      </article>
    );
  };

  const closeCompactWrite = () => {
    setIsWriteFormOpen(false);
  };

  const resetCompactWrite = () => {
    setThreadTitle('');
    setThreadContent('');
    setThreadPrivateQuestion(false);
  };

  const renderCompactComposer = () => (
    <form
      className={styles['compactWrite']}
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmitNewThread();
      }}
    >
      <div className={styles['compactWriteScroll']}>
        <h3 className={styles['compactWriteTitle']}>Q&amp;A 작성</h3>
        <div className={styles['compactDetailNav']}>
          <button
            aria-label='Q&A 목록으로 돌아가기'
            className={styles['compactDetailIconButton']}
            onClick={closeCompactWrite}
            type='button'
          >
            <svg aria-hidden='true' fill='none' viewBox='0 0 24 24'>
              <path
                d='M19 12H5M12 19L5 12L12 5'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
              />
            </svg>
          </button>
          <button
            aria-label='Q&A 작성 닫기'
            className={styles['compactDetailIconButton']}
            onClick={closeCompactWrite}
            type='button'
          >
            <svg aria-hidden='true' fill='none' viewBox='0 0 24 24'>
              <path
                d='M18 6L6 18M6 6L18 18'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
              />
            </svg>
          </button>
        </div>

        <div className={styles['compactWriteFields']}>
          <label className={styles['compactWriteLabel']} htmlFor='program-qna-compact-title'>
            제목
          </label>
          <input
            className={classNames(styles['input'], styles['compactWriteTitleInput'])}
            id='program-qna-compact-title'
            maxLength={QNA_TITLE_MAX_LENGTH}
            onChange={(event) => {
              setThreadTitle(event.target.value);
            }}
            placeholder='질문 내용을 한 줄로 요약해주세요.'
            value={threadTitle}
          />
          <label className={styles['compactWriteLabel']} htmlFor='program-qna-compact-content'>
            내용
          </label>
          <textarea
            className={classNames(styles['textarea'], styles['compactWriteContentInput'])}
            id='program-qna-compact-content'
            maxLength={QNA_CONTENT_MAX_LENGTH}
            onChange={(event) => {
              setThreadContent(event.target.value);
            }}
            placeholder='강의와 관련하여 궁금한 내용을 작성해주세요.'
            value={threadContent}
          />
        </div>
        <p
          aria-label={`내용 글자 수 ${String(threadContent.length)} / ${String(QNA_CONTENT_MAX_LENGTH)}`}
          className={styles['compactWriteCharacterCount']}
        >
          <span>{String(threadContent.length)}</span> / {String(QNA_CONTENT_MAX_LENGTH)}
        </p>
        <label className={styles['privateOption']}>
          <input
            checked={threadPrivateQuestion}
            onChange={(event) => {
              setThreadPrivateQuestion(event.currentTarget.checked);
            }}
            style={privateCheckStyle}
            type='checkbox'
          />
          <span>비밀글로 등록</span>
        </label>
      </div>

      <div className={styles['compactWriteActionRow']}>
        <button
          className={styles['compactWriteCancelButton']}
          disabled={createThreadMutation.isPending}
          onClick={resetCompactWrite}
          type='button'
        >
          취소
        </button>
        <button
          className={styles['compactWriteSubmitButton']}
          disabled={
            createThreadMutation.isPending ||
            threadTitle.trim().length === 0 ||
            threadContent.trim().length === 0
          }
          type='submit'
        >
          {createThreadMutation.isPending ? '등록 중...' : '질문 등록'}
        </button>
      </div>
    </form>
  );

  const renderComposer = (isModal = false) => (
    <div
      className={classNames(
        styles['composer'],
        isBoardVariant && styles['composerBoard'],
        isModal && styles['composerModal'],
      )}
    >
      {isBoardVariant ? (
        <div className={styles['writerHeader']}>
          <h4 className={styles['writerTitle']}>Q&A 작성</h4>
        </div>
      ) : null}
      {isBoardVariant ? (
        <div className={styles['composerNotice']}>
          <span aria-hidden='true' className={styles['composerNoticeIcon']}>
            i
          </span>
          <div>
            <p className={styles['composerNoticeTitle']}>
              강의와 관련하여 궁금한 내용을 작성해 주세요.
            </p>
            <p className={styles['composerNoticeDescription']}>
              질문은 다른 수강생에게 공개될 수 있습니다.
            </p>
          </div>
        </div>
      ) : null}
      <div className={styles['composerFields']}>
        {isBoardVariant ? (
          <label className={styles['composerLabel']} htmlFor='program-qna-board-title'>
            질문 제목
          </label>
        ) : null}
        <input
          className={styles['input']}
          id={isBoardVariant ? 'program-qna-board-title' : undefined}
          maxLength={QNA_TITLE_MAX_LENGTH}
          onChange={(event) => {
            setThreadTitle(event.target.value);
          }}
          placeholder={isBoardVariant ? '질문 내용을 요약해주세요.' : '제목'}
          value={threadTitle}
        />
        {isBoardVariant ? (
          <label className={styles['composerLabel']} htmlFor='program-qna-board-content'>
            질문 내용
          </label>
        ) : null}
        <textarea
          className={styles['textarea']}
          id={isBoardVariant ? 'program-qna-board-content' : undefined}
          maxLength={QNA_CONTENT_MAX_LENGTH}
          onChange={(event) => {
            setThreadContent(event.target.value);
          }}
          placeholder={
            isBoardVariant
              ? '궁금한 내용, 이해가 되지 않는 부분, 확인하고 싶은 내용 등을 구체적으로 작성해주세요.'
              : `내용 (${String(QNA_CONTENT_MAX_LENGTH)}자 이내)`
          }
          value={threadContent}
        />
      </div>
      {isBoardVariant ? (
        <p className={styles['composerCharacterCount']}>
          <span>{String(threadContent.length)}</span> / {String(QNA_CONTENT_MAX_LENGTH)}
        </p>
      ) : null}
      <label className={styles['privateOption']}>
        <input
          checked={threadPrivateQuestion}
          onChange={(event) => {
            setThreadPrivateQuestion(event.currentTarget.checked);
          }}
          style={privateCheckStyle}
          type='checkbox'
        />
        <span>비밀글로 등록</span>
      </label>
      <div className={styles['actionRow']}>
        {isBoardVariant ? (
          <Button
            className={styles['footerCancelButton']}
            disabled={createThreadMutation.isPending}
            onClick={() => {
              setThreadTitle('');
              setThreadContent('');
              setThreadPrivateQuestion(false);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            취소
          </Button>
        ) : null}
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
            목록으로
          </Button>
        ) : null}
        <Button
          className={isBoardVariant ? styles['footerSubmitButton'] : undefined}
          disabled={
            createThreadMutation.isPending ||
            threadTitle.trim().length === 0 ||
            threadContent.trim().length === 0
          }
          onClick={() => {
            handleSubmitNewThread();
          }}
          size='sm'
          type='button'
          variant='primary'
        >
          {createThreadMutation.isPending ? '등록 중...' : isBoardVariant ? '등록하기' : '등록'}
        </Button>
      </div>
    </div>
  );

  return (
    <section
      className={classNames(
        styles['panel'],
        isBoardVariant && styles['panelBoard'],
        (activeCompactDetailThread || (isCompactBoard && isWriteFormOpen)) &&
          styles['panelBoardCompactDetail'],
      )}
    >
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

          {showBoardReadContent &&
          !activeCompactDetailThread &&
          !(isCompactBoard && isWriteFormOpen) ? (
            <>
              {!isCompactBoard ? (
                <div className={styles['courseQnaNotice']}>
                  <span aria-hidden='true' className={styles['courseQnaNoticeIcon']}>
                    i
                  </span>
                  <div>
                    <p className={styles['courseQnaNoticeTitle']}>
                      강의 Q&amp;A는 해당 과정의 강의 내용과 관련된 질문을 위한 공간입니다.
                    </p>
                    <p className={styles['courseQnaNoticeDescription']}>
                      강의 내용과 무관한 문의는 운영 Q&amp;A를 이용해주세요.
                    </p>
                  </div>
                </div>
              ) : null}
              <div
                className={classNames(
                  styles['boardToolbar'],
                  isCompactBoard && styles['boardToolbarCompact'],
                )}
              >
                {!isCompactBoard ? (
                  <div
                    className={styles['boardFilterGroup']}
                    data-active-index={statusFilterIndex}
                    role='tablist'
                    aria-label='질문 상태 필터'
                  >
                    {BOARD_STATUS_FILTER_OPTIONS.map((option) => (
                      <button
                        aria-selected={statusFilter === option.value}
                        className={styles['boardFilterButton']}
                        data-active={statusFilter === option.value ? 'true' : 'false'}
                        key={option.value}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setCurrentPage(1);
                        }}
                        role='tab'
                        type='button'
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <UnifiedSearchBar
                  className={classNames(
                    styles['boardSearchBar'],
                    isCompactBoard && styles['compactSearchBar'],
                  )}
                  inputAriaLabel='Q&A 검색'
                  onChange={(nextValue) => {
                    setSearchInput(nextValue);
                  }}
                  onSubmit={() => {
                    setSearchKeyword(searchInput);
                    setCurrentPage(1);
                  }}
                  placeholder={
                    isCompactBoard ? '검색어를 입력하세요.' : '제목 또는 내용을 검색해 주세요.'
                  }
                  value={searchInput}
                />
                {!isCompactBoard ? (
                  <button
                    className={styles['writeButton']}
                    onClick={handleToggleWriteForm}
                    type='button'
                  >
                    <img
                      alt=''
                      aria-hidden='true'
                      className={styles['writeButtonIcon']}
                      src={squarePenIconSrc}
                    />
                    <span className={styles['writeButtonText']}>질문 작성</span>
                  </button>
                ) : null}
                {isCompactBoard ? (
                  <div
                    className={styles['compactFilterRow']}
                    data-active-index={statusFilterIndex}
                    role='tablist'
                    aria-label='질문 상태 필터'
                  >
                    {[
                      { count: statusFilterCounts.all, label: '전체', value: 'all' },
                      { count: statusFilterCounts.answered, label: '완료', value: 'answered' },
                      { count: statusFilterCounts.waiting, label: '대기', value: 'waiting' },
                    ].map((option) => (
                      <button
                        aria-selected={statusFilter === option.value}
                        className={styles['compactFilterButton']}
                        data-active={statusFilter === option.value ? 'true' : 'false'}
                        key={option.value}
                        onClick={() => {
                          setStatusFilter(option.value as BoardStatusFilter);
                          setCurrentPage(1);
                        }}
                        role='tab'
                        type='button'
                      >
                        <span>{option.label}</span>
                        <span>{String(option.count)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
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
      ) : (!isBoardVariant && isAuthenticated) || (isBoardVariant && isWriteFormOpen) ? (
        isCompactBoard ? (
          renderCompactComposer()
        ) : (
          renderComposer(false)
        )
      ) : null}

      {pendingDeleteThread ? (
        <Modal
          bodyClassName={styles['deleteModalBody']}
          closeButtonClassName={styles['deleteModalClose']}
          closeButtonContent={<img alt='' aria-hidden='true' src={closeIconSrc} />}
          closeButtonLabel='삭제 확인 닫기'
          headerClassName={styles['deleteModalHeader']}
          hideTitle
          onClose={handleCancelDeleteThread}
          panelClassName={styles['deleteModalPanel']}
          title='질문 삭제'
        >
          <div className={styles['deleteModalContent']}>
            <p className={styles['deleteModalTitle']}>질문을 삭제하시겠어요?</p>
            <p className={styles['deleteModalDescription']}>질문과 답변이 전부 삭제됩니다.</p>
            <div className={styles['deleteModalActions']}>
              <Button
                className={styles['deleteModalCancelButton']}
                disabled={deleteThreadMutation.isPending}
                onClick={handleCancelDeleteThread}
                type='button'
                variant='secondary'
              >
                취소
              </Button>
              <Button
                className={styles['deleteModalConfirmButton']}
                disabled={deleteThreadMutation.isPending}
                onClick={handleConfirmDeleteThread}
                type='button'
              >
                {deleteThreadMutation.isPending ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        </Modal>
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
      !(isCompactBoard && isWriteFormOpen) &&
      !qnaQuery.isLoading &&
      (!qnaQuery.isError || shouldTreatQueryErrorAsEmptyState) ? (
        <>
          {activeCompactDetailThread ? (
            renderCompactDetail(activeCompactDetailThread)
          ) : isCompactBoard ? (
            paginatedThreads.length ? (
              <div className={styles['compactBoardList']}>
                {paginatedThreads.map((thread) => {
                  const isExpanded = activeExpandedThreadId === thread.id;
                  const isReplyComposerOpen = openReplyThreadIds.includes(thread.id);
                  const isReadable = canReadThread(thread);

                  return (
                    <article
                      className={classNames(
                        styles['threadCard'],
                        styles['threadCardBoardCompact'],
                        isExpanded && styles['threadCardBoardCompactAnswerExpanded'],
                      )}
                      key={thread.id}
                    >
                      <button
                        aria-controls={`program-qna-detail-${String(thread.id)}`}
                        aria-expanded={isExpanded}
                        className={styles['compactThreadButton']}
                        data-locked={!isReadable}
                        onClick={() => {
                          handleOpenCompactThread(thread);
                        }}
                        type='button'
                      >
                        <span className={styles['compactThreadPrimary']}>
                          <div className={styles['compactThreadTopRow']}>
                            <span className={styles['compactThreadAuthorGroup']}>
                              <span
                                className={classNames(
                                  styles['boardStatusBadge'],
                                  styles['compactStatusBadge'],
                                )}
                                data-tone={
                                  isThreadAnswered(thread, answerSource) ? 'answered' : 'waiting'
                                }
                              >
                                {isThreadAnswered(thread, answerSource)
                                  ? '답변완료'
                                  : waitingStatusLabel}
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
                            </span>
                            <span className={styles['compactThreadDate']}>
                              {formatDate(thread.createdAt)}
                            </span>
                          </div>
                          <span className={styles['compactThreadTextBlock']}>
                            <span className={styles['srOnly']}>{thread.title}</span>
                            <strong className={styles['compactThreadTitle']}>
                              {thread.content || thread.title}
                            </strong>
                          </span>
                        </span>
                      </button>

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
            ) : deferredSearchKeyword || statusFilter !== 'all' ? (
              <div className={styles['stateBox']}>검색 조건에 맞는 질문이 없습니다.</div>
            ) : (
              <div />
            )
          ) : (
            <div className={styles['tableWrap']}>
              <table className={styles['boardTable']}>
                <colgroup>
                  <col className={styles['statusCol']} />
                  <col />
                  <col className={styles['authorCol']} />
                  <col className={styles['dateCol']} />
                </colgroup>
                <tbody>
                  {paginatedThreads.length ? (
                    paginatedThreads.map((thread) => {
                      const isExpanded = activeExpandedThreadId === thread.id;
                      const isReadable = canReadThread(thread);
                      const authorName = maskQnaAuthorName(
                        resolveQnaAuthorName(thread.authorName, thread.mine, currentDisplayName),
                      );

                      return (
                        <Fragment key={thread.id}>
                          <tr
                            aria-expanded={isExpanded}
                            className={styles['questionRow']}
                            data-expanded={isExpanded}
                            data-locked={!isReadable}
                            onClick={() => {
                              handleToggleThread(thread);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') {
                                return;
                              }

                              event.preventDefault();
                              handleToggleThread(thread);
                            }}
                            tabIndex={0}
                          >
                            <td className={styles['statusCell']}>
                              <span
                                className={styles['boardStatusBadge']}
                                data-tone={
                                  isThreadAnswered(thread, answerSource) ? 'answered' : 'waiting'
                                }
                              >
                                {isThreadAnswered(thread, answerSource)
                                  ? '답변 완료'
                                  : waitingStatusLabel}
                              </span>
                            </td>
                            <td className={styles['titleCell']}>
                              <span className={styles['titleButton']}>
                                {thread.privateQuestion ? (
                                  <span className={styles['privateBadge']}>비밀글</span>
                                ) : null}
                                {thread.title}
                              </span>
                            </td>
                            <td className={styles['authorCell']}>{authorName}</td>
                            <td className={styles['dateCell']}>
                              <time dateTime={thread.createdAt}>
                                {formatDate(thread.createdAt)}
                              </time>
                              <span
                                aria-hidden='true'
                                className={styles['dropdownIcon']}
                                data-expanded={isExpanded}
                              />
                            </td>
                          </tr>

                          {isExpanded ? (
                            <tr className={styles['detailRow']}>
                              <td colSpan={4}>
                                <div id={`program-qna-detail-${String(thread.id)}`}>
                                  {renderBoardTableDetailContent(thread)}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['emptyRow']} colSpan={4}>
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

          {!activeCompactDetailThread && !(isCompactBoard && isWriteFormOpen) ? (
            <div
              className={classNames(
                styles['boardFooter'],
                isCompactBoard && styles['compactBoardFooter'],
              )}
            >
              {isCompactBoard ? (
                <>
                  {normalizedCurrentPage < totalPages ? (
                    <button
                      className={styles['moreButton']}
                      onClick={() => {
                        setCurrentPage((page) => Math.min(totalPages, page + 1));
                      }}
                      type='button'
                    >
                      더보기
                    </button>
                  ) : null}
                  <Button
                    className={styles['writeButton']}
                    onClick={handleToggleWriteForm}
                    size='md'
                    type='button'
                  >
                    {isWriteFormOpen ? '작성 닫기' : '글 작성하기'}
                  </Button>
                </>
              ) : totalPages > 1 ? (
                <div className={styles['pagination']}>
                  <button
                    className={styles['pageNavButton']}
                    disabled={normalizedCurrentPage === 1}
                    onClick={() => {
                      setCurrentPage(1);
                    }}
                    type='button'
                  >
                    {'<<'}
                  </button>
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
                  <button
                    className={styles['pageNavButton']}
                    disabled={normalizedCurrentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(totalPages);
                    }}
                    type='button'
                  >
                    {'>>'}
                  </button>
                </div>
              ) : (
                <div />
              )}
            </div>
          ) : null}
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
