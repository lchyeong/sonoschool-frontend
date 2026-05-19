import type { NoticeItem } from '@/types/notice';
import { summarizeHtmlContent } from '@/utils/htmlContent';

import styles from './AdminConsolePage.module.scss';
import { formatNoticeDateTime } from './adminNoticeUtils';

interface AdminNoticeTableProps {
  notices: NoticeItem[];
  onDelete: (noticeId: number) => void;
  onEdit: (noticeId: number) => void;
  onPublish: (noticeId: number) => void;
  onUnpublish: (noticeId: number) => void;
}

const AdminNoticeTable = ({
  notices,
  onDelete,
  onEdit,
  onPublish,
  onUnpublish,
}: AdminNoticeTableProps) => {
  return (
    <div className={styles['tableWrap']}>
      <table className={`${styles['table']} ${styles['noticeTable']}`}>
        <thead>
          <tr>
            <th scope='col'>제목</th>
            <th scope='col'>일시</th>
            <th scope='col'>관리</th>
          </tr>
        </thead>
        <tbody>
          {notices.map((notice) => (
            <tr key={notice.id}>
              <td>
                <div className={styles['cellStack']}>
                  <span className={styles['noticeTitleRow']}>
                    <span className={styles['cellPrimary']}>{notice.title}</span>
                    <span className={notice.published ? styles['badgeSuccess'] : styles['badge']}>
                      {notice.published ? '게시 중' : '비공개'}
                    </span>
                    {notice.pinned ? <span className={styles['badgeAccent']}>필독</span> : null}
                  </span>
                  <span className={styles['cellSecondary']}>
                    {summarizeHtmlContent(notice.content, 110)}
                  </span>
                </div>
              </td>
              <td>
                <div className={styles['cellStack']}>
                  <span className={styles['cellSecondary']}>
                    등록 {formatNoticeDateTime(notice.createdAt)}
                  </span>
                  <span className={styles['cellSecondary']}>
                    수정 {formatNoticeDateTime(notice.updatedAt)}
                  </span>
                </div>
              </td>
              <td>
                <div className={styles['tableActionGroup']}>
                  <button
                    className={styles['tableActionButton']}
                    onClick={() => {
                      onEdit(notice.id);
                    }}
                    type='button'
                  >
                    수정
                  </button>
                  {notice.published ? (
                    <button
                      className={styles['tableActionButton']}
                      onClick={() => {
                        onUnpublish(notice.id);
                      }}
                      type='button'
                    >
                      중지
                    </button>
                  ) : (
                    <button
                      className={styles['tableActionButton']}
                      onClick={() => {
                        onPublish(notice.id);
                      }}
                      type='button'
                    >
                      게시
                    </button>
                  )}
                  <button
                    className={styles['tableActionButtonDanger']}
                    onClick={() => {
                      onDelete(notice.id);
                    }}
                    type='button'
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminNoticeTable;
