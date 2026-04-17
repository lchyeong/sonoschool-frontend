import { useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import { useGlobalNoticesQuery } from '@/query/useNoticeQueries';
import { routePaths } from '@/routes/routeRegistry';
import { extractTextFromHtml, summarizeHtmlContent } from '@/utils/htmlContent';

import styles from './NoticesPage.module.scss';

const PAGE_SIZE = 8;

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
  }).format(new Date(value));
};

const NoticesPage = () => {
  const noticesQuery = useGlobalNoticesQuery();
  const notices = useMemo(() => noticesQuery.data ?? [], [noticesQuery.data]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const filteredNotices = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return notices.filter((notice) => {
      if (!normalizedSearchTerm) {
        return true;
      }

      return [notice.title, extractTextFromHtml(notice.content), notice.programTitle ?? ''].some(
        (field) => {
          return field.toLowerCase().includes(normalizedSearchTerm);
        },
      );
    });
  }, [notices, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedNotices = filteredNotices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className={styles['page']}>
      <div className={styles['boardHeader']}>
        <div className={styles['boardTitleBlock']}>
          <h1 className={styles['boardTitle']}>공지사항</h1>
        </div>
        <p className={styles['boardSummary']}>
          총 {String(notices.length)}건 중 검색 결과 {String(filteredNotices.length)}건
        </p>
      </div>

      <section className={styles['boardShell']}>
        <div className={styles['toolbar']}>
          <UnifiedSearchBar
            className={styles['searchBar']}
            inputAriaLabel='공지사항 검색'
            onChange={(nextValue) => {
              setSearchInput(nextValue);
            }}
            onSubmit={() => {
              setSearchTerm(searchInput);
              setPage(1);
            }}
            placeholder='제목과 내용을 검색해 주세요.'
            value={searchInput}
          />
        </div>

        {noticesQuery.isPending ? (
          <div aria-busy='true' className={styles['stateBox']}>
            공지사항을 불러오는 중입니다.
          </div>
        ) : null}

        {noticesQuery.isError ? (
          <div className={styles['stateBox']}>
            {noticesQuery.error instanceof Error
              ? noticesQuery.error.message
              : '공지사항을 불러오지 못했습니다.'}
          </div>
        ) : null}

        {!noticesQuery.isPending && !noticesQuery.isError ? (
          <>
            <div className={styles['tableWrap']}>
              <table className={styles['boardTable']}>
                <colgroup>
                  <col className={styles['numberCol']} />
                  <col />
                  <col className={styles['dateCol']} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope='col'>번호</th>
                    <th scope='col'>제목</th>
                    <th scope='col'>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedNotices.length ? (
                    paginatedNotices.map((notice, index) => {
                      const rowNumber =
                        filteredNotices.length - ((currentPage - 1) * PAGE_SIZE + index);

                      return (
                        <tr className={styles['noticeRow']} key={notice.id}>
                          <td>{String(rowNumber)}</td>
                          <td className={styles['titleCell']}>
                            <Link
                              className={styles['titleLink']}
                              to={routePaths.noticeDetail(String(notice.id))}
                            >
                              <span className={styles['titleHeading']}>
                                {notice.pinned ? (
                                  <span className={styles['statusBadge']} data-tone='pinned'>
                                    필독
                                  </span>
                                ) : null}
                                <span className={styles['titleText']}>{notice.title}</span>
                              </span>
                              <span className={styles['previewText']}>
                                {summarizeHtmlContent(notice.content, 88)}
                              </span>
                            </Link>
                          </td>
                          <td>{formatDate(notice.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['emptyRow']} colSpan={3}>
                        검색 조건에 맞는 공지사항이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles['boardFooter']}>
              <div className={styles['pagination']}>
                <button
                  className={styles['pageNavButton']}
                  disabled={currentPage === 1}
                  onClick={() => {
                    setPage((value) => Math.max(1, value - 1));
                  }}
                  type='button'
                >
                  {'<'}
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                  return (
                    <button
                      className={styles['pageButton']}
                      data-active={pageNumber === currentPage}
                      key={pageNumber}
                      onClick={() => {
                        setPage(pageNumber);
                      }}
                      type='button'
                    >
                      {String(pageNumber)}
                    </button>
                  );
                })}

                <button
                  className={styles['pageNavButton']}
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setPage((value) => Math.min(totalPages, value + 1));
                  }}
                  type='button'
                >
                  {'>'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default NoticesPage;
