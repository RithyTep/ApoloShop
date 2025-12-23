import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Default customization config
const getDefaultConfig = () => ({
  theme: {
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

// GET /api/customizer - Get active customization config
export async function GET() {
  try {
    const customization = await prisma.shopCustomization.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    })

    if (!customization) {
      return NextResponse.json({ config: getDefaultConfig(), version: 0 })
    }

    return NextResponse.json({
      config: customization.config,
      version: customization.version,
      updatedAt: customization.updatedAt,
    })
  } catch (error) {
    console.error("Get customization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/customizer - Update customization config
export async function PUT(request: NextRequest) {
  try {
    const { config } = await request.json()

    if (!config) {
      return NextResponse.json({ error: "Config is required" }, { status: 400 })
    }

    // Get current version
    const current = await prisma.shopCustomization.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    })

    const newVersion = (current?.version || 0) + 1

    // Deactivate old versions
    await prisma.shopCustomization.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Create new active version
    const customization = await prisma.shopCustomization.create({
      data: {
        version: newVersion,
        isActive: true,
        config: config,
      },
    })

    return NextResponse.json({
      success: true,
      version: customization.version,
      updatedAt: customization.updatedAt,
    })
  } catch (error) {
    console.error("Update customization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
