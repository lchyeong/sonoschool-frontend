import { useId, type ChangeEvent, type FormEvent, type ReactNode } from 'react';

import { classNames } from '@/utils/classNames';

import styles from './UnifiedSearchBar.module.scss';

interface UnifiedSearchBarProps {
  className?: string;
  inputAriaLabel: string;
  inputName?: string;
  inputType?: 'search' | 'text';
  leading?: ReactNode;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  value: string;
}

const UnifiedSearchBar = ({
  className,
  inputAriaLabel,
  inputName = 'q',
  inputType = 'search',
  leading,
  onChange,
  onSubmit,
  placeholder,
  submitLabel = '검색',
  value,
}: UnifiedSearchBarProps) => {
  const inputId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value);
  };

  return (
    <form
      className={classNames(
        styles['searchBar'],
        leading ? styles['searchBarWithLeading'] : styles['searchBarSimple'],
        className,
      )}
      onSubmit={handleSubmit}
    >
      {leading ? <div className={styles['leading']}>{leading}</div> : null}

      <label className={styles['srOnly']} htmlFor={inputId}>
        {inputAriaLabel}
      </label>

      <input
        autoComplete='off'
        className={styles['input']}
        id={inputId}
        name={inputName}
        onChange={handleChange}
        placeholder={placeholder}
        type={inputType}
        value={value}
      />

      <button aria-label={submitLabel} className={styles['submitButton']} type='submit'>
        <svg
          aria-hidden='true'
          className={styles['submitIcon']}
          fill='none'
          viewBox='0 0 24 24'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle cx='11' cy='11' r='5.8' stroke='currentColor' strokeWidth='1.8' />
          <path
            d='m15.6 15.4 4 4'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='1.8'
          />
        </svg>
      </button>
    </form>
  );
};

export default UnifiedSearchBar;
