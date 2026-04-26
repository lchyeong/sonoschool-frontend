import { useEffect, useMemo, useState } from 'react';

import Modal from '@/components/overlay/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import { useGlobalPopupsQuery } from '@/query/usePopupQueries';

import styles from './GlobalNoticePopup.module.scss';

const DISMISS_STORAGE_PREFIX = 'popup-banner-dismissed';

const buildTodayLabel = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${String(year)}-${month}-${day}`;
};

const buildStorageKey = (popupId: number): string => `${DISMISS_STORAGE_PREFIX}:${String(popupId)}`;

const hasDismissedToday = (popupId: number): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(buildStorageKey(popupId)) === buildTodayLabel();
};

const dismissForToday = (popupId: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(buildStorageKey(popupId), buildTodayLabel());
};

const GlobalNoticePopup = () => {
  const popupsQuery = useGlobalPopupsQuery();
  const [closedPopupIds, setClosedPopupIds] = useState<number[]>([]);
  const [preloadedImageUrl, setPreloadedImageUrl] = useState<string | null>(null);

  const activePopup = useMemo(() => {
    const popups = popupsQuery.data ?? [];

    return (
      popups.find((popup) => {
        return !closedPopupIds.includes(popup.id) && !hasDismissedToday(popup.id);
      }) ?? null
    );
  }, [closedPopupIds, popupsQuery.data]);

  useEffect(() => {
    if (!activePopup) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setPreloadedImageUrl(activePopup.imageUrl);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setPreloadedImageUrl(activePopup.imageUrl);
      }
    };
    image.src = activePopup.imageUrl;

    return () => {
      cancelled = true;
    };
  }, [activePopup]);

  if (
    popupsQuery.isPending ||
    popupsQuery.isError ||
    !activePopup ||
    preloadedImageUrl !== activePopup.imageUrl
  ) {
    return null;
  }

  const closePopup = () => {
    setClosedPopupIds((current) => [...current, activePopup.id]);
  };

  return (
    <Modal hideTitle onClose={closePopup} title={activePopup.altText || '홈 팝업'}>
      <div className={styles['imageWrap']}>
        <img
          alt={activePopup.altText || '홈 팝업'}
          className={styles['image']}
          decoding='async'
          fetchPriority='high'
          loading='eager'
          src={preloadedImageUrl}
        />
      </div>
      <div className={styles['actionRow']}>
        <Button
          onClick={() => {
            dismissForToday(activePopup.id);
            closePopup();
          }}
          type='button'
          variant='secondary'
        >
          오늘은 닫기
        </Button>
        <Button onClick={closePopup} type='button'>
          닫기
        </Button>
      </div>
    </Modal>
  );
};

export default GlobalNoticePopup;
