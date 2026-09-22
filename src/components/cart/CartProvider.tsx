"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCartCount,
  getCartSummaryAction,
  type CartLineItem,
} from "@/app/actions/cart";
import type { OrderTotals } from "@/lib/service-fee";
import { CartAddedToast } from "./CartAddedToast";
import { CartDrawer } from "./CartDrawer";
import { FloatingCartButton } from "./FloatingCartButton";

const emptyTotals: OrderTotals = {
  subtotalTwd: 0,
  serviceFeePercent: 5,
  serviceFeeTwd: 0,
  totalTwd: 0,
};

type CartContextValue = {
  count: number;
  items: CartLineItem[];
  totals: OrderTotals;
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  showAddedToast: () => void;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

export function CartProvider({
  children,
  canShop,
}: {
  children: React.ReactNode;
  canShop: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [totals, setTotals] = useState<OrderTotals>(emptyTotals);
  const [count, setCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!canShop) {
      setItems([]);
      setTotals(emptyTotals);
      setCount(0);
      return;
    }
    const [summary, nextCount] = await Promise.all([getCartSummaryAction(), getCartCount()]);
    setItems(summary?.items ?? []);
    setTotals(summary?.totals ?? emptyTotals);
    setCount(nextCount);
  }, [canShop]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [toastVisible]);

  const closeDrawer = useCallback(() => setOpen(false), []);

  const openDrawer = useCallback(() => {
    setToastVisible(false);
    setOpen(true);
  }, []);

  const showAddedToast = useCallback(() => {
    setOpen(false);
    setToastVisible(true);
  }, []);

  const value = useMemo(
    () => ({
      count,
      items,
      totals,
      open,
      openDrawer,
      closeDrawer,
      showAddedToast,
      refreshCart,
    }),
    [count, items, totals, open, openDrawer, closeDrawer, showAddedToast, refreshCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {canShop ? (
        <>
          <FloatingCartButton
            count={count}
            onClick={() => {
              void refreshCart().then(() => openDrawer());
            }}
          />
          <CartAddedToast
            visible={toastVisible}
            itemCount={count}
            onContinue={() => setToastVisible(false)}
            onViewCart={() => {
              void refreshCart().then(() => openDrawer());
            }}
          />
          <CartDrawer
            open={open}
            onClose={closeDrawer}
            items={items}
            totals={totals}
            onRefresh={refreshCart}
          />
        </>
      ) : null}
    </CartContext.Provider>
  );
}
