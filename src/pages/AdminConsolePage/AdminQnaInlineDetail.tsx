import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { QNA_CONTENT_MAX_LENGTH, QNA_TITLE_MAX_LENGTH } from '@/constants/qna';
import type { QuestionItem, QuestionReplyItem } from '@/types/qna';
import { sanitizeRichTextHtml } from '@/utils/htmlContent';

import styles from './AdminConsolePage.module.scss';
import { formatQnaDateTime } from './adminQnaUtils';

interface AdminQnaInlineDetailProps {
  editingQuestionId: number | null;
  isDeletingQuestion: boolean;
  isDeletingReply: boolean;
  isSavingQuestion: boolean;
  isSavingReply: boolean;
  onCancelEditQuestion: () => void;
  onDeleteQuestion: (questionId: number) => void;
  onDeleteReply: (replyId: number) => void;
  onQuestionContentChange: (value: string) => void;
  onQuestionPrivateQuestionChange: (value: boolean) => void;
  onQuestionTitleChange: (value: string) => void;
  onReplyContentChange: (value: string) => void;
  onStartEditQuestion: (question: QuestionItem) => void;
  onSubmitQuestion: (questionId: number) => void;
  onSubmitReply: (questionId: number) => void;
  primaryReply: QuestionReplyItem | null;
  question: QuestionItem;
  questionContent: string;
  questionPrivateQuestion: boolean;
  questionTitle: string;
  replyContent: string;
}

const AdminQnaInlineDetail = ({
  editingQuestionId,
  isDeletingQuestion,
  isDeletingReply,
  isSavingQuestion,
  isSavingReply,
  onCancelEditQuestion,
  onDeleteQuestion,
  onDeleteReply,
  onQuestionContentChange,
  onQuestionPrivateQuestionChange,
  onQuestionTitleChange,
  onReplyContentChange,
  onStartEditQuestion,
  onSubmitQuestion,
  onSubmitReply,
  primaryReply,
  question,
  questionContent,
  questionPrivateQuestion,
  questionTitle,
  replyContent,
}: AdminQnaInlineDetailProps) => {
  const hasPrimaryReply = primaryReply !== null;
  const isEditingQuestion = editingQuestionId === question.id;

  return (
    <tr className={styles['qnaInlineDetailRow']}>
      <td colSpan={5}>
        <div className={styles['qnaInlineDetail']}>
          <section className={styles['qnaInlineQuestion']}>
            <div className={styles['qnaSectionHeader']}>
              <div className={styles['qnaReplyMetaStack']}>
                <h3 className={styles['qnaQuestionTitle']}>
                  {question.privateQuestion && !question.notice
                    ? `[비밀글] ${question.title}`
                    : question.title}
                </h3>
                <p className={styles['qnaPanelMeta']}>
                  {question.authorName} · {formatQnaDateTime(question.createdAt)}
                </p>
              </div>
              {!question.notice ? (
                <div className={styles['qnaReplyActions']}>
                  <button
                    className={styles['tableActionButton']}
                    disabled={isSavingQuestion || isDeletingQuestion}
                    onClick={() => {
                      onStartEditQuestion(question);
                    }}
                    type='button'
                  >
                    질문 수정
                  </button>
                  <button
                    className={styles['tableActionButtonDanger']}
                    disabled={isSavingQuestion || isDeletingQuestion}
                    onClick={() => {
                      onDeleteQuestion(question.id);
                    }}
                    type='button'
                  >
                    질문 삭제
                  </button>
                </div>
              ) : null}
            </div>
            {question.notice ? (
              <div
                className={`${styles['qnaQuestionContent']} ${styles['qnaRichContent']}`}
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichTextHtml(question.content),
                }}
              />
            ) : isEditingQuestion ? (
              <div className={styles['qnaReplyComposerInline']}>
                <TextField
                  label='질문 제목'
                  maxLength={QNA_TITLE_MAX_LENGTH}
                  name={`admin-qna-question-title-${String(question.id)}`}
                  onChange={(event) => {
                    onQuestionTitleChange(event.target.value);
                  }}
                  placeholder='질문 제목을 입력해 주세요.'
                  value={questionTitle}
                />
                <TextAreaField
                  label='질문 내용'
                  maxLength={QNA_CONTENT_MAX_LENGTH}
                  name={`admin-qna-question-content-${String(question.id)}`}
                  onChange={(event) => {
                    onQuestionContentChange(event.target.value);
                  }}
                  placeholder='질문 내용을 입력해 주세요.'
                  rows={5}
                  value={questionContent}
                />
                <label className={styles['checkboxRow']}>
                  <input
                    checked={questionPrivateQuestion}
                    onChange={(event) => {
                      onQuestionPrivateQuestionChange(event.target.checked);
                    }}
                    type='checkbox'
                  />
                  비밀글로 등록
                </label>
                <div className={styles['qnaActionRow']}>
                  <Button
                    disabled={isSavingQuestion}
                    onClick={onCancelEditQuestion}
                    type='button'
                    variant='secondary'
                  >
                    수정 취소
                  </Button>
                  <Button
                    disabled={
                      isSavingQuestion ||
                      questionTitle.trim().length === 0 ||
                      questionContent.trim().length === 0
                    }
                    onClick={() => {
                      onSubmitQuestion(question.id);
                    }}
                    type='button'
                  >
                    {isSavingQuestion ? '저장 중...' : '질문 저장'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className={styles['qnaQuestionContent']}>{question.content}</p>
            )}
          </section>

          {!question.notice ? (
            <section className={styles['qnaInlineReplies']}>
              <div className={styles['qnaSectionHeader']}>
                <h3 className={styles['qnaReplySectionTitle']}>답변</h3>
              </div>

              {primaryReply !== null ? (
                <div className={styles['qnaReplyList']}>
                  <article className={styles['qnaReplyCard']} key={primaryReply.id}>
                    <div className={styles['qnaReplyCardHeader']}>
                      <div className={styles['qnaReplyMetaStack']}>
                        <strong>{primaryReply.authorName}</strong>
                        <span>{formatQnaDateTime(primaryReply.createdAt)}</span>
                      </div>
                    </div>
                    <p className={styles['qnaReplyCardContent']}>{primaryReply.content}</p>
                  </article>
                </div>
              ) : (
                <p className={styles['qnaEmptyState']}>아직 등록된 답변이 없습니다.</p>
              )}

              <div className={styles['qnaReplyComposerInline']}>
                <TextAreaField
                  label={hasPrimaryReply ? '답변 수정' : '답변 달기'}
                  name={`admin-qna-reply-${String(question.id)}`}
                  onChange={(event) => {
                    onReplyContentChange(event.target.value);
                  }}
                  placeholder='답변을 입력해 주세요.'
                  rows={3}
                  value={replyContent}
                />
                <div className={styles['qnaActionRow']}>
                  <Button
                    disabled={isSavingReply || isDeletingReply}
                    onClick={() => {
                      onSubmitReply(question.id);
                    }}
                    type='button'
                  >
                    {isSavingReply ? '저장 중...' : hasPrimaryReply ? '답변 저장' : '답변 등록'}
                  </Button>
                  {primaryReply !== null ? (
                    <Button
                      disabled={isSavingReply || isDeletingReply}
                      onClick={() => {
                        onDeleteReply(primaryReply.id);
                      }}
                      type='button'
                      variant='danger'
                    >
                      삭제
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </td>
    </tr>
  );
};

export default AdminQnaInlineDetail;
