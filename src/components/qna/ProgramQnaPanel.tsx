import { Fragment, useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/errors';
import {
  createProgramQnaReply,
  createProgramQnaThread,
  fetchProgramQna,
  programQnaQueryKey,
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
import type { ProgramQnaAuthorType, ProgramQnaThreadItem } from '@/types/programQna';
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

const BOARD_PAGE_SIZE = 6;
const EMPTY_THREADS: ProgramQnaThreadItem[] = [];

interface ProgramQnaPanelProps {
  boardLayout?: BoardLayout;
  enabled?: boolean;
  programId: number | null;
  programThreadCount?: number | null;
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

const matchesStatusFilter = (thread: ProgramQnaThreadItem, statusFilter: BoardStatusFilter) => {
  if (statusFilter === 'all') {
    return true;
  }

  return statusFilter === 'answered' ? thread.answered : !thread.answered;
};

const ProgramQnaPanelContent = ({
  boardLayout = 'table',
  enabled = true,
  resolvedProgramId,
  programThreadCount = null,
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
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null);
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [openReplyThreadIds, setOpenReplyThreadIds] = useState<number[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim().toLowerCase());

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

  const threads = qnaQuery.data?.content ?? EMPTY_THREADS;
  const visibleThreads = useMemo(() => {
    return threads.filter((thread) => {
      return (
        matchesSearchKeyword(thread, deferredSearchKeyword) &&
        (!isBoardVariant || matchesStatusFilter(thread, statusFilter))
      );
    });
  }, [deferredSearchKeyword, isBoardVariant, statusFilter, threads]);

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

  const handleToggleWriteForm = () => {
    if (!isAuthenticated) {
      void navigate(routePaths.login);
      return;
    }

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

  const renderThreadDetailContent = (
    thread: ProgramQnaThreadItem,
    isReplyComposerOpen: boolean,
    expandedLayoutClassName?: string,
  ) => {
    return (
      <div className={classNames(styles['detailInner'], expandedLayoutClassName)}>
        <div className={styles['detailQuestion']}>
          <p className={styles['detailLabel']}>질문 내용</p>
          <p className={styles['detailText']}>{thread.content}</p>
        </div>

        <div className={styles['detailAnswer']}>
          <p className={styles['detailLabel']}>문의에 대한 답변</p>
          {thread.replies.length ? (
            <div className={styles['detailReplyList']}>
              {thread.replies.map((reply) => (
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
            <p className={styles['detailText']}>아직 등록된 답변이 없습니다.</p>
          )}
        </div>

        {isAuthenticated ? (
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
          <div className={styles['boardHeader']}>
            <div className={styles['boardTitleBlock']}>
              <h3 className={styles['boardTitle']}>강의 Q&A</h3>
            </div>
            <p className={styles['boardSummary']}>
              총 {String(resolvedProgramThreadCount ?? threads.length)}건 중 검색 결과{' '}
              {String(visibleThreads.length)}건
            </p>
          </div>

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
                  const isReplyComposerOpen = openReplyThreadIds.includes(thread.id);

                  return (
                    <article
                      className={classNames(
                        styles['threadCard'],
                        styles['threadCardBoardCompact'],
                        isExpanded && styles['threadCardBoardCompactExpanded'],
                      )}
                      key={thread.id}
                    >
                      <button
                        aria-controls={`program-qna-detail-${String(thread.id)}`}
                        aria-expanded={isExpanded}
                        className={styles['compactThreadButton']}
                        onClick={() => {
                          setExpandedThreadId((current) =>
                            current === thread.id ? null : thread.id,
                          );
                        }}
                        type='button'
                      >
                        <div className={styles['compactThreadPrimary']}>
                          <div className={styles['compactThreadTopRow']}>
                            <span className={styles['compactThreadNumber']}>
                              {String(rowNumber)}
                            </span>
                            <span
                              className={styles['boardStatusBadge']}
                              data-tone={thread.answered ? 'answered' : 'waiting'}
                            >
                              {thread.answered ? '답변완료' : '답변대기'}
                            </span>
                            <span className={styles['compactThreadDate']}>
                              {formatDate(thread.createdAt)}
                            </span>
                          </div>
                          <strong className={styles['compactThreadTitle']}>{thread.title}</strong>
                          <span className={styles['compactThreadPreview']}>
                            {buildQnaPreview(thread.content, QNA_LIST_CONTENT_PREVIEW_LENGTH)}
                          </span>
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
                          <div className={styles['compactThreadMetaSecondary']}>
                            <span className={styles['compactThreadReplyCount']}>
                              답글 {String(thread.replyCount)}
                            </span>
                            <span className={styles['compactThreadChevron']} aria-hidden='true' />
                          </div>
                        </div>
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
                                data-tone={thread.answered ? 'answered' : 'waiting'}
                              >
                                {thread.answered ? '답변완료' : '답변대기'}
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
                  <h4 className={styles['threadTitle']}>{thread.title}</h4>
                  <p className={styles['threadBody']}>{thread.content}</p>
                </div>

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
