import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { addMyCartItem, fetchMyCart } from '@/api/mypage';
import { myCartQueryKey } from '@/query/useMyPageQueries';
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
