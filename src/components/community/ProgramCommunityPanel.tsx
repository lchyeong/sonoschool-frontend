import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import {
  createProgramCommunityReply,
  createProgramCommunityThread,
  fetchProgramCommunity,
  programCommunityQueryKey,
} from '@/api/programCommunity';
import Button from '@/components/ui/Button/Button';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type {
  ProgramCommunityAuthorType,
  ProgramCommunityThreadItem,
} from '@/types/programCommunity';
import { classNames } from '@/utils/classNames';

import styles from './ProgramCommunityPanel.module.scss';

type FilterScope = 'program' | 'lecture';

interface ProgramCommunityPanelProps {
  enabled?: boolean;
  lectureId?: number | null;
  lectureThreadCount?: number | null;
  programId: number | null;
  programThreadCount?: number | null;
  title?: string;
}

const AUTHOR_TYPE_LABELS: Record<ProgramCommunityAuthorType, string> = {
  ADMIN: '관리자',
  ENROLLED: '수강생',
  MEMBER: '회원',
};

const LECTURE_TYPE_LABELS: Record<
  NonNullable<ProgramCommunityThreadItem['lectureType']>,
  string
> = {
  OFFLINE: '오프라인',
  PRACTICUM: '실습',
  PROBLEM: '문제풀이',
  RESOURCE: '자료',
  VIDEO: '영상',
};

const formatRelativeDate = (value: string) => {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
};

