import type { HeaderNavigationItem } from '@/utils/buildHeaderNavigation';
import { classNames } from '@/utils/classNames';

import styles from './CommonHeader.module.scss';
import type { CommonHeaderLinkComponent } from './CommonHeader.types';
import { getNavigationDescription, hasNavigationChildren } from './commonHeaderShared';

interface CommonHeaderDesktopDropdownPanelProps {
  item: HeaderNavigationItem;
  isVisible: boolean;
  LinkComponent: CommonHeaderLinkComponent;
  onCloseMenu: () => void;
}

const CommonHeaderDesktopDropdownPanel = ({
  item,
  isVisible,
  LinkComponent,
  onCloseMenu,
}: CommonHeaderDesktopDropdownPanelProps) => {
  if (!item.children?.length) {
    return null;
  }

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
            <p className={styles['dropdownDescription']}>
              {getNavigationDescription(
                item.description,
                '세부 메뉴를 선택해 바로 이동할 수 있습니다.',
              )}
            </p>
          </div>
          <div className={styles['dropdownSectionGrid']}>
            {item.children.map((section) => {
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
                    <p className={styles['dropdownSectionDescription']}>{sectionDescription}</p>
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
                  ) : (
                    <p className={styles['dropdownSectionHint']}>
                      {getNavigationDescription(
                        section.description,
                        '상세 소개 페이지로 이동합니다.',
                      )}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommonHeaderDesktopDropdownPanel;
