import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';

import { classNames } from '@/utils/classNames';

import styles from './AdminFileDropZone.module.scss';

const parseAcceptList = (accept: string | undefined): string[] => {
  return (
    accept
      ?.split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? []
  );
};

const matchesAcceptRule = (file: File, rule: string): boolean => {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.trim().toLowerCase();

  if (rule.startsWith('.')) {
    return fileName.endsWith(rule);
  }

  if (rule.endsWith('/*')) {
    return mimeType.startsWith(rule.slice(0, -1));
  }

  return mimeType === rule;
};

const isAcceptedFile = (file: File, accept: string | undefined): boolean => {
  const acceptList = parseAcceptList(accept);

  if (acceptList.length === 0) {
    return true;
  }

  return acceptList.some((rule) => matchesAcceptRule(file, rule));
};

const hasFileDragItem = (event: DragEvent<HTMLElement>): boolean => {
  return Array.from(event.dataTransfer.items).some((item) => item.kind === 'file');
};

interface AdminFileDropZoneProps {
  accept?: string;
  actions?: ReactNode;
  buttonLabel?: string;
  className?: string;
  disabled?: boolean;
  emptyLabel?: ReactNode;
  hint?: ReactNode;
  id?: string;
  inputLabel?: string;
  label: ReactNode;
  multiple?: boolean;
  name?: string;
  onClear?: (() => void) | undefined;
  onFilesSelected: (files: File[]) => void;
  selectedContent?: ReactNode;
  selectedLabel?: ReactNode;
  selectedMeta?: ReactNode;
}

const AdminFileDropZone = ({
  accept,
  actions,
  buttonLabel = '파일 선택',
  className,
  disabled = false,
  emptyLabel = '선택된 파일 없음',
  hint,
  id,
  inputLabel,
  label,
  multiple = false,
  name,
  onClear,
  onFilesSelected,
  selectedContent,
  selectedLabel,
  selectedMeta,
}: AdminFileDropZoneProps) => {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasSelectedContent = selectedContent !== null && selectedContent !== undefined;
  const hasSelectedFile =
    hasSelectedContent ||
    (selectedLabel !== null && selectedLabel !== undefined && selectedLabel !== '');

  const selectFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    if (!multiple && files.length > 1) {
      setErrorMessage('파일은 한 번에 1개만 올릴 수 있습니다.');
      return;
    }

    const rejectedFile = files.find((file) => !isAcceptedFile(file, accept));
    if (rejectedFile) {
      setErrorMessage(`${rejectedFile.name} 파일 형식은 이 항목에 올릴 수 없습니다.`);
      return;
    }

    setErrorMessage(null);
    onFilesSelected(files);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFileDragItem(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFileDragItem(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFileDragItem(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    selectFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className={classNames(styles['dropZone'], className)} data-disabled={disabled}>
      <div className={styles['actionLine']}>
        <label className={styles['picker']} htmlFor={inputId}>
          <input
            accept={accept}
            aria-label={inputLabel}
            disabled={disabled}
            id={inputId}
            multiple={multiple}
            name={name}
            onChange={(event) => {
              selectFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = '';
            }}
            type='file'
          />
          <span className={styles['button']}>{buttonLabel}</span>
        </label>
        {actions ? <div className={styles['actions']}>{actions}</div> : null}
      </div>

      <div
        className={styles['dropTarget']}
        data-dragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {hasSelectedContent ? (
          <div className={styles['selectedContent']}>{selectedContent}</div>
        ) : hasSelectedFile ? (
          <div className={styles['fileMetaRow']}>
            <span className={styles['fileName']}>{selectedLabel}</span>
            <span className={styles['fileMetaGroup']}>
              {selectedMeta ? <span className={styles['fileMeta']}>{selectedMeta}</span> : null}
              {onClear ? (
                <button
                  aria-label='선택 취소'
                  className={styles['clearButton']}
                  disabled={disabled}
                  onClick={onClear}
                  type='button'
                >
                  ×
                </button>
              ) : null}
            </span>
          </div>
        ) : (
          <div className={styles['copy']}>
            <p className={styles['label']}>{label}</p>
            <p className={styles['dropHint']}>
              {multiple ? '파일을 이곳에 끌어다 놓으세요.' : '파일을 이곳에 끌어다 놓으세요.'}
            </p>
            {hint ? <p className={styles['hint']}>{hint}</p> : null}
            <p className={styles['emptyLabel']}>{emptyLabel}</p>
          </div>
        )}
        {errorMessage ? <p className={styles['error']}>{errorMessage}</p> : null}
      </div>
    </div>
  );
};

export default AdminFileDropZone;
