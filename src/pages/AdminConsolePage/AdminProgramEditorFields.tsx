import { type UseFormReturn, useFieldArray, useWatch } from 'react-hook-form';

import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import type { AdminProgramFormValues } from '@/forms/schemas/adminProgramSchema';
import type { AdminProgramFormat } from '@/types/adminConsole';

import styles from './AdminProgramEditorSection.module.scss';
import { DEFAULT_LESSON_DATE, toFieldIndex } from './adminProgramEditorShared';
import { buildCurriculumSectionPreviewMeta } from './adminProgramFormShared';

interface StructuredListEditorProps {
  addLabel: string;
  canRemoveMinCount: number;
  emptyValue: { value: string };
  form: UseFormReturn<AdminProgramFormValues>;
  name: 'learningPoints' | 'preparationChecklist' | 'recommendedFor';
  title: string;
}

interface CurriculumSectionEditorProps {
  canRemove: boolean;
  form: UseFormReturn<AdminProgramFormValues>;
  index: number;
  onRemove: () => void;
  selectedFormat: AdminProgramFormat;
}

export const StructuredListEditor = ({
  addLabel,
  canRemoveMinCount,
  emptyValue,
  form,
  name,
  title,
}: StructuredListEditorProps) => {
  const fieldArray = useFieldArray({
    control: form.control,
    name,
  });

  return (
    <div className={styles['stackList']}>
      {fieldArray.fields.map((field, index) => {
        const fieldName = `${name}.${toFieldIndex(index)}.value` as const;
        const fieldError = form.formState.errors[name]?.[index];
        const errorMessage =
          fieldError && 'value' in fieldError ? fieldError.value.message : undefined;

        return (
          <div className={styles['stackCard']} key={field.id}>
            <div className={styles['stackCardHeader']}>
              <strong className={styles['stackCardTitle']}>
                {title} {String(index + 1)}
              </strong>
              <button
                className={styles['ghostButton']}
                disabled={fieldArray.fields.length <= canRemoveMinCount}
                onClick={() => {
                  fieldArray.remove(index);
                }}
                type='button'
              >
                삭제
              </button>
            </div>

            <TextField
              errorMessage={errorMessage}
              label='항목 내용'
              {...form.register(fieldName)}
            />
          </div>
        );
      })}

      <Button
        onClick={() => {
          fieldArray.append(emptyValue);
        }}
        type='button'
        variant='secondary'
      >
        {addLabel}
      </Button>
    </div>
  );
};

