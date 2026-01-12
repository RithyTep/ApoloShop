import { prisma } from "@/lib/prisma"
import { cache } from "react"
import type { ShopCustomizationConfig, ShopTheme, ShopSection, Product } from "./api-hooks"

// Default customization config
const getDefaultConfig = (): ShopCustomizationConfig => ({
  theme: {
    shopName: "My Shop",
    logoUrl: "",
    primaryColor: "oklch(0.72 0.16 356)",
    accentColor: "oklch(0.72 0.16 356)",
    backgroundColor: "oklch(1 0 0)",
    textColor: "oklch(0.15 0 0)",
    borderRadius: 0,
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      enabled: true,
      order: 0,
      config: {
        mediaType: "image",
        mediaUrl: "",
        overlayOpacity: 40,
        overlayColor: "#000000",
        titleEn: "Welcome to Our Shop",
        titleKh: "សូមស្វាគមន៍មកកាន់ហាងរបស់យើង",
        subtitleEn: "Discover our amazing products",
        subtitleKh: "ស្វែងរកផលិតផលអស្ចារ្យរបស់យើង",
        ctaTextEn: "Shop Now",
        ctaTextKh: "ទិញឥឡូវ",
        ctaLink: "#products",
        ctaStyle: "primary",
        textAlignment: "center",
        height: "medium",
      },
    },
    {
      id: "products-1",
      type: "products",
      enabled: true,
      order: 1,
      config: {
        titleEn: "Our Products",
        titleKh: "ផលិតផលរបស់យើង",
        displayType: "featured",
        layout: "grid",
        columns: 4,
        maxProducts: 8,
        showPrice: true,
        showStock: true,
        showAddToCart: true,
      },
    },
    {
      id: "footer-1",
      type: "footer",
      enabled: true,
      order: 2,
      config: {
        backgroundColor: "oklch(0.15 0 0)",
        textColor: "oklch(0.9 0 0)",
        columns: [
          {
            id: "col-1",
            titleEn: "Quick Links",
            titleKh: "តំណភ្ជាប់រហ័ស",
            type: "links",
            links: [
              { textEn: "Home", textKh: "ទំព័រដើម", url: "/" },
              { textEn: "Products", textKh: "ផលិតផល", url: "#products" },
              { textEn: "Contact", textKh: "ទំនាក់ទំនង", url: "#contact" },
            ],
          },
        ],
        copyrightEn: "© 2024 Simple Shop. All rights reserved.",
        copyrightKh: "© 2024 Simple Shop។ រក្សាសិទ្ធិគ្រប់យ៉ាង។",
        showSocialIcons: true,
        socialLinks: {
          facebook: "",
          telegram: "",
          instagram: "",
        },
      },
    },
  ],
})

// Cached fetch for customization (deduped per request)
export const getShopCustomization = cache(async (): Promise<ShopCustomizationConfig> => {
  try {
    const customization = await prisma.shopCustomization.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    })

    if (!customization || !customization.config) {
      return getDefaultConfig()
    }

    return customization.config as unknown as ShopCustomizationConfig
  } catch (error) {
    console.error("Error fetching shop customization:", error)
    return getDefaultConfig()
  }
})

// Cached fetch for products
export const getProducts = cache(async (): Promise<Product[]> => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        inventory: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return products.map((p) => ({
      id: p.id,
      nameEn: p.nameEn,
      nameKh: p.nameKh,
      descriptionEn: p.descriptionEn || undefined,
      descriptionKh: p.descriptionKh || undefined,
      priceUsd: typeof p.priceUsd === 'object' && 'toNumber' in p.priceUsd
        ? (p.priceUsd as { toNumber: () => number }).toNumber()
        : Number(p.priceUsd),
      priceKhr: typeof p.priceKhr === 'object' && 'toNumber' in p.priceKhr
        ? (p.priceKhr as { toNumber: () => number }).toNumber()
        : Number(p.priceKhr),
      categoryId: p.categoryId,
      sku: p.sku,
      imageUrl: p.imageUrl || undefined,
      images: p.images as string[] | undefined,
      isActive: p.isActive,
      category: p.category
        ? {
            id: p.category.id,
            nameEn: p.category.nameEn,
            nameKh: p.category.nameKh,
            slug: p.category.slug,
            sortOrder: p.category.sortOrder,
            isActive: p.category.isActive,
          }
        : undefined,
      inventory: p.inventory
        ? {
            id: p.inventory.id,
            productId: p.inventory.productId,
            quantity: p.inventory.quantity,
            minLevel: p.inventory.minLevel,
          }
        : undefined,
    }))
  } catch (error) {
    console.error("Error fetching products:", error)
    return []
  }
})

// Cached fetch for categories
export const getCategories = cache(async () => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })

    return categories.map((c) => ({
      id: c.id,
      nameEn: c.nameEn,
      nameKh: c.nameKh,
      slug: c.slug,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    }))
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
})

// Preload functions for parallel data fetching
export const preloadShopCustomization = () => {
  void getShopCustomization()
}

export const preloadProducts = () => {
  void getProducts()
}

export const preloadCategories = () => {
  void getCategories()
}
