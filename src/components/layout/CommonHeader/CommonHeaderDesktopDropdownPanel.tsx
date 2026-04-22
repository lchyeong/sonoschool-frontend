import type { HeaderNavigationItem } from '@/utils/buildHeaderNavigation';
import { classNames } from '@/utils/classNames';

import styles from './CommonHeader.module.scss';
import type { CommonHeaderLinkComponent } from './CommonHeader.types';
import { hasNavigationChildren } from './commonHeaderShared';

interface CommonHeaderDesktopDropdownPanelProps {
  item: HeaderNavigationItem;
  isVisible: boolean;
  LinkComponent: CommonHeaderLinkComponent;
  onCloseMenu: () => void;
}

const MAX_DROPDOWN_SECTIONS_PER_COLUMN = 4;

const distributeDropdownSections = <Item,>(items: readonly Item[]): Item[][] => {
  if (!items.length) {
    return [];
  }

  const columnCount = Math.ceil(items.length / MAX_DROPDOWN_SECTIONS_PER_COLUMN);
  const baseColumnSize = Math.floor(items.length / columnCount);
  const columnsWithExtraItem = items.length % columnCount;
  const columns: Item[][] = [];
  let startIndex = 0;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const columnSize = baseColumnSize + (columnIndex < columnsWithExtraItem ? 1 : 0);
    const endIndex = startIndex + columnSize;

    columns.push(items.slice(startIndex, endIndex));
    startIndex = endIndex;
  }

  return columns;
};

const CommonHeaderDesktopDropdownPanel = ({
  item,
  isVisible,
  LinkComponent,
  onCloseMenu,
}: CommonHeaderDesktopDropdownPanelProps) => {
  if (!item.children?.length) {
    return null;
  }

  const sectionColumns = distributeDropdownSections(item.children);

  return (
    <div
      aria-hidden={!isVisible}
      className={classNames(styles['dropdownPanel'], isVisible && styles['dropdownPanelOpen'])}
    >
      <div className={styles['dropdownPanelViewport']}>
        <div className={styles['dropdownInner']}>
          <div className={styles['dropdownHeader']}>
            <LinkComponent
              className={styles['dropdownTitleLink']}
              onClick={onCloseMenu}
              to={item.to}
            >
              {item.label}
            </LinkComponent>
            <p className={styles['dropdownDescription']}>{item.label}을 살펴보세요.</p>
          </div>
          <div className={styles['dropdownSectionGrid']}>
            {sectionColumns.map((sections, columnIndex) => {
              return (
                <div className={styles['dropdownSectionColumn']} key={columnIndex}>
                  {sections.map((section) => {
                    const hasGrandChildren = hasNavigationChildren(section);
                    const sectionDescription = section.description?.trim();

                    return (
                      <section className={styles['dropdownSection']} key={section.id}>
                        <LinkComponent
                          className={styles['dropdownSectionTitle']}
                          onClick={onCloseMenu}
                          to={section.to}
                        >
                          {section.label}
                        </LinkComponent>
                        {hasGrandChildren && sectionDescription ? (
                          <p className={styles['dropdownSectionDescription']}>
                            {sectionDescription}
                          </p>
                        ) : null}

                        {hasGrandChildren ? (
                          <ul className={styles['dropdownLinkList']}>
                            {section.children?.map((child) => {
                              const childDescription = child.description?.trim();

                              return (
                                <li className={styles['dropdownLinkItem']} key={child.id}>
                                  <LinkComponent
                                    className={styles['dropdownLink']}
                                    onClick={onCloseMenu}
                                    to={child.to}
                                  >
                                    {child.label}
                                  </LinkComponent>
                                  {childDescription ? (
                                    <p className={styles['dropdownLinkDescription']}>
                                      {childDescription}
                                    </p>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : sectionDescription ? (
                          <p className={styles['dropdownSectionHint']}>{sectionDescription}</p>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommonHeaderDesktopDropdownPanel;
