import { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { useGlobalNoticesQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';

import styles from './GlobalNoticePopup.module.scss';

const DISMISS_STORAGE_PREFIX = 'notice-popup-dismissed';

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const buildTodayLabel = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${String(year)}-${month}-${day}`;
};

const buildStorageKey = (noticeId: number): string => `${DISMISS_STORAGE_PREFIX}:${String(noticeId)}`;

const hasDismissedToday = (noticeId: number): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(buildStorageKey(noticeId)) === buildTodayLabel();
};

const dismissForToday = (noticeId: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(buildStorageKey(noticeId), buildTodayLabel());
};

const splitContentParagraphs = (content: string): string[] => {
  return content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
};

const GlobalNoticePopup = () => {
  const noticesQuery = useGlobalNoticesQuery();
  const [isClosed, setIsClosed] = useState(false);

  const activePopupNotice = useMemo(() => {
    const notices = noticesQuery.data ?? [];

    return (
      notices.find((notice) => {
        return notice.popup && !hasDismissedToday(notice.id);
      }) ?? null
    );
  }, [noticesQuery.data]);

  useEffect(() => {
    setIsClosed(false);
  }, [activePopupNotice?.id]);

  if (noticesQuery.isPending || noticesQuery.isError || !activePopupNotice || isClosed) {
    return null;
  }

  return (
    <Modal
      description={`등록일 ${formatDate(activePopupNotice.createdAt)} · 운영 공지`}
      onClose={() => {
        setIsClosed(true);
      }}
      title={activePopupNotice.title}
    >
      <div className={styles['content']}>
        {splitContentParagraphs(activePopupNotice.content).map((paragraph) => {
          return (
            <p className={styles['paragraph']} key={paragraph}>
              {paragraph}
            </p>
          );
        })}
      </div>
      <div className={styles['actionRow']}>
        <Link
          className={styles['detailLink']}
          to={routePaths.noticeDetail(String(activePopupNotice.id))}
        >
          공지 자세히 보기
        </Link>
        <Button
          onClick={() => {
            dismissForToday(activePopupNotice.id);
            setIsClosed(true);
          }}
          type='button'
          variant='secondary'
        >
          오늘은 닫기
        </Button>
      </div>
    </Modal>
  );
};

export default GlobalNoticePopup;
