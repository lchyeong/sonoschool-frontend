import { Fragment } from 'react';

import Button from '@/components/ui/Button/Button';
import type { QuestionItem } from '@/types/qna';

import styles from './AdminConsolePage.module.scss';
import AdminQnaInlineDetail from './AdminQnaInlineDetail';
import { buildQuestionLocationLabel, formatQnaDateTime } from './adminQnaUtils';

interface AdminQnaTableProps {
  editingQuestionId: number | null;
  isDeletingQuestion: boolean;
  isDeletingReply: boolean;
  isReorderingNotice: boolean;
  isSavingQuestion: boolean;
  isSavingReply: boolean;
  noticeQuestions: QuestionItem[];
  onCancelEditQuestion: () => void;
  onDeleteQuestion: (question: QuestionItem) => void;
  onDeleteReply: (replyId: number) => void;
  onQuestionContentChange: (value: string) => void;
  onQuestionPrivateQuestionChange: (value: boolean) => void;
  onQuestionTitleChange: (value: string) => void;
  onReplyContentChange: (value: string) => void;
  onReorderNotice: (questionId: number, direction: 'down' | 'up') => void;
  onStartEditQuestion: (question: QuestionItem) => void;
  onSubmitQuestion: (question: QuestionItem) => void;
  onSubmitReply: (questionId: number) => void;
  onToggleQuestion: (questionId: number) => void;
  questions: QuestionItem[];
  questionContent: string;
  questionPrivateQuestion: boolean;
  questionTitle: string;
  replyContent: string;
  selectedQuestionId: number | null;
}

const AdminQnaTable = ({
  editingQuestionId,
  isDeletingQuestion,
  isDeletingReply,
  isReorderingNotice,
  isSavingQuestion,
  isSavingReply,
  noticeQuestions,
  onCancelEditQuestion,
  onDeleteQuestion,
  onDeleteReply,
  onQuestionContentChange,
  onQuestionPrivateQuestionChange,
  onQuestionTitleChange,
  onReplyContentChange,
  onReorderNotice,
  onStartEditQuestion,
  onSubmitQuestion,
  onSubmitReply,
  onToggleQuestion,
  questions,
  questionContent,
  questionPrivateQuestion,
  questionTitle,
  replyContent,
  selectedQuestionId,
}: AdminQnaTableProps) => {
  return (
    <div className={styles['qnaTableWrap']}>
      <table className={styles['qnaTable']}>
        <colgroup>
          <col className={styles['qnaStatusCol']} />
          <col />
          <col className={styles['qnaAuthorCol']} />
          <col className={styles['qnaDateCol']} />
          <col className={styles['qnaOrderCol']} />
        </colgroup>
        <thead>
          <tr>
            <th scope='col'>상태</th>
            <th scope='col'>질문</th>
            <th scope='col'>작성자</th>
            <th scope='col'>등록일</th>
            <th scope='col'>공지 순서</th>
          </tr>
        </thead>
        <tbody>
          {questions.length ? (
            questions.map((question) => {
              const isActive = question.id === selectedQuestionId;
              const primaryReply = question.replies.at(0) ?? null;
              const hasPrimaryReply = primaryReply !== null;
              const noticeIndex = question.notice
                ? noticeQuestions.findIndex((notice) => notice.id === question.id)
                : -1;

              return (
                <Fragment key={question.id}>
                  <tr className={styles['qnaTableRow']} data-active={isActive}>
                    <td>
                      <span
                        className={styles['qnaStatusBadge']}
                        data-tone={
                          question.notice ? 'notice' : question.answered ? 'answered' : 'waiting'
                        }
                      >
                        {question.notice ? '공지' : question.answered ? '답변 완료' : '답변 대기'}
                      </span>
                    </td>
                    <td className={styles['qnaTableTitleCell']}>
                      <button
                        className={styles['qnaTableTitleButton']}
                        onClick={() => {
                          onToggleQuestion(question.id);
                        }}
                        type='button'
                      >
                        <span className={styles['qnaTableTitle']}>{question.title}</span>
                        <span className={styles['qnaTableMeta']}>
                          {question.notice
                            ? '운영 Q&A 공지'
                            : buildQuestionLocationLabel(question.scope, question.programTitle)}
                          {question.privateQuestion && !question.notice ? ' · 비밀글' : ''}
                          {!question.notice ? (
                            <>
                              {' · 답변 '}
                              {hasPrimaryReply ? '1개' : '0개'}
                            </>
                          ) : null}
                        </span>
                      </button>
                    </td>
                    <td>{question.notice ? '운영팀' : question.authorName}</td>
                    <td>{formatQnaDateTime(question.createdAt)}</td>
                    <td>
                      {question.notice ? (
                        <div className={styles['qnaNoticeOrderActions']}>
                          <Button
                            disabled={isReorderingNotice || noticeIndex <= 0}
                            onClick={() => {
                              onReorderNotice(question.id, 'up');
                            }}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            위로
                          </Button>
                          <Button
                            disabled={
                              isReorderingNotice ||
                              noticeIndex < 0 ||
                              noticeIndex >= noticeQuestions.length - 1
                            }
                            onClick={() => {
                              onReorderNotice(question.id, 'down');
                            }}
                            size='sm'
                            type='button'
                            variant='secondary'
                          >
                            아래로
                          </Button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>

                  {isActive ? (
                    <AdminQnaInlineDetail
                      editingQuestionId={editingQuestionId}
                      isDeletingQuestion={isDeletingQuestion}
                      isDeletingReply={isDeletingReply}
                      isSavingQuestion={isSavingQuestion}
                      isSavingReply={isSavingReply}
                      onCancelEditQuestion={onCancelEditQuestion}
                      onDeleteQuestion={onDeleteQuestion}
                      onDeleteReply={onDeleteReply}
                      onQuestionContentChange={onQuestionContentChange}
                      onQuestionPrivateQuestionChange={onQuestionPrivateQuestionChange}
                      onQuestionTitleChange={onQuestionTitleChange}
                      onReplyContentChange={onReplyContentChange}
                      onStartEditQuestion={onStartEditQuestion}
                      onSubmitQuestion={onSubmitQuestion}
                      onSubmitReply={onSubmitReply}
                      primaryReply={primaryReply}
                      question={question}
                      questionContent={questionContent}
                      questionPrivateQuestion={questionPrivateQuestion}
                      questionTitle={questionTitle}
                      replyContent={replyContent}
                    />
                  ) : null}
                </Fragment>
              );
            })
          ) : (
            <tr>
              <td className={styles['qnaEmptyTableCell']} colSpan={5}>
                조건에 맞는 질문이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminQnaTable;
