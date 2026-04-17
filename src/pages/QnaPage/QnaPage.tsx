import { Fragment, useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { createGlobalQuestion } from '@/api/qna';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { QNA_CONTENT_MAX_LENGTH, QNA_TITLE_MAX_LENGTH } from '@/constants/qna';
import { globalQuestionsQueryKey, useGlobalQuestionsQuery } from '@/query/useQnaQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { buildQnaPreview, maskQnaAuthorName, resolveQnaAuthorName, validateQnaQuestionDraft } from '@/utils/qna';

import styles from './QnaPage.module.scss';

type BoardStatusFilter = 'all' | 'answered' | 'waiting';

const PAGE_SIZE = 6;

const boardNotice = {
  authorName: '관리자',
  createdAt: '2026-03-25T00:00:00Z',
  title: 'Q&A 운영 안내',
};

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
  }).format(new Date(value));
};

const QnaPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentDisplayName = useAuthStore((state) => state.displayName);
  const showToast = useToastStore((state) => state.showToast);
  const questionsQuery = useGlobalQuestionsQuery();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoardStatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [isWriteFormOpen, setIsWriteFormOpen] = useState(false);

  const questions = questionsQuery.data ?? [];
  const totalQuestions = questions.length;

  const filteredQuestions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'answered' ? question.answered : !question.answered);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      return [question.title, question.content, question.authorName].some((field) => {
        return field.toLowerCase().includes(normalizedSearchTerm);
      });
    });
  }, [questions, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
      setIsWriteFormOpen(false);
      setCurrentPage(1);
      await queryClient.invalidateQueries({ queryKey: globalQuestionsQueryKey() });
      showToast({
        message: '질문을 등록했습니다.',
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

    void createQuestionMutation.mutateAsync({
      content: trimmedContent,
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

  return (
    <div className={styles['page']}>
      <div className={styles['boardHeader']}>
        <div className={styles['boardTitleBlock']}>
          <h1 className={styles['boardTitle']}>운영 Q&A</h1>
        </div>
        <p className={styles['boardSummary']}>
          총 {String(totalQuestions)}건 중 검색 결과 {String(filteredQuestions.length)}건
        </p>
      </div>

      <section className={styles['boardShell']}>
        <div className={styles['toolbar']}>
          <UnifiedSearchBar
            className={styles['searchBar']}
            inputAriaLabel='운영 Q&A 검색'
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
              setSearchTerm(searchInput);
              setCurrentPage(1);
            }}
            placeholder='제목, 내용, 작성자를 검색해 주세요.'
            value={searchInput}
          />
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
                  <tr className={styles['noticeRow']}>
                    <td className={styles['noticeLabel']}>공지</td>
                    <td />
                    <td>{boardNotice.title}</td>
                    <td>{boardNotice.authorName}</td>
                    <td>{formatDate(boardNotice.createdAt)}</td>
                  </tr>

                  {paginatedQuestions.length ? (
                    paginatedQuestions.map((question, index) => {
                      const rowNumber =
                        filteredQuestions.length - ((currentPage - 1) * PAGE_SIZE + index);
                      const isExpanded = expandedQuestionId === question.id;

                      return (
                        <Fragment key={question.id}>
                          <tr className={styles['questionRow']} key={question.id}>
                            <td>{String(rowNumber)}</td>
                            <td>
                              <span
                                className={styles['statusBadge']}
                                data-tone={question.answered ? 'answered' : 'waiting'}
                              >
                                {question.answered ? '답변완료' : '답변대기'}
                              </span>
                            </td>
                            <td className={styles['titleCell']}>
                              <button
                                className={styles['titleButton']}
                                onClick={() => {
                                  setExpandedQuestionId((current) =>
                                    current === question.id ? null : question.id,
                                  );
                                }}
                                type='button'
                              >
                                <span className={styles['titleText']} title={question.title}>
                                  {question.title}
                                </span>
                                <span className={styles['previewText']}>
                                  {buildQnaPreview(question.content)}
                                </span>
                              </button>
                            </td>
                            <td>
                              {maskQnaAuthorName(
                                resolveQnaAuthorName(
                                  question.authorName,
                                  question.mine,
                                  currentDisplayName,
                                ),
                              )}
                            </td>
                            <td>{formatDate(question.createdAt)}</td>
                          </tr>

                          {isExpanded ? (
                            <tr className={styles['detailRow']} key={`${question.id}-detail`}>
                              <td colSpan={5}>
                                <div className={styles['detailInner']}>
                                  <div className={styles['detailQuestion']}>
                                    <p className={styles['detailLabel']}>질문 내용</p>
                                    <p className={styles['detailText']}>{question.content}</p>
                                  </div>

                                  <div className={styles['detailAnswer']}>
                                    <p className={styles['detailLabel']}>문의에 대한 답변</p>
                                    {question.replies.length ? (
                                      question.replies.map((reply) => {
                                        return (
                                          <div className={styles['replyBlock']} key={reply.id}>
                                            <div className={styles['replyMeta']}>
                                              <strong>
                                                {maskQnaAuthorName(
                                                  resolveQnaAuthorName(
                                                    reply.authorName,
                                                    reply.mine,
                                                    currentDisplayName,
                                                  ),
                                                )}
                                              </strong>
                                              <span>{formatDate(reply.createdAt)}</span>
                                            </div>
                                            <p className={styles['detailText']}>{reply.content}</p>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <p className={styles['detailText']}>
                                        아직 등록된 답변이 없습니다.
                                      </p>
                                    )}
                                  </div>
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
                        검색 조건에 맞는 질문이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles['boardFooter']}>
              <div className={styles['pagination']}>
                <button
                  className={styles['pageNavButton']}
                  disabled={currentPage === 1}
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
                      data-active={pageNumber === currentPage}
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
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  type='button'
                >
                  {'>'}
                </button>
              </div>

              <button
                className={styles['writeButton']}
                onClick={handleToggleWriteForm}
                type='button'
              >
                글쓰기
              </button>
            </div>

            {isWriteFormOpen ? (
              <section className={styles['writerPanel']}>
                <div className={styles['writerHeader']}>
                  <h2 className={styles['writerTitle']}>질문 작성</h2>
                  <p className={styles['writerDescription']}>
                    운영 관련 질문을 남기면 확인 후 게시판에 답변이 표시됩니다. 제목은{' '}
                    {String(QNA_TITLE_MAX_LENGTH)}자, 내용은 {String(QNA_CONTENT_MAX_LENGTH)}자까지 입력할 수 있습니다.
                  </p>
                </div>

                <div className={styles['writerForm']}>
                  <TextField
                    label='질문 제목'
                    maxLength={QNA_TITLE_MAX_LENGTH}
                    name='global-question-title'
                    onChange={(event) => {
                      setTitle(event.target.value);
                    }}
                    placeholder='예: 결제 영수증은 어디에서 확인하나요?'
                    value={title}
                  />
                  <TextAreaField
                    label='질문 내용'
                    maxLength={QNA_CONTENT_MAX_LENGTH}
                    name='global-question-content'
                    onChange={(event) => {
                      setContent(event.target.value);
                    }}
                    placeholder='운영 관련 문의를 구체적으로 작성해 주세요.'
                    rows={6}
                    value={content}
                  />
                  <div className={styles['writerActions']}>
                    <p className={styles['writerHint']}>
                      {isAuthenticated
                        ? '로그인 상태에서 바로 질문을 등록할 수 있습니다.'
                        : '로그인 후 질문을 남길 수 있습니다.'}
                    </p>
                    <div className={styles['writerActionButtons']}>
                      <button
                        className={styles['secondaryAction']}
                        onClick={() => {
                          setIsWriteFormOpen(false);
                        }}
                        type='button'
                      >
                        취소
                      </button>
                      <Button
                        disabled={createQuestionMutation.isPending}
                        onClick={handleSubmitQuestion}
                      >
                        {createQuestionMutation.isPending ? '등록 중...' : '질문 등록'}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
};

export default QnaPage;
