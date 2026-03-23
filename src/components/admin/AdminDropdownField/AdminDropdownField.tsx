import { useEffect, useMemo, useRef, useState } from 'react';

import downIconSrc from '@/assets/icons/icons_down.png';
import { classNames } from '@/utils/classNames';

import styles from './AdminDropdownField.module.scss';

export interface AdminDropdownOption<T extends string = string> {
  value: T;
  label: string;
  meta?: string;
  disabled?: boolean;
}

interface AdminDropdownFieldProps<T extends string = string> {
  label: string;
  options: readonly AdminDropdownOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

const AdminDropdownField = <T extends string = string>({
  label,
  options,
  value,
  onChange,
  placeholder = '선택해 주세요',
  compact = false,
  disabled = false,
  className,
}: AdminDropdownFieldProps<T>) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div
      className={classNames(styles['field'], compact && styles['compact'], className)}
      ref={rootRef}
    >
      <span className={styles['label']}>{label}</span>
      <button
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        aria-label={label}
        className={styles['trigger']}
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }

          setIsOpen((current) => !current);
        }}
        type='button'
      >
        <span className={styles['triggerLabel']}>{selectedOption?.label ?? placeholder}</span>
        <span className={styles['caret']}>
          <img alt='' aria-hidden='true' className={styles['caretIcon']} src={downIconSrc} />
        </span>
      </button>

      {isOpen ? (
        <div aria-label={`${label} 목록`} className={styles['menu']} role='listbox'>
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={classNames(
                  styles['option'],
                  isSelected && styles['optionSelected'],
                  option.disabled && styles['optionDisabled'],
                )}
                disabled={option.disabled}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role='option'
                type='button'
              >
                <span className={styles['optionTitle']}>{option.label}</span>
                {option.meta ? <span className={styles['optionMeta']}>{option.meta}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default AdminDropdownField;
