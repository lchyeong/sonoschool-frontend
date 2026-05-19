import { useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { useGlobalPopupsQuery } from '@/query/usePopupQueries';
import type { PopupItem } from '@/types/popup';

import styles from './GlobalNoticePopup.module.scss';

const DISMISS_STORAGE_PREFIX = 'popup-banner-dismissed';
const MAX_VISIBLE_POPUP_COUNT = 3;

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
  const [dismissSelection, setDismissSelection] = useState<{
    checked: boolean;
    popupId: number | null;
  }>({ checked: false, popupId: null });
  const [preloadedImageUrls, setPreloadedImageUrls] = useState<string[]>([]);
  const firstCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const visiblePopups = useMemo(() => {
    const popups = popupsQuery.data ?? [];

    return popups
      .filter((popup) => {
        return !closedPopupIds.includes(popup.id) && !hasDismissedToday(popup.id);
      })
      .slice(0, MAX_VISIBLE_POPUP_COUNT);
  }, [closedPopupIds, popupsQuery.data]);

  useEffect(() => {
    if (visiblePopups.length === 0) {
      return;
    }

    let cancelled = false;
    const popupImageUrls = visiblePopups.map((popup) => popup.imageUrl);
    const preloadImage = (popupImageUrl: string) =>
      new Promise<string>((resolve) => {
        const image = new Image();
        image.onload = () => {
          resolve(popupImageUrl);
        };
        image.onerror = () => {
          resolve(popupImageUrl);
        };
        image.src = popupImageUrl;
      });

    void Promise.all(popupImageUrls.map(preloadImage)).then((loadedImageUrls) => {
      if (!cancelled) {
        setPreloadedImageUrls(loadedImageUrls);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [visiblePopups]);

  useEffect(() => {
    const visiblePopupIds = visiblePopups.map((popup) => popup.id);

    if (
      visiblePopups.length === 0 ||
      visiblePopups.some((popup) => !preloadedImageUrls.includes(popup.imageUrl))
    ) {
      return;
    }

    firstCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setClosedPopupIds((current) => [...new Set([...current, ...visiblePopupIds])]);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [preloadedImageUrls, visiblePopups]);

  if (
    popupsQuery.isPending ||
    popupsQuery.isError ||
    visiblePopups.length === 0 ||
    visiblePopups.some((popup) => !preloadedImageUrls.includes(popup.imageUrl))
  ) {
    return null;
  }

  const closePopup = (popup: PopupItem) => {
    const shouldDismissForToday = dismissSelection.popupId === popup.id && dismissSelection.checked;

    if (shouldDismissForToday) {
      dismissForToday(popup.id);
    }

    setClosedPopupIds((current) => [...current, popup.id]);
  };

  return createPortal(
    <div className={styles['popupLayer']}>
      <div className={styles['popupGrid']}>
        {visiblePopups.map((popup, index) => {
          const isDismissForTodayChecked =
            dismissSelection.popupId === popup.id && dismissSelection.checked;
          return (
            <section
              aria-label={popup.altText || '홈 팝업'}
              aria-modal='false'
              className={styles['panel']}
              key={popup.id}
              role='dialog'
            >
              <div className={styles['imageWrap']}>
                <img
                  alt={popup.altText || '홈 팝업'}
                  className={styles['image']}
                  decoding='async'
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  loading='eager'
                  src={popup.imageUrl}
                />
              </div>
              <div className={styles['actionRow']}>
                <label className={styles['dismissControl']}>
                  <input
                    checked={isDismissForTodayChecked}
                    className={styles['dismissInput']}
                    onChange={(event) => {
                      setDismissSelection({
                        checked: event.target.checked,
                        popupId: popup.id,
                      });
                    }}
                    type='checkbox'
                  />
                  <span aria-hidden='true' className={styles['dismissCheckbox']}>
                    <span className={styles['dismissCheckMark']} />
                  </span>
                  오늘 하루 보지 않기
                </label>
                <button
                  className={styles['closeButton']}
                  onClick={() => {
                    closePopup(popup);
                  }}
                  ref={index === 0 ? firstCloseButtonRef : undefined}
                  type='button'
                >
                  닫기
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

export default GlobalNoticePopup;
