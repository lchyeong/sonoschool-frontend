import { useMemo } from 'react';

import { Link, useParams } from 'react-router-dom';

import downloadIconSrc from '@/assets/icons/lucide_arrow-down-to-line.svg';
import fileIconSrc from '@/assets/icons/lucide_file-plus.svg';
import { useGlobalNoticesQuery, useNoticeDetailQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';
import type { NoticeAttachmentItem, NoticeItem } from '@/types/notice';
import { sanitizeRichTextHtml } from '@/utils/htmlContent';

import styles from './NoticeDetailPage.module.scss';

const formatFileSizeLabel = (size: number): string => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${String(Math.max(1, Math.round(size / 1024)))} KB`;
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? '오후' : '오전';
  const displayHour = hours % 12 || 12;

  return `${String(year)}. ${month}. ${day}. ${meridiem} ${String(displayHour)}:${minutes}`;
};

const getNoticeAttachments = (notice: NoticeItem | undefined): NoticeAttachmentItem[] => {
  const attachments = notice?.attachments;
  return Array.isArray(attachments) ? attachments : [];
};

const NoticeDetailPage = () => {
  const params = useParams();
  const noticeId = Number(params['noticeId']);
  const resolvedNoticeId = Number.isInteger(noticeId) && noticeId > 0 ? noticeId : null;
  const noticeQuery = useNoticeDetailQuery(resolvedNoticeId);
  const noticesQuery = useGlobalNoticesQuery();
  const notice = noticeQuery.data;
  const sanitizedContent = useMemo(() => {
    return notice ? sanitizeRichTextHtml(notice.content) : '';
  }, [notice]);
  const attachments = useMemo(() => getNoticeAttachments(notice), [notice]);
  const adjacentNotices = useMemo(() => {
    if (!notice || !noticesQuery.data) {
      return {
        next: null,
        previous: null,
      };
    }

    const currentIndex = noticesQuery.data.findIndex((item) => item.id === notice.id);

    if (currentIndex < 0) {
      return {
        next: null,
        previous: null,
      };
    }

    return {
      next: noticesQuery.data[currentIndex - 1] ?? null,
      previous: noticesQuery.data[currentIndex + 1] ?? null,
    };
  }, [notice, noticesQuery.data]);

  if (resolvedNoticeId === null) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>공지 경로가 올바르지 않습니다.</h1>
        <p className={styles['stateDescription']}>공지사항 목록으로 돌아가 다시 선택해 주세요.</p>
        <Link className={styles['backLink']} to={routePaths.notices}>
          공지사항 목록으로 이동
        </Link>
      </section>
    );
  }

  if (noticeQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>공지 상세를 불러오는 중입니다.</h1>
        <p className={styles['stateDescription']}>운영 공지 내용을 준비하고 있습니다.</p>
      </section>
    );
  }

  if (noticeQuery.isError || !notice) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>공지 상세를 불러오지 못했습니다.</h1>
        <p className={styles['stateDescription']}>
          {noticeQuery.error instanceof Error
            ? noticeQuery.error.message
            : '운영 공지 상태를 확인한 뒤 다시 시도해 주세요.'}
        </p>
        <Link className={styles['backLink']} to={routePaths.notices}>
          공지사항 목록으로 이동
        </Link>
      </section>
    );
  }

  return (
    <main className={styles['page']}>
      <article className={styles['detail']} aria-labelledby='notice-detail-title'>
        <h1 className={styles['pageTitle']}>공지사항</h1>

        <header className={styles['noticeHeader']}>
          {notice.pinned ? <span className={styles['badge']}>필독</span> : null}
          <h2 className={styles['noticeTitle']} id='notice-detail-title'>
            {notice.title}
          </h2>
          <time className={styles['noticeDate']} dateTime={notice.createdAt}>
            {formatDate(notice.createdAt)}
          </time>
        </header>

        <section className={styles['contentPanel']} aria-label='공지사항 본문'>
          <div
            className={styles['richContent']}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </section>

        <section className={styles['attachmentPanel']} aria-labelledby='notice-attachment-title'>
          <h3 className={styles['attachmentTitle']} id='notice-attachment-title'>
            첨부파일
          </h3>
          {attachments.length > 0 ? (
            <ul className={styles['attachmentList']}>
              {attachments.map((attachment, index) => {
                const key = attachment.id ?? `${attachment.fileName}-${String(index)}`;
                const content = (
                  <>
                    <span className={styles['attachmentMeta']}>
                      <img
                        alt=''
                        aria-hidden='true'
                        className={styles['fileIcon']}
                        src={fileIconSrc}
                      />
                      <span className={styles['fileName']}>{attachment.fileName}</span>
                    </span>
                    <span className={styles['fileSize']}>
                      {formatFileSizeLabel(attachment.fileSize)}
                    </span>
                    <span className={styles['downloadButton']} aria-hidden='true'>
                      <img alt='' className={styles['downloadIcon']} src={downloadIconSrc} />
                    </span>
                  </>
                );

                return (
                  <li className={styles['attachmentItem']} key={key}>
                    {attachment.url ? (
                      <a className={styles['attachmentLink']} href={attachment.url} download>
                        {content}
                      </a>
                    ) : (
                      <div className={styles['attachmentLink']}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles['attachmentEmpty']}>
              <span className={styles['attachmentMeta']}>
                <img alt='' aria-hidden='true' className={styles['fileIcon']} src={fileIconSrc} />
                <span className={styles['fileName']}>첨부파일이 없습니다.</span>
              </span>
            </div>
          )}
        </section>

        <nav className={styles['adjacentPanel']} aria-label='이전글 다음글'>
          <AdjacentNoticeLink direction='previous' notice={adjacentNotices.previous} />
          <AdjacentNoticeLink direction='next' notice={adjacentNotices.next} />
        </nav>

        <div className={styles['listAction']}>
          <Link className={styles['listButton']} to={routePaths.notices}>
            목록으로
          </Link>
        </div>
      </article>
    </main>
  );
};

interface AdjacentNoticeLinkProps {
  direction: 'next' | 'previous';
  notice: NoticeItem | null;
}

const AdjacentNoticeLink = ({ direction, notice }: AdjacentNoticeLinkProps) => {
  const label = direction === 'previous' ? '이전글' : '다음 글';
  const content = (
    <>
      <span className={styles['adjacentIcon']} aria-hidden='true'>
        <svg fill='none' viewBox='0 0 24 24'>
          <path
            d={direction === 'previous' ? 'M15 18L9 12L15 6' : 'M9 6L15 12L9 18'}
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
          />
        </svg>
      </span>
      <span className={styles['adjacentText']}>
        <span className={styles['adjacentLabel']}>{label}</span>
        <span className={styles['adjacentTitle']}>{notice?.title ?? '등록된 글이 없습니다.'}</span>
      </span>
    </>
  );

  if (!notice) {
    return (
      <div className={styles['adjacentLink']} data-direction={direction} aria-disabled='true'>
        {content}
      </div>
    );
  }

  return (
    <Link
      className={styles['adjacentLink']}
      data-direction={direction}
      to={routePaths.noticeDetail(String(notice.id))}
    >
      {content}
    </Link>
  );
};

export default NoticeDetailPage;
