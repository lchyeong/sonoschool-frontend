import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { addMyCartItem, fetchMyCart } from '@/api/mypage';
import { createProgramQuestion } from '@/api/qna';
import { myCartQueryKey } from '@/query/useMyPageQueries';
import { programQuestionsQueryKey, useProgramQuestionsQuery } from '@/query/useQnaQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import type { AddToCartPayload, CartSummary, ProgramType } from '@/types/mypage';
import type { ProgramDetailPageResponse } from '@/types/programCatalog';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';

import styles from './ProgramPageDetail.module.scss';
import {
  ProgramPageDetailHero,
  ProgramPageDetailMainContent,
  ProgramPageDetailSidebar,
} from './ProgramPageDetailSections';
import { useProgramPageDetailViewModel } from './useProgramPageDetailViewModel';

interface ProgramPageDetailProps {
  data: ProgramDetailPageResponse;
}

const inferProgramType = (data: ProgramDetailPageResponse): ProgramType => {
  const hasOnlineLesson = data.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'online');
  });
  const hasOfflineLesson = data.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'offline');
  });

  if (hasOnlineLesson && hasOfflineLesson) {
    return 'HYBRID';
  }

  return hasOfflineLesson ? 'OFFLINE' : 'ONLINE';
};

const deriveProgramId = (sourcePath: string): number => {
  const normalizedPath = sourcePath.trim() || '/programs/detail';

  return Array.from(normalizedPath).reduce((accumulator, character) => {
    return (accumulator * 31 + character.charCodeAt(0)) % 1_000_000_007;
  }, 7_000);
};

const buildAddToCartPayload = (
  data: ProgramDetailPageResponse,
  selectedOption: string,
  discountedPriceAmount: number,
  originalPriceAmount: number,
): AddToCartPayload => {
  const sourcePath = data.breadcrumbItems.at(-1)?.to ?? routePaths.programs;

  return {
    instructorName: data.instructor.name,
    originalPrice: originalPriceAmount,
    payablePrice: discountedPriceAmount,
    programId: data.programId ?? deriveProgramId(`${sourcePath}:${selectedOption}`),
    programType: inferProgramType(data),
    salePrice: discountedPriceAmount < originalPriceAmount ? discountedPriceAmount : null,
    sourcePath,
    thumbnailUrl: data.heroImageSrc,
    title: selectedOption || data.title,
  };
};

const findCartItemByPayload = (cart: CartSummary, payload: AddToCartPayload) => {
  return [...cart.items].reverse().find((item) => item.programId === payload.programId) ?? null;
};

