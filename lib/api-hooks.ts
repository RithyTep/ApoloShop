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
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) =>
      fetchAPI<{ success: boolean; softDeleted?: boolean; hasOrders?: boolean; forceDeleted?: boolean }>(
        `/api/products?id=${id}${force ? "&force=true" : ""}`,
        { method: "DELETE" }
      ),
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

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  displayName: string;
  description?: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  permissions: Record<string, string[]>;
  permissionNames?: string[];
  isSystem?: boolean;
  rolePermissions?: RolePermission[];
  _count?: { users: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  isActive: boolean;
  role?: Role;
  createdAt: string;
  lastLoginAt?: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchAPI<{ users: User[] }>("/api/users"),
  });
}

export function useRoles(options?: { includePermissions?: boolean }) {
  const params = new URLSearchParams();
  if (options?.includePermissions) {
    params.set("includePermissions", "true");
  }
  return useQuery({
    queryKey: ["roles", options],
    queryFn: () => fetchAPI<{ roles: Role[] }>(`/api/roles?${params.toString()}`),
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
    mutationFn: (data: { name: string; displayName?: string; description?: string; permissions: Record<string, string[]> }) =>
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
    mutationFn: ({ id, ...data }: Partial<Role> & { id: string; permissionNames?: string[] }) =>
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

export function useSeedRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchAPI<{ success: boolean; created: string[]; updated: string[] }>("/api/roles", {
        method: "POST",
        body: JSON.stringify({ seed: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

// ============================================
// PERMISSIONS (RBAC)
// ============================================

export interface PermissionsResponse {
  permissions: Permission[];
  byResource: Record<string, Permission[]>;
  resources: string[];
  seeded: boolean;
}

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => fetchAPI<PermissionsResponse>("/api/permissions"),
  });
}

export function useSeedPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchAPI<{ success: boolean; created: string[]; existing: string[] }>("/api/permissions", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
}

// ============================================
// SHOP CUSTOMIZATION (White Label)
// ============================================

export type SectionType = "hero" | "promotions" | "products" | "footer" | "gallery" | "about" | "team" | "testimonials" | "features" | "faq";

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

// Announcement Banner
export interface AnnouncementConfig {
  enabled: boolean;
  textEn: string;
  textKh: string;
  linkUrl?: string;
  linkTextEn?: string;
  linkTextKh?: string;
  backgroundColor: string;
  textColor: string;
  isDismissible: boolean;
  showOnPages: "all" | "home" | "checkout";
  startDate?: string;
  endDate?: string;
}

// Gallery Section
export interface GalleryImage {
  id: string;
  url: string;
  captionEn?: string;
  captionKh?: string;
}

export interface GalleryConfig {
  titleEn: string;
  titleKh: string;
  layout: "grid" | "masonry" | "carousel";
  columns: 2 | 3 | 4;
  images: GalleryImage[];
}

// About Section
export interface AboutConfig {
  titleEn: string;
  titleKh: string;
  contentEn: string;
  contentKh: string;
  imageUrl?: string;
  imagePosition: "left" | "right" | "top" | "bottom";
}

// Team Section
export interface TeamMember {
  id: string;
  name: string;
  roleEn: string;
  roleKh: string;
  imageUrl?: string;
}

export interface TeamConfig {
  titleEn: string;
  titleKh: string;
  members: TeamMember[];
}

// Testimonials Section
export interface Testimonial {
  id: string;
  name: string;
  roleEn: string;
  roleKh: string;
  contentEn: string;
  contentKh: string;
  imageUrl?: string;
  rating: number;
}

export interface TestimonialsConfig {
  titleEn: string;
  titleKh: string;
  layout: "grid" | "carousel";
  columns: 2 | 3;
  testimonials: Testimonial[];
}

// Features Section
export interface Feature {
  id: string;
  icon: string;
  titleEn: string;
  titleKh: string;
  descriptionEn: string;
  descriptionKh: string;
}

export interface FeaturesConfig {
  titleEn: string;
  titleKh: string;
  subtitleEn: string;
  subtitleKh: string;
  layout: "grid" | "list";
  columns: 2 | 3 | 4;
  features: Feature[];
}

// FAQ Section
export interface FAQItem {
  id: string;
  questionEn: string;
  questionKh: string;
  answerEn: string;
  answerKh: string;
}

export interface FAQConfig {
  titleEn: string;
  titleKh: string;
  subtitleEn: string;
  subtitleKh: string;
  items: FAQItem[];
}

export interface ShopSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  config: HeroConfig | PromotionsConfig | ProductsConfig | FooterConfig | GalleryConfig | AboutConfig | TeamConfig | TestimonialsConfig | FeaturesConfig | FAQConfig;
}

export interface ShopTheme {
  shopName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
}

export interface ShopCustomizationConfig {
  theme: ShopTheme;
  sections: ShopSection[];
  announcement?: AnnouncementConfig;
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

// ============================================
// BUSINESS HOURS
// ============================================

export interface BusinessHoursDay {
  id?: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isOpen: boolean;
}

export interface Holiday {
  id: string;
  date: string;
  nameEn: string;
  nameKh: string;
  isFullDay: boolean;
  openTime: string | null;
  closeTime: string | null;
  createdAt?: string;
}

export interface StoreStatus {
  isOpen: boolean;
  reason: "regular" | "holiday" | "holiday_hours";
  hours?: {
    openTime: string | null;
    closeTime: string | null;
    isOpen: boolean;
  };
  holiday?: {
    nameEn: string;
    nameKh: string;
    openTime?: string | null;
    closeTime?: string | null;
  };
}

export function useBusinessHours() {
  return useQuery({
    queryKey: ["business-hours"],
    queryFn: () =>
      fetchAPI<{ hours: BusinessHoursDay[]; isDefault: boolean }>("/api/business-hours"),
  });
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hours: BusinessHoursDay[]) =>
      fetchAPI<{ hours: BusinessHoursDay[]; success: boolean }>("/api/business-hours", {
        method: "PUT",
        body: JSON.stringify({ hours }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours"] });
      queryClient.invalidateQueries({ queryKey: ["store-status"] });
    },
  });
}

export function useStoreStatus() {
  return useQuery({
    queryKey: ["store-status"],
    queryFn: () =>
      fetchAPI<StoreStatus>("/api/business-hours", {
        method: "POST",
      }),
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ["holidays", year],
    queryFn: () =>
      fetchAPI<{ holidays: Holiday[] }>(
        `/api/holidays${year ? `?year=${year}` : ""}`
      ),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Holiday, "id" | "createdAt">) =>
      fetchAPI<{ holiday: Holiday }>("/api/holidays", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["store-status"] });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Holiday> & { id: string }) =>
      fetchAPI<{ holiday: Holiday }>("/api/holidays", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["store-status"] });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/holidays?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["store-status"] });
    },
  });
}

