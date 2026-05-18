import { type FormEvent, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { addMyCartItem, fetchMyCart } from '@/api/mypage';
import {
  submitProgramReservationInquiry,
  type ProgramReservationInquiryPayload,
} from '@/api/programReservationInquiries';
import closeIconSrc from '@/assets/icons/lucide_x.svg';
import CartAddedModal from '@/components/cart/CartAddedModal/CartAddedModal';
import Modal from '@/components/overlay/Modal/Modal';
import { myCartQueryKey, useMyCartQuery, useMyEnrollmentsQuery } from '@/query/useMyPageQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartSelectionStore } from '@/stores/useCartSelectionStore';
import { useToastStore } from '@/stores/useToastStore';
import type { AddToCartPayload, CartItem, CartSummary, ProgramType } from '@/types/mypage';
import type { ProgramCatalogStatus, ProgramDetailPageResponse } from '@/types/programCatalog';
import { resolveCartQueryScope } from '@/utils/cartQueryScope';
import { blocksProgramCartAction } from '@/utils/enrollmentCartGuard';

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

interface ReservationInquiryFormValues {
  applicantName: string;
  phoneNumber: string;
  specialty: string;
}

interface ProgramReservationInquiryModalProps {
  defaultName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ReservationInquiryFormValues) => void;
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

const buildDefaultApplicationStatusLabel = (catalogStatus: ProgramCatalogStatus) => {
  switch (catalogStatus) {
    case 'OPEN':
      return '수강 가능';
    case 'SCHEDULED':
      return '모집 예정';
    case 'STARTED':
      return '과정 진행중';
    case 'CLOSED':
      return '모집 종료';
    case 'ENDED':
      return '과정 종료';
    case 'FULL':
      return '정원 마감';
  }
};

const isRemainingSeatsStatusLabel = (label: string) => {
  return /(?:잔여석|인원|남음|\d+\s*명)/.test(label);
};

const buildAvailabilityActionLabel = (catalogStatus: ProgramCatalogStatus) => {
  switch (catalogStatus) {
    case 'SCHEDULED':
      return '모집 예정';
    case 'STARTED':
    case 'CLOSED':
      return '신청 마감';
    case 'ENDED':
      return '과정 종료';
    case 'FULL':
      return '정원 마감';
    case 'OPEN':
      return '수강신청하기';
  }
};

const resolveProgramReservationAvailability = (data: ProgramDetailPageResponse) => {
  const catalogStatus = resolveCatalogStatus(data);
  const enrollmentAvailable = catalogStatus === 'OPEN' && data.enrollmentAvailable !== false;

  return {
    actionKind: enrollmentAvailable ? ('ENROLL' as const) : ('DISABLED' as const),
    actionLabel: buildAvailabilityActionLabel(catalogStatus),
    reservationInquiryAvailable: catalogStatus === 'OPEN',
    statusLabel:
      data.applicationStatusLabel && !isRemainingSeatsStatusLabel(data.applicationStatusLabel)
        ? data.applicationStatusLabel
        : buildDefaultApplicationStatusLabel(catalogStatus),
  };
};

const normalizePhoneNumber = (value: string) => value.replaceAll(/\D/g, '');

const ProgramReservationInquiryModal = ({
  defaultName,
  isSubmitting,
  onClose,
  onSubmit,
}: ProgramReservationInquiryModalProps) => {
  const [applicantName, setApplicantName] = useState(defaultName);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = applicantName.trim();
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const trimmedSpecialty = specialty.trim();

    if (!trimmedName) {
      setErrorMessage('이름을 입력해주세요.');
      return;
    }

    if (normalizedPhoneNumber.length < 10 || normalizedPhoneNumber.length > 11) {
      setErrorMessage('휴대폰번호를 숫자만 10~11자리로 입력해주세요.');
      return;
    }

    setErrorMessage(null);
    onSubmit({
      applicantName: trimmedName,
      phoneNumber: normalizedPhoneNumber,
      specialty: trimmedSpecialty,
    });
  };

  return (
    <Modal
      bodyClassName={styles['reservationModalBody']}
      closeButtonClassName={styles['reservationModalCloseButton']}
      closeButtonContent={<img alt='' aria-hidden='true' src={closeIconSrc} />}
      closeButtonLabel='예약 문의 닫기'
      headerClassName={styles['reservationModalHeader']}
      onClose={onClose}
      panelClassName={styles['reservationModalPanel']}
      title='예약 문의하기'
      titleClassName={styles['reservationModalTitle']}
    >
      <form className={styles['reservationForm']} onSubmit={handleSubmit}>
        <label className={styles['reservationField']}>
          <span className={styles['reservationFieldLabel']}>이름</span>
          <input
            autoComplete='name'
            className={styles['reservationInput']}
            onChange={(event) => {
              setApplicantName(event.target.value);
            }}
            placeholder='이름을 입력해주세요.'
            value={applicantName}
          />
        </label>

        <label className={styles['reservationField']}>
          <span className={styles['reservationFieldLabel']}>휴대폰번호</span>
          <input
            autoComplete='tel'
            className={styles['reservationInput']}
            inputMode='numeric'
            onChange={(event) => {
              setPhoneNumber(event.target.value);
            }}
            placeholder='- 없이 숫자만 입력해주세요.'
            value={phoneNumber}
          />
        </label>

        <label className={styles['reservationField']}>
          <span className={styles['reservationFieldLabel']}>전공분야</span>
          <input
            autoComplete='organization-title'
            className={styles['reservationInput']}
            onChange={(event) => {
              setSpecialty(event.target.value);
            }}
            placeholder='전공분야를 입력해주세요. (선택)'
            value={specialty}
          />
        </label>

        {errorMessage ? (
          <p className={styles['reservationError']} role='alert'>
            {errorMessage}
          </p>
        ) : null}

        <button className={styles['reservationSubmitButton']} disabled={isSubmitting} type='submit'>
          {isSubmitting ? '제출 중...' : '제출하기'}
        </button>

        <div className={styles['reservationNoticeBlock']}>
          <p className={styles['reservationNoticeTitle']}>유의사항</p>
          <ul className={styles['reservationNoticeList']}>
            <li>예약 문의 접수 후 담당자가 입력하신 휴대폰번호로 안내드립니다.</li>
            <li>접수 순서와 운영 일정에 따라 안내까지 시간이 걸릴 수 있습니다.</li>
          </ul>
        </div>
      </form>
    </Modal>
  );
};

