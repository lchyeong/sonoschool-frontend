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
            <p className={styles['dropdownDescription']}>{item.label}을 살펴보세요.</p>
          </div>
          <div className={styles['dropdownDepthLayout']}>
            <div className={styles['dropdownSecondLevelColumn']}>
              {sections.map((section) => {
                const hasGrandChildren = hasNavigationChildren(section);
                const isActive = activeSection.id === section.id;
                const sectionDescription =
                  section.description?.trim() || `${section.label} 과정을 살펴보세요.`;

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
                      <span className={styles['dropdownDepthDescription']}>
                        {sectionDescription}
                      </span>
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
                  const childDescription =
                    child.description?.trim() || `${child.label} 온라인과정을 살펴보세요.`;

                  return (
                    <LinkComponent
                      className={styles['dropdownGrandchildCard']}
                      key={child.id}
                      onClick={onCloseMenu}
                      to={child.to}
                    >
                      <span className={styles['dropdownGrandchildTitle']}>{child.label}</span>
                      <span className={styles['dropdownGrandchildDescription']}>
                        {childDescription}
                      </span>
                    </LinkComponent>
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
