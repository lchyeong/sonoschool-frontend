import { useState } from 'react';

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

const CommonHeaderDesktopDropdownPanel = ({
  item,
  isVisible,
  LinkComponent,
  onCloseMenu,
}: CommonHeaderDesktopDropdownPanelProps) => {
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  if (!item.children?.length) {
    return null;
  }

  const sections = item.children;
  const hoveredSection =
    hoveredSectionId === null
      ? undefined
      : sections.find((section) => section.id === hoveredSectionId);
  const activeSection =
    hoveredSection ?? sections.find((section) => hasNavigationChildren(section)) ?? sections[0];
  const activeSectionChildren = activeSection.children ?? [];

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
          </div>
          <div className={styles['dropdownDepthLayout']}>
            <div className={styles['dropdownSecondLevelColumn']}>
              {sections.map((section) => {
                const hasGrandChildren = hasNavigationChildren(section);
                const isActive = activeSection.id === section.id;

                return (
                  <LinkComponent
                    className={classNames(
                      styles['dropdownDepthCard'],
                      isActive && styles['dropdownDepthCardActive'],
                    )}
                    key={section.id}
                    onClick={onCloseMenu}
                    onFocus={() => {
                      setHoveredSectionId(section.id);
                    }}
                    onMouseEnter={() => {
                      setHoveredSectionId(section.id);
                    }}
                    to={section.to}
                  >
                    <span className={styles['dropdownDepthCopy']}>
                      <span className={styles['dropdownDepthTitle']}>{section.label}</span>
                    </span>
                    {hasGrandChildren ? (
                      <svg
                        aria-hidden='true'
                        className={styles['dropdownDepthArrow']}
                        fill='none'
                        focusable='false'
                        viewBox='0 0 6 12'
                      >
                        <path
                          d='M1 1L5 6L1 11'
                          stroke='currentColor'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth='1.5'
                        />
                      </svg>
                    ) : null}
                  </LinkComponent>
                );
              })}
            </div>

            {activeSectionChildren.length ? (
              <div className={styles['dropdownGrandchildGrid']}>
                {activeSectionChildren.map((child) => {
                  const fourthDepthItems = child.children ?? [];

                  return (
                    <div className={styles['dropdownGrandchildGroup']} key={child.id}>
                      <LinkComponent
                        className={styles['dropdownGrandchildCard']}
                        onClick={onCloseMenu}
                        to={child.to}
                      >
                        <span className={styles['dropdownGrandchildTitle']}>{child.label}</span>
                      </LinkComponent>

                      {fourthDepthItems.length ? (
                        <div className={styles['dropdownFourthDepthList']}>
                          {fourthDepthItems.map((fourthDepthItem) => {
                            return (
                              <LinkComponent
                                className={styles['dropdownFourthDepthLink']}
                                key={fourthDepthItem.id}
                                onClick={onCloseMenu}
                                to={fourthDepthItem.to}
                              >
                                {fourthDepthItem.label}
                              </LinkComponent>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommonHeaderDesktopDropdownPanel;
