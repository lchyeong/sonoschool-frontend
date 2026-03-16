import type { ReactNode } from 'react';

import styles from './PlaceholderPage.module.scss';

interface PlaceholderPageProps {
  eyebrow?: string | undefined;
  title: string;
  description: string;
  actions?: ReactNode;
  secondary?: ReactNode;
}

const PlaceholderPage = ({
  eyebrow,
  title,
  description,
  actions,
  secondary,
}: PlaceholderPageProps) => {
  return (
    <section className={styles['container']}>
      {eyebrow ? <p className={styles['eyebrow']}>{eyebrow}</p> : null}
      <h1 className={styles['title']}>{title}</h1>
      <p className={styles['description']}>{description}</p>
      {actions ? <div className={styles['actions']}>{actions}</div> : null}
      {secondary ? <div className={styles['secondary']}>{secondary}</div> : null}
    </section>
  );
};

export default PlaceholderPage;
