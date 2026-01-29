import type { MouseEventHandler } from 'react';

import { useToastStore } from '@/stores/useToastStore';
import { classNames } from '@/utils/classNames';

import styles from './ToastViewport.module.scss';

export const ToastViewport = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <div aria-atomic='true' aria-live='polite' className={styles['viewport']}>
      {toasts.map((toast) => {
        const handleDismiss: MouseEventHandler<HTMLButtonElement> = () => {
          dismissToast(toast.id);
        };

        return (
          <div
            className={classNames(
              styles['toast'],
              toast.variant === 'success' && styles['variantSuccess'],
              toast.variant === 'error' && styles['variantError'],
              toast.variant === 'info' && styles['variantInfo'],
            )}
            key={toast.id}
            role='status'
          >
            <div className={styles['message']}>{toast.message}</div>
            <button className={styles['closeButton']} onClick={handleDismiss} type='button'>
              닫기
            </button>
          </div>
        );
      })}
    </div>
  );
};
