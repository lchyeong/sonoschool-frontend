import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import type { PopupItem } from '@/types/popup';

import styles from './AdminConsolePage.module.scss';
import {
  formatVisibilityWindow,
  getPopupManagementStatusLabel,
  isPopupVisibleNow,
} from './adminPopupUtils';

interface AdminPopupPreviewModalProps {
  displayedPopupIds: readonly number[];
  isPublishPending: boolean;
  isUnpublishPending: boolean;
  onClose: () => void;
  onEdit: (popup: PopupItem) => void;
  onPublish: (popupId: number) => void;
  onUnpublish: (popupId: number) => void;
  popup: PopupItem;
}

const AdminPopupPreviewModal = ({
  displayedPopupIds,
  isPublishPending,
  isUnpublishPending,
  onClose,
  onEdit,
  onPublish,
  onUnpublish,
  popup,
}: AdminPopupPreviewModalProps) => {
  const isDisplayedPopup = displayedPopupIds.includes(popup.id);
  const isOverDisplayLimit = isPopupVisibleNow(popup) && !isDisplayedPopup;

  return (
    <Modal
      onClose={onClose}
      overlayClassName={styles['popupPreviewModalOverlay']}
      panelClassName={styles['popupPreviewModalPanel']}
      size='lg'
      title={popup.altText || '팝업 미리보기'}
    >
      <div className={styles['popupPreviewModalBody']}>
        <div className={styles['metaRow']}>
          {isDisplayedPopup ? (
            <span className={styles['badgeSuccess']}>노출중</span>
          ) : isOverDisplayLimit ? (
            <span className={styles['badge']}>노출 한도 초과</span>
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
              title='클릭하면 노출을 중지합니다.'
              type='button'
              variant='secondary'
            >
              {getPopupManagementStatusLabel(popup)}
            </Button>
          ) : (
            <Button
              disabled={isPublishPending}
              onClick={() => {
                onPublish(popup.id);
              }}
              size='sm'
              title='클릭하면 노출 처리합니다.'
              type='button'
            >
              {getPopupManagementStatusLabel(popup)}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AdminPopupPreviewModal;
