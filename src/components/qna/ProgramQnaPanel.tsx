import { useDeferredValue, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import {
  createProgramQnaReply,
  createProgramQnaThread,
  fetchProgramQna,
  programQnaQueryKey,
} from '@/api/programQna';
import Button from '@/components/ui/Button/Button';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { ProgramQnaAuthorType, ProgramQnaThreadItem } from '@/types/programQna';
import { classNames } from '@/utils/classNames';

import styles from './ProgramQnaPanel.module.scss';

type QnaVariant = 'board' | 'panel';

interface ProgramQnaPanelProps {
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

const matchesSearchKeyword = (thread: ProgramQnaThreadItem, keyword: string) => {
  if (!keyword) {
    return true;
  }

  return `${thread.title} ${thread.content} ${thread.authorName} ${thread.programTitle ?? ''}`
    .toLowerCase()
    .includes(keyword);
};

export const ProgramQnaPanel = ({
  enabled = true,
  programId,
  programThreadCount = null,
  title = 'Q&A',
  variant = 'panel',
}: ProgramQnaPanelProps) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBoardVariant = variant === 'board';
  const [searchKeyword, setSearchKeyword] = useState('');
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [openReplyThreadIds, setOpenReplyThreadIds] = useState<number[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim().toLowerCase());

  const resolvedProgramId = programId ?? null;

  const qnaQuery = useQuery({
    enabled: enabled && resolvedProgramId !== null,
    queryFn: () => fetchProgramQna(resolvedProgramId as number, { page: 0, size: 20 }),
    queryKey: programQnaQueryKey(resolvedProgramId),
  });

  const invalidateQna = async () => {
    await queryClient.invalidateQueries({
      queryKey: programQnaQueryKey(resolvedProgramId),
    });
  };

  const createThreadMutation = useMutation({
    mutationFn: (payload: { content: string; title: string }) =>
      createProgramQnaThread(resolvedProgramId as number, {
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
      await invalidateQna();
      showToast({
        message: 'Q&A를 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: ({ content, threadId }: { content: string; threadId: number }) =>
      createProgramQnaReply(resolvedProgramId as number, threadId, { content }),
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

  const threads = qnaQuery.data?.content ?? [];
  const visibleThreads = useMemo(() => {
    return threads.filter((thread) => matchesSearchKeyword(thread, deferredSearchKeyword));
  }, [deferredSearchKeyword, threads]);

  const resolvedProgramThreadCount = qnaQuery.data?.totalElements ?? programThreadCount ?? null;

  const headerMeta = useMemo(() => {
    if (resolvedProgramThreadCount !== null) {
      return `프로그램 전체 Q&A ${String(resolvedProgramThreadCount)}개`;
    }

    return '프로그램별 Q&A를 확인할 수 있습니다.';
  }, [resolvedProgramThreadCount]);

  const toggleReplyComposer = (threadId: number) => {
    setOpenReplyThreadIds((current) => {
      return current.includes(threadId)
        ? current.filter((value) => value !== threadId)
        : [...current, threadId];
    });
  };

  if (resolvedProgramId === null) {
    return <p className={styles['emptyState']}>Q&A를 연결할 프로그램 정보를 찾지 못했습니다.</p>;
  }

  return (
    <section className={classNames(styles['panel'], isBoardVariant && styles['panelBoard'])}>
      {isBoardVariant ? (
        <header className={styles['boardToolbar']}>
          <div className={styles['boardIntro']}>
            <div>
              <p className={styles['boardIntroLabel']}>Q&A</p>
              <h3 className={styles['boardIntroTitle']}>
                프로그램 관련 질문을 게시판 형태로 한눈에 확인할 수 있습니다.
              </h3>
              <p className={styles['boardIntroDescription']}>
                강의 내용, 준비물, 운영 방식에 대한 질문을 남기고 답변을 확인해 보세요.
              </p>
            </div>
            <p className={styles['boardIntroMeta']}>{headerMeta}</p>
          </div>

          <label className={styles['boardSearchBox']}>
            <span className={styles['srOnly']}>Q&A 검색</span>
            <input
              className={styles['boardSearchInput']}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
              }}
              placeholder='궁금한 내용을 검색해 보세요!'
              value={searchKeyword}
            />
          </label>
        </header>
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

      {!isAuthenticated ? (
        <div className={styles['loginPrompt']}>
          <p className={styles['loginHint']}>Q&A 작성과 답글 등록은 로그인 후 사용할 수 있습니다.</p>
          <div>
            <Link to={routePaths.login}>로그인하러 가기</Link>
          </div>
        </div>
      ) : (
        <div className={classNames(styles['composer'], isBoardVariant && styles['composerBoard'])}>
          <div className={styles['composerFields']}>
            <input
              className={styles['input']}
              maxLength={200}
              onChange={(event) => {
                setThreadTitle(event.target.value);
              }}
              placeholder='프로그램에서 궁금한 점을 제목으로 남겨 주세요.'
              value={threadTitle}
            />
            <textarea
              className={styles['textarea']}
              onChange={(event) => {
                setThreadContent(event.target.value);
              }}
              placeholder='질문 배경과 궁금한 내용을 자세히 적어 주세요.'
              value={threadContent}
            />
          </div>
          <div className={styles['actionRow']}>
            <p className={styles['fieldHint']}>이 글은 프로그램 Q&A 게시판에 등록됩니다.</p>
            <Button
              disabled={
                createThreadMutation.isPending ||
                threadTitle.trim().length === 0 ||
                threadContent.trim().length === 0
              }
              onClick={() => {
                void createThreadMutation.mutateAsync({
                  content: threadContent.trim(),
                  title: threadTitle.trim(),
                });
              }}
              size='sm'
              type='button'
            >
              질문 등록
            </Button>
          </div>
        </div>
      )}

      {qnaQuery.isLoading ? <p className={styles['emptyState']}>Q&A를 불러오는 중입니다.</p> : null}
      {qnaQuery.isError ? (
        <p className={styles['errorText']}>
          {qnaQuery.error instanceof Error ? qnaQuery.error.message : 'Q&A를 불러오지 못했습니다.'}
        </p>
      ) : null}

      {!qnaQuery.isLoading && !qnaQuery.isError && visibleThreads.length === 0 ? (
        <p className={styles['emptyState']}>
          {deferredSearchKeyword
            ? '검색 조건에 맞는 Q&A가 없습니다.'
            : '이 프로그램에 등록된 Q&A가 아직 없습니다.'}
        </p>
      ) : null}

      {visibleThreads.length > 0 ? (
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
                      {thread.authorName} · {formatDateTime(thread.createdAt)}
                    </p>
                    {isBoardVariant ? (
                      <p className={styles['threadMetaAux']}>댓글 {String(thread.replyCount)}</p>
                    ) : null}
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
                            {reply.authorName} · {formatDateTime(reply.createdAt)}
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

export default ProgramQnaPanel;
