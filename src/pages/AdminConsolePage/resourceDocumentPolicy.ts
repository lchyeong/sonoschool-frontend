const MAX_RESOURCE_DOCUMENT_FILE_SIZE_BYTES = 300 * 1024 * 1024;

export const RESOURCE_DOCUMENT_ACCEPT =
  '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

export const RESOURCE_DOCUMENT_WITH_IMAGE_ACCEPT = `${RESOURCE_DOCUMENT_ACCEPT},.jpg,.jpeg,.png`;

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

const SUPPORTED_RESOURCE_DOCUMENT_WITH_IMAGE_EXTENSIONS = new Set([
  ...SUPPORTED_RESOURCE_DOCUMENT_EXTENSIONS,
  'jpg',
  'jpeg',
  'png',
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

const SUPPORTED_RESOURCE_DOCUMENT_WITH_IMAGE_MIME_TYPES = new Set([
  ...SUPPORTED_RESOURCE_DOCUMENT_MIME_TYPES,
  'image/jpeg',
  'image/png',
]);

export const RESOURCE_DOCUMENT_POLICY_HINT =
  '문서 자료는 PDF, HWP/HWPX, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV 파일만 등록할 수 있으며 최대 300MB까지 지원합니다.';

export const RESOURCE_DOCUMENT_WITH_IMAGE_POLICY_HINT =
  '자료 파일은 PDF, HWP/HWPX, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, JPG, PNG 파일만 등록할 수 있으며 최대 300MB까지 지원합니다.';

const normalizeMimeType = (mimeType: string): string => {
  return mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
};

const resolveFileExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.trim().toLowerCase();
  return extension ?? '';
};

const validateResourceFilePolicy = (
  params: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  },
  options: {
    extensions: Set<string>;
    invalidTypeMessage: string;
    mimeTypes: Set<string>;
    tooLargeMessage: string;
  },
): string | null => {
  if (params.fileSize < 1 || params.fileSize > MAX_RESOURCE_DOCUMENT_FILE_SIZE_BYTES) {
    return options.tooLargeMessage;
  }

  const normalizedMimeType = normalizeMimeType(params.mimeType);
  const extension = resolveFileExtension(params.fileName);
  const isSupportedMimeType =
    normalizedMimeType.length > 0 && options.mimeTypes.has(normalizedMimeType);
  const isSupportedExtension = options.extensions.has(extension);

  if (!isSupportedMimeType && !isSupportedExtension) {
    return options.invalidTypeMessage;
  }

  return null;
};

export const validateResourceDocumentPolicy = (params: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}): string | null => {
  return validateResourceFilePolicy(params, {
    extensions: SUPPORTED_RESOURCE_DOCUMENT_EXTENSIONS,
    invalidTypeMessage:
      '문서 자료는 PDF, HWP/HWPX, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV 파일만 등록할 수 있습니다.',
    mimeTypes: SUPPORTED_RESOURCE_DOCUMENT_MIME_TYPES,
    tooLargeMessage: '문서 파일은 300MB 이하만 등록할 수 있습니다.',
  });
};

export const validateResourceDocumentWithImagePolicy = (params: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}): string | null => {
  return validateResourceFilePolicy(params, {
    extensions: SUPPORTED_RESOURCE_DOCUMENT_WITH_IMAGE_EXTENSIONS,
    invalidTypeMessage:
      '자료 파일은 PDF, HWP/HWPX, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, JPG, PNG 파일만 등록할 수 있습니다.',
    mimeTypes: SUPPORTED_RESOURCE_DOCUMENT_WITH_IMAGE_MIME_TYPES,
    tooLargeMessage: '자료 파일은 300MB 이하만 등록할 수 있습니다.',
  });
};
