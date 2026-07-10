import Button from '@/components/ui/Button/Button';
import type { PopupItem } from '@/types/popup';

import styles from './AdminConsolePage.module.scss';
import {
  formatVisibilityWindow,
  getPopupManagementStatusLabel,
  isPopupVisibleNow,
} from './adminPopupUtils';

interface AdminPopupTableProps {
  displayedPopupIds: readonly number[];
  isPublishPending: boolean;
  onDelete: (popupId: number) => void;
  onEdit: (popup: PopupItem) => void;
  onPreview: (popupId: number) => void;
  onPublish: (popupId: number) => void;
  onStartCreate: () => void;
  onUnpublish: (popupId: number) => void;
  popups: PopupItem[];
}

const AdminPopupTable = ({
  displayedPopupIds,
  isPublishPending,
  onDelete,
  onEdit,
  onPreview,
  onPublish,
  onStartCreate,
  onUnpublish,
  popups,
}: AdminPopupTableProps) => {
  return (
    <article className={styles['panelWide']}>
      <div className={styles['panelToolbar']}>
        <p className={styles['metaText']}>총 {popups.length}개</p>
        <Button onClick={onStartCreate} size='sm' type='button'>
          새 팝업 등록
        </Button>
      </div>

      {!popups.length ? (
        <section className={styles['stateSection']}>
          <h3 className={styles['stateTitle']}>표시할 팝업이 없습니다.</h3>
        </section>
      ) : (
        <div className={styles['tableWrap']}>
          <table className={`${styles['table']} ${styles['popupTable']}`}>
            <thead>
              <tr>
                <th scope='col'>팝업</th>
                <th scope='col'>관리</th>
              </tr>
            </thead>
            <tbody>
              {popups.map((popup) => {
                const isDisplayedPopup = displayedPopupIds.includes(popup.id);
                const isOverDisplayLimit = isPopupVisibleNow(popup) && !isDisplayedPopup;

                return (
                  <tr key={popup.id}>
                    <td>
                      <div className={styles['cellStack']}>
                        <span className={styles['noticeTitleRow']}>
                          <span className={styles['cellPrimary']}>
                            {popup.altText || '홈 팝업'}
                          </span>
                          {isDisplayedPopup ? (
                            <span className={styles['badgeSuccess']}>노출중</span>
                          ) : isOverDisplayLimit ? (
                            <span className={styles['badge']}>노출 한도 초과</span>
                          ) : popup.published ? (
                            <span className={styles['badge']}>예약/기간 외</span>
                          ) : (
                            <span className={styles['badgeDanger']}>중지</span>
                          )}
                        </span>
                        <span className={styles['cellSecondary']}>
                          {formatVisibilityWindow(popup)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles['tableActionGroup']}>
                        <button
                          className={styles['tableActionButton']}
                          onClick={() => {
                            onPreview(popup.id);
                          }}
                          type='button'
                        >
                          보기
                        </button>
                        <button
                          className={styles['tableActionButton']}
                          onClick={() => {
                            onEdit(popup);
                          }}
                          type='button'
                        >
                          수정
                        </button>
                        {popup.published ? (
                          <button
                            className={styles['tableActionButton']}
                            onClick={() => {
                              onUnpublish(popup.id);
                            }}
                            title='클릭하면 노출을 중지합니다.'
                            type='button'
                          >
                            {getPopupManagementStatusLabel(popup)}
                          </button>
                        ) : (
                          <button
                            className={styles['tableActionButton']}
                            disabled={isPublishPending}
                            onClick={() => {
                              onPublish(popup.id);
                            }}
                            title='클릭하면 노출 처리합니다.'
                            type='button'
                          >
                            {getPopupManagementStatusLabel(popup)}
                          </button>
                        )}
                        <button
                          className={styles['tableActionButtonDanger']}
                          onClick={() => {
                            onDelete(popup.id);
                          }}
                          type='button'
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
};

export default AdminPopupTable;
