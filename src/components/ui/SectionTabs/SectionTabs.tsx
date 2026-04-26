import { classNames } from '@/utils/classNames';

import styles from './SectionTabs.module.scss';

export interface SectionTabItem<TValue extends string> {
  count?: number | undefined;
  disabled?: boolean | undefined;
  label: string;
  value: TValue;
}

interface SectionTabsProps<TValue extends string> {
  ariaLabel: string;
  className?: string | undefined;
  items: Array<SectionTabItem<TValue>>;
  onChange: (value: TValue) => void;
  value: TValue;
}

const SectionTabs = <TValue extends string>({
  ariaLabel,
  className,
  items,
  onChange,
  value,
}: SectionTabsProps<TValue>) => {
  return (
    <div aria-label={ariaLabel} className={classNames(styles['tabs'], className)} role='tablist'>
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            aria-selected={isActive}
            className={classNames(styles['tab'], isActive && styles['tabActive'])}
            disabled={item.disabled}
            key={item.value}
            onClick={() => {
              onChange(item.value);
            }}
            role='tab'
            type='button'
          >
            <span className={styles['label']}>{item.label}</span>
            {typeof item.count === 'number' ? (
              <span
                className={classNames(styles['count'], isActive && styles['countActive'])}
                aria-label={`${item.label} ${String(item.count)}건`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default SectionTabs;
