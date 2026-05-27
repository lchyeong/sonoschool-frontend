import AdminFileDropZone from '@/components/admin/AdminFileDropZone';
import Button from '@/components/ui/Button/Button';
import type { NoticeAttachmentPayload } from '@/types/notice';

import styles from './AdminConsolePage.module.scss';
import { formatFileSizeLabel } from './adminConsolePageShared';
import { RESOURCE_DOCUMENT_ACCEPT, RESOURCE_DOCUMENT_POLICY_HINT } from './resourceDocumentPolicy';

interface AdminNoticeAttachmentPanelProps {
  attachments: NoticeAttachmentPayload[];
  isUploading: boolean;
  onClearSelected: () => void;
  onFilesSelected: (files: File[]) => void;
  onRemove: (targetIndex: number) => void;
  onUploadSelected: () => void;
  selectedFiles: File[];
}

const AdminNoticeAttachmentPanel = ({
  attachments,
  isUploading,
  onClearSelected,
  onFilesSelected,
  onRemove,
  onUploadSelected,
  selectedFiles,
}: AdminNoticeAttachmentPanelProps) => {
  const totalAttachmentSize = attachments.reduce((total, item) => total + item.fileSize, 0);
  const totalSelectedFileSize = selectedFiles.reduce((total, item) => total + item.size, 0);

  return (
    <section className={styles['noticeAttachmentPanel']} aria-labelledby='notice-attachments-label'>
      <div className={styles['noticeAttachmentHeader']}>
        <div>
          <h3 className={styles['noticeAttachmentTitle']} id='notice-attachments-label'>
            첨부파일
          </h3>
          <p className={styles['noticeAttachmentHint']}>{RESOURCE_DOCUMENT_POLICY_HINT}</p>
        </div>
      </div>

      <AdminFileDropZone
        actions={
          selectedFiles.length > 0 ? (
            <>
              <Button
                disabled={isUploading}
                onClick={onUploadSelected}
                size='sm'
                type='button'
                variant='secondary'
              >
                업로드 시작
              </Button>
              <Button
                disabled={isUploading}
                onClick={onClearSelected}
                size='sm'
                type='button'
                variant='secondary'
              >
                선택 취소
              </Button>
            </>
          ) : null
        }
        accept={RESOURCE_DOCUMENT_ACCEPT}
        buttonLabel={isUploading ? '업로드 중...' : '파일 선택'}
        disabled={isUploading}
        hint='선택한 파일은 업로드 시작을 누를 때 업로드됩니다.'
        label='첨부파일 업로드'
        multiple
        onFilesSelected={onFilesSelected}
        selectedLabel={
          selectedFiles.length > 0
            ? `선택 파일 ${String(selectedFiles.length)}개`
            : attachments.length > 0
              ? `등록된 첨부파일 ${String(attachments.length)}개`
              : undefined
        }
        selectedMeta={
          totalSelectedFileSize > 0
            ? formatFileSizeLabel(totalSelectedFileSize)
            : totalAttachmentSize > 0
              ? formatFileSizeLabel(totalAttachmentSize)
              : null
        }
      />

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
