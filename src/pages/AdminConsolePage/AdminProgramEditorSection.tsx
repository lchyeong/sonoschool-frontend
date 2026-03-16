import { useEffect, useMemo, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  createAdminProgramDraft,
  hideAdminProgram,
  publishAdminProgram,
  updateAdminProgram,
} from '@/api/adminConsole';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { env } from '@/config/env';
import {
  adminProgramSchema,
  type AdminProgramFormValues,
} from '@/forms/schemas/adminProgramSchema';
import { adminConsoleQueryKey } from '@/query/useAdminConsoleQuery';
import {
  adminProgramMenuTreeQueryKey,
  useAdminProgramMenuTreeQuery,
} from '@/query/useAdminProgramMenuQuery';
import { useAdminProgramDetailQuery } from '@/query/useAdminProgramsQuery';
import { programSearchIndexQueryKey } from '@/query/useProgramSearchIndexQuery';
import { programsOverviewQueryKey } from '@/query/useProgramsOverviewQuery';
import { siteNavigationQueryKey } from '@/query/useSiteNavigationQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';

import { CurriculumSectionEditor, StructuredListEditor } from './AdminProgramEditorFields';
import styles from './AdminProgramEditorSection.module.scss';
import {
  appendCurriculumSection,
  buildEditorPageMeta,
  buildFallbackProgramListPath,
  getLeafCollectionOptions,
  getPreviewStatusLabel,
  programFormatLabel,
  programStatusLabel,
  resolveInitialParentCollectionPath,
  toFieldIndex,
} from './adminProgramEditorShared';
import {
  buildAdminProgramPreviewData,
  createDefaultAdminProgramFormValues,
  deriveProgramText,
  deriveLearningDatesFromCurriculumSections,
  slugifyAdminProgram,
  syncCurriculumSectionsForFormat,
  toAdminProgramDraftPayloadFromFormValues,
  toAdminProgramFormValues,
  toAdminProgramPayload,
  toDuplicateAdminProgramFormValues,
} from './adminProgramFormShared';

interface AdminProgramEditorSectionProps {
  mode: 'create' | 'duplicate' | 'edit';
}

interface AdminProgramEditorRouteState {
  returnTo?: string;
}

