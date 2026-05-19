import type { ChangeEvent } from 'react';

import Button from '@/components/ui/Button/Button';
import type { NoticeAttachmentPayload } from '@/types/notice';

import styles from './AdminConsolePage.module.scss';
import { formatFileSizeLabel } from './adminConsolePageShared';
import { RESOURCE_DOCUMENT_POLICY_HINT } from './resourceDocumentPolicy';

export const NOTICE_ATTACHMENT_ACCEPT =
  '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

interface AdminNoticeAttachmentPanelProps {
  attachments: NoticeAttachmentPayload[];
  isUploading: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (targetIndex: number) => void;
}

const AdminNoticeAttachmentPanel = ({
  attachments,
  isUploading,
  onFileChange,
  onRemove,
}: AdminNoticeAttachmentPanelProps) => {
  return (
    <section className={styles['noticeAttachmentPanel']} aria-labelledby='notice-attachments-label'>
      <div className={styles['noticeAttachmentHeader']}>
        <div>
          <h3 className={styles['noticeAttachmentTitle']} id='notice-attachments-label'>
            첨부파일
          </h3>
          <p className={styles['noticeAttachmentHint']}>{RESOURCE_DOCUMENT_POLICY_HINT}</p>
        </div>
        <label className={styles['noticeAttachmentButton']}>
          <input
            accept={NOTICE_ATTACHMENT_ACCEPT}
            disabled={isUploading}
            multiple
            onChange={(event) => {
              onFileChange(event);
            }}
            type='file'
          />
          {isUploading ? '업로드 중...' : '파일 선택'}
        </label>
      </div>

      {attachments.length > 0 ? (
        <ul className={styles['noticeAttachmentList']}>
          {attachments.map((attachment, index) => (
            <li
              className={styles['noticeAttachmentItem']}
              key={`${attachment.fileUrl}-${String(index)}`}
            >
              <span className={styles['noticeAttachmentName']}>{attachment.fileName}</span>
              <span className={styles['noticeAttachmentSize']}>
                {formatFileSizeLabel(attachment.fileSize)}
              </span>
              <Button
                onClick={() => {
                  onRemove(index);
                }}
                size='sm'
                type='button'
                variant='secondary'
              >
                삭제
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles['noticeAttachmentEmpty']}>등록된 첨부파일이 없습니다.</p>
      )}
    </section>
  );
};

export default AdminNoticeAttachmentPanel;
