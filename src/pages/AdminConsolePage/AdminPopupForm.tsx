import AdminFileDropZone from '@/components/admin/AdminFileDropZone';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';

import styles from './AdminConsolePage.module.scss';
import { formatFileSizeLabel } from './adminConsolePageShared';
import type { PopupFormState } from './adminPopupUtils';

interface AdminPopupFormProps {
  editingPopupId: number | null;
  formState: PopupFormState;
  isSaving: boolean;
  isUploadingImage: boolean;
  onImageAltChange: (value: string) => void;
  onImageFileChange: (file: File | null) => void;
  onRemoveImage: () => void;
  onStartCreate: () => void;
  onSubmit: () => void;
}

const AdminPopupForm = ({
  editingPopupId,
  formState,
  isSaving,
  isUploadingImage,
  onImageAltChange,
  onImageFileChange,
  onRemoveImage,
  onStartCreate,
  onSubmit,
}: AdminPopupFormProps) => {
  return (
    <article className={styles['panel']}>
      <div className={styles['form']}>
        <div className={styles['popupMediaField']}>
          <div className={styles['popupFileField']}>
            <AdminFileDropZone
              accept='image/*'
              buttonLabel={isUploadingImage ? '업로드 중' : '파일 선택'}
              disabled={isUploadingImage}
              inputLabel='팝업 이미지 파일'
              label='팝업 이미지'
              name='popupImageFile'
              onFilesSelected={(files) => {
                onImageFileChange(files[0] ?? null);
              }}
              onClear={formState.pendingImageFile ? onRemoveImage : undefined}
              selectedLabel={
                formState.pendingImageFile?.name ??
                (formState.imageUrl ? '등록된 이미지' : undefined)
              }
              selectedMeta={
                formState.pendingImageFile
                  ? formatFileSizeLabel(formState.pendingImageFile.size)
                  : null
              }
            />
          </div>

          {formState.imageUrl ? (
            <div className={styles['thumbnailPreview']}>
              <img
                alt={formState.imageAlt || '팝업 이미지 미리보기'}
                className={styles['thumbnailPreviewImage']}
                src={formState.imageUrl}
              />
              {formState.pendingImageFile ? (
                <p className={styles['thumbnailFileCaption']}>
                  등록 대기 중 · {formState.pendingImageFile.name}
                </p>
              ) : null}
            </div>
          ) : (
            <div className={styles['thumbnailEmptyState']}>이미지를 선택해 주세요.</div>
          )}
        </div>

        <TextField
          label='이미지 설명'
          name='popupImageAlt'
          onChange={(event) => {
            onImageAltChange(event.target.value);
          }}
          placeholder='이미지 설명'
          value={formState.imageAlt}
        />

        <div className={styles['actionRow']}>
          <Button disabled={isSaving || isUploadingImage} onClick={onSubmit} type='button'>
            {isUploadingImage
              ? '이미지 업로드 중...'
              : isSaving
                ? '저장 중...'
                : editingPopupId === null
                  ? '팝업 등록'
                  : '팝업 수정'}
          </Button>
          <Button onClick={onStartCreate} type='button' variant='secondary'>
            새 팝업 작성
          </Button>
          {formState.imageUrl ? (
            <Button onClick={onRemoveImage} type='button' variant='secondary'>
              이미지 제거
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default AdminPopupForm;
