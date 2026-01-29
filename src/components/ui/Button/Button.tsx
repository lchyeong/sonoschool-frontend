import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

import { classNames } from '@/utils/classNames';

import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { children, className, disabled, size = 'md', type = 'button', variant = 'primary', ...rest },
    ref,
  ) => {
    return (
      <button
        className={classNames(
          styles['button'],
          size === 'sm' && styles['sizeSm'],
          size === 'md' && styles['sizeMd'],
          variant === 'primary' && styles['variantPrimary'],
          variant === 'secondary' && styles['variantSecondary'],
          variant === 'danger' && styles['variantDanger'],
          disabled && styles['disabled'],
          className,
        )}
        disabled={disabled}
        ref={ref}
        type={type}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