// ============================================
// DEVELOPER BACKLOG
// ============================================

export type BacklogPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type BacklogStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface BacklogItem {
  id: string;
  title: string;
  description: string | null;
  priority: BacklogPriority;
  status: BacklogStatus;
  createdAt: string;
  updatedAt: string;
}

export function useBacklogItems() {
  return useQuery({
    queryKey: ["backlog"],
    queryFn: () => fetchAPI<{ items: BacklogItem[] }>("/api/backlog"),
  });
}

export function useCreateBacklogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; priority?: BacklogPriority }) =>
      fetchAPI<{ item: BacklogItem }>("/api/backlog", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
  });
}

export function useUpdateBacklogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string;
      priority?: BacklogPriority;
      status?: BacklogStatus;
    }) =>
      fetchAPI<{ item: BacklogItem }>(`/api/backlog/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
  });
}

export function useDeleteBacklogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/backlog/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
  });
}

// ============================================
// SEARCH ANALYTICS
// ============================================

export interface SearchAnalyticsSummary {
  totalSearches: number;
  searchesWithResults: number;
  zeroResultSearches: number;
  successRate: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface PopularSearch {
  query: string;
  count: number;
  avgResults: number;
}

export interface RecentSearch {
  id: string;
  query: string;
  resultsCount: number;
  createdAt: string;
}

export interface DailySearchStat {
  date: string;
  searches: number;
  avgResults: number;
}

export interface SearchAnalyticsData {
  summary: SearchAnalyticsSummary;
  popularSearches: PopularSearch[];
  zeroResultQueries: { query: string; count: number }[];
  recentSearches: RecentSearch[];
  dailyStats: DailySearchStat[];
}

export function useSearchAnalytics(options?: { startDate?: string; endDate?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  if (options?.limit) params.set("limit", options.limit.toString());

  return useQuery({
    queryKey: ["search-analytics", options],
    queryFn: () =>
      fetchAPI<SearchAnalyticsData>(`/api/analytics/search?${params.toString()}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// COMPONENT REGISTRY
// ============================================

export interface ComponentStateConfig {
  id: string;
  enabled: boolean;
  order?: number;
  config?: Record<string, unknown>;
}

export interface ComponentRegistryConfigData {
  components: Record<string, ComponentStateConfig>;
  version: number;
}

export function useComponentRegistry() {
  return useQuery({
    queryKey: ["component-registry"],
    queryFn: () =>
      fetchAPI<{ config: ComponentRegistryConfigData }>("/api/settings?key=componentRegistry"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateComponentRegistry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: ComponentRegistryConfigData) =>
      fetchAPI<{ success: boolean }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: { componentRegistry: config } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-registry"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ============================================
// SALES REPORTS
// ============================================

export interface SalesReportSummary {
  totalRevenue: number;
  totalRevenueKhr: number;
  orderCount: number;
  cancelledOrders: number;
  averageOrderValue: number;
  revenueChange: number;
  orderCountChange: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface TopProduct {
  rank: number;
  id: string;
  nameEn: string;
  nameKh: string;
  imageUrl: string | null;
  category: { id: string; nameEn: string; nameKh: string } | null;
  quantity: number;
  revenue: number;
}

export interface CategorySales {
  id: string;
  nameEn: string;
  nameKh: string;
  revenue: number;
  orderCount: number;
  percentage: number;
}

export interface ChannelSales {
  channel: string;
  revenue: number;
  orderCount: number;
  percentage: number;
}

export interface TopCustomer {
  rank: number;
  id: string;
  name: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface SalesReportData {
  summary: SalesReportSummary;
  topProducts: TopProduct[];
  salesByCategory: CategorySales[];
  salesByChannel: ChannelSales[];
  topCustomers: TopCustomer[];
  chartData: SalesChartData[];
}

export function useSalesReport(options?: { startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);

  return useQuery({
    queryKey: ["sales-report", options],
    queryFn: () =>
      fetchAPI<SalesReportData>(`/api/reports/sales?${params.toString()}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// CUSTOMER ANALYTICS REPORTS
// ============================================

export interface CustomerReportSummary {
  totalCustomers: number;
  newCustomers: number;
  newCustomersChange: number;
  returningCustomers: number;
  activeCustomers: number;
  retentionRate: number;
  avgCustomerLifetimeValue: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface TopCustomerData {
  rank: number;
  id: string;
  name: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  lastOrderDate: string | null;
}

export interface CustomerGrowthData {
  date: string;
  newCustomers: number;
  totalCustomers: number;
}

export interface CustomerSegments {
  vip: number;
  active: number;
  atRisk: number;
  churned: number;
  newCustomers: number;
}

export interface CustomerReportData {
  summary: CustomerReportSummary;
  topCustomers: TopCustomerData[];
  customerGrowthData: CustomerGrowthData[];
  segments: CustomerSegments;
}

export function useCustomerReport(options?: { startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);

  return useQuery({
    queryKey: ["customer-report", options],
    queryFn: () =>
      fetchAPI<CustomerReportData>(`/api/reports/customers?${params.toString()}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// INVENTORY REPORTS
// ============================================

export interface InventoryReportSummary {
  totalProducts: number;
  productsWithInventory: number;
  productsWithoutInventory: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
  totalInventoryValue: number;
  totalInventoryValueKhr: number;
}

export interface LowStockProduct {
  id: string;
  nameEn: string;
  nameKh: string;
  sku: string;
  imageUrl: string | null;
  category: { id: string; nameEn: string; nameKh: string } | null;
  currentStock: number;
  minLevel: number;
  priceUsd: number;
  stockValue: number;
  status: "low" | "critical";
}

export interface OutOfStockProduct {
  id: string;
  nameEn: string;
  nameKh: string;
  sku: string;
  imageUrl: string | null;
  category: { id: string; nameEn: string; nameKh: string } | null;
  priceUsd: number;
  lastUpdated: string | null;
}

export interface CategoryStock {
  id: string;
  nameEn: string;
  nameKh: string;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}

export interface FastMovingProduct {
  id: string;
  nameEn: string;
  nameKh: string;
  sku: string;
  currentStock: number;
  soldLast30Days: number;
  daysUntilStockout: number | null;
}

export interface SlowMovingProduct {
  id: string;
  nameEn: string;
  nameKh: string;
  sku: string;
  currentStock: number;
  soldLast30Days: number;
  stockValue: number;
}

export interface InventoryReportData {
  summary: InventoryReportSummary;
  lowStockProducts: LowStockProduct[];
  outOfStockProducts: OutOfStockProduct[];
  stockByCategory: CategoryStock[];
  fastMovingProducts: FastMovingProduct[];
  slowMovingProducts: SlowMovingProduct[];
}

export function useInventoryReport(options?: { threshold?: number; categoryId?: string }) {
  const params = new URLSearchParams();
  if (options?.threshold) params.set("threshold", options.threshold.toString());
  if (options?.categoryId) params.set("categoryId", options.categoryId);

  return useQuery({
    queryKey: ["inventory-report", options],
    queryFn: () =>
      fetchAPI<InventoryReportData>(`/api/reports/inventory?${params.toString()}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// CLIENT THEME (Multi-tenant whitelabel)
// ============================================

export interface ClientTheme {
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface ClientContext {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  theme: ClientTheme | null;
  isActive: boolean;
}

export interface ClientThemeResponse {
  client: ClientContext | null;
  theme: ClientTheme | null;
}

/**
 * Hook to fetch client theme from API
 * Used for multi-tenant shops to get client-specific branding
 */
export function useClientTheme(clientSlug?: string) {
  const params = new URLSearchParams();
  if (clientSlug) params.set("slug", clientSlug);

  return useQuery({
    queryKey: ["client-theme", clientSlug],
    queryFn: () =>
      fetchAPI<ClientThemeResponse>(`/api/client/theme?${params.toString()}`),
    staleTime: 10 * 60 * 1000, // 10 minutes - themes don't change often
  });
}

/**
 * Hook to update client theme (admin only)
 */
export function useUpdateClientTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, theme }: { clientId: string; theme: Partial<ClientTheme> }) =>
      fetchAPI<{ success: boolean; theme: ClientTheme }>("/api/client/theme", {
        method: "PUT",
        body: JSON.stringify({ clientId, theme }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-theme"] });
    },
  });
}

// ============================================
// PRODUCT RECOMMENDATIONS
// ============================================

export interface RecommendedProduct {
  id: string;
  nameEn: string;
  nameKh: string;
  priceUsd: number;
  priceKhr: number;
  imageUrl: string | null;
  category: {
    id: string;
    nameEn: string;
    nameKh: string;
    slug: string;
  } | null;
  inventory: {
    quantity: number;
  } | null;
  recommendationType: "also_bought" | "same_category";
}

export interface ProductRecommendationsResponse {
  productId: string;
  recommendations: RecommendedProduct[];
  meta: {
    total: number;
    alsoBoughtCount: number;
    sameCategoryCount: number;
  };
}

/**
 * Hook to fetch product recommendations
 * Returns products frequently bought together and from the same category
 */
export function useProductRecommendations(productId: string, limit = 8) {
  return useQuery({
    queryKey: ["product-recommendations", productId, limit],
    queryFn: () =>
      fetchAPI<ProductRecommendationsResponse>(
        `/api/products/${productId}/recommendations?limit=${limit}`
      ),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// PRODUCT REVIEWS
// ============================================

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  reviewerName: string;
  reviewerEmail?: string;
  createdAt: string;
  updatedAt?: string;
  product?: {
    id: string;
    nameEn: string;
    nameKh: string;
    imageUrl: string | null;
  };
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution;
}

export interface ProductReviewsResponse {
  productId: string;
  reviews: Review[];
  stats: ReviewStats;
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface AdminReviewsResponse {
  reviews: Review[];
  pendingCount: number;
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Hook to fetch reviews for a specific product
 */
export function useProductReviews(productId: string, options?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.offset) params.set("offset", options.offset.toString());

  return useQuery({
    queryKey: ["product-reviews", productId, options],
    queryFn: () =>
      fetchAPI<ProductReviewsResponse>(
        `/api/products/${productId}/reviews?${params.toString()}`
      ),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to create a new review for a product
 */
export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      rating,
      comment,
      customerId,
      guestName,
    }: {
      productId: string;
      rating: number;
      comment?: string;
      customerId?: string;
      guestName?: string;
    }) =>
      fetchAPI<{ message: string; review: Review }>(
        `/api/products/${productId}/reviews`,
        {
          method: "POST",
          body: JSON.stringify({ rating, comment, customerId, guestName }),
        }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews", variables.productId] });
    },
  });
}

/**
 * Hook to fetch all reviews for admin (with moderation)
 */
export function useAdminReviews(options?: { status?: ReviewStatus; productId?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.productId) params.set("productId", options.productId);
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.offset) params.set("offset", options.offset.toString());

  return useQuery({
    queryKey: ["admin-reviews", options],
    queryFn: () =>
      fetchAPI<AdminReviewsResponse>(`/api/reviews?${params.toString()}`),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to update review status (admin moderation)
 */
export function useUpdateReviewStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) =>
      fetchAPI<{ message: string; review: Review }>(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
    },
  });
}

/**
 * Hook to delete a review (admin)
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      fetchAPI<{ message: string }>(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
    },
  });
}

/**
 * Hook to fetch rating stats for multiple products at once
 * Useful for displaying ratings on product cards
 */
export function useProductRatings(productIds: string[]) {
  return useQuery({
    queryKey: ["product-ratings", productIds.sort().join(",")],
    queryFn: async () => {
      const ratings = await Promise.all(
        productIds.map(async (productId) => {
          try {
            const response = await fetchAPI<ProductReviewsResponse>(
              `/api/products/${productId}/reviews?limit=0`
            );
            return {
              productId,
              averageRating: response.stats.averageRating,
              totalReviews: response.stats.totalReviews,
            };
          } catch {
            return { productId, averageRating: 0, totalReviews: 0 };
          }
        })
      );
      return ratings.reduce(
        (acc, item) => {
          acc[item.productId] = { averageRating: item.averageRating, totalReviews: item.totalReviews };
          return acc;
        },
        {} as Record<string, { averageRating: number; totalReviews: number }>
      );
    },
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// DASHBOARD WIDGETS
// ============================================

export type DashboardWidgetType = "sales_overview" | "recent_orders" | "low_stock" | "top_products";

export interface DashboardWidgetConfig {
  id: string;
  type: DashboardWidgetType;
  order: number;
  enabled: boolean;
  size: "small" | "medium" | "large";
}

export interface DashboardLayoutConfig {
  widgets: DashboardWidgetConfig[];
  version: number;
  lastUpdated: string;
}

// Default widget configurations
export const defaultDashboardWidgets: DashboardWidgetConfig[] = [
  { id: "sales_overview_1", type: "sales_overview", order: 0, enabled: true, size: "large" },
  { id: "recent_orders_1", type: "recent_orders", order: 1, enabled: true, size: "large" },
  { id: "low_stock_1", type: "low_stock", order: 2, enabled: true, size: "medium" },
  { id: "top_products_1", type: "top_products", order: 3, enabled: true, size: "medium" },
];

/**
 * Hook to fetch dashboard widget layout for current admin user
 */
export function useDashboardLayout() {
  return useQuery({
    queryKey: ["dashboard-layout"],
    queryFn: () =>
      fetchAPI<{ config: DashboardLayoutConfig | null }>("/api/settings?key=dashboardLayout"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to save dashboard widget layout
 */
export function useUpdateDashboardLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: DashboardLayoutConfig) =>
      fetchAPI<{ success: boolean }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: { dashboardLayout: config } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ============================================
// FLASH SALES
// ============================================

export interface FlashSale {
  id: string;
  productId: string;
  salePriceUsd: number;
  salePriceKhr: number;
  startTime: string;
  endTime: string;
  quantity: number | null;
  soldCount: number;
  remainingQuantity: number | null;
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";
  nameEn: string | null;
  nameKh: string | null;
  descriptionEn: string | null;
  descriptionKh: string | null;
  isFeatured: boolean;
  bannerImageUrl: string | null;
  product: {
    id: string;
    nameEn: string;
    nameKh: string;
    priceUsd: number;
    priceKhr: number;
    imageUrl: string | null;
    category?: Category;
    inventory?: Inventory;
  } | null;
}

export interface FlashSaleForProduct {
  id: string;
  salePriceUsd: number;
  salePriceKhr: number;
  startTime: string;
  endTime: string;
  quantity: number | null;
  soldCount: number;
  remainingQuantity: number | null;
  nameEn: string | null;
  nameKh: string | null;
  isFeatured: boolean;
  discount: {
    amountUsd: number;
    amountKhr: number;
    percentage: number;
  } | null;
}

/**
 * Hook to fetch active flash sales for products
 * Returns a map of productId to flash sale info for quick lookup
 */
export function useActiveFlashSales(productIds: string[]) {
  return useQuery({
    queryKey: ["flash-sales-by-products", productIds.sort().join(",")],
    queryFn: async () => {
      const flashSales = await Promise.all(
        productIds.map(async (productId) => {
          try {
            const response = await fetchAPI<{
              hasFlashSale: boolean;
              flashSale: FlashSaleForProduct | null;
            }>(`/api/flash-sales/product/${productId}`);
            return { productId, ...response };
          } catch {
            return { productId, hasFlashSale: false, flashSale: null };
          }
        })
      );
      return flashSales.reduce(
        (acc, item) => {
          if (item.hasFlashSale && item.flashSale) {
            acc[item.productId] = item.flashSale;
          }
          return acc;
        },
        {} as Record<string, FlashSaleForProduct>
      );
    },
    enabled: productIds.length > 0,
    staleTime: 60 * 1000, // 1 minute (flash sales can change quickly)
    refetchInterval: 60 * 1000, // Refetch every minute to check for expired sales
  });
}

/**
 * Hook to fetch flash sale for a single product
 */
export function useProductFlashSale(productId: string | undefined) {
  return useQuery({
    queryKey: ["flash-sale-product", productId],
    queryFn: () =>
      fetchAPI<{ hasFlashSale: boolean; flashSale: FlashSaleForProduct | null }>(
        `/api/flash-sales/product/${productId}`
      ),
    enabled: !!productId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to fetch featured/active flash sales for banner display
 */
export function useFeaturedFlashSales() {
  return useQuery({
    queryKey: ["flash-sales-featured"],
    queryFn: () =>
      fetchAPI<{ flashSales: FlashSale[] }>(
        "/api/flash-sales?active=true&featured=true&limit=5"
      ),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  });
}

// ============================================
// PRODUCT IMPORT/EXPORT
// ============================================

export interface ImportRowError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportRowError[];
  importedProducts: { sku: string; id: string; action: "created" | "updated" }[];
  dryRun?: boolean;
  pendingCreates?: number;
  pendingUpdates?: number;
  message?: string;
}

/**
 * Hook to import products from CSV file
 */
export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      updateExisting = false,
      dryRun = false,
    }: {
      file: File;
      updateExisting?: boolean;
      dryRun?: boolean;
    }) => {
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams();
      if (updateExisting) params.set("updateExisting", "true");
      if (dryRun) params.set("dryRun", "true");

      const res = await fetch(`/api/products/import?${params.toString()}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Import failed" }));
        throw new Error(error.error || "Import failed");
      }

      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      if (!result.dryRun && (result.imported > 0 || result.updated > 0)) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
  });
}

/**
 * Function to download product export CSV
 */
export async function exportProducts(options?: {
  categoryId?: string;
  isActive?: boolean;
}): Promise<void> {
  const params = new URLSearchParams();
  if (options?.categoryId) params.set("categoryId", options.categoryId);
  if (options?.isActive !== undefined) params.set("isActive", String(options.isActive));

  const url = `/api/products/export${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Export failed");
  }

  // Get filename from content-disposition header or use default
  const contentDisposition = res.headers.get("content-disposition");
  let filename = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch) filename = filenameMatch[1];
  }

  // Download the file
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

// ============================================
// CLIENTS (SUPER ADMIN)
// ============================================

export interface Client {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  settings?: {
    currency?: "USD" | "KHR";
    language?: "EN" | "KH";
    timezone?: string;
  } | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    orders: number;
    customers: number;
  };
}

export interface ClientStats {
  totalRevenue: number;
  totalRevenueKhr: number;
  orderCount: number;
  averageOrderValue: number;
  productCount: number;
  customerCount: number;
}

export interface ClientWithStats extends Client {
  stats?: ClientStats;
}

export interface ClientsResponse {
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all clients (super admin only)
 */
export function useClients(options?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: ["clients", options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.page) params.set("page", String(options.page));
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.search) params.set("search", options.search);
      if (options?.isActive !== undefined) params.set("isActive", String(options.isActive));

      return fetchAPI<ClientsResponse>(`/api/clients?${params.toString()}`);
    },
  });
}

/**
 * Hook to fetch a single client with stats
 */
export function useClientStats(clientId: string) {
  return useQuery({
    queryKey: ["client-stats", clientId],
    queryFn: () => fetchAPI<{ client: Client; stats: ClientStats }>(`/api/clients/${clientId}/stats`),
    enabled: !!clientId,
  });
}

/**
 * Hook to create a new client
 */
export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      domain?: string;
      settings?: Client["settings"];
      isActive?: boolean;
    }) =>
      fetchAPI<Client>("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

/**
 * Hook to update a client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      slug?: string;
      domain?: string | null;
      settings?: Client["settings"];
      isActive?: boolean;
    }) =>
      fetchAPI<Client>("/api/clients", {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

/**
 * Hook to delete/disable a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) =>
      fetchAPI<{
        success: boolean;
        softDeleted?: boolean;
        forceDeleted?: boolean;
        hasData?: boolean;
        counts?: { products: number; orders: number; customers: number };
      }>(`/api/clients?id=${id}${force ? "&force=true" : ""}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

/**
 * Helper function to set impersonation cookie for client admin access
 */
export function setClientImpersonation(clientId: string, clientSlug: string): void {
  // Store impersonation info in localStorage
  localStorage.setItem("impersonateClientId", clientId);
  localStorage.setItem("impersonateClientSlug", clientSlug);
}

/**
 * Helper function to clear impersonation
 */
export function clearClientImpersonation(): void {
  localStorage.removeItem("impersonateClientId");
  localStorage.removeItem("impersonateClientSlug");
}

/**
 * Helper function to get current impersonation
 */
export function getClientImpersonation(): { clientId: string; clientSlug: string } | null {
  if (typeof window === "undefined") return null;
  const clientId = localStorage.getItem("impersonateClientId");
  const clientSlug = localStorage.getItem("impersonateClientSlug");
  if (clientId && clientSlug) {
    return { clientId, clientSlug };
  }
  return null;
}

// ============================================
// SUBSCRIPTION & BILLING
// ============================================

export type SubscriptionPlan = "FREE" | "STARTER" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | "PAST_DUE";

export interface SubscriptionPlanLimits {
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxCustomers: number;
  features: {
    customDomain: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    multipleUsers: boolean;
    exportReports: boolean;
    bulkImport: boolean;
  };
}

export interface SubscriptionPlanPricing {
  monthly: number;
  yearly: number;
  yearlyDiscount: number;
}

export interface SubscriptionPlanInfo {
  name: string;
  description: string;
  badge?: string;
}

export interface SubscriptionUsageMetric {
  used: number;
  limit: number;
  percentage: number;
  isUnlimited: boolean;
  isApproachingLimit: boolean;
  isAtLimit: boolean;
}

export interface SubscriptionUsage {
  products: SubscriptionUsageMetric;
  ordersThisMonth: SubscriptionUsageMetric;
  customers: SubscriptionUsageMetric;
}

export interface SubscriptionUpgradeRecommendation {
  shouldUpgrade: boolean;
  reason?: string;
  suggestedPlan?: SubscriptionPlan;
  blockedAction?: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  productsUsed: number;
  ordersThisMonth: number;
  createdAt: string;
  cancelledAt: string | null;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  planInfo: SubscriptionPlanInfo;
  planLimits: SubscriptionPlanLimits;
  planPricing: SubscriptionPlanPricing;
  usage: SubscriptionUsage;
  upgradeRecommendation: SubscriptionUpgradeRecommendation;
  allPlans: Array<{
    plan: SubscriptionPlan;
    info: SubscriptionPlanInfo;
    limits: SubscriptionPlanLimits;
    pricing: SubscriptionPlanPricing;
  }>;
}

/**
 * Hook to fetch current subscription and usage for a client
 */
export function useSubscription(clientId?: string) {
  return useQuery({
    queryKey: ["subscription", clientId],
    queryFn: () => {
      const params = clientId ? `?clientId=${clientId}` : "";
      return fetchAPI<SubscriptionResponse>(`/api/subscription${params}`);
    },
    enabled: !!clientId,
  });
}

/**
 * Hook to upgrade/change subscription plan
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientId: string;
      plan: SubscriptionPlan;
      billingCycle?: "monthly" | "yearly";
    }) =>
      fetchAPI<{
        success: boolean;
        subscription: Subscription;
        planInfo: SubscriptionPlanInfo;
        planLimits: SubscriptionPlanLimits;
      }>("/api/subscription", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription", variables.clientId] });
    },
  });
}

/**
 * Hook to cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) =>
      fetchAPI<{
        success: boolean;
        message: string;
        subscription: {
          id: string;
          status: SubscriptionStatus;
          currentPeriodEnd: string;
          cancelledAt: string | null;
        };
      }>(`/api/subscription?clientId=${clientId}`, { method: "DELETE" }),
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ["subscription", clientId] });
    },
  });
}

// ============================================
// AUDIT LOGS
// ============================================

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "SETTINGS_CHANGE";

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogsSummary {
  total: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  hourlyActivity: Array<{ hour: number; count: number }>;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: AuditLogsPagination;
  summary: AuditLogsSummary;
  filters: {
    validActions: AuditAction[];
    validResources: string[];
  };
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Hook to fetch audit logs with filtering and pagination
 */
export function useAuditLogs(params: AuditLogsParams = {}) {
  const queryString = new URLSearchParams();
  if (params.page) queryString.set("page", String(params.page));
  if (params.limit) queryString.set("limit", String(params.limit));
  if (params.userId) queryString.set("userId", params.userId);
  if (params.action) queryString.set("action", params.action);
  if (params.resource) queryString.set("resource", params.resource);
  if (params.resourceId) queryString.set("resourceId", params.resourceId);
  if (params.startDate) queryString.set("startDate", params.startDate);
  if (params.endDate) queryString.set("endDate", params.endDate);
  if (params.search) queryString.set("search", params.search);

  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () =>
      fetchAPI<AuditLogsResponse>(`/api/audit-logs?${queryString.toString()}`),
    staleTime: 30000, // 30 seconds
  });
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export interface UserSession {
  id: string;
  deviceName: string;
  deviceType: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface SessionStats {
  totalActive: number;
  deviceTypes: { type: string; count: number }[];
  mostRecentActivity: string | null;
}

export interface SessionsResponse {
  sessions: UserSession[];
  stats: SessionStats;
}

/**
 * Hook to fetch user's active sessions
 */
export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => fetchAPI<SessionsResponse>("/api/sessions"),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to revoke a specific session
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      fetchAPI<{ success: boolean; message: string }>(
        `/api/sessions/${sessionId}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

/**
 * Hook to revoke all sessions except current
 */
export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (currentSessionId?: string) =>
      fetchAPI<{ success: boolean; revokedCount: number; message: string }>(
        "/api/sessions",
        {
          method: "DELETE",
          body: JSON.stringify({ currentSessionId }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

// ============================================
// API KEYS
// ============================================

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  clientId: string | null;
  scopes: string[];
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  createdBy: string | null;
}

export interface ApiKeyScope {
  scope: string;
  description: string;
}

export interface ApiKeysResponse {
  keys: ApiKey[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  availableScopes: ApiKeyScope[];
  scopePresets: Record<string, string[]>;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  clientId?: string;
  description?: string;
  expiresAt?: string;
  rateLimitPerMinute?: number;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey & { key: string }; // Full key only on creation
  message: string;
  warning: string;
}

export interface UpdateApiKeyInput {
  id: string;
  name?: string;
  scopes?: string[];
  description?: string;
  expiresAt?: string | null;
  rateLimitPerMinute?: number;
  isActive?: boolean;
  rotate?: boolean; // Request key rotation
}

export interface UpdateApiKeyResponse {
  apiKey?: ApiKey;
  message: string;
  newKey?: string; // Only present when rotate=true
  warning?: string;
  gracePeriodEnds?: string;
}

/**
 * Hook to fetch API keys list
 */
export function useApiKeys(params?: {
  page?: number;
  limit?: number;
  clientId?: string;
  includeDisabled?: boolean;
}) {
  const queryString = new URLSearchParams();
  if (params?.page) queryString.set("page", params.page.toString());
  if (params?.limit) queryString.set("limit", params.limit.toString());
  if (params?.clientId) queryString.set("clientId", params.clientId);
  if (params?.includeDisabled) queryString.set("includeDisabled", "true");

  return useQuery({
    queryKey: ["api-keys", params],
    queryFn: () =>
      fetchAPI<ApiKeysResponse>(`/api/keys?${queryString.toString()}`),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to create a new API key
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyInput) =>
      fetchAPI<CreateApiKeyResponse>("/api/keys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

/**
 * Hook to update an API key
 */
export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateApiKeyInput) =>
      fetchAPI<UpdateApiKeyResponse>("/api/keys", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

/**
 * Hook to rotate an API key
 */
export function useRotateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI<UpdateApiKeyResponse>("/api/keys", {
        method: "PUT",
        body: JSON.stringify({ id, rotate: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

/**
 * Hook to delete/disable an API key
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permanent = false }: { id: string; permanent?: boolean }) =>
      fetchAPI<{ message: string }>(
        `/api/keys?id=${id}${permanent ? "&permanent=true" : ""}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

// ============================================
// OAUTH / SOCIAL ACCOUNTS
// ============================================

export interface SocialAccount {
  id: string;
  provider: "google" | "facebook";
  providerUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  connectedAt: string;
}

export interface OAuthProvider {
  provider: "google" | "facebook";
  enabled: boolean;
  displayName: string;
  icon: string;
}

export interface SocialAccountsResponse {
  accounts: SocialAccount[];
  availableProviders: string[];
}

export interface OAuthProvidersResponse {
  providers: OAuthProvider[];
  allProviders: OAuthProvider[];
}

/**
 * Hook to get available OAuth providers
 */
export function useOAuthProviders() {
  return useQuery({
    queryKey: ["oauth-providers"],
    queryFn: () => fetchAPI<OAuthProvidersResponse>("/api/auth/oauth"),
  });
}

/**
 * Hook to get linked social accounts for current user
 */
export function useSocialAccounts(customerId?: string) {
  return useQuery({
    queryKey: ["social-accounts", customerId],
    queryFn: () =>
      fetchAPI<SocialAccountsResponse>(
        `/api/auth/social-accounts${customerId ? `?customerId=${customerId}` : ""}`
      ),
  });
}

/**
 * Hook to unlink a social account
 */
export function useUnlinkSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      customerId,
    }: {
      provider: "google" | "facebook";
      customerId?: string;
    }) =>
      fetchAPI<{ success: boolean; message: string }>("/api/auth/social-accounts", {
        method: "DELETE",
        body: JSON.stringify({ provider, customerId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    },
  });
}

/**
 * Helper to initiate OAuth login
 */
export function initiateOAuthLogin(
  provider: "google" | "facebook",
  options?: {
    returnUrl?: string;
    linkUserId?: string;
    linkCustomerId?: string;
  }
): void {
  const params = new URLSearchParams();
  if (options?.returnUrl) params.set("returnUrl", options.returnUrl);
  if (options?.linkUserId) params.set("linkUserId", options.linkUserId);
  if (options?.linkCustomerId) params.set("linkCustomerId", options.linkCustomerId);

  const queryString = params.toString();
  const url = `/api/auth/oauth/${provider}${queryString ? `?${queryString}` : ""}`;

  // Navigate to OAuth initiation URL (will redirect to provider)
  window.location.href = url;
}

// ============================================
// SECURITY DASHBOARD
// ============================================

export type SecurityDashboardTimeframe = "1h" | "6h" | "24h" | "7d" | "30d";

export interface SecurityDashboardSummary {
  securityScore: number;
  loginSuccessCount: number;
  loginFailedCount: number;
  failedLoginRate: string;
  activeSessions: number;
  lockedAccountsCount: number;
  unreviewedSuspiciousLogins: number;
  criticalEventsCount: number;
}

export interface DeviceSessionCount {
  type: string;
  count: number;
}

export interface SessionsBreakdown {
  total: number;
  byDevice: DeviceSessionCount[];
}

export interface LockedAccount {
  userId: string;
  userName: string;
  email: string;
  lockedAt: string;
  lockedUntil: string;
  failedAttempts: number;
  ipAddress: string | null;
}

export interface LoginAttemptEntry {
  id: string;
  email: string;
  userId: string | null;
  ipAddress: string;
  success: boolean;
  createdAt: string;
}

export interface FailedLoginTrendPoint {
  hour: string;
  count: number;
}

export interface SecurityLogStats {
  totalEvents: number;
  byEventType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentCritical: number;
}

export interface SecurityAlert {
  pattern: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  count: number;
  message: string;
}

export interface CriticalEvent {
  id: string;
  event: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface SuspiciousLogin {
  id: string;
  userId: string;
  deviceName: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  isNewDevice: boolean;
  isNewLocation: boolean;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export interface SecurityDashboardConfig {
  lockoutMaxAttempts: number;
  lockoutDurationMinutes: number;
}

export interface SecurityDashboardResponse {
  timeframe: SecurityDashboardTimeframe;
  generatedAt: string;
  summary: SecurityDashboardSummary;
  sessions: SessionsBreakdown;
  lockedAccounts: LockedAccount[];
  recentLoginAttempts: LoginAttemptEntry[];
  failedLoginTrends: FailedLoginTrendPoint[];
  securityLogStats: SecurityLogStats;
  alerts: SecurityAlert[];
  criticalEvents: CriticalEvent[];
  suspiciousLogins: SuspiciousLogin[];
  config: SecurityDashboardConfig;
}

/**
 * Hook to fetch security dashboard data
 */
export function useSecurityDashboard(timeframe: SecurityDashboardTimeframe = "24h") {
  return useQuery({
    queryKey: ["security-dashboard", timeframe],
    queryFn: () =>
      fetchAPI<SecurityDashboardResponse>(
        `/api/admin/security-dashboard?timeframe=${timeframe}`
      ),
    staleTime: 30000, // 30 seconds - security data should be fairly fresh
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

/**
 * Hook to unlock a locked account
 */
export function useUnlockAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      fetchAPI<{ success: boolean; message: string }>("/api/admin/lockouts", {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-dashboard"] });
    },
  });
}

/**
 * Hook to force logout a user (revoke all their sessions)
 */
export function useForceLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      fetchAPI<{ success: boolean; revokedCount: number }>("/api/admin/sessions", {
        method: "DELETE",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-dashboard"] });
    },
  });
}
