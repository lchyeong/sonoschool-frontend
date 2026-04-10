import { useMemo } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addMyCartItem } from '@/api/mypage';
import {
  subscribeMyProgramAvailabilityAlert,
  type ProgramAvailabilityAlertStatusResponse,
} from '@/api/programAvailabilityAlerts';
import { myCartQueryKey } from '@/query/useMyPageQueries';
import {
  programAvailabilityAlertStatusQueryKey,
  useProgramAvailabilityAlertStatusQuery,
} from '@/query/useProgramAvailabilityAlertStatusQuery';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { AddToCartPayload, ProgramType } from '@/types/mypage';
import type { ProgramLectureCard } from '@/types/programCatalog';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';

const parsePriceAmount = (priceLabel: string) => {
  const numericValue = Number.parseInt(priceLabel.replaceAll(/[^0-9]/g, ''), 10);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const inferProgramTypeFromLabel = (formatLabel: string): ProgramType => {
  if (formatLabel.includes('문제')) {
    return 'PROBLEM_SOLVING';
  }
  if (formatLabel.includes('하이브리드') || formatLabel.includes('실습')) {
    return 'HYBRID';
  }
  if (formatLabel.includes('오프라인')) {
    return 'OFFLINE';
  }
  return 'ONLINE';
};

const buildAddToCartPayload = (lecture: ProgramLectureCard): AddToCartPayload => {
  if (typeof lecture.programId !== 'number' || lecture.programId <= 0) {
    throw new Error('장바구니에 담을 과정 정보를 찾지 못했습니다.');
  }

  const priceAmount = parsePriceAmount(lecture.priceLabel);

  return {
    instructorName: '장은희',
    originalPrice: priceAmount,
    payablePrice: priceAmount,
    programId: lecture.programId,
    programType: inferProgramTypeFromLabel(lecture.formatLabel),
    salePrice: null,
    sourcePath: lecture.to,
    thumbnailUrl: lecture.thumbnailSrc,
    title: lecture.title,
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

export const useProgramCatalogActions = (lectures: readonly ProgramLectureCard[]) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const showToast = useToastStore((state) => state.showToast);
  const cartScope = resolveCartQueryScope(isAuthenticated);
  const programIds = useMemo(() => {
    return Array.from(
      new Set(
        lectures
          .map((lecture) => lecture.programId)
          .filter((programId): programId is number => typeof programId === 'number' && programId > 0),
      ),
    ).sort((left, right) => left - right);
  }, [lectures]);

  const alertStatusQuery = useProgramAvailabilityAlertStatusQuery(programIds);
  const addToCartMutation = useMutation({
    mutationFn: addMyCartItem,
  });
  const subscribeAlertMutation = useMutation({
    mutationFn: subscribeMyProgramAvailabilityAlert,
  });
  const subscribedProgramIds = useMemo(() => {
    return new Set(alertStatusQuery.data?.subscribedProgramIds ?? []);
  }, [alertStatusQuery.data]);

  const handleAddToCart = (lecture: ProgramLectureCard) => {
    let payload: AddToCartPayload;

    try {
      payload = buildAddToCartPayload(lecture);
    } catch (error: unknown) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : '장바구니에 담을 과정 정보를 준비하지 못했습니다.',
        variant: 'error',
      });
      return;
    }

    addToCartMutation.mutate(payload, {
      onError: (error: unknown) => {
        const message =
          error instanceof Error ? error.message : '장바구니에 담지 못했습니다. 다시 시도해 주세요.';

        showToast({
          message,
          variant: message.includes('이미 장바구니에 담긴 강의') ? 'info' : 'error',
        });
      },
      onSuccess: (cart) => {
        queryClient.setQueryData(myCartQueryKey(cartScope), cart);
        showToast({
          message: '장바구니에 담았습니다.',
          variant: 'success',
        });
      },
    });
  };

  const handleSubscribeAlert = (lecture: ProgramLectureCard) => {
    if (typeof lecture.programId !== 'number' || lecture.programId <= 0) {
      showToast({
        message: '알림을 신청할 과정 정보를 찾지 못했습니다.',
        variant: 'error',
      });
      return;
    }

    subscribeAlertMutation.mutate(lecture.programId, {
      onError: (error: unknown) => {
        showToast({
          message:
            error instanceof Error ? error.message : '알림 신청을 처리하지 못했습니다. 다시 시도해 주세요.',
          variant: 'error',
        });
      },
      onSuccess: () => {
        queryClient.setQueryData<ProgramAvailabilityAlertStatusResponse>(
          programAvailabilityAlertStatusQueryKey(programIds),
          (current) => addSubscribedProgramId(current, lecture.programId as number),
        );
        showToast({
          message: '마감 해제 알림을 신청했습니다.',
          variant: 'success',
        });
      },
    });
  };

  return {
    handleAddToCart,
    handleSubscribeAlert,
    isAddToCartPending: (programId: number | undefined) => {
      return Boolean(
        addToCartMutation.isPending &&
          typeof programId === 'number' &&
          addToCartMutation.variables?.programId === programId,
      );
    },
    isAlertPending: (programId: number | undefined) => {
      return Boolean(
        subscribeAlertMutation.isPending &&
          typeof programId === 'number' &&
          subscribeAlertMutation.variables === programId,
      );
    },
    isAuthenticated,
    subscribedProgramIds,
  };
};
