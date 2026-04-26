import { useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import UnifiedSearchBar from '@/components/search/UnifiedSearchBar/UnifiedSearchBar';
import Pagination from '@/components/ui/Pagination/Pagination';
import { useGlobalResourcesQuery } from '@/query/useResourceQueries';
import { routePaths } from '@/routes/routeRegistry';

import styles from './ResourcesPage.module.scss';

const PAGE_SIZE = 6;

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
  }).format(new Date(value));
};

const buildPreview = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 84) {
    return normalized;
  }

  return `${normalized.slice(0, 84)}...`;
};

const ResourcesPage = () => {
  const resourcesQuery = useGlobalResourcesQuery();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const resources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data]);

  const filteredResources = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return resources;
    }

    return resources.filter((resource) => {
      const searchableFields = [
        resource.title,
        resource.description,
        ...resource.attachments.map((attachment) => attachment.fileName),
      ];

      return searchableFields.some((field) => {
        return field.toLowerCase().includes(normalizedSearchTerm);
      });
    });
  }, [resources, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className={styles['page']}>
      <div className={styles['boardHeader']}>
        <div className={styles['boardTitleBlock']}>
          <h1 className={styles['boardTitle']}>자료실</h1>
        </div>
        <p className={styles['boardSummary']}>
          총 {String(resources.length)}건 중 검색 결과 {String(filteredResources.length)}건
        </p>
      </div>

      <section className={styles['boardShell']}>
        <div className={styles['toolbar']}>
          <UnifiedSearchBar
            className={styles['searchBar']}
            inputAriaLabel='자료실 검색'
            leading={
              <select
                aria-label='자료 범위 필터'
                className={styles['filterSelect']}
                defaultValue='all'
              >
                <option value='all'>전체</option>
              </select>
            }
            onChange={(nextValue) => {
              setSearchInput(nextValue);
            }}
            onSubmit={() => {
              setSearchTerm(searchInput);
              setPage(1);
            }}
            placeholder='제목, 설명, 파일명을 검색해 주세요.'
            value={searchInput}
          />
        </div>

        {resourcesQuery.isPending ? (
          <div aria-busy='true' className={styles['stateBox']}>
            자료실을 불러오는 중입니다.
          </div>
        ) : null}

        {resourcesQuery.isError ? (
          <div className={styles['stateBox']}>
            {resourcesQuery.error instanceof Error
              ? resourcesQuery.error.message
              : '자료실을 불러오지 못했습니다.'}
          </div>
        ) : null}

        {!resourcesQuery.isPending && !resourcesQuery.isError ? (
          <>
            <div className={styles['tableWrap']}>
              <table className={styles['boardTable']}>
                <colgroup>
                  <col className={styles['numberCol']} />
                  <col className={styles['typeCol']} />
                  <col />
                  <col className={styles['dateCol']} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope='col'>번호</th>
                    <th scope='col'>구분</th>
                    <th scope='col'>제목</th>
                    <th scope='col'>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResources.length ? (
                    paginatedResources.map((resource, index) => {
                      const rowNumber =
                        filteredResources.length - ((currentPage - 1) * PAGE_SIZE + index);

                      return (
                        <tr className={styles['resourceRow']} key={resource.id}>
                          <td>{String(rowNumber)}</td>
                          <td>
                            <span className={styles['typeBadge']}>
                              {resource.scope === 'GLOBAL' ? '공개' : '과정'}
                            </span>
                          </td>
                          <td className={styles['titleCell']}>
                            <Link
                              aria-label={resource.title}
                              className={styles['titleLink']}
                              to={routePaths.resourceDetail(String(resource.id))}
                            >
                              <div className={styles['titleBlock']}>
                                <strong className={styles['titleText']}>{resource.title}</strong>
                                <p className={styles['previewText']}>
                                  {buildPreview(resource.description)}
                                </p>
                                <p className={styles['attachmentCount']}>
                                  첨부 {String(resource.attachments.length)}개
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td>{formatDate(resource.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className={styles['emptyRow']} colSpan={4}>
                        검색 조건에 맞는 자료가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles['boardFooter']}>
              <Pagination
                ariaLabel='자료실 페이지 이동'
                currentPage={currentPage}
                onChange={setPage}
                totalPages={totalPages}
              />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default ResourcesPage;
