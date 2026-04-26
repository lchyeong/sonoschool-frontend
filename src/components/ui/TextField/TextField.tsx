import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { classNames } from '@/utils/classNames';

import styles from './TextField.module.scss';

interface BaseFieldProps {
  label: string;
  errorMessage?: string | undefined;
  errorClassName?: string | undefined;
  fieldClassName?: string | undefined;
  labelClassName?: string | undefined;
}

export interface TextFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    { className, errorClassName, errorMessage, fieldClassName, id, label, labelClassName, ...rest },
    ref,
  ) => {
    const resolvedId = id ?? rest.name ?? undefined;
    const errorId = resolvedId ? `${resolvedId}_error` : undefined;

    return (
      <div className={classNames(styles['field'], fieldClassName)}>
        <label className={classNames(styles['label'], labelClassName)} htmlFor={resolvedId}>
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
          className={classNames(
            styles['error'],
            errorClassName,
            !errorMessage && styles['errorHidden'],
          )}
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
  (
    { className, errorClassName, errorMessage, fieldClassName, id, label, labelClassName, ...rest },
    ref,
  ) => {
    const resolvedId = id ?? rest.name ?? undefined;
    const errorId = resolvedId ? `${resolvedId}_error` : undefined;

    return (
      <div className={classNames(styles['field'], fieldClassName)}>
        <label className={classNames(styles['label'], labelClassName)} htmlFor={resolvedId}>
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
          className={classNames(
            styles['error'],
            errorClassName,
            !errorMessage && styles['errorHidden'],
          )}
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
