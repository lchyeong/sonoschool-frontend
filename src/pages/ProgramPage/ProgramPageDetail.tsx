import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { addMyCartItem, fetchMyCart } from '@/api/mypage';
import {
  subscribeMyProgramAvailabilityAlert,
  type ProgramAvailabilityAlertStatusResponse,
} from '@/api/programAvailabilityAlerts';
import { myCartQueryKey } from '@/query/useMyPageQueries';
import {
  programAvailabilityAlertStatusQueryKey,
  useProgramAvailabilityAlertStatusQuery,
} from '@/query/useProgramAvailabilityAlertStatusQuery';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import type { AddToCartPayload, CartSummary, ProgramType } from '@/types/mypage';
import type { ProgramCatalogStatus, ProgramDetailPageResponse } from '@/types/programCatalog';
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
  const hasProblemOnly = data.curriculumTrack.sections.every((section) =>
    section.lessons.every(
      (lesson) => lesson.deliveryType === 'problem' || lesson.deliveryType === 'resource',
    ),
  );
  const hasOfflineLesson = data.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'offline');
  });
  const hasPracticumLesson = data.curriculumTrack.sections.some((section) => {
    return section.lessons.some((lesson) => lesson.deliveryType === 'practicum');
  });
  const hasOnlineLesson = data.curriculumTrack.sections.some((section) => {
    return section.lessons.some(
      (lesson) =>
        lesson.deliveryType === 'online' ||
        lesson.deliveryType === 'problem' ||
        lesson.deliveryType === 'resource',
    );
  });

  if (hasProblemOnly) {
    return 'PROBLEM_SOLVING';
  }

  if (hasPracticumLesson) {
    return 'HYBRID';
  }

  if (!hasOnlineLesson) {
    return 'OFFLINE';
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
  discountedPriceAmount: number,
  originalPriceAmount: number,
): AddToCartPayload => {
  const sourcePath = data.breadcrumbItems.at(-1)?.to ?? routePaths.programs;

  return {
    instructorName: data.instructor.name,
    originalPrice: originalPriceAmount,
    payablePrice: discountedPriceAmount,
    programId: data.programId ?? deriveProgramId(sourcePath),
    programType: inferProgramType(data),
    salePrice: discountedPriceAmount < originalPriceAmount ? discountedPriceAmount : null,
    sourcePath,
    thumbnailUrl: data.heroImageSrc,
    title: data.title,
  };
};

const findCartItemByPayload = (cart: CartSummary, payload: AddToCartPayload) => {
  return [...cart.items].reverse().find((item) => item.programId === payload.programId) ?? null;
};

const isProgramSoldOut = (remainingSeatsLabel: string | undefined) => {
  return typeof remainingSeatsLabel === 'string' && remainingSeatsLabel.includes('0명');
};

const resolveCatalogStatus = (data: ProgramDetailPageResponse): ProgramCatalogStatus => {
  if (data.catalogStatus) {
    return data.catalogStatus;
  }

  return isProgramSoldOut(data.remainingSeatsLabel) ? 'FULL' : 'OPEN';
};

const buildDefaultApplicationStatusLabel = (
  catalogStatus: ProgramCatalogStatus,
  remainingSeatsLabel: string | undefined,
) => {
  switch (catalogStatus) {
    case 'OPEN':
      return remainingSeatsLabel ?? '신청 가능';
    case 'SCHEDULED':
      return '모집 예정';
    case 'STARTED':
      return '운영 중';
    case 'CLOSED':
      return '모집 종료';
    case 'FULL':
      return '정원 마감';
  }
};

const buildDefaultApplicationStatusDescription = (
  catalogStatus: ProgramCatalogStatus,
  registrationPeriodLabel: string,
) => {
  switch (catalogStatus) {
    case 'OPEN':
      return '지금 바로 장바구니 또는 결제로 이동할 수 있습니다.';
    case 'SCHEDULED':
      return `${registrationPeriodLabel} 일정에 맞춰 모집이 열립니다.`;
    case 'STARTED':
      return '이미 시작한 운영 중 과정으로 신청이 마감되었습니다.';
    case 'CLOSED':
      return '모집 기간이 종료되어 현재는 신청할 수 없습니다.';
    case 'FULL':
      return '정원이 모두 마감되었습니다. 결원이 생기면 문자 알림을 받을 수 있습니다.';
  }
};

const buildAvailabilityActionLabel = (catalogStatus: ProgramCatalogStatus) => {
  switch (catalogStatus) {
    case 'SCHEDULED':
      return '모집 예정';
    case 'STARTED':
    case 'CLOSED':
      return '신청 마감';
    case 'FULL':
      return '알림 받기';
    case 'OPEN':
      return '수강 신청';
  }
};

const resolveProgramAvailability = (data: ProgramDetailPageResponse) => {
  const catalogStatus = resolveCatalogStatus(data);
  const enrollmentAvailable = data.enrollmentAvailable ?? catalogStatus === 'OPEN';
  const availabilityAlertAvailable = data.availabilityAlertAvailable ?? catalogStatus === 'FULL';

  return {
    actionKind: enrollmentAvailable
      ? ('ENROLL' as const)
      : availabilityAlertAvailable
        ? ('ALERT' as const)
        : ('DISABLED' as const),
    actionLabel: buildAvailabilityActionLabel(catalogStatus),
    statusDescription:
      data.applicationStatusDescription ??
      buildDefaultApplicationStatusDescription(catalogStatus, data.registrationPeriodLabel),
    statusLabel:
      data.applicationStatusLabel ??
      buildDefaultApplicationStatusLabel(catalogStatus, data.remainingSeatsLabel),
  };
};

