import type { ReactNode } from 'react';

import styles from './AdminFieldArray.module.scss';

interface AdminFieldArrayProps<T> {
  addLabel: string;
  emptyMessage?: string;
  helperText?: string;
  items: readonly T[];
  label: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
}

const AdminFieldArray = <T,>({
  addLabel,
  emptyMessage = '등록된 항목이 없습니다.',
  helperText,
  items,
  label,
  onAdd,
  onRemove,
  renderItem,
}: AdminFieldArrayProps<T>) => {
  return (
    <section className={styles['fieldArray']}>
      <div className={styles['header']}>
        <div className={styles['headerCopy']}>
          <p className={styles['label']}>{label}</p>
          {helperText ? <p className={styles['helperText']}>{helperText}</p> : null}
        </div>
        <button className={styles['addButton']} onClick={onAdd} type='button'>
          {addLabel}
        </button>
      </div>

      {items.length ? (
        <div className={styles['rows']}>
          {items.map((item, index) => (
            <div className={styles['row']} key={index}>
              <div className={styles['rowFields']}>{renderItem(item, index)}</div>
              <button
                aria-label={`${label} ${index + 1} 삭제`}
                className={styles['removeButton']}
                onClick={() => {
                  onRemove(index);
                }}
                type='button'
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles['emptyState']}>{emptyMessage}</p>
      )}
    </section>
  );
};

export default AdminFieldArray;
