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

// ============================================
// DASHBOARD
// ============================================

export interface DashboardStats {
  kpis: {
    todayOrders: number;
    ordersChange: number;
    pendingOrders: number;
    lowStockItems: number;
    revenueUsd: number;
    revenueKhr: number;
    revenueChange: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    customer: string;
    phone: string;
    total: number;
    status: OrderStatus;
    channel: OrderChannel;
    createdAt: string;
    items: number;
  }[];
  chartData: {
    day: string;
    date: string;
    orders: number;
    revenue: number;
  }[];
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchAPI<DashboardStats>("/api/dashboard"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ============================================
// PROMOTIONS
// ============================================

export interface Promotion {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export function usePromotions(isActive?: boolean) {
  const params = isActive !== undefined ? `?isActive=${isActive}` : "";
  return useQuery({
    queryKey: ["promotions", isActive],
    queryFn: () => fetchAPI<{ promotions: Promotion[] }>(`/api/promotions${params}`),
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Promotion>) =>
      fetchAPI<Promotion>("/api/promotions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Promotion> & { id: string }) =>
      fetchAPI<Promotion>("/api/promotions", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/promotions?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

// ============================================
// CMS CONTENT
// ============================================

export type CMSContentType = "PAGE" | "BLOG" | "BANNER" | "FAQ";
export type CMSContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface CMSContent {
  id: string;
  slug: string;
  titleEn: string;
  titleKh: string;
  contentEn: string;
  contentKh: string;
  type: CMSContentType;
  status: CMSContentStatus;
  createdAt: string;
  updatedAt: string;
}

export function useCMSContent(type?: CMSContentType) {
  const params = type ? `?type=${type}` : "";
  return useQuery({
    queryKey: ["cms", type],
    queryFn: () => fetchAPI<{ contents: CMSContent[] }>(`/api/cms${params}`),
  });
}

export function useCreateCMSContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CMSContent>) =>
      fetchAPI<CMSContent>("/api/cms", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms"] });
    },
  });
}

export function useUpdateCMSContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CMSContent> & { id: string }) =>
      fetchAPI<CMSContent>("/api/cms", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms"] });
    },
  });
}

export function useDeleteCMSContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/cms?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms"] });
    },
  });
}

// ============================================
// USERS & ROLES
// ============================================

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, string[]>;
  _count?: { users: number };
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  isActive: boolean;
  role?: Role;
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchAPI<{ users: User[] }>("/api/users"),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => fetchAPI<{ roles: Role[] }>("/api/roles"),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string; roleId: string }) =>
      fetchAPI<User>("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<User> & { id: string; password?: string }) =>
      fetchAPI<User>("/api/users", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/users?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; permissions: Record<string, string[]> }) =>
      fetchAPI<Role>("/api/roles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Role> & { id: string }) =>
      fetchAPI<Role>("/api/roles", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/roles?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

// ============================================
// SHOP CUSTOMIZATION (White Label)
// ============================================

export type SectionType = "hero" | "promotions" | "products" | "footer";

export interface HeroConfig {
  mediaType: "image" | "video";
  mediaUrl: string;
  overlayOpacity: number;
  overlayColor: string;
  titleEn: string;
  titleKh: string;
  subtitleEn: string;
  subtitleKh: string;
  ctaTextEn: string;
  ctaTextKh: string;
  ctaLink: string;
  ctaStyle: "primary" | "outline" | "ghost";
  textAlignment: "left" | "center" | "right";
  height: "small" | "medium" | "large" | "full";
}

export interface PromotionCard {
  id: string;
  imageUrl: string;
  titleEn: string;
  titleKh: string;
  descriptionEn: string;
  descriptionKh: string;
  link: string;
  badge?: string;
}

export interface PromotionsConfig {
  titleEn: string;
  titleKh: string;
  layout: "grid" | "carousel";
  columns: 2 | 3 | 4;
  cards: PromotionCard[];
}

export interface ProductsConfig {
  titleEn: string;
  titleKh: string;
  displayType: "featured" | "new_arrivals" | "bestsellers" | "category";
  categoryId?: string;
  productIds?: string[];
  layout: "grid" | "carousel";
  columns: 2 | 3 | 4;
  maxProducts: number;
  showPrice: boolean;
  showStock: boolean;
  showAddToCart: boolean;
}

export interface FooterColumn {
  id: string;
  titleEn: string;
  titleKh: string;
  type: "links" | "contact" | "social" | "text";
  links?: { textEn: string; textKh: string; url: string }[];
  content?: { en: string; kh: string };
}

export interface FooterConfig {
  backgroundColor: string;
  textColor: string;
  columns: FooterColumn[];
  copyrightEn: string;
  copyrightKh: string;
  showSocialIcons: boolean;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    telegram?: string;
    tiktok?: string;
  };
}

export interface ShopSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  config: HeroConfig | PromotionsConfig | ProductsConfig | FooterConfig;
}

export interface ShopTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
}

export interface ShopCustomizationConfig {
  theme: ShopTheme;
  sections: ShopSection[];
}

export function useShopCustomization() {
  return useQuery({
    queryKey: ["shop-customization"],
    queryFn: () =>
      fetchAPI<{ config: ShopCustomizationConfig; version: number; updatedAt?: string }>(
        "/api/customizer"
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateShopCustomization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { config: ShopCustomizationConfig }) =>
      fetchAPI<{ success: boolean; version: number; updatedAt: string }>("/api/customizer", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-customization"] });
    },
  });
}
