import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { classNames } from '@/utils/classNames';

import styles from './TextField.module.scss';

interface BaseFieldProps {
  label: string;
  errorMessage?: string | undefined;
}

export interface TextFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, errorMessage, id, label, ...rest }, ref) => {
    const resolvedId = id ?? rest.name ?? undefined;
    const errorId = resolvedId ? `${resolvedId}_error` : undefined;

    return (
      <div className={styles['field']}>
        <label className={styles['label']} htmlFor={resolvedId}>
          {label}
        </label>
        <input
          aria-describedby={errorMessage && errorId ? errorId : undefined}
          aria-invalid={Boolean(errorMessage)}
          className={classNames(styles['input'], className)}
          id={resolvedId}
          ref={ref}
          {...rest}
        />
        <div
          aria-hidden={!errorMessage}
          className={classNames(styles['error'], !errorMessage && styles['errorHidden'])}
          id={errorMessage && errorId ? errorId : undefined}
          role={errorMessage ? 'alert' : undefined}
        >
          {errorMessage ?? ' '}
        </div>
      </div>
    );
  },
);

TextField.displayName = 'TextField';

export interface TextAreaFieldProps
  extends BaseFieldProps,
    TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ className, errorMessage, id, label, ...rest }, ref) => {
    const resolvedId = id ?? rest.name ?? undefined;
    const errorId = resolvedId ? `${resolvedId}_error` : undefined;

    return (
      <div className={styles['field']}>
        <label className={styles['label']} htmlFor={resolvedId}>
          {label}
        </label>
        <textarea
          aria-describedby={errorMessage && errorId ? errorId : undefined}
          aria-invalid={Boolean(errorMessage)}
          className={classNames(styles['input'], styles['textarea'], className)}
          id={resolvedId}
          ref={ref}
          {...rest}
        />
        <div
          aria-hidden={!errorMessage}
          className={classNames(styles['error'], !errorMessage && styles['errorHidden'])}
          id={errorMessage && errorId ? errorId : undefined}
          role={errorMessage ? 'alert' : undefined}
        >
          {errorMessage ?? ' '}
        </div>
      </div>
    );
  },
);

TextAreaField.displayName = 'TextAreaField';
