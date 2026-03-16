import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useEffect, useId, useRef } from 'react';

import { createPortal } from 'react-dom';

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
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  restoreFocusElement?: HTMLElement | null | undefined;
}

const Modal = ({
  children,
  description,
  initialFocusRef,
  onClose,
  restoreFocusElement,
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialogElement = dialogRef.current;
    const focusTarget =
      initialFocusRef?.current ?? (dialogElement ? getFocusableElements(dialogElement)[0] : null);

    if (focusTarget) {
      focusTarget.focus();
    } else {
      dialogElement?.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;

      const nextFocusTarget = restoreFocusElementRef.current;
      if (nextFocusTarget?.isConnected) {
        nextFocusTarget.focus();
      }
    };
  }, [initialFocusRef, restoreFocusElement]);

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
    <div
      className={styles['overlay']}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;

        onClose();
      }}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal='true'
        className={styles['panel']}
        onKeyDown={handlePanelKeyDown}
        ref={dialogRef}
        role='dialog'
        tabIndex={-1}
      >
        <div className={styles['header']}>
          <div className={styles['headingGroup']}>
            <h2 className={styles['title']} id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className={styles['description']} id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>

          <button
            aria-label='모달 닫기'
            className={styles['closeButton']}
            onClick={onClose}
            type='button'
          >
            <span aria-hidden='true'>x</span>
          </button>
        </div>

        <div className={styles['body']}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
