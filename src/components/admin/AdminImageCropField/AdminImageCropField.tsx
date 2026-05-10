import { useRef, type PointerEvent } from 'react';

import Button from '@/components/ui/Button/Button';
import { classNames } from '@/utils/classNames';

import styles from './AdminImageCropField.module.scss';
import {
  DEFAULT_ADMIN_IMAGE_CROP,
  getAdminImageCropObjectStyle,
  normalizeAdminImageCrop,
  type AdminImageCropValue,
} from './AdminImageCropField.utils';

interface AdminImageCropFieldProps {
  accept: string;
  alt: string;
  aspectRatio: number;
  disabled?: boolean;
  fileCaption?: string | null;
  imageUrl: string | null | undefined;
  label: string;
  onChange: (value: AdminImageCropValue) => void;
  onRemove?: () => void;
  onSelectFile: (file: File | null) => void;
  value: AdminImageCropValue;
}

const AdminImageCropField = ({
  accept,
  alt,
  aspectRatio,
  disabled = false,
  fileCaption,
  imageUrl,
  label,
  onChange,
  onRemove,
  onSelectFile,
  value,
}: AdminImageCropFieldProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<{
    crop: AdminImageCropValue;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const crop = normalizeAdminImageCrop(value);
  const hasImage = Boolean(imageUrl);

  const updateCrop = (partial: Partial<AdminImageCropValue>) => {
    onChange(normalizeAdminImageCrop({ ...crop, ...partial }));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !hasImage) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      crop,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const frame = event.currentTarget.getBoundingClientRect();
    if (frame.width <= 0 || frame.height <= 0) {
      return;
    }

    onChange(
      normalizeAdminImageCrop({
        ...dragState.crop,
        offsetX: dragState.crop.offsetX - ((event.clientX - dragState.startX) / frame.width) * 200,
        offsetY: dragState.crop.offsetY - ((event.clientY - dragState.startY) / frame.height) * 200,
      }),
    );
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={styles['field']}>
      <input
        accept={accept}
        className={styles['fileInput']}
        onChange={(event) => {
          onSelectFile(event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
        ref={fileInputRef}
        type='file'
      />

      <div className={styles['previewShell']}>
        {hasImage ? (
          <div
            className={styles['previewFrame']}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            style={{ aspectRatio }}
          >
            <img
              alt={alt}
              className={styles['previewImage']}
              src={imageUrl ?? undefined}
              style={getAdminImageCropObjectStyle(crop)}
            />
          </div>
        ) : (
          <div className={styles['emptyFrame']} style={{ aspectRatio }}>
            등록된 이미지가 없습니다.
          </div>
        )}
      </div>

      <div className={styles['controlPanel']}>
        <div className={styles['controlHeader']}>
          <p className={styles['title']}>{label}</p>
          <button
            className={styles['resetButton']}
            disabled={disabled || !hasImage}
            onClick={() => {
              onChange(DEFAULT_ADMIN_IMAGE_CROP);
            }}
            type='button'
          >
            위치 초기화
          </button>
        </div>

        {fileCaption ? <p className={styles['caption']}>{fileCaption}</p> : null}

        <div className={styles['zoomControls']} aria-label={`${label} 확대 조정`}>
          <button
            aria-label='축소'
            className={styles['zoomButton']}
            disabled={disabled || !hasImage || crop.zoom <= 1}
            onClick={() => {
              updateCrop({ zoom: crop.zoom - 0.1 });
            }}
            type='button'
          >
            -
          </button>
          <output className={styles['zoomValue']} aria-label='확대 배율'>
            {Math.round(crop.zoom * 100)}%
          </output>
          <button
            aria-label='확대'
            className={styles['zoomButton']}
            disabled={disabled || !hasImage || crop.zoom >= 3}
            onClick={() => {
              updateCrop({ zoom: crop.zoom + 0.1 });
            }}
            type='button'
          >
            +
          </button>
        </div>

        <div className={styles['actions']}>
          <Button
            disabled={disabled}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            size='sm'
            type='button'
            variant='primary'
          >
            파일 선택
          </Button>
          {hasImage && onRemove ? (
            <Button
              disabled={disabled}
              onClick={onRemove}
              size='sm'
              type='button'
              variant='secondary'
            >
              이미지 제거
            </Button>
          ) : null}
        </div>

        <p className={classNames(styles['caption'], styles['formatCaption'])}>
          허용 형식 · {accept.replaceAll(',', ', ')}
        </p>
      </div>
    </div>
  );
};

export default AdminImageCropField;
