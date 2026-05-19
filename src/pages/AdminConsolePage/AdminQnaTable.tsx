import { Fragment } from 'react';

import Button from '@/components/ui/Button/Button';
import type { QuestionItem, QuestionReplyItem } from '@/types/qna';

import styles from './AdminConsolePage.module.scss';
import AdminQnaInlineDetail from './AdminQnaInlineDetail';
import { buildQuestionLocationLabel, formatQnaDateTime } from './adminQnaUtils';

interface AdminQnaTableProps {
  editingReplyId: number | null;
  isDeletingReply: boolean;
  isReorderingNotice: boolean;
  isSavingReply: boolean;
  noticeQuestions: QuestionItem[];
  onCancelEditReply: () => void;
  onDeleteReply: (replyId: number) => void;
  onReplyContentChange: (value: string) => void;
  onReorderNotice: (questionId: number, direction: 'down' | 'up') => void;
  onStartEditReply: (reply: QuestionReplyItem) => void;
  onSubmitReply: (questionId: number) => void;
  onToggleQuestion: (questionId: number) => void;
  questions: QuestionItem[];
  replyContent: string;
  selectedQuestionId: number | null;
}

const AdminQnaTable = ({
  editingReplyId,
  isDeletingReply,
  isReorderingNotice,
  isSavingReply,
  noticeQuestions,
  onCancelEditReply,
  onDeleteReply,
  onReplyContentChange,
  onReorderNotice,
  onStartEditReply,
  onSubmitReply,
  onToggleQuestion,
  questions,
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
                      editingReplyId={editingReplyId}
                      isDeletingReply={isDeletingReply}
                      isSavingReply={isSavingReply}
                      onCancelEditReply={onCancelEditReply}
                      onDeleteReply={onDeleteReply}
                      onReplyContentChange={onReplyContentChange}
                      onStartEditReply={onStartEditReply}
                      onSubmitReply={onSubmitReply}
                      primaryReply={primaryReply}
                      question={question}
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
