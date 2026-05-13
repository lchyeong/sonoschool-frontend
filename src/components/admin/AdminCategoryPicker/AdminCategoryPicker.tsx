import { useMemo } from 'react';

import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import type { AdminCategoryTreeItem } from '@/types/adminCategories';
import { classNames } from '@/utils/classNames';

import styles from './AdminCategoryPicker.module.scss';

interface FlatCategoryItem extends AdminCategoryTreeItem {
  pathIds: number[];
  pathLabel: string;
  isLeaf: boolean;
}

interface AdminCategoryPickerProps {
  helperText?: string;
  label: string;
  onChange: (categoryId: string) => void;
  tree: readonly AdminCategoryTreeItem[];
  value: string;
}

const sortCategoryTree = (items: readonly AdminCategoryTreeItem[]): AdminCategoryTreeItem[] => {
  return [...items]
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.id - right.id;
    })
    .map((item) => ({
      ...item,
      children: sortCategoryTree(item.children),
    }));
};

const filterActiveTree = (items: readonly AdminCategoryTreeItem[]): AdminCategoryTreeItem[] => {
  return items
    .filter((item) => item.active)
    .map((item) => ({
      ...item,
      children: filterActiveTree(item.children),
    }));
};

const flattenCategoryTree = (
  items: readonly AdminCategoryTreeItem[],
  pathIds: readonly number[] = [],
  pathNames: readonly string[] = [],
): FlatCategoryItem[] => {
  return items.flatMap((item) => {
    const nextPathIds = [...pathIds, item.id];
    const nextPathNames = [...pathNames, item.name];
    const current: FlatCategoryItem = {
      ...item,
      isLeaf: item.children.length === 0,
      pathIds: nextPathIds,
      pathLabel: nextPathNames.join(' > '),
    };

    return [current, ...flattenCategoryTree(item.children, nextPathIds, nextPathNames)];
  });
};

const buildCategoryColumns = (
  tree: readonly AdminCategoryTreeItem[],
  pathIds: readonly number[],
): [AdminCategoryTreeItem[], AdminCategoryTreeItem[], AdminCategoryTreeItem[]] => {
  const firstColumn = [...tree];
  const secondColumn =
    pathIds.length >= 1
      ? [...(firstColumn.find((item) => item.id === pathIds[0])?.children ?? [])]
      : [];
  const thirdColumn =
    pathIds.length >= 2
      ? [...(secondColumn.find((item) => item.id === pathIds[1])?.children ?? [])]
      : [];

  return [firstColumn, secondColumn, thirdColumn];
};

const AdminCategoryPicker = ({
  helperText = '프로그램을 노출할 카테고리를 선택해 주세요.',
  label,
  onChange,
  tree,
  value,
}: AdminCategoryPickerProps) => {
  const activeTree = useMemo(() => filterActiveTree(tree), [tree]);
  const sortedTree = useMemo(() => sortCategoryTree(activeTree), [activeTree]);
  const flatCategories = useMemo(() => flattenCategoryTree(sortedTree), [sortedTree]);
  const categoryMap = useMemo(
    () => new Map(flatCategories.map((item) => [item.id, item])),
    [flatCategories],
  );
  const selectedCategoryId = value.trim() ? Number(value) : null;
  const selectedCategory =
    selectedCategoryId !== null ? (categoryMap.get(selectedCategoryId) ?? null) : null;
  const selectedPathIds = useMemo(() => selectedCategory?.pathIds ?? [], [selectedCategory]);

  const columns = useMemo(
    () => buildCategoryColumns(sortedTree, selectedPathIds),
    [selectedPathIds, sortedTree],
  );

  return (
    <div className={styles['field']}>
      <div className={styles['header']}>
        <p className={styles['label']}>{label}</p>
        <p className={styles['helper']}>{helperText}</p>
      </div>

      <div className={styles['selectionBar']}>
        <p className={styles['selectionLabel']}>현재 선택된 카테고리</p>
        <p className={styles['selectionValue']}>
          {selectedCategory ? selectedCategory.pathLabel : '선택된 카테고리가 없습니다.'}
        </p>
      </div>

      <div className={styles['browserShell']}>
        <div className={styles['browserGrid']}>
          {columns.map((columnItems, columnIndex) => (
            <section
              className={styles['browserColumn']}
              key={`picker-column-${String(columnIndex)}`}
            >
              <div
                className={styles['browserColumnHeader']}
              >{`${String(columnIndex + 1)}차 카테고리`}</div>
              {columnItems.length ? (
                <div className={styles['browserList']} role='list'>
                  {columnItems.map((item) => {
                    const flatItem = categoryMap.get(item.id);
                    const isActive = selectedPathIds[columnIndex] === item.id;
                    const isSelected = selectedCategoryId === item.id;

                    return (
                      <button
                        aria-label={`${item.name} 카테고리 선택`}
                        className={classNames(
                          styles['browserOption'],
                          isActive && styles['browserOptionActive'],
                          isSelected && styles['browserOptionSelected'],
                        )}
                        key={item.id}
                        onClick={() => {
                          if (!flatItem) {
                            return;
                          }

                          onChange(String(flatItem.id));
                        }}
                        type='button'
                      >
                        <span className={styles['browserOptionLabel']}>{item.name}</span>
                        {item.children.length ? (
                          <img
                            alt=''
                            aria-hidden='true'
                            className={styles['browserOptionArrow']}
                            src={rightArrowIconSrc}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles['columnEmpty']}>카테고리 없음</div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCategoryPicker;
