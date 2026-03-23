import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppliedCoupon, CartItem, CartSummary, UserCoupon } from '@/types/mypage';
import CartPage from '@/pages/CartPage/CartPage';
import { resetCartSelectionState } from '@/stores/useCartSelectionStore';

const cloneData = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const testCoupons: UserCoupon[] = [
  {
    appliesTo: 'ALL',
    code: 'ONLINE10',
    description: '온라인 집중 10%',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    expiresAt: '2026-04-05T14:59:59Z',
    id: 10,
    issuedAt: '2026-03-12T09:00:00Z',
    minimumOrderAmount: 150000,
    name: '온라인 집중 10%',
    usable: true,
    validFromAt: '2026-03-12T09:00:00Z',
  },
];

const initialCartItems: CartItem[] = [
  {
    addedAt: '2026-03-22T00:00:00Z',
    detailPath: '/programs/doctor-course/pocus/fast/2026-mar-apr',
    id: 55,
    instructorName: '장은희',
    originalPrice: 150000,
    payablePrice: 125000,
    programId: 1001,
    programType: 'OFFLINE',
    saleEndAt: null,
    salePrice: 125000,
    saleStartAt: null,
    thumbnailUrl: '/images/pocus.png',
    title: 'POCUS 워크숍',
  },
  {
    addedAt: '2026-03-22T00:00:00Z',
    detailPath: '/programs/doctor-course/abdominal/hands-on',
    id: 56,
    instructorName: '장은희',
    originalPrice: 250000,
    payablePrice: 198000,
    programId: 1002,
    programType: 'OFFLINE',
    saleEndAt: null,
    salePrice: 198000,
    saleStartAt: null,
    thumbnailUrl: '/images/abdominal.png',
    title: '복부초음파 오프라인 핸즈온',
  },
  {
    addedAt: '2026-03-22T00:00:00Z',
    detailPath: '/programs/doctor-course/echo/master',
    id: 57,
    instructorName: '장은희',
    originalPrice: 1030000,
    payablePrice: 978000,
    programId: 1003,
    programType: 'ONLINE',
    saleEndAt: null,
    salePrice: 978000,
    saleStartAt: null,
    thumbnailUrl: '/images/echo.png',
    title: '심장초음파 실전 마스터 클래스',
  },
];

const toAppliedCoupon = (coupon: UserCoupon, discountAmount: number): AppliedCoupon => ({
  code: coupon.code,
  discountAmount,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  id: coupon.id,
  name: coupon.name,
});

const buildCart = (items: CartItem[], appliedCoupon: AppliedCoupon | null = null): CartSummary => {
  const totalOriginalPrice = items.reduce((sum, item) => sum + item.originalPrice, 0);
  const subtotal = items.reduce((sum, item) => sum + item.payablePrice, 0);
  const couponDiscountAmount = appliedCoupon?.discountAmount ?? 0;

  return {
    appliedCoupon,
    itemCount: items.length,
    items,
    totalDiscountAmount: totalOriginalPrice - subtotal + couponDiscountAmount,
    totalOriginalPrice,
    totalPayablePrice: subtotal - couponDiscountAmount,
  };
};

let currentCart = buildCart(cloneData(initialCartItems));

vi.mock('@/api/mypage', () => ({
  applyMyCartCoupon: vi.fn(async (couponCode: string) => {
    const coupon = testCoupons.find((item) => item.code === couponCode) ?? null;
    const onlineItems = currentCart.items.filter((item) => item.programType === 'ONLINE');
    const onlineSubtotal = onlineItems.reduce((sum, item) => sum + item.payablePrice, 0);
    const discountAmount =
      coupon && coupon.discountType === 'PERCENTAGE'
        ? Math.floor((onlineSubtotal * coupon.discountValue) / 100)
        : 0;

    currentCart = buildCart(
      currentCart.items,
      coupon ? toAppliedCoupon(coupon, discountAmount) : null,
    );

    return currentCart;
  }),
  clearMyCartCoupon: vi.fn(async () => {
    currentCart = buildCart(currentCart.items);
    return currentCart;
  }),
  fetchMyApplicationSummary: vi.fn(),
  fetchMyCart: vi.fn(async () => currentCart),
  fetchMyCoupons: vi.fn(async () => testCoupons),
  fetchMyEnrollmentDetail: vi.fn(),
  fetchMyEnrollments: vi.fn(),
  fetchMyLearningPlayerSnapshot: vi.fn(),
  fetchMyProfile: vi.fn(),
  fetchMyRefunds: vi.fn(),
  removeMyCartItem: vi.fn(async (cartItemId: number) => {
    currentCart = buildCart(
      currentCart.items.filter((item) => item.id !== cartItemId),
      currentCart.appliedCoupon,
    );
    return currentCart;
  }),
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
};

const renderCartPage = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  resetCartSelectionState();
  window.localStorage.clear();
});

beforeEach(() => {
  currentCart = buildCart(cloneData(initialCartItems));
  resetCartSelectionState();
  window.localStorage.clear();
});

describe('CartPage', () => {
  it('renders each cart item title as a lecture detail link', async () => {
    renderCartPage();

    const lectureLink = await screen.findByRole('link', { name: 'POCUS 워크숍' });
    const thumbnail = screen.getByRole('img', { name: 'POCUS 워크숍 대표 이미지' });

    expect(lectureLink).toHaveAttribute('href', '/programs/doctor-course/pocus/fast/2026-mar-apr');
    expect(thumbnail).toHaveAttribute('src');
  });

  it('removes a cart item when the delete action is clicked', async () => {
    renderCartPage();

    expect(await screen.findByText('POCUS 워크숍')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0] as HTMLButtonElement);

    expect(await screen.findByText('심장초음파 실전 마스터 클래스')).toBeInTheDocument();
    expect(screen.queryByText('POCUS 워크숍')).not.toBeInTheDocument();
  });

  it('updates the total when a cart item is unchecked and a coupon is changed', async () => {
    renderCartPage();

    expect(await screen.findByText('1,301,000원')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '복부초음파 오프라인 핸즈온 선택' }));

    expect(await screen.findByText('1,103,000원')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '쿠폰 선택' }));
    fireEvent.click(screen.getByRole('option', { name: /온라인 집중 10%/ }));

    expect(await screen.findByText('992,700원')).toBeInTheDocument();
  });
});
