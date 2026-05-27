import { useId, useRef, type CSSProperties, type PointerEvent } from 'react';

import AdminFileDropZone from '@/components/admin/AdminFileDropZone';
import Button from '@/components/ui/Button/Button';
import { classNames } from '@/utils/classNames';

import styles from './AdminImageCropField.module.scss';
import {
  ADMIN_IMAGE_CROP_MAX_ZOOM,
  ADMIN_IMAGE_CROP_MIN_ZOOM,
  DEFAULT_ADMIN_IMAGE_CROP,
  getAdminImageCropObjectStyle,
  normalizeAdminImageCrop,
  type AdminImageCropValue,
} from './AdminImageCropField.utils';

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const createRangeProgressStyle = (value: number, min: number, max: number) => {
  const progress = ((clamp(value, min, max) - min) / (max - min)) * 100;

  return {
    '--range-start': '0%',
    '--range-end': `${String(progress)}%`,
  } as CSSProperties;
};

const toZoomSliderValue = (zoom: number) => {
  const nextZoom = clamp(zoom, ADMIN_IMAGE_CROP_MIN_ZOOM, ADMIN_IMAGE_CROP_MAX_ZOOM);

  if (nextZoom >= 1) {
    return ((nextZoom - 1) / (ADMIN_IMAGE_CROP_MAX_ZOOM - 1)) * 100;
  }

  return -((1 - nextZoom) / (1 - ADMIN_IMAGE_CROP_MIN_ZOOM)) * 100;
};

const toZoomValue = (sliderValue: number) => {
  const nextSliderValue = clamp(sliderValue, -100, 100);

  if (nextSliderValue >= 0) {
    return 1 + (nextSliderValue / 100) * (ADMIN_IMAGE_CROP_MAX_ZOOM - 1);
  }

  return 1 + (nextSliderValue / 100) * (1 - ADMIN_IMAGE_CROP_MIN_ZOOM);
};

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
  onUploadStart?: () => void;
  uploadButtonDisabled?: boolean;
  uploadButtonLabel?: string;
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
  onUploadStart,
  uploadButtonDisabled = false,
  uploadButtonLabel = '업로드 시작',
  value,
}: AdminImageCropFieldProps) => {
  const fieldId = useId();
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

  const zoomInputId = `${fieldId}-zoom`;
  const offsetXInputId = `${fieldId}-offset-x`;
  const offsetYInputId = `${fieldId}-offset-y`;
  const zoomSliderValue = toZoomSliderValue(crop.zoom);

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

      <div className={styles['controlStack']}>
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

          <div className={styles['rangeControlGroup']}>
            <div className={styles['rangeControl']}>
              <div className={styles['rangeLabelRow']}>
                <label className={styles['rangeLabel']} htmlFor={zoomInputId}>
                  확대/축소
                </label>
              </div>
              <input
                className={styles['rangeInput']}
                disabled={disabled || !hasImage}
                id={zoomInputId}
                max='100'
                min='-100'
                onChange={(event) => {
                  updateCrop({ zoom: toZoomValue(Number(event.target.value)) });
                }}
                step='1'
                style={createRangeProgressStyle(zoomSliderValue, -100, 100)}
                type='range'
                value={zoomSliderValue}
              />
            </div>

            <div className={styles['rangeGrid']}>
              <div className={styles['rangeControl']}>
                <div className={styles['rangeLabelRow']}>
                  <label className={styles['rangeLabel']} htmlFor={offsetXInputId}>
                    가로 위치
                  </label>
                </div>
                <input
                  className={styles['rangeInput']}
                  disabled={disabled || !hasImage}
                  id={offsetXInputId}
                  max='100'
                  min='-100'
                  onChange={(event) => {
                    updateCrop({ offsetX: Number(event.target.value) });
                  }}
                  step='1'
                  style={createRangeProgressStyle(crop.offsetX, -100, 100)}
                  type='range'
                  value={crop.offsetX}
                />
              </div>

              <div className={styles['rangeControl']}>
                <div className={styles['rangeLabelRow']}>
                  <label className={styles['rangeLabel']} htmlFor={offsetYInputId}>
                    세로 위치
                  </label>
                </div>
                <input
                  className={styles['rangeInput']}
                  disabled={disabled || !hasImage}
                  id={offsetYInputId}
                  max='100'
                  min='-100'
                  onChange={(event) => {
                    updateCrop({ offsetY: Number(event.target.value) });
                  }}
                  step='1'
                  style={createRangeProgressStyle(crop.offsetY, -100, 100)}
                  type='range'
                  value={crop.offsetY}
                />
              </div>
            </div>
          </div>

          <div className={styles['actions']}>
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
        </div>

        <div className={styles['uploadPanel']}>
          <AdminFileDropZone
            accept={accept}
            buttonLabel='파일 선택'
            disabled={disabled}
            label='대표 이미지 파일'
            onFilesSelected={(files) => {
              onSelectFile(files[0] ?? null);
            }}
            onClear={fileCaption && onRemove ? onRemove : undefined}
            selectedLabel={fileCaption}
          />

          {fileCaption && onUploadStart ? (
            <div className={styles['uploadActions']}>
              <Button
                disabled={disabled || uploadButtonDisabled}
                onClick={onUploadStart}
                size='sm'
                type='button'
              >
                {uploadButtonLabel}
              </Button>
            </div>
          ) : null}

          <p className={classNames(styles['caption'], styles['formatCaption'])}>
            허용 형식 · {accept.replaceAll(',', ', ')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminImageCropField;
