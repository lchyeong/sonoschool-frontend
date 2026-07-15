import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useEffect, useId, useRef } from 'react';

import { createPortal } from 'react-dom';

import { classNames } from '@/utils/classNames';

import styles from './Modal.module.scss';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      return element.getAttribute('aria-hidden') !== 'true';
    },
  );
};

interface ModalProps {
  title: string;
  description?: string | undefined;
  children: ReactNode;
  headerLeading?: ReactNode;
  headerLeadingStacked?: boolean | undefined;
  hideTitle?: boolean | undefined;
  overlayClassName?: string | undefined;
  panelClassName?: string | undefined;
  headerClassName?: string | undefined;
  bodyClassName?: string | undefined;
  titleClassName?: string | undefined;
  descriptionClassName?: string | undefined;
  closeButtonClassName?: string | undefined;
  closeButtonContent?: ReactNode;
  closeButtonLabel?: string | undefined;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  lockScroll?: boolean | undefined;
  restoreFocusElement?: HTMLElement | null | undefined;
  size?: 'md' | 'lg' | undefined;
}

const Modal = ({
  children,
  description,
  headerLeading,
  headerLeadingStacked = false,
  hideTitle = false,
  panelClassName,
  headerClassName,
  bodyClassName,
  titleClassName,
  descriptionClassName,
  closeButtonClassName,
  closeButtonContent,
  closeButtonLabel,
  initialFocusRef,
  lockScroll = true,
  onClose,
  overlayClassName,
  restoreFocusElement,
  size = 'md',
  title,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    restoreFocusElementRef.current =
      restoreFocusElement ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    if (lockScroll) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    const dialogElement = dialogRef.current;
    const focusTarget =
      initialFocusRef?.current ?? (dialogElement ? getFocusableElements(dialogElement)[0] : null);

    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    } else {
      dialogElement?.focus({ preventScroll: true });
    }

    return () => {
      if (lockScroll) {
        document.documentElement.style.overflow = previousDocumentOverflow;
        document.body.style.overflow = previousBodyOverflow;
      }

      const nextFocusTarget = restoreFocusElementRef.current;
      if (nextFocusTarget?.isConnected) {
        nextFocusTarget.focus({ preventScroll: true });
      }
    };
  }, [initialFocusRef, lockScroll, restoreFocusElement]);

  if (typeof document === 'undefined') {
    return null;
  }

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const focusableElements = getFocusableElements(dialogElement);
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogElement.focus();
      return;
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstFocusableElement) {
      event.preventDefault();
      lastFocusableElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastFocusableElement) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  };

  return createPortal(
    <div className={classNames(styles['overlay'], overlayClassName)}>
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal='true'
        className={classNames(styles['panel'], size === 'lg' && styles['panelLg'], panelClassName)}
        onKeyDown={handlePanelKeyDown}
        ref={dialogRef}
        role='dialog'
        tabIndex={-1}
      >
        <div className={classNames(styles['header'], headerClassName)}>
          <div
            className={classNames(
              styles['headerMain'],
              headerLeadingStacked && styles['headerMainStacked'],
            )}
          >
            {headerLeading ? (
              <div
                className={classNames(
                  styles['headerLeading'],
                  headerLeadingStacked && styles['headerLeadingStacked'],
                )}
              >
                {headerLeading}
              </div>
            ) : null}
            <div className={styles['headingGroup']}>
              <h2 className={classNames(styles['title'], titleClassName)} id={titleId}>
                <span className={classNames(hideTitle && styles['titleHidden'])}>{title}</span>
              </h2>
              {description ? (
                <p
                  className={classNames(styles['description'], descriptionClassName)}
                  id={descriptionId}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <button
            aria-label={closeButtonLabel ?? '모달 닫기'}
            className={classNames(styles['closeButton'], closeButtonClassName)}
            onClick={onClose}
            type='button'
          >
            {closeButtonContent ?? <span aria-hidden='true'>x</span>}
          </button>
        </div>

        <div className={classNames(styles['body'], bodyClassName)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