const AdminProgramEditorSection = ({ mode }: AdminProgramEditorSectionProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const params = useParams<{ programId?: string; sourceProgramId?: string }>();
  const [searchParams] = useSearchParams();
  const [isEditorSlugDirty, setIsEditorSlugDirty] = useState(mode !== 'create');
  const [creationAction, setCreationAction] = useState<'publish' | 'save' | null>(null);
  const appliedSeedRef = useRef<string | null>(null);

  const requestedParentCollectionPath = searchParams.get('parentCollectionPath')?.trim() ?? '';
  const routeState = (location.state as AdminProgramEditorRouteState | null) ?? null;
  const editingProgramId = mode === 'edit' ? (params.programId ?? null) : null;
  const duplicateSourceProgramId = mode === 'duplicate' ? (params.sourceProgramId ?? null) : null;
  const isInvalidRoute =
    (mode === 'edit' && !editingProgramId) || (mode === 'duplicate' && !duplicateSourceProgramId);

  const menuTreeQuery = useAdminProgramMenuTreeQuery(env.siteKey);
  const menuItems = useMemo(() => menuTreeQuery.data?.items ?? [], [menuTreeQuery.data?.items]);
  const leafCollectionOptions = useMemo(() => getLeafCollectionOptions(menuItems), [menuItems]);

  const detailQuery = useAdminProgramDetailQuery(env.siteKey, editingProgramId);
  const duplicateSourceQuery = useAdminProgramDetailQuery(env.siteKey, duplicateSourceProgramId);

  const form = useForm<AdminProgramFormValues>({
    defaultValues: createDefaultAdminProgramFormValues(),
    mode: 'onBlur',
    resolver: zodResolver(adminProgramSchema),
  });

  const statsFieldArray = useFieldArray({
    control: form.control,
    name: 'stats',
  });
  const faqFieldArray = useFieldArray({
    control: form.control,
    name: 'faqItems',
  });
  const curriculumFieldArray = useFieldArray({
    control: form.control,
    name: 'curriculumSections',
  });

  const currentValues = useWatch({
    control: form.control,
  }) as AdminProgramFormValues;
  const selectedFormat = useWatch({
    control: form.control,
    name: 'format',
  });
  const selectedAccessPolicy = useWatch({
    control: form.control,
    name: 'accessPolicy',
  });
  const watchedTitle = useWatch({
    control: form.control,
    name: 'title',
  });
  const watchedSlug = useWatch({
    control: form.control,
    name: 'slug',
  });
  const watchedCurriculumSections = useWatch({
    control: form.control,
    name: 'curriculumSections',
  });

  const currentProgram = detailQuery.data?.program ?? null;
  const sourceProgram = duplicateSourceQuery.data?.program ?? null;
  const pageMeta = buildEditorPageMeta(mode, currentProgram, sourceProgram);

  const invalidateProgramQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminConsoleQueryKey(env.siteKey) }),
      queryClient.invalidateQueries({ queryKey: adminProgramMenuTreeQueryKey(env.siteKey) }),
      queryClient.invalidateQueries({ queryKey: ['adminProgramMenuDetail', env.siteKey] }),
      queryClient.invalidateQueries({ queryKey: ['adminPrograms', env.siteKey] }),
      queryClient.invalidateQueries({ queryKey: ['adminProgramDetail', env.siteKey] }),
      queryClient.invalidateQueries({ queryKey: programsOverviewQueryKey(env.siteKey) }),
      queryClient.invalidateQueries({ queryKey: ['programPage', env.siteKey] }),
      queryClient.invalidateQueries({ queryKey: siteNavigationQueryKey(env.siteKey) }),
      queryClient.invalidateQueries({ queryKey: programSearchIndexQueryKey(env.siteKey) }),
    ]);
  };

  useEffect(() => {
    const defaultPath = resolveInitialParentCollectionPath(
      requestedParentCollectionPath,
      leafCollectionOptions,
      sourceProgram?.parentCollectionPath ?? '',
    );

    let nextSeed: string | null = null;
    let nextValues: AdminProgramFormValues | null = null;

    if (mode === 'create') {
      nextSeed = `create:${defaultPath}`;
      nextValues = createDefaultAdminProgramFormValues(defaultPath);
    }

    if (mode === 'duplicate' && sourceProgram) {
      nextSeed = `duplicate:${sourceProgram.id}:${defaultPath}`;
      nextValues = toDuplicateAdminProgramFormValues(sourceProgram, defaultPath);
    }

    if (mode === 'edit' && currentProgram) {
      nextSeed = `edit:${currentProgram.id}`;
      nextValues = toAdminProgramFormValues(currentProgram);
    }

    if (!nextSeed || !nextValues || appliedSeedRef.current === nextSeed) {
      return;
    }

    form.reset(nextValues);
    setIsEditorSlugDirty(mode !== 'create');
    appliedSeedRef.current = nextSeed;
  }, [
    currentProgram,
    form,
    leafCollectionOptions,
    mode,
    requestedParentCollectionPath,
    sourceProgram,
  ]);

  useEffect(() => {
    if (!watchedTitle || isEditorSlugDirty) {
      return;
    }

    form.setValue('slug', slugifyAdminProgram(watchedTitle), {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, isEditorSlugDirty, watchedTitle]);

  useEffect(() => {
    if (selectedFormat !== 'online') {
      return;
    }

    form.setValue('capacity', '', {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, selectedFormat]);

  useEffect(() => {
    if (
      (selectedFormat === 'offline' || selectedFormat === 'hybrid') &&
      selectedAccessPolicy !== 'cohort'
    ) {
      form.setValue('accessPolicy', 'cohort', {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [form, selectedAccessPolicy, selectedFormat]);

  useEffect(() => {
    const currentSections = form.getValues('curriculumSections');
    const nextSections = syncCurriculumSectionsForFormat(currentSections, selectedFormat);

    if (JSON.stringify(currentSections) === JSON.stringify(nextSections)) {
      return;
    }

    form.setValue('curriculumSections', nextSections, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, selectedFormat]);

  useEffect(() => {
    if (selectedFormat === 'online') {
      return;
    }

    const currentValuesSnapshot = form.getValues();
    const derivedLearningDates = deriveLearningDatesFromCurriculumSections(currentValuesSnapshot);

    if (currentValuesSnapshot.learningStartDate !== derivedLearningDates.learningStartDate) {
      form.setValue('learningStartDate', derivedLearningDates.learningStartDate, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: true,
      });
    }

    if (currentValuesSnapshot.learningEndDate !== derivedLearningDates.learningEndDate) {
      form.setValue('learningEndDate', derivedLearningDates.learningEndDate, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [
    form,
    selectedFormat,
    selectedAccessPolicy,
    watchedCurriculumSections,
    watchedSlug,
    watchedTitle,
  ]);

  const saveMutation = useMutation({
    mutationFn: ({ programId, values }: { programId: string; values: AdminProgramFormValues }) =>
      updateAdminProgram(env.siteKey, programId, toAdminProgramPayload(values)),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 초안 저장에 실패했습니다.',
        variant: 'error',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (programId: string) => publishAdminProgram(env.siteKey, programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 게시에 실패했습니다.',
        variant: 'error',
      });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (programId: string) => hideAdminProgram(env.siteKey, programId),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '강의 숨김 처리에 실패했습니다.',
        variant: 'error',
      });
    },
  });

  const handleBackToList = () => {
    if (typeof routeState?.returnTo === 'string' && routeState.returnTo.trim()) {
      void navigate(routeState.returnTo);
      return;
    }

    const fallbackParentCollectionPath =
      currentProgram?.parentCollectionPath ??
      sourceProgram?.parentCollectionPath ??
      requestedParentCollectionPath;

    void navigate(buildFallbackProgramListPath(fallbackParentCollectionPath));
  };

  const handleSave = form.handleSubmit(async (values) => {
    if (!editingProgramId) {
      return;
    }

    await saveMutation.mutateAsync({
      programId: editingProgramId,
      values,
    });
    await invalidateProgramQueries();
    showToast({
      message: '강의 초안을 저장했습니다.',
      variant: 'success',
    });
  });

  const handlePublish = form.handleSubmit(async (values) => {
    if (!editingProgramId) {
      return;
    }

    await saveMutation.mutateAsync({
      programId: editingProgramId,
      values,
    });
    await publishMutation.mutateAsync(editingProgramId);
    await invalidateProgramQueries();
    showToast({
      message: '강의를 게시했습니다.',
      variant: 'success',
    });
  });

  const handleHide = async () => {
    if (!currentProgram) {
      return;
    }

    await hideMutation.mutateAsync(currentProgram.id);
    await invalidateProgramQueries();
    showToast({
      message: '강의를 숨김 처리했습니다.',
      variant: 'success',
    });
  };

  const persistNewProgram = async (values: AdminProgramFormValues, action: 'publish' | 'save') => {
    const successMessage =
      action === 'publish' ? '강의를 게시했습니다.' : '강의 초안을 저장했습니다.';
    const fallbackErrorMessage =
      action === 'publish' ? '강의 게시에 실패했습니다.' : '강의 초안 저장에 실패했습니다.';
    const partialSuccessMessage =
      action === 'publish'
        ? '강의 초안은 생성되었지만 게시 전에 오류가 발생했습니다. 편집 페이지에서 이어서 처리해 주세요.'
        : '강의 초안은 생성되었지만 첫 저장 중 오류가 발생했습니다. 편집 페이지에서 이어서 처리해 주세요.';

    setCreationAction(action);

    let createdProgramId: string | null = null;

    try {
      const response = await createAdminProgramDraft(
        env.siteKey,
        toAdminProgramDraftPayloadFromFormValues(values, duplicateSourceProgramId),
      );

      createdProgramId = response.id;
      await updateAdminProgram(env.siteKey, response.id, toAdminProgramPayload(values));

      if (action === 'publish') {
        await publishAdminProgram(env.siteKey, response.id);
      }

      await invalidateProgramQueries();
      void navigate(routePaths.adminProgramEdit(response.id), {
        replace: true,
        state: routeState ?? undefined,
      });
      showToast({
        message: successMessage,
        variant: 'success',
      });
    } catch (error: unknown) {
      await invalidateProgramQueries();

      if (createdProgramId) {
        void navigate(routePaths.adminProgramEdit(createdProgramId), {
          replace: true,
          state: routeState ?? undefined,
        });
        showToast({
          message: partialSuccessMessage,
          variant: 'error',
        });
      } else {
        showToast({
          message: error instanceof Error ? error.message : fallbackErrorMessage,
          variant: 'error',
        });
      }
    } finally {
      setCreationAction(null);
    }
  };

  const handleCreateSave = async () => {
    await form.handleSubmit(async (values) => {
      await persistNewProgram(values, 'save');
    })();
  };

  const handleCreatePublish = async () => {
    await form.handleSubmit(async (values) => {
      await persistNewProgram(values, 'publish');
    })();
  };

  const previewStatus = currentProgram?.status ?? 'draft';
  const preview = buildAdminProgramPreviewData(
    currentValues,
    leafCollectionOptions,
    getPreviewStatusLabel(previewStatus),
  );
  const currentProgramMissingFieldLabels = detailQuery.data?.missingFieldLabels ?? [];
  const editorSlugField = form.register('slug');
  const isEditorLoading =
    menuTreeQuery.isPending ||
    (mode === 'edit' && detailQuery.isPending) ||
    (mode === 'duplicate' && duplicateSourceQuery.isPending);
  const hasEditorError =
    isInvalidRoute ||
    menuTreeQuery.isError ||
    (mode === 'edit' && detailQuery.isError) ||
    (mode === 'duplicate' && duplicateSourceQuery.isError);
  const formatSummary = deriveProgramText(currentValues);
  const saveButtonLabel =
    mode === 'edit'
      ? saveMutation.isPending
        ? '저장 중...'
        : '초안 저장'
      : creationAction === 'save'
        ? '저장 중...'
        : '초안 저장';
  const publishButtonLabel =
    mode === 'edit'
      ? publishMutation.isPending
        ? '게시 중...'
        : '게시'
      : creationAction === 'publish'
        ? '게시 중...'
        : '게시';

  return (
    <div className={styles['workspace']}>
      <section className={styles['editorWorkspace']}>
        <div className={styles['panelHeaderRow']}>
          <div className={styles['sectionHeader']}>
            <p className={styles['eyebrow']}>{pageMeta.eyebrow}</p>
            <h1 className={styles['sectionTitle']}>{pageMeta.title}</h1>
            <p className={styles['sectionDescription']}>{pageMeta.description}</p>
          </div>

          <div className={styles['headerActions']}>
            {currentProgram ? (
              <Link className={styles['inlineLink']} target='_blank' to={currentProgram.publicPath}>
                공개 페이지
              </Link>
            ) : null}
            <Button onClick={handleBackToList} type='button' variant='secondary'>
              목록으로 돌아가기
            </Button>
          </div>
        </div>

        {mode === 'duplicate' && sourceProgram ? (
          <div className={styles['selectionHint']}>
            <strong>복제 원본: {sourceProgram.title}</strong>
            <span>
              {sourceProgram.parentCollectionLabel} · {sourceProgram.formatLabel} ·{' '}
              {sourceProgram.scheduleLabel}
            </span>
          </div>
        ) : null}

        {isEditorLoading ? (
          <div className={styles['inlineState']}>강의 편집 정보를 불러오는 중입니다.</div>
        ) : hasEditorError ? (
          <div className={styles['inlineState']}>
            불러올 강의 정보를 찾지 못했습니다. 목록으로 돌아가 다시 선택해 주세요.
          </div>
        ) : (
          <>
            <section className={styles['editorSummary']}>
              <article className={styles['summaryCard']}>
                <span className={styles['summaryLabel']}>현재 상태</span>
                <strong className={styles['summaryValue']}>
                  {currentProgram ? programStatusLabel[currentProgram.status] : '새 초안'}
                </strong>
              </article>
              <article className={styles['summaryCard']}>
                <span className={styles['summaryLabel']}>운영 형식</span>
                <strong className={styles['summaryValue']}>
                  {programFormatLabel[currentValues.format]} · {formatSummary.formatLabel}
                </strong>
              </article>
              <article className={styles['summaryCard']}>
                <span className={styles['summaryLabel']}>게시 준비</span>
                <strong className={styles['summaryValue']}>
                  {mode === 'edit'
                    ? detailQuery.data?.isPublishReady
                      ? '게시 가능'
                      : '추가 입력 필요'
                    : '첫 저장 후 확인'}
                </strong>
              </article>
              <article className={styles['summaryCard']}>
                <span className={styles['summaryLabel']}>공개 경로</span>
                <strong className={styles['summaryValue']}>
                  {preview.publicPath || '/programs/.../lecture-slug'}
                </strong>
              </article>
            </section>

            <section className={styles['checklistPanel']}>
              <div className={styles['sectionHeader']}>
                <h2 className={styles['subsectionTitle']}>완성 체크리스트</h2>
                <p className={styles['sectionDescription']}>
                  게시 전 확인이 필요한 항목만 모아 보여줍니다.
                </p>
              </div>

              {mode === 'edit' ? (
                currentProgramMissingFieldLabels.length ? (
                  <ul className={styles['checklist']}>
                    {currentProgramMissingFieldLabels.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles['inlineState']}>지금 상태로 바로 게시할 수 있습니다.</div>
                )
              ) : (
                <div className={styles['inlineState']}>
                  첫 저장 후 게시 가능 여부와 누락 항목을 같은 화면에서 계속 확인할 수 있습니다.
                </div>
              )}
            </section>

            <div className={styles['editorLayout']}>
              <form
                className={styles['formPanel']}
                onSubmit={(event) => {
                  event.preventDefault();

                  if (mode === 'edit') {
                    void handleSave();
                    return;
                  }

                  void handleCreateSave();
                }}
              >
                <section className={styles['formSection']}>
                  <div className={styles['sectionHeader']}>
                    <h2 className={styles['subsectionTitle']}>기본 정보</h2>
                    <p className={styles['sectionDescription']}>
                      등록 메뉴, 제목, 공개 경로와 대표 이미지를 정리합니다.
                    </p>
                  </div>

                  <label className={styles['field']}>
                    <span className={styles['fieldLabel']}>등록 메뉴</span>
                    <select className={styles['select']} {...form.register('parentCollectionPath')}>
                      {leafCollectionOptions.map((option) => (
                        <option key={option.path} value={option.path}>
                          {'ㄴ '.repeat(option.depth - 1)}
                          {option.labelPath}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className={styles['gridCols2']}>
                    <TextField
                      errorMessage={form.formState.errors.title?.message}
                      label='강의명'
                      {...form.register('title')}
                    />
                    <TextField
                      {...editorSlugField}
                      errorMessage={form.formState.errors.slug?.message}
                      label='공개 URL 슬러그'
                      onBlur={(event) => {
                        void editorSlugField.onBlur(event);
                      }}
                      onChange={(event) => {
                        setIsEditorSlugDirty(true);
                        void editorSlugField.onChange(event);
                        form.setValue('slug', event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                      value={watchedSlug}
                    />
                  </div>

                  <TextAreaField
                    errorMessage={form.formState.errors.description?.message}
                    label='소개 문구'
                    placeholder='상세페이지 히어로에 노출할 소개 문구를 입력해 주세요.'
                    {...form.register('description')}
                  />

                  <div className={styles['gridCols2']}>
                    <TextField
                      errorMessage={form.formState.errors.heroImageSrc?.message}
                      label='대표 이미지 경로'
                      {...form.register('heroImageSrc')}
                    />
                    <TextField
                      errorMessage={form.formState.errors.heroImageAlt?.message}
                      label='대표 이미지 설명'
                      placeholder='대표 이미지 설명은 초안 상태에서도 비워둘 수 있습니다.'
                      {...form.register('heroImageAlt')}
                    />
                  </div>
                </section>

                <section className={styles['formSection']}>
                  <div className={styles['sectionHeader']}>
                    <h2 className={styles['subsectionTitle']}>운영 / 판매</h2>
                    <p className={styles['sectionDescription']}>
                      오프라인 기수, 온라인 기간제, 온라인 무제한 수강을 구조화 필드로 등록합니다.
                    </p>
                  </div>

                  <div className={styles['gridCols3']}>
                    <label className={styles['field']}>
                      <span className={styles['fieldLabel']}>운영 형식</span>
                      <select className={styles['select']} {...form.register('format')}>
                        <option value='offline'>오프라인</option>
                        <option value='hybrid'>하이브리드</option>
                        <option value='online'>온라인</option>
                      </select>
                    </label>

                    <label className={styles['field']}>
                      <span className={styles['fieldLabel']}>수강 정책</span>
                      <select className={styles['select']} {...form.register('accessPolicy')}>
                        <option value='cohort'>기수형 운영</option>
                        <option value='limited-window'>기간제 수강</option>
                        <option value='unlimited'>무제한 수강</option>
                      </select>
                    </label>

                    <TextField
                      disabled={selectedFormat === 'online'}
                      errorMessage={form.formState.errors.capacity?.message}
                      label='정원'
                      placeholder={selectedFormat === 'online' ? '온라인은 비워둡니다.' : '24'}
                      type='number'
                      {...form.register('capacity')}
                    />
                  </div>

                  <div className={styles['gridCols2']}>
                    <TextField
                      label='모집 시작일'
                      type='date'
                      {...form.register('registrationStartDate')}
                    />
                    <TextField
                      errorMessage={form.formState.errors.registrationEndDate?.message}
                      label='모집 종료일'
                      type='date'
                      {...form.register('registrationEndDate')}
                    />
                  </div>

                  <div className={styles['gridCols2']}>
                    {selectedFormat === 'online' ? (
                      <>
                        <TextField
                          label={
                            selectedAccessPolicy === 'unlimited' ? '수강 시작일' : '운영 시작일'
                          }
                          type='date'
                          {...form.register('learningStartDate')}
                        />
                        <TextField
                          errorMessage={form.formState.errors.learningEndDate?.message}
                          label={
                            selectedAccessPolicy === 'unlimited' ? '수강 종료일' : '운영 종료일'
                          }
                          type='date'
                          {...form.register('learningEndDate')}
                        />
                      </>
                    ) : (
                      <>
                        <TextField
                          label='운영 시작일(자동)'
                          readOnly
                          type='date'
                          value={currentValues.learningStartDate}
                        />
                        <TextField
                          label='운영 종료일(자동)'
                          readOnly
                          type='date'
                          value={currentValues.learningEndDate}
                        />
                      </>
                    )}
                  </div>

                  <div className={styles['gridCols3']}>
                    <TextField
                      errorMessage={form.formState.errors.originalPrice?.message}
                      label='정가'
                      min='0'
                      type='number'
                      {...form.register('originalPrice')}
                    />
                    <TextField
                      errorMessage={form.formState.errors.price?.message}
                      label='판매가'
                      min='0'
                      type='number'
                      {...form.register('price')}
                    />
                    <TextField
                      errorMessage={form.formState.errors.difficultyLabel?.message}
                      label='난이도'
                      {...form.register('difficultyLabel')}
                    />
                  </div>

                  {currentProgram ? (
                    <div className={styles['readOnlyInfo']}>
                      <span>누적 판매 수량</span>
                      <strong>{String(currentProgram.soldCount)}건</strong>
                    </div>
                  ) : null}
                </section>

                <section className={styles['formSection']}>
                  <div className={styles['sectionHeader']}>
                    <h2 className={styles['subsectionTitle']}>노출 태그와 학습 포인트</h2>
                  </div>

                  <div className={styles['gridCols2']}>
                    <TextAreaField
                      errorMessage={form.formState.errors.tagsInput?.message}
                      label='분류 태그'
                      {...form.register('tagsInput')}
                    />
                    <TextAreaField
                      errorMessage={form.formState.errors.hashtagLabelsInput?.message}
                      label='히어로 해시태그'
                      {...form.register('hashtagLabelsInput')}
                    />
                  </div>

                  <div className={styles['structuredGroup']}>
                    <div className={styles['sectionHeader']}>
                      <h3 className={styles['stackCardTitle']}>핵심 학습 포인트</h3>
                      <p className={styles['metaText']}>
                        줄바꿈 대신 항목을 하나씩 추가해 관리합니다.
                      </p>
                    </div>
                    <StructuredListEditor
                      addLabel='학습 포인트 추가'
                      canRemoveMinCount={1}
                      emptyValue={{ value: '' }}
                      form={form}
                      name='learningPoints'
                      title='학습 포인트'
                    />
                  </div>

                  <div className={styles['structuredGroup']}>
                    <div className={styles['sectionHeader']}>
                      <h3 className={styles['stackCardTitle']}>추천 대상</h3>
                    </div>
                    <StructuredListEditor
                      addLabel='추천 대상 추가'
                      canRemoveMinCount={1}
                      emptyValue={{ value: '' }}
                      form={form}
                      name='recommendedFor'
                      title='추천 대상'
                    />
                  </div>

                  <div className={styles['structuredGroup']}>
                    <div className={styles['sectionHeader']}>
                      <h3 className={styles['stackCardTitle']}>수강 전 체크리스트</h3>
                    </div>
                    <StructuredListEditor
                      addLabel='체크리스트 추가'
                      canRemoveMinCount={1}
                      emptyValue={{ value: '' }}
                      form={form}
                      name='preparationChecklist'
                      title='체크리스트'
                    />
                  </div>
                </section>

                <section className={styles['formSection']}>
                  <div className={styles['sectionHeader']}>
                    <h2 className={styles['subsectionTitle']}>요약 정보</h2>
                  </div>

                  <div className={styles['stackList']}>
                    {statsFieldArray.fields.map((field, index) => {
                      const fieldIndex = toFieldIndex(index);
                      const labelFieldName = `stats.${fieldIndex}.label` as const;
                      const valueFieldName = `stats.${fieldIndex}.value` as const;

                      return (
                        <div className={styles['stackCard']} key={field.id}>
                          <div className={styles['stackCardHeader']}>
                            <strong className={styles['stackCardTitle']}>
                              요약 항목 {String(index + 1)}
                            </strong>
                            <button
                              className={styles['ghostButton']}
                              disabled={statsFieldArray.fields.length <= 2}
                              onClick={() => {
                                statsFieldArray.remove(index);
                              }}
                              type='button'
                            >
                              삭제
                            </button>
                          </div>

                          <div className={styles['gridCols2']}>
                            <TextField
                              errorMessage={form.formState.errors.stats?.[index]?.label?.message}
                              label='항목명'
                              {...form.register(labelFieldName)}
                            />
                            <TextField
                              errorMessage={form.formState.errors.stats?.[index]?.value?.message}
                              label='내용'
                              {...form.register(valueFieldName)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => {
                      statsFieldArray.append({ label: '', value: '' });
                    }}
                    type='button'
                    variant='secondary'
                  >
                    요약 항목 추가
                  </Button>
                </section>

                <section className={styles['formSection']}>
                  <div className={styles['sectionHeader']}>
                    <h2 className={styles['subsectionTitle']}>커리큘럼 / FAQ</h2>
                  </div>

                  <div className={styles['gridCols2']}>
                    <TextField
                      errorMessage={form.formState.errors.curriculumTitle?.message}
                      label='커리큘럼 제목'
                      {...form.register('curriculumTitle')}
                    />

                    <label className={styles['field']}>
                      <span className={styles['fieldLabel']}>요약 리스트 타입</span>
                      <select
                        className={styles['select']}
                        {...form.register('curriculumSummaryKind')}
                      >
                        <option value='disc'>불릿 리스트</option>
                        <option value='decimal'>숫자 리스트</option>
                      </select>
                    </label>
                  </div>

                  <TextAreaField
                    errorMessage={form.formState.errors.curriculumSummaryItemsInput?.message}
                    label='커리큘럼 요약 항목'
                    {...form.register('curriculumSummaryItemsInput')}
                  />

                  <div className={styles['stackList']}>
                    {curriculumFieldArray.fields.map((field, index) => {
                      return (
                        <CurriculumSectionEditor
                          canRemove={curriculumFieldArray.fields.length > 1}
                          form={form}
                          index={index}
                          key={field.id}
                          onRemove={() => {
                            curriculumFieldArray.remove(index);
                          }}
                          selectedFormat={selectedFormat}
                        />
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => {
                      appendCurriculumSection(
                        curriculumFieldArray.append,
                        selectedFormat,
                        curriculumFieldArray.fields.length,
                      );
                    }}
                    type='button'
                    variant='secondary'
                  >
                    커리큘럼 섹션 추가
                  </Button>

                  <div className={styles['stackList']}>
                    {faqFieldArray.fields.map((field, index) => {
                      const fieldIndex = toFieldIndex(index);
                      const questionFieldName = `faqItems.${fieldIndex}.question` as const;
                      const answerFieldName = `faqItems.${fieldIndex}.answer` as const;

                      return (
                        <div className={styles['stackCard']} key={field.id}>
                          <div className={styles['stackCardHeader']}>
                            <strong className={styles['stackCardTitle']}>
                              FAQ {String(index + 1)}
                            </strong>
                            <button
                              className={styles['ghostButton']}
                              disabled={faqFieldArray.fields.length <= 2}
                              onClick={() => {
                                faqFieldArray.remove(index);
                              }}
                              type='button'
                            >
                              삭제
                            </button>
                          </div>

                          <TextField
                            errorMessage={
                              form.formState.errors.faqItems?.[index]?.question?.message
                            }
                            label='질문'
                            {...form.register(questionFieldName)}
                          />
                          <TextAreaField
                            errorMessage={form.formState.errors.faqItems?.[index]?.answer?.message}
                            label='답변'
                            {...form.register(answerFieldName)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => {
                      faqFieldArray.append({ answer: '', question: '' });
                    }}
                    type='button'
                    variant='secondary'
                  >
                    FAQ 추가
                  </Button>
                </section>

                <div className={styles['actionRow']}>
                  <Button
                    disabled={
                      creationAction !== null ||
                      saveMutation.isPending ||
                      publishMutation.isPending ||
                      hideMutation.isPending
                    }
                    type='submit'
                  >
                    {saveButtonLabel}
                  </Button>
                  <Button
                    disabled={
                      creationAction !== null ||
                      saveMutation.isPending ||
                      publishMutation.isPending ||
                      hideMutation.isPending
                    }
                    onClick={() => {
                      if (mode === 'edit') {
                        void handlePublish();
                        return;
                      }

                      void handleCreatePublish();
                    }}
                    type='button'
                  >
                    {publishButtonLabel}
                  </Button>
                  {currentProgram?.status === 'published' ? (
                    <Button
                      disabled={hideMutation.isPending}
                      onClick={() => {
                        void handleHide();
                      }}
                      type='button'
                      variant='secondary'
                    >
                      숨김
                    </Button>
                  ) : null}
                </div>
              </form>

              <aside className={styles['previewPanel']}>
                <div className={styles['sectionHeader']}>
                  <p className={styles['eyebrow']}>Preview</p>
                  <h2 className={styles['subsectionTitle']}>공개 페이지 미리보기</h2>
                  <p className={styles['sectionDescription']}>
                    구조화 필드로 입력한 일정과 수강 정책이 공개 페이지 문구로 어떻게 보일지
                    확인합니다.
                  </p>
                </div>

                <section className={styles['previewHero']}>
                  <div className={styles['previewMetaRow']}>
                    <span className={styles['statusBadge']} data-status={previewStatus}>
                      {preview.statusLabel}
                    </span>
                    <span className={styles['metaText']}>{preview.collectionLabelPath}</span>
                  </div>
                  <h3 className={styles['previewProgramTitle']}>
                    {preview.title || '강의명을 입력하면 여기에 반영됩니다.'}
                  </h3>
                  <p className={styles['previewProgramDescription']}>
                    {preview.description || '소개 문구를 입력하면 공개 페이지 요약이 반영됩니다.'}
                  </p>
                  <div className={styles['previewHashTags']}>
                    {preview.hashtags.length ? (
                      preview.hashtags.slice(0, 4).map((item) => (
                        <span className={styles['previewHashTag']} key={item}>
                          #{item}
                        </span>
                      ))
                    ) : (
                      <span className={styles['metaText']}>
                        태그를 입력하면 히어로에 반영됩니다.
                      </span>
                    )}
                  </div>
                  <div className={styles['previewPillRow']}>
                    {preview.heroInfoPills.map((item) => (
                      <div className={styles['previewPill']} key={`${item.label}-${item.value}`}>
                        <span className={styles['previewPillLabel']}>{item.label}</span>
                        <span className={styles['previewPillValue']}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={styles['previewPricePanel']}>
                  <div className={styles['previewPriceRow']}>
                    <span>정가</span>
                    <span>{preview.originalPriceLabel}</span>
                  </div>
                  <div className={styles['previewPriceRowStrong']}>
                    <span>{preview.discountRateLabel}</span>
                    <strong>{preview.priceLabel}</strong>
                  </div>
                  <div className={styles['previewInlineList']}>
                    <span>{preview.formatLabel}</span>
                    <span>{preview.difficultyLabel}</span>
                    <span>{preview.durationLabel}</span>
                  </div>
                  <p className={styles['metaText']}>모집 기간: {preview.registrationPeriodLabel}</p>
                  {preview.operationPeriodLabel ? (
                    <p className={styles['metaText']}>운영 기간: {preview.operationPeriodLabel}</p>
                  ) : null}
                  <p className={styles['metaText']}>{preview.scheduleLabel}</p>
                  <p className={styles['metaText']}>{preview.tuitionLabel}</p>
                  <p className={styles['metaText']}>
                    공개 경로:{' '}
                    <code className={styles['code']}>
                      {preview.publicPath || '/programs/.../lecture-slug'}
                    </code>
                  </p>
                </section>

                <section className={styles['previewSection']}>
                  <h2 className={styles['subsectionTitle']}>요약 미리보기</h2>
                  <div className={styles['summaryGrid']}>
                    <article className={styles['summaryCard']}>
                      <span className={styles['summaryLabel']}>학습 포인트</span>
                      <strong className={styles['summaryValue']}>
                        {String(preview.learningPoints.length)}개
                      </strong>
                    </article>
                    <article className={styles['summaryCard']}>
                      <span className={styles['summaryLabel']}>커리큘럼</span>
                      <strong className={styles['summaryValue']}>
                        {String(preview.curriculumSectionCount)}개
                      </strong>
                    </article>
                    <article className={styles['summaryCard']}>
                      <span className={styles['summaryLabel']}>FAQ</span>
                      <strong className={styles['summaryValue']}>
                        {String(preview.faqCount)}개
                      </strong>
                    </article>
                  </div>

                  <ul className={styles['previewList']}>
                    {preview.curriculumSummaryItems.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default AdminProgramEditorSection;
