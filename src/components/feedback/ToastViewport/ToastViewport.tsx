import { useEffect } from 'react';

import { useToastStore } from '@/stores/useToastStore';

import styles from './ToastViewport.module.scss';

const ToastViewport = () => {
  const dismissToast = useToastStore((state) => state.dismissToast);
  const toasts = useToastStore((state) => state.toasts);

  useEffect(() => {
    const timers = toasts
      .filter((toast) => toast.durationMs !== null)
      .map((toast) =>
        window.setTimeout(() => {
          dismissToast(toast.id);
        }, toast.durationMs ?? 0),
      );

    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, [dismissToast, toasts]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div aria-live='polite' aria-relevant='additions text' className={styles['viewport']}>
      {toasts.map((toast) => (
        <div className={styles['toast']} data-variant={toast.variant} key={toast.id} role='status'>
          <span>{toast.message}</span>
          <button
            aria-label='알림 닫기'
            className={styles['closeButton']}
            onClick={() => {
              dismissToast(toast.id);
            }}
            type='button'
          >
            닫기
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastViewport;