const ProgramPageDetail = ({ data }: ProgramPageDetailProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const selectSingleCartItem = useCartSelectionStore((state) => state.selectSingleItem);
  const showToast = useToastStore((state) => state.showToast);
  const displayName = useAuthStore((state) => state.displayName);
  const [addedCartItem, setAddedCartItem] = useState<CartItem | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const availability = resolveProgramReservationAvailability(data);
  const viewModel = useProgramPageDetailViewModel(data);
  const sourcePath = data.breadcrumbItems.at(-1)?.to ?? routePaths.programs;
  const programId =
    typeof data.programId === 'number' && data.programId > 0
      ? data.programId
      : deriveProgramId(sourcePath);
  const cartScope = resolveCartQueryScope(isAuthenticated);
  const cartQuery = useMyCartQuery();
  const enrollmentsQuery = useMyEnrollmentsQuery(isAuthenticated && programId > 0);
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
    setAllCurriculumRowsOpen,
    setOpenFaqId,
    setReviewSortOrder,
    sortedReviews,
    toggleCurriculumRow,
    totalPriceLabel,
    visiblePreviewReviewIds,
  } = viewModel;
  const reservationInquiryMutation = useMutation({
    mutationFn: submitProgramReservationInquiry,
  });
  const addToCartMutation = useMutation({
    mutationFn: addMyCartItem,
  });
  const cartPayload = buildAddToCartPayload(data, discountedPriceAmount, originalPriceAmount);
  const isCartAdded = (cartQuery.data?.items ?? []).some((item) => {
    return item.programId === cartPayload.programId;
  });
  const isEnrollmentOwned = useMemo(() => {
    if (programId <= 0) {
      return false;
    }

    return (enrollmentsQuery.data ?? []).some((enrollment) => {
      return enrollment.programId === programId && blocksProgramCartAction(enrollment);
    });
  }, [enrollmentsQuery.data, programId]);

  const handleAddToCart = () => {
    const payload = cartPayload;

    if (isEnrollmentOwned) {
      showToast({
        message: '이미 수강 중인 과정입니다.',
        variant: 'info',
      });
      return;
    }

    if (isCartAdded) {
      void navigate(routePaths.cart);
      return;
    }

    void addToCartMutation.mutateAsync(payload).then(
      (cart) => {
        queryClient.setQueryData(myCartQueryKey(cartScope), cart);

        showToast({
          message: '장바구니에 담았습니다.',
          variant: 'success',
        });

        setAddedCartItem(findCartItemByPayload(cart, payload));
      },
      (error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : '장바구니에 담지 못했습니다. 다시 시도해 주세요.';

        if (message.includes('이미 장바구니에 담긴 강의')) {
          void queryClient
            .fetchQuery({
              queryFn: fetchMyCart,
              queryKey: myCartQueryKey(cartScope),
            })
            .then((cart) => {
              setAddedCartItem(findCartItemByPayload(cart, payload));
            })
            .catch(() => {
              return undefined;
            });
        }

        showToast({
          message,
          variant: message.includes('이미 장바구니에 담긴 강의') ? 'info' : 'error',
        });
      },
    );
  };

  const handleEnrollNow = async () => {
    const payload = cartPayload;

    if (isEnrollmentOwned) {
      showToast({
        message: '이미 수강 중인 과정입니다.',
        variant: 'info',
      });
      return;
    }

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

  const handleRequestReservationInquiry = () => {
    setIsReservationModalOpen(true);
  };

  const handleSubmitReservationInquiry = (values: ReservationInquiryFormValues) => {
    const payload: ProgramReservationInquiryPayload = {
      applicantName: values.applicantName,
      phoneNumber: values.phoneNumber,
      programId,
      programTitle: data.title,
      sourcePath,
      specialty: values.specialty,
    };

    reservationInquiryMutation.mutate(payload, {
      onError: (error: unknown) => {
        showToast({
          message:
            error instanceof Error
              ? error.message
              : '예약 문의를 접수하지 못했습니다. 다시 시도해 주세요.',
          variant: 'error',
        });
      },
      onSuccess: () => {
        setIsReservationModalOpen(false);
        showToast({
          message: '예약 문의가 접수되었습니다.',
          variant: 'success',
        });
      },
    });
  };

  return (
    <div className={styles['page']}>
      <ProgramPageDetailHero data={data} heroInfoPills={heroInfoPills} />

      <div className={styles['detailShell']}>
        <div
          className={
            isQnaTabOpen
              ? `${styles['contentLayout']} ${styles['contentLayoutFull']}`
              : styles['contentLayout']
          }
        >
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
            setAllCurriculumRowsOpen={setAllCurriculumRowsOpen}
            setOpenFaqId={setOpenFaqId}
            setReviewSortOrder={setReviewSortOrder}
            sortedReviews={sortedReviews}
            toggleCurriculumRow={toggleCurriculumRow}
            visiblePreviewReviewIds={visiblePreviewReviewIds}
          />
          {!isQnaTabOpen ? (
            <ProgramPageDetailSidebar
              availabilityActionKind={availability.actionKind}
              availabilityActionLabel={availability.actionLabel}
              availabilityStatusLabel={availability.statusLabel}
              data={data}
              discountedPriceAmount={discountedPriceAmount}
              handleAddToCart={handleAddToCart}
              handleEnrollNow={handleEnrollNowClick}
              handleRequestReservationInquiry={handleRequestReservationInquiry}
              isAddingToCart={addToCartMutation.isPending}
              isCartAdded={isCartAdded}
              isEnrollmentOwned={isEnrollmentOwned}
              isEnrollingNow={addToCartMutation.isPending}
              isReservationInquiryAvailable={availability.reservationInquiryAvailable}
              isReservationPending={reservationInquiryMutation.isPending}
              originalPriceAmount={originalPriceAmount}
              totalPriceLabel={totalPriceLabel}
            />
          ) : null}
        </div>
      </div>

      {!isQnaTabOpen ? (
        <div className={styles['mobileBottomBar']}>
          {availability.actionKind === 'ENROLL' ? (
            <button
              className={
                isCartAdded
                  ? `${styles['mobileCartActionLink']} ${styles['mobileCartActionLinkAdded']}`
                  : styles['mobileCartActionLink']
              }
              disabled={isEnrollmentOwned || addToCartMutation.isPending}
              onClick={handleAddToCart}
              type='button'
            >
              {isCartAdded
                ? '장바구니 보기'
                : addToCartMutation.isPending
                  ? '담는 중...'
                  : '장바구니 담기'}
            </button>
          ) : null}
          {availability.reservationInquiryAvailable ? (
            <button
              className={styles['mobileReservationActionLink']}
              disabled={reservationInquiryMutation.isPending}
              onClick={handleRequestReservationInquiry}
              type='button'
            >
              {reservationInquiryMutation.isPending ? '접수 중...' : '예약하기'}
            </button>
          ) : null}
          <button
            className={styles['mobileApplyActionLink']}
            disabled={
              availability.actionKind === 'DISABLED' ||
              isEnrollmentOwned ||
              addToCartMutation.isPending
            }
            onClick={availability.actionKind === 'ENROLL' ? handleEnrollNowClick : undefined}
            type='button'
          >
            {availability.actionKind === 'DISABLED'
              ? availability.actionLabel
              : isEnrollmentOwned
                ? '수강 중'
                : addToCartMutation.isPending
                  ? '이동 중...'
                  : '수강신청하기'}
          </button>
        </div>
      ) : null}

      {addedCartItem ? (
        <CartAddedModal
          item={addedCartItem}
          onClose={() => {
            setAddedCartItem(null);
          }}
        />
      ) : null}

      {isReservationModalOpen ? (
        <ProgramReservationInquiryModal
          defaultName={displayName}
          isSubmitting={reservationInquiryMutation.isPending}
          onClose={() => {
            if (!reservationInquiryMutation.isPending) {
              setIsReservationModalOpen(false);
            }
          }}
          onSubmit={handleSubmitReservationInquiry}
        />
      ) : null}
    </div>
  );
};

export default ProgramPageDetail;
