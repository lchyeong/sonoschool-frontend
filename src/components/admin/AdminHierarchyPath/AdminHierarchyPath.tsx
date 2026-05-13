import rightArrowIconSrc from '@/assets/icons/icon_arrow_right_50.png';
import { classNames } from '@/utils/classNames';

import styles from './AdminHierarchyPath.module.scss';

interface AdminHierarchyPathProps {
  path: string;
  className?: string;
}

const AdminHierarchyPath = ({ path, className }: AdminHierarchyPathProps) => {
  const segments = path
    .split(' / ')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (!segments.length) {
    return null;
  }

  return (
    <span className={classNames(styles['path'], className)}>
      {segments.map((segment, index) => (
        <span className={styles['segmentGroup']} key={`${segment}-${String(index)}`}>
          {index > 0 ? (
            <img alt='' aria-hidden='true' className={styles['arrow']} src={rightArrowIconSrc} />
          ) : null}
          <span className={styles['segment']}>{segment}</span>
        </span>
      ))}
    </span>
  );
};

export default AdminHierarchyPath;
