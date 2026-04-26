import styles from './Pagination.module.scss';

interface PaginationProps {
  ariaLabel?: string | undefined;
  currentPage: number;
  onChange: (nextPage: number) => void;
  totalPages: number;
}

const Pagination = ({
  ariaLabel = '페이지 이동',
  currentPage,
  onChange,
  totalPages,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label={ariaLabel} className={styles['pagination']}>
      <button
        className={styles['pageNavButton']}
        disabled={currentPage <= 1}
        onClick={() => {
          onChange(Math.max(1, currentPage - 1));
        }}
        type='button'
      >
        {'<'}
      </button>

      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
        return (
          <button
            aria-current={pageNumber === currentPage ? 'page' : undefined}
            className={styles['pageButton']}
            data-active={pageNumber === currentPage}
            key={pageNumber}
            onClick={() => {
              onChange(pageNumber);
            }}
            type='button'
          >
            {String(pageNumber)}
          </button>
        );
      })}

      <button
        className={styles['pageNavButton']}
        disabled={currentPage >= totalPages}
        onClick={() => {
          onChange(Math.min(totalPages, currentPage + 1));
        }}
        type='button'
      >
        {'>'}
      </button>
    </nav>
  );
};

export default Pagination;