export const CurriculumSectionEditor = ({
  canRemove,
  form,
  index,
  onRemove,
  selectedFormat,
}: CurriculumSectionEditorProps) => {
  const fieldIndex = toFieldIndex(index);
  const lessonsFieldName = `curriculumSections.${fieldIndex}.lessons` as const;
  const titleFieldName = `curriculumSections.${fieldIndex}.title` as const;
  const descriptionFieldName = `curriculumSections.${fieldIndex}.description` as const;
  const lessonFieldArray = useFieldArray({
    control: form.control,
    name: lessonsFieldName,
  });
  const watchedSection = useWatch({
    control: form.control,
    name: `curriculumSections.${fieldIndex}` as const,
  });
  const sectionMeta = buildCurriculumSectionPreviewMeta(watchedSection);

  return (
    <div className={styles['stackCard']}>
      <div className={styles['stackCardHeader']}>
        <strong className={styles['stackCardTitle']}>커리큘럼 섹션 {String(index + 1)}</strong>
        <button
          className={styles['ghostButton']}
          disabled={!canRemove}
          onClick={onRemove}
          type='button'
        >
          삭제
        </button>
      </div>

      <div className={styles['gridCols2']}>
        <TextField
          errorMessage={form.formState.errors.curriculumSections?.[index]?.title?.message}
          label='섹션 제목'
          {...form.register(titleFieldName)}
        />
        <div className={styles['readOnlyInfo']}>
          <span>자동 집계 기간/시간</span>
          <strong>{sectionMeta.durationLabel}</strong>
        </div>
      </div>

      {sectionMeta.onlineSummaryLabel ? (
        <p className={styles['metaText']}>{sectionMeta.onlineSummaryLabel}</p>
      ) : null}

      <TextAreaField
        errorMessage={form.formState.errors.curriculumSections?.[index]?.description?.message}
        label='섹션 설명'
        {...form.register(descriptionFieldName)}
      />

      <div className={styles['nestedCardList']}>
        {lessonFieldArray.fields.map((lessonField, lessonIndex) => {
          const lessonFieldIndex = toFieldIndex(lessonIndex);
          const lessonBase =
            `curriculumSections.${fieldIndex}.lessons.${lessonFieldIndex}` as const;
          const currentLesson = watchedSection.lessons.at(lessonIndex);
          const effectiveDeliveryType =
            selectedFormat === 'hybrid'
              ? (currentLesson?.deliveryType ?? 'online')
              : selectedFormat === 'online'
                ? 'online'
                : 'offline';

          return (
            <div className={styles['nestedCard']} key={lessonField.id}>
              <div className={styles['stackCardHeader']}>
                <strong className={styles['stackCardTitle']}>
                  섹션 하위 강의 {String(lessonIndex + 1)}
                </strong>
                <button
                  className={styles['ghostButton']}
                  disabled={lessonFieldArray.fields.length <= 1}
                  onClick={() => {
                    lessonFieldArray.remove(lessonIndex);
                  }}
                  type='button'
                >
                  삭제
                </button>
              </div>

              {selectedFormat === 'hybrid' ? (
                <label className={styles['field']}>
                  <span className={styles['fieldLabel']}>강의 유형</span>
                  <select
                    className={styles['select']}
                    {...form.register(`${lessonBase}.deliveryType`)}
                  >
                    <option value='online'>온라인</option>
                    <option value='offline'>오프라인</option>
                  </select>
                </label>
              ) : null}

              <TextField
                errorMessage={
                  form.formState.errors.curriculumSections?.[index]?.lessons?.[lessonIndex]?.title
                    ?.message
                }
                label='강의 제목'
                {...form.register(`${lessonBase}.title`)}
              />

              <TextAreaField
                errorMessage={
                  form.formState.errors.curriculumSections?.[index]?.lessons?.[lessonIndex]
                    ?.description?.message
                }
                label='강의 설명'
                placeholder='비워두면 섹션 설명을 기본 안내로 사용합니다.'
                {...form.register(`${lessonBase}.description`)}
              />

              {effectiveDeliveryType === 'online' ? (
                <TextField
                  errorMessage={
                    form.formState.errors.curriculumSections?.[index]?.lessons?.[lessonIndex]
                      ?.durationMinutes?.message
                  }
                  label='강의 시간(분)'
                  min='1'
                  type='number'
                  {...form.register(`${lessonBase}.durationMinutes`)}
                />
              ) : (
                <div className={styles['gridCols2']}>
                  <TextField
                    label='하위 강의 시작일'
                    type='date'
                    {...form.register(`${lessonBase}.startDate`)}
                  />
                  <TextField
                    errorMessage={
                      form.formState.errors.curriculumSections?.[index]?.lessons?.[lessonIndex]
                        ?.endDate?.message
                    }
                    label='하위 강의 종료일'
                    type='date'
                    {...form.register(`${lessonBase}.endDate`)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        onClick={() => {
          lessonFieldArray.append({
            deliveryType:
              selectedFormat === 'hybrid'
                ? 'online'
                : selectedFormat === 'online'
                  ? 'online'
                  : 'offline',
            description: '',
            durationMinutes: selectedFormat === 'offline' ? '' : '45',
            endDate: selectedFormat === 'online' ? '' : DEFAULT_LESSON_DATE,
            startDate: selectedFormat === 'online' ? '' : DEFAULT_LESSON_DATE,
            title: '',
          });
        }}
        type='button'
        variant='secondary'
      >
        하위 강의 추가
      </Button>
    </div>
  );
};
