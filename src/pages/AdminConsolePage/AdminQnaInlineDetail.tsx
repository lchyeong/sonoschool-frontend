import Button from '@/components/ui/Button/Button';
import { TextAreaField } from '@/components/ui/TextField/TextField';
import type { QuestionItem, QuestionReplyItem } from '@/types/qna';
import { sanitizeRichTextHtml } from '@/utils/htmlContent';

import styles from './AdminConsolePage.module.scss';
import { formatQnaDateTime } from './adminQnaUtils';

interface AdminQnaInlineDetailProps {
  editingReplyId: number | null;
  isDeletingReply: boolean;
  isSavingReply: boolean;
  onCancelEditReply: () => void;
  onDeleteReply: (replyId: number) => void;
  onReplyContentChange: (value: string) => void;
  onStartEditReply: (reply: QuestionReplyItem) => void;
  onSubmitReply: (questionId: number) => void;
  primaryReply: QuestionReplyItem | null;
  question: QuestionItem;
  replyContent: string;
}

const AdminQnaInlineDetail = ({
  editingReplyId,
  isDeletingReply,
  isSavingReply,
  onCancelEditReply,
  onDeleteReply,
  onReplyContentChange,
  onStartEditReply,
  onSubmitReply,
  primaryReply,
  question,
  replyContent,
}: AdminQnaInlineDetailProps) => {
  const hasPrimaryReply = primaryReply !== null;

  return (
    <tr className={styles['qnaInlineDetailRow']}>
      <td colSpan={5}>
        <div className={styles['qnaInlineDetail']}>
          <section className={styles['qnaInlineQuestion']}>
            <div className={styles['qnaSectionHeader']}>
              <h3 className={styles['qnaQuestionTitle']}>
                {question.privateQuestion && !question.notice
                  ? `[비밀글] ${question.title}`
                  : question.title}
              </h3>
              <p className={styles['qnaPanelMeta']}>
                {question.authorName} · {formatQnaDateTime(question.createdAt)}
              </p>
            </div>
            {question.notice ? (
              <div
                className={`${styles['qnaQuestionContent']} ${styles['qnaRichContent']}`}
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichTextHtml(question.content),
                }}
              />
            ) : (
              <p className={styles['qnaQuestionContent']}>{question.content}</p>
            )}
          </section>

          {!question.notice ? (
            <section className={styles['qnaInlineReplies']}>
              <div className={styles['qnaSectionHeader']}>
                <h3 className={styles['qnaReplySectionTitle']}>답변</h3>
                {editingReplyId !== null ? (
                  <button
                    className={styles['qnaTextButton']}
                    onClick={onCancelEditReply}
                    type='button'
                  >
                    수정 취소
                  </button>
                ) : null}
              </div>

              {primaryReply !== null ? (
                <div className={styles['qnaReplyList']}>
                  <article className={styles['qnaReplyCard']} key={primaryReply.id}>
                    <div className={styles['qnaReplyCardHeader']}>
                      <div className={styles['qnaReplyMetaStack']}>
                        <strong>{primaryReply.authorName}</strong>
                        <span>{formatQnaDateTime(primaryReply.createdAt)}</span>
                      </div>
                      <div className={styles['qnaReplyActions']}>
                        <button
                          className={styles['tableActionButton']}
                          disabled={isSavingReply}
                          onClick={() => {
                            onStartEditReply(primaryReply);
                          }}
                          type='button'
                        >
                          답변 수정
                        </button>
                        <button
                          className={styles['tableActionButtonDanger']}
                          disabled={isDeletingReply}
                          onClick={() => {
                            onDeleteReply(primaryReply.id);
                          }}
                          type='button'
                        >
                          삭제
                        </button>
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
                  label={editingReplyId === null && !hasPrimaryReply ? '답변 달기' : '답변 수정'}
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
                    disabled={isSavingReply}
                    onClick={() => {
                      onSubmitReply(question.id);
                    }}
                    type='button'
                  >
                    {isSavingReply
                      ? '저장 중...'
                      : editingReplyId === null && !hasPrimaryReply
                        ? '답변 등록'
                        : '답변 수정'}
                  </Button>
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