const ProgramPageDetail = ({ data }: ProgramPageDetailProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const selectSingleCartItem = useCartSelectionStore((state) => state.selectSingleItem);
  const showToast = useToastStore((state) => state.showToast);
  const cartScope = resolveCartQueryScope(isAuthenticated);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const programQuestionsQuery = useProgramQuestionsQuery(data.programId ?? null);
  const viewModel = useProgramPageDetailViewModel(data);
  const {
    activeSectionId,
    discountedPriceAmount,
    handleReviewCarouselScroll,
    handleTabClick,
    heroInfoPills,
    openCurriculumRows,
    openFaqId,
    optionList,
    originalPriceAmount,
    reviewCarouselRef,
    reviewSortOrder,
    sectionRefHandlers,
    selectedOption,
    setOpenFaqId,
    setReviewSortOrder,
    setSelectedOption,
    setShowOptionList,
    showOptionList,
    sortedReviews,
    supportTags,
    toggleCurriculumRow,
    totalPriceLabel,
    visiblePreviewReviewIds,
  } = viewModel;

  const addToCartMutation = useMutation({
    mutationFn: addMyCartItem,
  });

  const createQuestionMutation = useMutation({
    mutationFn: ({ content, programId, title }: { programId: number; title: string; content: string }) => {
      return createProgramQuestion(programId, { content, title });
    },
  });

  const handleAddToCart = () => {
    const payload = buildAddToCartPayload(
      data,
      selectedOption,
      discountedPriceAmount,
      originalPriceAmount,
    );

    void addToCartMutation.mutateAsync(payload).then(
      async (cart) => {
        queryClient.setQueryData(myCartQueryKey(cartScope), cart);

        showToast({
          message: '장바구니에 담았습니다.',
          variant: 'success',
        });

        await navigate(routePaths.cart);
      },
      (error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : '장바구니에 담지 못했습니다. 다시 시도해 주세요.';

        showToast({
          message,
          variant: message.includes('이미 장바구니에 담긴 강의') ? 'info' : 'error',
        });
      },
    );
  };

  const handleEnrollNow = async () => {
    const payload = buildAddToCartPayload(
      data,
      selectedOption,
      discountedPriceAmount,
      originalPriceAmount,
    );

    try {
      const cart = await addToCartMutation.mutateAsync(payload);
      const targetCartItem = findCartItemByPayload(cart, payload);

      queryClient.setQueryData(myCartQueryKey(cartScope), cart);

      if (!targetCartItem) {
        throw new Error('결제할 강의 정보를 찾지 못했습니다.');
      }

      selectSingleCartItem(targetCartItem.id);
      await navigate(routePaths.checkout);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : '결제 페이지로 이동하지 못했습니다. 다시 시도해 주세요.';

      if (message.includes('이미 장바구니에 담긴 강의')) {
        try {
          const cart = await queryClient.fetchQuery({
            queryFn: fetchMyCart,
            queryKey: myCartQueryKey(cartScope),
          });
          const targetCartItem = findCartItemByPayload(cart, payload);

          if (!targetCartItem) {
            showToast({
              message: '이미 담긴 강의를 찾지 못했습니다. 장바구니에서 다시 확인해 주세요.',
              variant: 'error',
            });
            return;
          }

          selectSingleCartItem(targetCartItem.id);
          await navigate(routePaths.checkout);
          return;
        } catch {
          showToast({
            message: '장바구니 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
            variant: 'error',
          });
          return;
        }
      }

      showToast({
        message,
        variant: 'error',
      });
    }
  };

  const handleEnrollNowClick = () => {
    void handleEnrollNow();
  };

  const handleCreateQuestion = () => {
    const programId = data.programId;
    const trimmedTitle = questionTitle.trim();
    const trimmedContent = questionContent.trim();

    if (!programId) {
      showToast({
        message: '질문을 등록할 과정 정보를 확인하지 못했습니다.',
        variant: 'error',
      });
      return;
    }

    if (!isAuthenticated) {
      void navigate(routePaths.login);
      return;
    }

    if (!trimmedTitle || !trimmedContent) {
      showToast({
        message: '질문 제목과 내용을 모두 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    void createQuestionMutation.mutateAsync(
      { content: trimmedContent, programId, title: trimmedTitle },
      {
        onError: (error: unknown) => {
          showToast({
            message: error instanceof Error ? error.message : '질문 등록에 실패했습니다.',
            variant: 'error',
          });
        },
        onSuccess: async () => {
          setQuestionTitle('');
          setQuestionContent('');
          await queryClient.invalidateQueries({ queryKey: programQuestionsQueryKey(programId) });
          showToast({
            message: '질문을 등록했습니다.',
            variant: 'success',
          });
        },
      },
    );
  };

  return (
    <div className={styles['page']}>
      <ProgramPageDetailHero data={data} heroInfoPills={heroInfoPills} supportTags={supportTags} />

      <div className={styles['detailShell']}>
        <div className={styles['contentLayout']}>
          <ProgramPageDetailMainContent
            activeSectionId={activeSectionId}
            data={data}
            handleReviewCarouselScroll={handleReviewCarouselScroll}
            handleTabClick={handleTabClick}
            openCurriculumRows={openCurriculumRows}
            openFaqId={openFaqId}
            isAuthenticated={isAuthenticated}
            isQuestionSubmitting={createQuestionMutation.isPending}
            isQuestionsLoading={programQuestionsQuery.isLoading}
            onQuestionContentChange={setQuestionContent}
            onQuestionSubmit={handleCreateQuestion}
            onQuestionTitleChange={setQuestionTitle}
            programQuestions={programQuestionsQuery.data ?? []}
            questionContent={questionContent}
            questionErrorMessage={
              programQuestionsQuery.isError ? '과정 Q&A를 불러오지 못했습니다.' : null
            }
            questionTitle={questionTitle}
            reviewCarouselRef={reviewCarouselRef}
            reviewSortOrder={reviewSortOrder}
            sectionRefHandlers={sectionRefHandlers}
            setOpenFaqId={setOpenFaqId}
            setReviewSortOrder={setReviewSortOrder}
            sortedReviews={sortedReviews}
            toggleCurriculumRow={toggleCurriculumRow}
            visiblePreviewReviewIds={visiblePreviewReviewIds}
          />
          <ProgramPageDetailSidebar
            data={data}
            discountedPriceAmount={discountedPriceAmount}
            optionList={optionList}
            originalPriceAmount={originalPriceAmount}
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
            setShowOptionList={setShowOptionList}
            showOptionList={showOptionList}
            totalPriceLabel={totalPriceLabel}
            handleAddToCart={handleAddToCart}
            handleEnrollNow={handleEnrollNowClick}
            isEnrollingNow={addToCartMutation.isPending}
            isAddingToCart={addToCartMutation.isPending}
          />
        </div>
      </div>

      <div className={styles['mobileBottomBar']}>
        <button
          className={styles['mobileApplyActionLink']}
          disabled={addToCartMutation.isPending}
          onClick={handleEnrollNowClick}
          type='button'
        >
          {addToCartMutation.isPending ? '이동 중...' : '수강 신청'}
        </button>
      </div>
    </div>
  );
};

export default ProgramPageDetail;
