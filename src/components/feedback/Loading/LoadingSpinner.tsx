import styles from './LoadingSpinner.module.scss';

export const LoadingSpinner = () => {
  return <div aria-label='Loading' className={styles['spinner']} role='status' />;
};
