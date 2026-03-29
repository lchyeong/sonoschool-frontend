const MAX_RESOURCE_DOCUMENT_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const SUPPORTED_RESOURCE_DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'hwp',
  'hwpx',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
]);

const SUPPORTED_RESOURCE_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-hwp',
  'application/haansofthwp',
  'application/hwp+zip',
  'application/vnd.hancom.hwpx',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/csv',
]);

export const RESOURCE_DOCUMENT_POLICY_HINT =
  '문서 자료는 PDF, HWP/HWPX, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV 파일만 등록할 수 있으며 최대 50MB까지 지원합니다.';

const normalizeMimeType = (mimeType: string): string => {
  return mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
};

const resolveFileExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.trim().toLowerCase();
  return extension ?? '';
};

export const validateResourceDocumentPolicy = (params: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}): string | null => {
  if (params.fileSize < 1 || params.fileSize > MAX_RESOURCE_DOCUMENT_FILE_SIZE_BYTES) {
    return '문서 파일은 50MB 이하만 등록할 수 있습니다.';
  }

  const normalizedMimeType = normalizeMimeType(params.mimeType);
  const extension = resolveFileExtension(params.fileName);
  const isSupportedMimeType =
    normalizedMimeType.length > 0 && SUPPORTED_RESOURCE_DOCUMENT_MIME_TYPES.has(normalizedMimeType);
  const isSupportedExtension = SUPPORTED_RESOURCE_DOCUMENT_EXTENSIONS.has(extension);

  if (!isSupportedMimeType && !isSupportedExtension) {
    return '문서 자료는 PDF, HWP/HWPX, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV 파일만 등록할 수 있습니다.';
  }

  return null;
};
