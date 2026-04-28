import { useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import popupSonoBasicCourseSampleImageSrc from '@/assets/sample/popup_sono_basic_course_sample.png';
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
  const [dismissSelection, setDismissSelection] = useState<{
    checked: boolean;
    popupId: number | null;
  }>({ checked: false, popupId: null });
  const [preloadedImageUrl, setPreloadedImageUrl] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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
        setPreloadedImageUrl(popupSonoBasicCourseSampleImageSrc);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setPreloadedImageUrl(popupSonoBasicCourseSampleImageSrc);
      }
    };
    image.src = popupSonoBasicCourseSampleImageSrc;

    return () => {
      cancelled = true;
    };
  }, [activePopup]);

  useEffect(() => {
    if (!activePopup || preloadedImageUrl !== popupSonoBasicCourseSampleImageSrc) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setClosedPopupIds((current) => [...current, activePopup.id]);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePopup, preloadedImageUrl]);

  if (
    popupsQuery.isPending ||
    popupsQuery.isError ||
    !activePopup ||
    preloadedImageUrl !== popupSonoBasicCourseSampleImageSrc
  ) {
    return null;
  }

  const closePopup = () => {
    const shouldDismissForToday =
      dismissSelection.popupId === activePopup.id && dismissSelection.checked;

    if (shouldDismissForToday) {
      dismissForToday(activePopup.id);
    }

    setClosedPopupIds((current) => [...current, activePopup.id]);
  };

  const isDismissForTodayChecked =
    dismissSelection.popupId === activePopup.id && dismissSelection.checked;

  return createPortal(
    <div className={styles['popupLayer']}>
      <section
        aria-label={activePopup.altText || '홈 팝업'}
        aria-modal='false'
        className={styles['panel']}
        role='dialog'
      >
        <div className={styles['imageWrap']}>
          <img
            alt={activePopup.altText || '홈 팝업'}
            className={styles['image']}
            decoding='async'
            fetchPriority='high'
            loading='eager'
            src={popupSonoBasicCourseSampleImageSrc}
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
                  popupId: activePopup.id,
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
            onClick={closePopup}
            ref={closeButtonRef}
            type='button'
          >
            닫기
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default GlobalNoticePopup;
