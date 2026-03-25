import type { ReactNode } from 'react';

import { classNames } from '@/utils/classNames';

import styles from './PublicBoardLayout.module.scss';

export interface PublicBoardLayoutProps {
  actions?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  description: ReactNode;
  eyebrow: string;
  heroAside?: ReactNode;
  title: string;
}

const PublicBoardLayout = ({
  actions,
  bodyClassName,
  children,
  description,
  eyebrow,
  heroAside,
  title,
}: PublicBoardLayoutProps) => {
  return (
    <div className={styles['page']}>
      <section className={styles['hero']}>
        <div className={styles['heroCopy']}>
          <p className={styles['eyebrow']}>{eyebrow}</p>
          <h1 className={styles['title']}>{title}</h1>
          <div className={styles['description']}>{description}</div>
        </div>

        {heroAside ? <div className={styles['heroAside']}>{heroAside}</div> : null}
      </section>

      {actions ? <div className={styles['actionRow']}>{actions}</div> : null}

      <div className={classNames(styles['body'], bodyClassName)}>{children}</div>
    </div>
  );
};

export default PublicBoardLayout;
