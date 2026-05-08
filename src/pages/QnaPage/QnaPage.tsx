import { Fragment, useMemo, useState, type CSSProperties } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { createGlobalQuestion, deleteGlobalQuestion, updateGlobalQuestion } from '@/api/qna';
import checkWhiteIconSrc from '@/assets/icons/lucide_check_white_20.svg';
import squarePenIconSrc from '@/assets/icons/mypage-menu-square-pen.svg';
import { QNA_CONTENT_MAX_LENGTH, QNA_TITLE_MAX_LENGTH } from '@/constants/qna';
import { globalQuestionsQueryKey, useGlobalQuestionsQuery } from '@/query/useQnaQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { sanitizeRichTextHtml } from '@/utils/htmlContent';
import { maskQnaAuthorName, resolveQnaAuthorName, validateQnaQuestionDraft } from '@/utils/qna';

import styles from './QnaPage.module.scss';

type BoardStatusFilter = 'all' | 'answered' | 'waiting';

const PAGE_SIZE = 8;

const statusFilterOptions: Array<{ label: string; value: BoardStatusFilter }> = [
  { label: '전체 상태', value: 'all' },
  { label: '답변 완료', value: 'answered' },
  { label: '답변 대기', value: 'waiting' },
];

const buildMaskIconStyle = (iconSrc: string) => {
  return {
    '--qna-icon': `url("${iconSrc}")`,
  } as CSSProperties & Record<'--qna-icon', string>;
};

const buildPrivateCheckStyle = () => {
  return {
    '--qna-private-check-icon': `url("${checkWhiteIconSrc}")`,
  } as CSSProperties & Record<'--qna-private-check-icon', string>;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 || 12;

  return `${year}.${month}.${day} ${meridiem} ${String(hour12)}:${minutes}`;
};

const getPaginationRange = (activePage: number, totalPages: number) => {
  const visibleCount = Math.min(5, totalPages);
  const half = Math.floor(visibleCount / 2);
  const start = Math.min(
    Math.max(1, activePage - half),
    Math.max(1, totalPages - visibleCount + 1),
  );

  return Array.from({ length: visibleCount }, (_, index) => start + index);
};

const QnaPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentDisplayName = useAuthStore((state) => state.displayName);
  const currentRole = useAuthStore((state) => state.role);
  const showToast = useToastStore((state) => state.showToast);
  const questionsQuery = useGlobalQuestionsQuery();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [privateQuestion, setPrivateQuestion] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const writeIconStyle = useMemo(() => buildMaskIconStyle(squarePenIconSrc), []);
  const privateCheckStyle = useMemo(() => buildPrivateCheckStyle(), []);
  const editingQuestion = useMemo(() => {
    if (editingQuestionId === null) {
      return null;
    }

    return questions.find((question) => question.id === editingQuestionId) ?? null;
  }, [editingQuestionId, questions]);

  const filteredQuestions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesStatus =
        question.notice ||
        statusFilter === 'all' ||
        (statusFilter === 'answered' ? question.answered : !question.answered);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      return [
        question.title,
        question.content,
        question.authorName,
        ...question.replies.map((reply) => reply.content),
      ].some((field) => {
        return field.toLowerCase().includes(normalizedSearchTerm);
      });
    });
  }, [questions, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const sortedQuestions = useMemo(() => {
    return [...filteredQuestions].sort((left, right) => {
      if (left.notice !== right.notice) {
        return left.notice ? -1 : 1;
      }

      if (left.notice && right.notice) {
        const orderDiff = (left.noticeSortOrder ?? 0) - (right.noticeSortOrder ?? 0);

        if (orderDiff !== 0) {
          return orderDiff;
        }
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [filteredQuestions]);
  const paginatedQuestions = sortedQuestions.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  const paginationRange = getPaginationRange(activePage, totalPages);

  const createQuestionMutation = useMutation({
    mutationFn: createGlobalQuestion,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '질문 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setTitle('');
      setContent('');
      setPrivateQuestion(false);
      setIsWriteFormOpen(false);
      setCurrentPage(1);
      await queryClient.invalidateQueries({ queryKey: globalQuestionsQueryKey() });
      showToast({
        message: '질문을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({
      content: nextContent,
      privateQuestion: nextPrivateQuestion,
      questionId,
      title: nextTitle,
    }: {
      content: string;
      privateQuestion: boolean;
      questionId: number;
      title: string;
    }) =>
      updateGlobalQuestion(questionId, {
        content: nextContent,
        privateQuestion: nextPrivateQuestion,
        title: nextTitle,
      }),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '질문 수정에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (updatedQuestion) => {
      setTitle('');
      setContent('');
      setPrivateQuestion(false);
      setEditingQuestionId(null);
      setIsWriteFormOpen(false);
      setExpandedQuestionId(updatedQuestion.id);
      await queryClient.invalidateQueries({ queryKey: globalQuestionsQueryKey() });
      showToast({
        message: '질문을 수정했습니다.',
        variant: 'success',
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: number) => deleteGlobalQuestion(questionId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '질문 삭제에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, questionId) => {
      setExpandedQuestionId((current) => (current === questionId ? null : current));
      setEditingQuestionId((current) => (current === questionId ? null : current));
      await queryClient.invalidateQueries({ queryKey: globalQuestionsQueryKey() });
      showToast({
        message: '질문을 삭제했습니다.',
        variant: 'success',
      });
    },
  });

  const handleSubmitQuestion = () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!isAuthenticated) {
      void navigate(routePaths.login);
      return;
    }

    const validationError = validateQnaQuestionDraft(trimmedTitle, trimmedContent);

    if (validationError) {
      showToast({
        message: validationError,
        variant: 'error',
      });
      return;
    }

    if (editingQuestionId !== null) {
      void updateQuestionMutation.mutateAsync({
        content: trimmedContent,
        privateQuestion,
        questionId: editingQuestionId,
        title: trimmedTitle,
      });
      return;
    }

    void createQuestionMutation.mutateAsync({
      content: trimmedContent,
      privateQuestion,
      title: trimmedTitle,
    });
  };

  const handleToggleWriteForm = () => {
    if (!isAuthenticated) {
      void navigate(routePaths.login);
      return;
    }

    setIsWriteFormOpen((current) => !current);
  };

  const handleResetWriteForm = () => {
    if (editingQuestion) {
      setTitle(editingQuestion.title);
      setContent(editingQuestion.content);
      setPrivateQuestion(editingQuestion.privateQuestion);
      return;
    }

    setTitle('');
    setContent('');
    setPrivateQuestion(false);
  };

  const handleCloseWriteForm = () => {
    setTitle('');
    setContent('');
    setPrivateQuestion(false);
    setEditingQuestionId(null);
    setIsWriteFormOpen(false);
  };

  const handleStartEdit = (question: (typeof questions)[number]) => {
    setTitle(question.title);
    setContent(question.content);
    setPrivateQuestion(question.privateQuestion);
    setEditingQuestionId(question.id);
    setIsWriteFormOpen(true);
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (!window.confirm('작성한 질문을 삭제하시겠습니까?')) {
      return;
    }

    void deleteQuestionMutation.mutateAsync(questionId);
  };

  const canReadQuestion = (question: (typeof questions)[number]) => {
    return !question.privateQuestion || question.mine || currentRole === 'ROLE_ADMIN';
  };

  const handleToggleQuestion = (question: (typeof questions)[number]) => {
    if (!canReadQuestion(question)) {
      showToast({
        message: '비밀글은 작성자와 관리자만 확인할 수 있습니다.',
        variant: 'error',
      });
      return;
    }

    setExpandedQuestionId((current) => (current === question.id ? null : question.id));
  };

  if (isWriteFormOpen) {
    const isEditing = editingQuestionId !== null;
    const isSubmitting = createQuestionMutation.isPending || updateQuestionMutation.isPending;

    return (
      <div className={styles['page']}>
        <div className={styles['writePageHeader']}>
          <h1 className={styles['boardTitle']}>{isEditing ? 'Q&A 수정' : 'Q&A 작성'}</h1>
          <p className={styles['writePageDescription']}>
            운영과 관련해 궁금한 사항을 남겨주시면 빠르게 답변드리겠습니다.
          </p>
        </div>

        <section className={styles['writerPanel']}>
          <div className={styles['privacyNotice']}>
            <span aria-hidden='true' className={styles['privacyNoticeIcon']}>
              i
            </span>
            <p className={styles['privacyNoticeText']}>
              문의 내용 작성 시, 민감한 개인정보가 포함되지 않도록 주의해 주세요.
            </p>
          </div>

          <div className={styles['writerForm']}>
            <label className={styles['writerLabel']} htmlFor='global-question-title'>
              질문 제목
            </label>
            <input
              className={styles['writerInput']}
              id='global-question-title'
              maxLength={QNA_TITLE_MAX_LENGTH}
              onChange={(event) => {
                setTitle(event.currentTarget.value);
              }}
              placeholder='질문 내용을 요약해주세요.'
              value={title}
            />

            <label className={styles['writerLabel']} htmlFor='global-question-content'>
              질문 내용
            </label>
            <textarea
              className={styles['writerTextarea']}
              id='global-question-content'
              maxLength={QNA_CONTENT_MAX_LENGTH}
              onChange={(event) => {
                setContent(event.currentTarget.value);
              }}
              placeholder='궁금한 내용, 발생 상황, 확인한 정보 등을 구체적으로 작성해주세요.'
              value={content}
            />

            <p className={styles['writerCounter']}>
              {content.length} / {QNA_CONTENT_MAX_LENGTH}
            </p>

            <label className={styles['privateOption']}>
              <input
                checked={privateQuestion}
                onChange={(event) => {
                  setPrivateQuestion(event.currentTarget.checked);
                }}
                style={privateCheckStyle}
                type='checkbox'
              />
              <span>비밀글로 등록</span>
            </label>

            <div className={styles['writerDivider']} />

            <div className={styles['writerActions']}>
              <button
                className={styles['secondaryAction']}
                onClick={handleResetWriteForm}
                type='button'
              >
                취소
              </button>
              <button className={styles['listAction']} onClick={handleCloseWriteForm} type='button'>
                목록으로
              </button>
              <button
                className={styles['submitWriteButton']}
                disabled={isSubmitting}
                onClick={handleSubmitQuestion}
                type='button'
              >
                {isSubmitting ? '저장 중...' : isEditing ? '수정하기' : '등록하기'}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles['page']}>
      <header className={styles['boardHeader']}>
        <h1 className={styles['boardTitle']}>운영 Q&A</h1>
        <p className={styles['boardSummary']}>
          총 <strong>{String(questions.length)}</strong>건의 질문
        </p>
      </header>

      <section className={styles['boardShell']}>
        <div className={styles['toolbar']}>
          <div className={styles['filterGroup']} role='tablist' aria-label='운영 Q&A 답변 상태'>
            {statusFilterOptions.map((option) => {
              const isActive = statusFilter === option.value;

              return (
                <button
                  aria-selected={isActive}
                  className={styles['filterButton']}
                  data-active={isActive}
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
              );
            })}
          </div>

          <form
            className={styles['searchForm']}
            onSubmit={(event) => {
              event.preventDefault();
              setSearchTerm(searchInput);
              setCurrentPage(1);
            }}
          >
            <label className={styles['srOnly']} htmlFor='global-qna-search'>
              운영 Q&A 검색
            </label>
            <input
              autoComplete='off'
              className={styles['searchInput']}
              id='global-qna-search'
              onChange={(event) => {
                setSearchInput(event.currentTarget.value);
              }}
              placeholder='제목 또는 내용을 검색해 주세요.'
              type='search'
              value={searchInput}
            />
            <button aria-label='검색' className={styles['searchButton']} type='submit'>
              <svg
                aria-hidden='true'
                className={styles['searchIcon']}
                fill='none'
                viewBox='0 0 24 24'
                xmlns='http://www.w3.org/2000/svg'
              >
                <circle cx='11' cy='11' r='6' stroke='currentColor' strokeWidth='2' />
                <path d='m16 16 4 4' stroke='currentColor' strokeLinecap='round' strokeWidth='2' />
              </svg>
            </button>
          </form>

          <button className={styles['writeButton']} onClick={handleToggleWriteForm} type='button'>
            <span aria-hidden='true' className={styles['writeIcon']} style={writeIconStyle} />
            질문 작성
          </button>
        </div>

        {questionsQuery.isPending ? (
          <div aria-busy='true' className={styles['stateBox']}>
            운영 Q&A를 불러오는 중입니다.
          </div>
        ) : null}

        {questionsQuery.isError ? (
          <div className={styles['stateBox']}>운영 Q&A를 불러오지 못했습니다.</div>
        ) : null}

        {!questionsQuery.isPending && !questionsQuery.isError ? (
          <>
            <div className={styles['tableWrap']}>
              <table className={styles['boardTable']}>
                <colgroup>
                  <col className={styles['statusCol']} />
                  <col />
                  <col className={styles['authorCol']} />
                  <col className={styles['dateCol']} />
                </colgroup>
                <tbody>
                  {paginatedQuestions.length ? (
                    paginatedQuestions.map((question) => {
                      const isExpanded = expandedQuestionId === question.id;
                      const isReadable = canReadQuestion(question);
                      const primaryReply =
                        question.replies.length > 0
                          ? (question.replies.find((reply) => reply.adminReply) ??
                            question.replies[0])
                          : null;
                      const authorName = maskQnaAuthorName(
                        resolveQnaAuthorName(
                          question.authorName,
                          question.mine,
                          currentDisplayName,
                        ),
                      );

                      return (
                        <Fragment key={question.id}>
                          <tr
                            aria-expanded={isExpanded}
                            className={styles['questionRow']}
                            data-expanded={isExpanded}
                            data-locked={!isReadable}
                            onClick={() => {
                              handleToggleQuestion(question);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') {
                                return;
                              }

                              event.preventDefault();
                              handleToggleQuestion(question);
                            }}
                            tabIndex={0}
                          >
                            <td className={styles['statusCell']}>
                              <span
                                className={styles['statusBadge']}
                                data-tone={
                                  question.notice
                                    ? 'notice'
                                    : question.answered
                                      ? 'answered'
                                      : 'waiting'
                                }
                              >
                                {question.notice
                                  ? '공지'
                                  : question.answered
                                    ? '답변 완료'
                                    : '답변 대기'}
                              </span>
                            </td>
                            <td className={styles['titleCell']}>
                              <span className={styles['titleButton']}>
                                {question.privateQuestion && !question.notice ? (
                                  <span className={styles['privateBadge']}>비밀글</span>
                                ) : null}
                                {question.title}
                              </span>
                            </td>
                            <td className={styles['authorCell']}>
                              {question.notice ? '운영팀' : authorName}
                            </td>
                            <td className={styles['dateCell']}>
                              <time dateTime={question.createdAt}>
                                {formatDate(question.createdAt)}
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
                                {question.mine && !question.notice ? (
                                  <div className={styles['ownQuestionToolbar']}>
                                    <span className={styles['ownQuestionLabel']}>내 질문</span>
                                    <div className={styles['ownQuestionActions']}>
                                      <button
                                        className={styles['ownQuestionActionButton']}
                                        disabled={
                                          updateQuestionMutation.isPending ||
                                          deleteQuestionMutation.isPending
                                        }
                                        onClick={() => {
                                          handleStartEdit(question);
                                        }}
                                        type='button'
                                      >
                                        수정하기
                                      </button>
                                      <button
                                        className={styles['ownQuestionActionButton']}
                                        disabled={
                                          updateQuestionMutation.isPending ||
                                          deleteQuestionMutation.isPending
                                        }
                                        onClick={() => {
                                          handleDeleteQuestion(question.id);
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
                                    <strong className={styles['questionLabel']}>
                                      {question.notice ? '공지' : '질문'}
                                    </strong>
                                    {question.notice ? (
                                      <div
                                        className={`${styles['questionContent']} ${styles['questionRichContent']}`}
                                        dangerouslySetInnerHTML={{
                                          __html: sanitizeRichTextHtml(question.content),
                                        }}
                                      />
                                    ) : (
                                      <p className={styles['questionContent']}>
                                        {question.content}
                                      </p>
                                    )}
                                    <time
                                      className={styles['detailDate']}
                                      dateTime={question.createdAt}
                                    >
                                      {formatDateTime(question.createdAt)}
                                    </time>
                                  </section>

                                  {!question.notice ? (
                                    <>
                                      <div className={styles['detailDivider']} />

                                      {primaryReply ? (
                                        <section className={styles['replyPanel']}>
                                          <span className={styles['answerIcon']}>A</span>
                                          <strong className={styles['replyAuthor']}>답변</strong>
                                          <div className={styles['replyBody']}>
                                            {primaryReply.adminReply ? (
                                              <span className={styles['replyBadge']}>
                                                관리자 답변
                                              </span>
                                            ) : null}
                                            <p className={styles['replyContent']}>
                                              {primaryReply.content}
                                            </p>
                                          </div>
                                          <time
                                            className={styles['detailDate']}
                                            dateTime={primaryReply.createdAt}
                                          >
                                            {formatDateTime(primaryReply.createdAt)}
                                          </time>
                                        </section>
                                      ) : (
                                        <p className={styles['waitingText']}>
                                          아직 등록된 답변이 없습니다.
                                        </p>
                                      )}
                                    </>
                                  ) : null}
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
                        검색 조건에 맞는 질문이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <nav aria-label='운영 Q&A 페이지 이동' className={styles['pagination']}>
              <button
                aria-label='이전 페이지'
                className={styles['pageNavButton']}
                disabled={activePage === 1}
                onClick={() => {
                  setCurrentPage((page) => Math.max(1, page - 1));
                }}
                type='button'
              >
                <svg
                  aria-hidden='true'
                  className={styles['pageNavIcon']}
                  fill='none'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M15 18L9 12L15 6'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='3'
                  />
                </svg>
              </button>

              {paginationRange.map((pageNumber) => {
                return (
                  <button
                    className={styles['pageButton']}
                    data-active={pageNumber === activePage}
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
                aria-label='다음 페이지'
                className={styles['pageNavButton']}
                disabled={activePage === totalPages}
                onClick={() => {
                  setCurrentPage((page) => Math.min(totalPages, page + 1));
                }}
                type='button'
              >
                <svg
                  aria-hidden='true'
                  className={styles['pageNavIcon']}
                  fill='none'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M9 18L15 12L9 6'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='3'
                  />
                </svg>
              </button>
            </nav>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default QnaPage;