export const ProgramCommunityPanel = ({
  enabled = true,
  lectureId = null,
  lectureThreadCount = null,
  programId,
  programThreadCount = null,
  title = '커뮤니티',
}: ProgramCommunityPanelProps) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasLectureContext = lectureId !== null;
  const [filterScope, setFilterScope] = useState<FilterScope>(
    hasLectureContext ? 'lecture' : 'program',
  );
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [openReplyThreadIds, setOpenReplyThreadIds] = useState<number[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const activeFilterScope = hasLectureContext ? filterScope : 'program';
  const activeLectureId = activeFilterScope === 'lecture' ? lectureId : null;
  const resolvedProgramId = programId ?? null;

  const communityQuery = useQuery({
    enabled: enabled && resolvedProgramId !== null,
    queryFn: () =>
      fetchProgramCommunity(resolvedProgramId as number, {
        lectureId: activeLectureId,
        page: 0,
        size: 20,
      }),
    queryKey: programCommunityQueryKey(resolvedProgramId, activeLectureId, activeFilterScope),
  });

  const createThreadMutation = useMutation({
    mutationFn: (payload: { content: string; title: string }) =>
      createProgramCommunityThread(resolvedProgramId as number, {
        content: payload.content,
        lectureId: activeLectureId,
        title: payload.title,
      }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '커뮤니티 글 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setThreadTitle('');
      setThreadContent('');
      await queryClient.invalidateQueries({
        queryKey: programCommunityQueryKey(resolvedProgramId, activeLectureId, activeFilterScope),
      });
      showToast({
        message: '커뮤니티 글을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: ({ content, threadId }: { content: string; threadId: number }) =>
      createProgramCommunityReply(resolvedProgramId as number, threadId, { content }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '커뮤니티 답글 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      setReplyDrafts((current) => ({
        ...current,
        [variables.threadId]: '',
      }));
      await queryClient.invalidateQueries({
        queryKey: programCommunityQueryKey(resolvedProgramId, activeLectureId, activeFilterScope),
      });
      showToast({
        message: '답글을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const threads = communityQuery.data?.content ?? [];
  const resolvedLectureThreadCount =
    activeFilterScope === 'lecture'
      ? (communityQuery.data?.totalElements ?? lectureThreadCount ?? null)
      : null;
  const resolvedProgramThreadCount =
    activeFilterScope === 'program'
      ? (communityQuery.data?.totalElements ?? programThreadCount ?? null)
      : programThreadCount;

  const headerMeta = useMemo(() => {
    if (activeFilterScope === 'lecture' && resolvedLectureThreadCount !== null) {
      return `현재 강의 질문 ${String(resolvedLectureThreadCount)}개`;
    }

    if (resolvedProgramThreadCount !== null) {
      return `프로그램 전체 질문 ${String(resolvedProgramThreadCount)}개`;
    }

    return '프로그램별 질의응답을 확인할 수 있습니다.';
  }, [activeFilterScope, resolvedLectureThreadCount, resolvedProgramThreadCount]);

  const toggleReplyComposer = (threadId: number) => {
    setOpenReplyThreadIds((current) => {
      return current.includes(threadId)
        ? current.filter((value) => value !== threadId)
        : [...current, threadId];
    });
  };

  if (resolvedProgramId === null) {
    return (
      <p className={styles['emptyState']}>커뮤니티를 연결할 프로그램 정보를 찾지 못했습니다.</p>
    );
  }

  return (
    <section className={styles['panel']}>
      <header className={styles['header']}>
        <div>
          <h3 className={styles['title']}>{title}</h3>
          <p className={styles['description']}>
            비수강생과 수강생 모두 참여할 수 있으며, 작성자 구분이 함께 표시됩니다.
          </p>
        </div>
        <p className={styles['meta']}>{headerMeta}</p>
      </header>

      {hasLectureContext ? (
        <div className={styles['filterTabs']}>
          <button
            className={classNames(
              styles['filterButton'],
              activeFilterScope === 'lecture' && styles['filterButtonActive'],
            )}
            onClick={() => {
              setFilterScope('lecture');
            }}
            type='button'
          >
            현재 강의
          </button>
          <button
            className={classNames(
              styles['filterButton'],
              activeFilterScope === 'program' && styles['filterButtonActive'],
            )}
            onClick={() => {
              setFilterScope('program');
            }}
            type='button'
          >
            프로그램 전체
          </button>
        </div>
      ) : null}

      {!isAuthenticated ? (
        <div className={styles['loginPrompt']}>
          <p className={styles['loginHint']}>글과 답글 등록은 로그인 후 사용할 수 있습니다.</p>
          <div>
            <Link to={routePaths.login}>로그인하러 가기</Link>
          </div>
        </div>
      ) : (
        <div className={styles['composer']}>
          <div className={styles['composerFields']}>
            <input
              className={styles['input']}
              maxLength={200}
              onChange={(event) => {
                setThreadTitle(event.target.value);
              }}
              placeholder={
                filterScope === 'lecture'
                  ? '현재 강의에서 궁금한 점을 한 줄 제목으로 남겨 주세요.'
                  : '프로그램 전체와 관련된 질문 제목을 입력해 주세요.'
              }
              value={threadTitle}
            />
            <textarea
              className={styles['textarea']}
              onChange={(event) => {
                setThreadContent(event.target.value);
              }}
              placeholder='상황과 질문 내용을 자세히 적어 주세요.'
              value={threadContent}
            />
          </div>
          <div className={styles['actionRow']}>
            <p className={styles['fieldHint']}>
              {filterScope === 'lecture'
                ? '이 글은 현재 강의 문맥에 연결됩니다.'
                : '이 글은 프로그램 전체 커뮤니티에 등록됩니다.'}
            </p>
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

      {communityQuery.isLoading ? (
        <p className={styles['emptyState']}>커뮤니티를 불러오는 중입니다.</p>
      ) : null}
      {communityQuery.isError ? (
        <p className={styles['errorText']}>
          {communityQuery.error instanceof Error
            ? communityQuery.error.message
            : '커뮤니티를 불러오지 못했습니다.'}
        </p>
      ) : null}

      {!communityQuery.isLoading && !communityQuery.isError && threads.length === 0 ? (
        <p className={styles['emptyState']}>
          {filterScope === 'lecture'
            ? '현재 강의에 등록된 질문이 아직 없습니다.'
            : '이 프로그램에 등록된 질문이 아직 없습니다.'}
        </p>
      ) : null}

      {threads.length > 0 ? (
        <div className={styles['threadList']}>
          {threads.map((thread) => {
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
                      {thread.answered ? '답변 진행중' : '답변 대기'}
                    </span>
                    {thread.lectureTitle && thread.lectureType ? (
                      <span className={styles['lectureBadge']}>
                        {LECTURE_TYPE_LABELS[thread.lectureType]} · {thread.lectureTitle}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles['metaRow']}>
                    <p className={styles['threadMeta']}>
                      {thread.authorName} · {formatRelativeDate(thread.createdAt)}
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
                              <span className={styles['lectureBadge']}>관리자 답글</span>
                            ) : null}
                          </div>
                          <p className={styles['replyMeta']}>
                            {reply.authorName} · {formatRelativeDate(reply.createdAt)}
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
                          <span className={styles['fieldHint']}>
                            현재 커뮤니티 글에 답글로 등록됩니다.
                          </span>
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

export default ProgramCommunityPanel;
