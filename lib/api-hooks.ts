"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Product {
  id: string;
  nameEn: string;
  nameKh: string;
  descriptionEn?: string;
  descriptionKh?: string;
  priceUsd: number;
  priceKhr: number;
  categoryId: string;
  sku: string;
  imageUrl?: string;
  images?: string[];
  isActive: boolean;
  category?: Category;
  inventory?: Inventory;
}

export interface Category {
  id: string;
  nameEn: string;
  nameKh: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  minLevel: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  totalUsd: number;
  totalKhr: number;
  currency: "USD" | "KHR";
  channel: OrderChannel;
  note?: string;
  createdAt: string;
  items?: OrderItem[];
  customer?: Customer;
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceUsd: number;
  priceKhr: number;
  product?: Product;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  currency: "USD" | "KHR";
  status: PaymentStatus;
  transactionId?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export type OrderStatus = "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
export type OrderChannel = "WEBSITE" | "TELEGRAM" | "MESSENGER" | "PHONE" | "WALK_IN";
export type PaymentMethod = "CASH" | "ABA_KHQR" | "WING" | "PAYWAY" | "BANK_TRANSFER";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

// Fetch helpers
async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return res.json();
}

// ============================================
// PRODUCTS
// ============================================

export function useProducts(categoryId?: string) {
  return useQuery({
    queryKey: ["products", categoryId],
    queryFn: () =>
      fetchAPI<{ products: Product[]; total: number }>(
        `/api/products${categoryId ? `?categoryId=${categoryId}` : ""}`
      ),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchAPI<Product>(`/api/products?id=${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      fetchAPI<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Product> & { id: string }) =>
      fetchAPI<Product>("/api/products", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/products?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============================================
// CATEGORIES
// ============================================

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchAPI<{ categories: Category[] }>("/api/categories"),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Category>) =>
      fetchAPI<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Category> & { id: string }) =>
      fetchAPI<Category>("/api/categories", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/categories?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

// ============================================
// ORDERS
// ============================================

export function useOrders(filters?: { status?: OrderStatus; dateFrom?: string; dateTo?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);

  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () =>
      fetchAPI<{ orders: Order[]; total: number }>(`/api/orders?${params.toString()}`),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchAPI<Order>(`/api/orders?id=${id}`),
    enabled: !!id,
  });
}

export interface CreateOrderInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: { productId: string; quantity: number }[];
  channel?: OrderChannel;
  currency?: "USD" | "KHR";
  note?: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderInput) =>
      fetchAPI<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      fetchAPI<Order>("/api/orders", {
        method: "PUT",
        body: JSON.stringify({ id, status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ============================================
// CUSTOMERS
// ============================================

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      fetchAPI<{ customers: Customer[]; total: number }>(
        `/api/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => fetchAPI<Customer>(`/api/customers?id=${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) =>
      fetchAPI<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Customer> & { id: string }) =>
      fetchAPI<Customer>("/api/customers", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// ============================================
// INVENTORY
// ============================================

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetchAPI<{ inventory: (Inventory & { product: Product })[] }>("/api/inventory"),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () =>
      fetchAPI<{ inventory: (Inventory & { product: Product })[] }>("/api/inventory?lowStock=true"),
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      adjustment,
    }: {
      productId: string;
      quantity?: number;
      adjustment?: number;
    }) =>
      fetchAPI<Inventory>("/api/inventory", {
        method: "PUT",
        body: JSON.stringify({ productId, quantity, adjustment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============================================
// SETTINGS
// ============================================

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchAPI<{ settings: Record<string, unknown> }>("/api/settings"),
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: () => fetchAPI<{ value: unknown }>(`/api/settings?key=${key}`),
    enabled: !!key,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      fetchAPI<{ success: boolean }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ============================================
// AUTH
// ============================================

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () =>
      fetchAPI<{
        authenticated: boolean;
        user?: { id: string; email: string; name: string; role: string };
      }>("/api/auth/session"),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      fetchAPI<{ user: { id: string; email: string; name: string; role: string } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(credentials),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchAPI<{ success: boolean }>("/api/auth/logout", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.clear();
    },
  });
}