const addSubscribedProgramId = (
  current: ProgramAvailabilityAlertStatusResponse | undefined,
  programId: number,
): ProgramAvailabilityAlertStatusResponse => {
  const subscribedProgramIds = new Set(current?.subscribedProgramIds ?? []);
  subscribedProgramIds.add(programId);

  return {
    subscribedProgramIds: [...subscribedProgramIds].sort((left, right) => left - right),
  };
};

const ProgramPageDetail = ({ data }: ProgramPageDetailProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const selectSingleCartItem = useCartSelectionStore((state) => state.selectSingleItem);
  const showToast = useToastStore((state) => state.showToast);
  const cartScope = resolveCartQueryScope(isAuthenticated);
  const programId =
    typeof data.programId === 'number' && data.programId > 0 ? data.programId : null;
  const availability = resolveProgramAvailability(data);
  const viewModel = useProgramPageDetailViewModel(data);
  const {
    activeSectionId,
    discountedPriceAmount,
    handleReviewCarouselScroll,
    handleTabClick,
    heroInfoPills,
    isQnaTabOpen,
    openCurriculumRows,
    openFaqId,
    originalPriceAmount,
    reviewCarouselRef,
    reviewSortOrder,
    sectionRefHandlers,
    setOpenFaqId,
    setReviewSortOrder,
    sortedReviews,
    toggleCurriculumRow,
    totalPriceLabel,
    visiblePreviewReviewIds,
  } = viewModel;

  const addToCartMutation = useMutation({
    mutationFn: addMyCartItem,
  });
  const alertStatusQuery = useProgramAvailabilityAlertStatusQuery(
    programId === null ? [] : [programId],
  );
  const subscribeAlertMutation = useMutation({
    mutationFn: subscribeMyProgramAvailabilityAlert,
  });
  const isAlertSubscribed =
    programId !== null && (alertStatusQuery.data?.subscribedProgramIds ?? []).includes(programId);

  const handleAddToCart = () => {
    const payload = buildAddToCartPayload(data, discountedPriceAmount, originalPriceAmount);

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
    const payload = buildAddToCartPayload(data, discountedPriceAmount, originalPriceAmount);

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

  const handleRequestAvailabilityAlert = () => {
    if (!isAuthenticated) {
      void navigate(routePaths.login);
      return;
    }

    if (programId === null) {
      showToast({
        message: '알림을 신청할 과정 정보를 찾지 못했습니다.',
        variant: 'error',
      });
      return;
    }

    subscribeAlertMutation.mutate(programId, {
      onError: (error: unknown) => {
        showToast({
          message:
            error instanceof Error
              ? error.message
              : '알림 신청을 처리하지 못했습니다. 다시 시도해 주세요.',
          variant: 'error',
        });
      },
      onSuccess: () => {
        queryClient.setQueryData<ProgramAvailabilityAlertStatusResponse>(
          programAvailabilityAlertStatusQueryKey([programId]),
          (current) => addSubscribedProgramId(current, programId),
        );
        showToast({
          message: '마감 해제 알림을 신청했습니다.',
          variant: 'success',
        });
      },
    });
  };

  return (
    <div className={styles['page']}>
      <ProgramPageDetailHero data={data} heroInfoPills={heroInfoPills} />

      <div className={styles['detailShell']}>
        <div className={styles['contentLayout']}>
          <ProgramPageDetailMainContent
            activeSectionId={activeSectionId}
            data={data}
            handleReviewCarouselScroll={handleReviewCarouselScroll}
            handleTabClick={handleTabClick}
            isQnaTabOpen={isQnaTabOpen}
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
            originalPriceAmount={originalPriceAmount}
            totalPriceLabel={totalPriceLabel}
            handleRequestAvailabilityAlert={handleRequestAvailabilityAlert}
            handleAddToCart={handleAddToCart}
            handleEnrollNow={handleEnrollNowClick}
            isAlertPending={subscribeAlertMutation.isPending}
            isAlertSubscribed={isAlertSubscribed}
            isAuthenticated={isAuthenticated}
            isEnrollingNow={addToCartMutation.isPending}
            isAddingToCart={addToCartMutation.isPending}
            availabilityActionKind={availability.actionKind}
            availabilityActionLabel={availability.actionLabel}
            availabilityStatusDescription={availability.statusDescription}
            availabilityStatusLabel={availability.statusLabel}
          />
        </div>
      </div>

      <div className={styles['mobileBottomBar']}>
        <button
          className={styles['mobileApplyActionLink']}
          disabled={
            availability.actionKind === 'ALERT'
              ? subscribeAlertMutation.isPending || isAlertSubscribed
              : availability.actionKind === 'DISABLED'
                ? true
                : addToCartMutation.isPending
          }
          onClick={
            availability.actionKind === 'ALERT'
              ? handleRequestAvailabilityAlert
              : availability.actionKind === 'ENROLL'
                ? handleEnrollNowClick
                : undefined
          }
          type='button'
        >
          {availability.actionKind === 'ALERT'
            ? !isAuthenticated
              ? '로그인 후 알림 받기'
              : isAlertSubscribed
                ? '알림 신청 완료'
                : subscribeAlertMutation.isPending
                  ? '신청 중...'
                  : '알림 받기'
            : availability.actionKind === 'DISABLED'
              ? availability.actionLabel
              : addToCartMutation.isPending
                ? '이동 중...'
                : '수강 신청'}
        </button>
      </div>
    </div>
  );
};

export default ProgramPageDetail;
