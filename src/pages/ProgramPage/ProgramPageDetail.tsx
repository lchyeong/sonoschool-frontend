import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { addMyCartItem } from '@/api/mypage';
import { myApplicationSummaryQueryKey, myCartQueryKey } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import type { AddToCartPayload, ProgramType } from '@/types/mypage';
import type { ProgramDetailPageResponse } from '@/types/programCatalog';

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
  const hasOfflineLesson = data.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'offline');
  });

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
    programId: deriveProgramId(`${sourcePath}:${selectedOption}`),
    programType: inferProgramType(data),
    salePrice: discountedPriceAmount < originalPriceAmount ? discountedPriceAmount : null,
    sourcePath,
    thumbnailUrl: data.heroImageSrc,
    title: selectedOption || data.title,
  };
};

const ProgramPageDetail = ({ data }: ProgramPageDetailProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
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
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : '장바구니에 담지 못했습니다. 다시 시도해 주세요.';

      showToast({
        message,
        variant: message.includes('이미 장바구니에 담긴 강의') ? 'info' : 'error',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myCartQueryKey }),
        queryClient.invalidateQueries({ queryKey: myApplicationSummaryQueryKey }),
      ]);

      showToast({
        message: '장바구니에 담았습니다.',
        variant: 'success',
      });

      await navigate(routePaths.cart);
    },
  });

  const handleAddToCart = () => {
    addToCartMutation.mutate(
      buildAddToCartPayload(data, selectedOption, discountedPriceAmount, originalPriceAmount),
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
            isAddingToCart={addToCartMutation.isPending}
          />
        </div>
      </div>

      <div className={styles['mobileBottomBar']}>
        <Link className={styles['mobileReserveActionLink']} to={routePaths.contact}>
          예약하기
        </Link>
        <Link className={styles['mobileApplyActionLink']} to={routePaths.contact}>
          수강 신청
        </Link>
      </div>
    </div>
  );
};

export default ProgramPageDetail;
