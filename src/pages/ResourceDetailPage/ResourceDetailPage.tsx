import { useMemo, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { downloadGlobalResourceFile } from '@/api/resources';
import downloadIconSrc from '@/assets/icons/lucide_arrow-down-to-line.svg';
import fileIconSrc from '@/assets/icons/lucide_file-plus.svg';
import Modal from '@/components/overlay/Modal/Modal';
import { useGlobalResourceDetailQuery, useGlobalResourcesQuery } from '@/query/useResourceQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { ResourceAttachmentItem, ResourceItem } from '@/types/resource';

import styles from './ResourceDetailPage.module.scss';

interface DownloadConfirmState {
  attachments: ResourceAttachmentItem[];
}

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? '오후' : '오전';
  const displayHour = hours % 12 || 12;

  return `${String(year)}. ${month}. ${day}. ${meridiem} ${String(displayHour)}:${minutes}`;
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '-';
  }

  if (bytes < 1024 * 1024) {
    return `${String(Math.max(1, Math.round(bytes / 1024)))}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
};

const getFileExtensionLabel = (fileName: string, mimeType: string): string => {
  const extension = fileName.split('.').pop()?.trim().toUpperCase();

  if (extension) {
    return extension.length <= 6 ? extension : extension.slice(0, 6);
  }

  if (mimeType.includes('pdf')) {
    return 'PDF';
  }

  return 'FILE';
};

const getTotalFileSize = (attachments: ResourceAttachmentItem[]): number => {
  return attachments.reduce((total, attachment) => total + attachment.fileSize, 0);
};

const ResourceDetailPage = () => {
  const params = useParams();
  const showToast = useToastStore((state) => state.showToast);
  const [downloadConfirmState, setDownloadConfirmState] = useState<DownloadConfirmState | null>(
    null,
  );
  const resourceId = Number(params['resourceId']);
  const resolvedResourceId = Number.isInteger(resourceId) && resourceId > 0 ? resourceId : null;
  const resourceQuery = useGlobalResourceDetailQuery(resolvedResourceId);
  const resourcesQuery = useGlobalResourcesQuery();
  const resource = resourceQuery.data;
  const attachments = resource?.attachments ?? [];
  const adjacentResources = useMemo(() => {
    if (!resource || !resourcesQuery.data) {
      return {
        next: null,
        previous: null,
      };
    }

    const currentIndex = resourcesQuery.data.findIndex((item) => item.id === resource.id);

    if (currentIndex < 0) {
      return {
        next: null,
        previous: null,
      };
    }

    return {
      next: resourcesQuery.data[currentIndex - 1] ?? null,
      previous: resourcesQuery.data[currentIndex + 1] ?? null,
    };
  }, [resource, resourcesQuery.data]);

  const downloadMutation = useMutation({
    mutationFn: ({ documentId, fileName }: { documentId: number; fileName: string }) =>
      downloadGlobalResourceFile(documentId, fileName),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료 파일을 다운로드하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: () => {
      showToast({
        message: '자료 다운로드를 시작했습니다.',
        variant: 'success',
      });
    },
  });

  const openDownloadConfirm = (nextAttachments: ResourceAttachmentItem[]) => {
    if (!nextAttachments.length || downloadMutation.isPending) {
      return;
    }

    setDownloadConfirmState({ attachments: nextAttachments });
  };

  const closeDownloadConfirm = () => {
    if (downloadMutation.isPending) {
      return;
    }

    setDownloadConfirmState(null);
  };

  const confirmDownload = async () => {
    if (!downloadConfirmState) {
      return;
    }

    for (const attachment of downloadConfirmState.attachments) {
      await downloadMutation.mutateAsync({
        documentId: attachment.documentId,
        fileName: attachment.fileName,
      });
    }

    setDownloadConfirmState(null);
  };

  if (resolvedResourceId === null) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>자료 경로가 올바르지 않습니다.</h1>
        <p className={styles['stateDescription']}>자료실 목록으로 돌아가 다시 선택해 주세요.</p>
        <Link className={styles['backLink']} to={routePaths.resources}>
          자료실 목록으로 이동
        </Link>
      </section>
    );
  }

  if (resourceQuery.isPending) {
    return (
      <section aria-busy='true' className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>자료 상세를 불러오는 중입니다.</h1>
        <p className={styles['stateDescription']}>첨부 파일과 다운로드 정보를 준비하고 있습니다.</p>
      </section>
    );
  }

  if (resourceQuery.isError || !resource) {
    return (
      <section className={styles['stateSection']}>
        <h1 className={styles['stateTitle']}>자료 상세를 불러오지 못했습니다.</h1>
        <p className={styles['stateDescription']}>
          {resourceQuery.error instanceof Error
            ? resourceQuery.error.message
            : '자료 상태를 확인한 뒤 다시 시도해 주세요.'}
        </p>
        <Link className={styles['backLink']} to={routePaths.resources}>
          자료실 목록으로 이동
        </Link>
      </section>
    );
  }

  return (
    <main className={styles['page']}>
      <article className={styles['detail']} aria-labelledby='resource-detail-title'>
        <h1 className={styles['pageTitle']}>자료실</h1>

        <header className={styles['resourceHeader']}>
          <h2 className={styles['resourceTitle']} id='resource-detail-title'>
            {resource.title}
          </h2>
          <time className={styles['resourceDate']} dateTime={resource.createdAt}>
            {formatDate(resource.createdAt)}
          </time>
        </header>

        <section className={styles['contentPanel']} aria-label='자료실 본문'>
          <p className={styles['resourceDescription']}>{resource.description}</p>
        </section>

        <section className={styles['attachmentPanel']} aria-labelledby='resource-attachment-title'>
          <div className={styles['attachmentHeader']}>
            <h3 className={styles['attachmentTitle']} id='resource-attachment-title'>
              첨부파일
            </h3>
            {attachments.length > 0 ? (
              <button
                className={styles['allDownloadButton']}
                disabled={downloadMutation.isPending}
                onClick={() => {
                  openDownloadConfirm(attachments);
                }}
                type='button'
              >
                <span>모두 다운로드</span>
                <img
                  alt=''
                  aria-hidden='true'
                  className={styles['allDownloadIcon']}
                  src={downloadIconSrc}
                />
              </button>
            ) : null}
          </div>

          {attachments.length > 0 ? (
            <ul className={styles['attachmentList']}>
              {attachments.map((attachment) => {
                const isDownloading =
                  downloadMutation.isPending &&
                  downloadMutation.variables.documentId === attachment.documentId;

                return (
                  <li className={styles['attachmentItem']} key={attachment.documentId}>
                    <span className={styles['attachmentMeta']}>
                      <img
                        alt=''
                        aria-hidden='true'
                        className={styles['fileIcon']}
                        src={fileIconSrc}
                      />
                      <span className={styles['fileName']}>{attachment.fileName}</span>
                    </span>
                    <span className={styles['fileSize']}>
                      {formatFileSize(attachment.fileSize)}
                    </span>
                    <button
                      aria-label={`${attachment.fileName} 다운로드`}
                      className={styles['downloadButton']}
                      disabled={isDownloading}
                      onClick={() => {
                        openDownloadConfirm([attachment]);
                      }}
                      type='button'
                    >
                      <img alt='' className={styles['downloadIcon']} src={downloadIconSrc} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles['attachmentEmpty']}>
              <span className={styles['attachmentMeta']}>
                <img alt='' aria-hidden='true' className={styles['fileIcon']} src={fileIconSrc} />
                <span className={styles['fileName']}>첨부파일이 없습니다.</span>
              </span>
            </div>
          )}
        </section>

        <nav className={styles['adjacentPanel']} aria-label='이전글 다음글'>
          <AdjacentResourceLink direction='previous' resource={adjacentResources.previous} />
          <AdjacentResourceLink direction='next' resource={adjacentResources.next} />
        </nav>

        <div className={styles['listAction']}>
          <Link className={styles['listButton']} to={routePaths.resources}>
            목록으로
          </Link>
        </div>
      </article>

      {downloadConfirmState ? (
        <DownloadConfirmModal
          attachments={downloadConfirmState.attachments}
          isPending={downloadMutation.isPending}
          onClose={closeDownloadConfirm}
          onConfirm={() => {
            void confirmDownload();
          }}
        />
      ) : null}
    </main>
  );
};

interface AdjacentResourceLinkProps {
  direction: 'next' | 'previous';
  resource: ResourceItem | null;
}

interface DownloadConfirmModalProps {
  attachments: ResourceAttachmentItem[];
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DownloadConfirmModal = ({
  attachments,
  isPending,
  onClose,
  onConfirm,
}: DownloadConfirmModalProps) => {
  const representative = attachments.at(0);
  const extraCount = Math.max(0, attachments.length - 1);
  const totalSize = getTotalFileSize(attachments);

  if (!representative) {
    return null;
  }

  return (
    <Modal
      bodyClassName={styles['downloadModalBody']}
      closeButtonClassName={styles['downloadModalCloseButton']}
      headerClassName={styles['downloadModalHeader']}
      onClose={onClose}
      panelClassName={styles['downloadModalPanel']}
      title='자료를 다운로드하시겠어요?'
      titleClassName={styles['downloadModalTitle']}
    >
      <div className={styles['downloadModalContent']}>
        <article className={styles['downloadFileCard']}>
          <h3 className={styles['downloadFileName']}>
            <span>{representative.fileName}</span>
            {extraCount > 0 ? <strong> 외 {String(extraCount)}건</strong> : null}
          </h3>
          <p className={styles['downloadFileMeta']}>
            <span>{getFileExtensionLabel(representative.fileName, representative.mimeType)}</span>
            <span aria-hidden='true' className={styles['downloadFileDot']} />
            <span>{formatFileSize(totalSize)}</span>
          </p>
        </article>

        <div className={styles['downloadNotice']}>
          <span aria-hidden='true' className={styles['downloadNoticeIcon']}>
            <svg fill='none' viewBox='0 0 24 24'>
              <path
                d='M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
              />
              <path
                d='M12 16V12'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
              />
              <path
                d='M12 8H12.01'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
              />
            </svg>
          </span>
          <div className={styles['downloadNoticeText']}>
            <p>본 자료는 교육 목적으로 제공되며,</p>
            <p>무단 배포 및 복제를 금지합니다.</p>
          </div>
        </div>

        <div className={styles['downloadModalActions']}>
          <button
            className={styles['downloadCancelButton']}
            disabled={isPending}
            onClick={onClose}
            type='button'
          >
            취소
          </button>
          <button
            className={styles['downloadConfirmButton']}
            disabled={isPending}
            onClick={onConfirm}
            type='button'
          >
            다운로드
          </button>
        </div>
      </div>
    </Modal>
  );
};

const AdjacentResourceLink = ({ direction, resource }: AdjacentResourceLinkProps) => {
  const label = direction === 'previous' ? '이전글' : '다음 글';
  const content = (
    <>
      <span className={styles['adjacentIcon']} aria-hidden='true'>
        <svg fill='none' viewBox='0 0 24 24'>
          <path
            d={direction === 'previous' ? 'M15 18L9 12L15 6' : 'M9 6L15 12L9 18'}
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
          />
        </svg>
      </span>
      <span className={styles['adjacentText']}>
        <span className={styles['adjacentLabel']}>{label}</span>
        <span className={styles['adjacentTitle']}>
          {resource?.title ?? '등록된 글이 없습니다.'}
        </span>
      </span>
    </>
  );

  if (!resource) {
    return (
      <div className={styles['adjacentLink']} data-direction={direction} aria-disabled='true'>
        {content}
      </div>
    );
  }

  return (
    <Link
      className={styles['adjacentLink']}
      data-direction={direction}
      to={routePaths.resourceDetail(String(resource.id))}
    >
      {content}
    </Link>
  );
};

export default ResourceDetailPage;
