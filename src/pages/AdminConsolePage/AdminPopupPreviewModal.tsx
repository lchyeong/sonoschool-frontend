import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import type { PopupItem } from '@/types/popup';

import styles from './AdminConsolePage.module.scss';
import { formatVisibilityWindow } from './adminPopupUtils';

interface AdminPopupPreviewModalProps {
  currentDisplayPopupId: number | null;
  isPublishPending: boolean;
  isUnpublishPending: boolean;
  onClose: () => void;
  onEdit: (popup: PopupItem) => void;
  onPublish: (popupId: number) => void;
  onUnpublish: (popupId: number) => void;
  popup: PopupItem;
}

const AdminPopupPreviewModal = ({
  currentDisplayPopupId,
  isPublishPending,
  isUnpublishPending,
  onClose,
  onEdit,
  onPublish,
  onUnpublish,
  popup,
}: AdminPopupPreviewModalProps) => {
  return (
    <Modal onClose={onClose} size='lg' title={popup.altText || '팝업 미리보기'}>
      <div className={styles['popupPreviewModalBody']}>
        <div className={styles['metaRow']}>
          {currentDisplayPopupId === popup.id ? (
            <span className={styles['badgeSuccess']}>노출중</span>
          ) : popup.published ? (
            <span className={styles['badge']}>예약/기간 외</span>
          ) : (
            <span className={styles['badgeDanger']}>중지</span>
          )}
        </div>

        <div className={styles['thumbnailPreview']}>
          <img
            alt={popup.altText || '팝업 이미지'}
            className={styles['thumbnailPreviewImage']}
            src={popup.imageUrl}
          />
        </div>

        <div className={styles['cellStack']}>
          <p className={styles['metaText']}>{popup.altText || '홈 팝업'}</p>
          <p className={styles['metaText']}>{formatVisibilityWindow(popup)}</p>
        </div>

        <div className={styles['actionRow']}>
          <Button
            onClick={() => {
              onEdit(popup);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            수정
          </Button>
          {popup.published ? (
            <Button
              disabled={isUnpublishPending}
              onClick={() => {
                onUnpublish(popup.id);
              }}
              size='sm'
              type='button'
              variant='secondary'
            >
              중지
            </Button>
          ) : (
            <Button
              disabled={isPublishPending}
              onClick={() => {
                onPublish(popup.id);
              }}
              size='sm'
              type='button'
            >
              노출
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AdminPopupPreviewModal;
