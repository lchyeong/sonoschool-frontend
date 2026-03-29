import { useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { downloadGlobalResourceFile } from '@/api/resources';
import { useGlobalResourceDetailQuery } from '@/query/useResourceQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';

import styles from './ResourceDetailPage.module.scss';

const resolveFileTypeLabel = (fileName: string, mimeType: string): string => {
  const extension = fileName.split('.').pop()?.trim().toUpperCase();

  if (extension) {
    return extension.length <= 4 ? extension : extension.slice(0, 4);
  }

  if (mimeType.includes('pdf')) {
    return 'PDF';
  }

  if (mimeType.includes('hwp')) {
    return 'HWP';
  }

  return 'FILE';
};

const ResourceDetailPage = () => {
  const params = useParams();
  const showToast = useToastStore((state) => state.showToast);
  const resourceId = Number(params['resourceId']);
  const resolvedResourceId = Number.isInteger(resourceId) && resourceId > 0 ? resourceId : null;
  const resourceQuery = useGlobalResourceDetailQuery(resolvedResourceId);

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

  if (resourceQuery.isError) {
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

  const resource = resourceQuery.data;
  const attachments = resource.attachments;

  const handleAttachmentClick = async (documentId: number, fileName: string) => {
    const shouldDownload = window.confirm(`${fileName} 파일을 다운로드하시겠습니까?`);

    if (!shouldDownload) {
      return;
    }

    await downloadMutation.mutateAsync({ documentId, fileName });
  };

  return (
    <div className={styles['container']}>
      <div className={styles['hero']}>
        <Link className={styles['backLink']} to={routePaths.resources}>
          자료실 목록으로 돌아가기
        </Link>
        <h1 className={styles['title']}>{resource.title}</h1>
        <p className={styles['description']}>{resource.description}</p>
      </div>

      <ul className={styles['attachmentList']}>
        {attachments.map((attachment) => {
          const isDownloading =
            downloadMutation.isPending &&
            downloadMutation.variables?.documentId === attachment.documentId;

          return (
            <li key={attachment.documentId}>
              <button
                aria-label={`${attachment.fileName} 다운로드`}
                className={styles['attachmentCard']}
                disabled={isDownloading}
                onClick={() => {
                  void handleAttachmentClick(attachment.documentId, attachment.fileName);
                }}
                type='button'
              >
                <div aria-hidden='true' className={styles['fileTypeIcon']}>
                  {resolveFileTypeLabel(attachment.fileName, attachment.mimeType)}
                </div>
                <div className={styles['attachmentBody']}>
                  <strong className={styles['attachmentName']}>{attachment.fileName}</strong>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ResourceDetailPage;
