import type { ReactNode } from 'react';

import sharedStyles from '@/styles/accountPage.module.scss';
import { classNames } from '@/utils/classNames';

import styles from './PlaceholderPage.module.scss';

interface PlaceholderPageSection {
  title: string;
  description?: string | undefined;
  items?: string[] | undefined;
}

interface PlaceholderPageProps {
  title: string;
  description: string;
  sections?: PlaceholderPageSection[] | undefined;
  actions?: ReactNode;
  secondary?: ReactNode;
  layout?: 'card' | 'plain' | undefined;
}

const PlaceholderPage = ({
  title,
  description,
  sections,
  actions,
  secondary,
  layout = 'card',
}: PlaceholderPageProps) => {
  return (
    <section className={sharedStyles['page']}>
      <div className={sharedStyles['shell']}>
        <div
          className={classNames(
            sharedStyles['surface'],
            styles['surface'],
            layout === 'plain' && styles['surfacePlain'],
          )}
        >
          <header className={sharedStyles['header']}>
            <h1 className={sharedStyles['title']}>{title}</h1>
            <p className={sharedStyles['description']}>{description}</p>
          </header>

          {sections?.map((section) => {
            return (
              <section className={sharedStyles['section']} key={section.title}>
                <div className={sharedStyles['sectionHeader']}>
                  <h2 className={sharedStyles['sectionTitle']}>{section.title}</h2>
                  {section.description ? (
                    <p className={sharedStyles['sectionDescription']}>{section.description}</p>
                  ) : null}
                </div>

                {section.items?.length ? (
                  <ul className={styles['itemList']}>
                    {section.items.map((item) => {
                      return (
                        <li className={styles['item']} key={item}>
                          {item}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}

          {actions ? <div className={styles['actions']}>{actions}</div> : null}
          {secondary ? <div className={sharedStyles['mutedText']}>{secondary}</div> : null}
        </div>
      </div>
    </section>
  );
};

export default PlaceholderPage;
