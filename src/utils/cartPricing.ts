import type { CartItem, CartSummary } from '@/types/mypage';
import { isOnlineProgramType } from '@/utils/programType';

export interface SelectedCartPricing {
  selectedItems: CartItem[];
  itemCount: number;
  onlineItemCount: number;
  offlineItemCount: number;
  totalOriginalPrice: number;
  itemDiscountAmount: number;
  totalPayablePrice: number;
}

export const calculateSelectedCartPricing = (
  cart: CartSummary | null | undefined,
  selectedItemIds: number[],
): SelectedCartPricing => {
  const selectedItems = (cart?.items ?? []).filter((item) => selectedItemIds.includes(item.id));
  const totalOriginalPrice = selectedItems.reduce((total, item) => total + item.originalPrice, 0);
  const totalPayablePrice = selectedItems.reduce((total, item) => total + item.payablePrice, 0);

  return {
    selectedItems,
    itemCount: selectedItems.length,
    onlineItemCount: selectedItems.filter((item) => isOnlineProgramType(item.programType)).length,
    offlineItemCount: selectedItems.filter((item) => item.programType === 'OFFLINE').length,
    totalOriginalPrice,
    itemDiscountAmount: totalOriginalPrice - totalPayablePrice,
    totalPayablePrice,
  };
};
