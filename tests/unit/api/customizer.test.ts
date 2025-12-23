import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    shopCustomization: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { GET, PUT } from '@/app/api/customizer/route'
import { prisma } from '@/lib/prisma'

const mockConfig = {
  theme: {
    primaryColor: 'oklch(0.72 0.16 356)',
    accentColor: 'oklch(0.72 0.16 356)',
    backgroundColor: 'oklch(1 0 0)',
    textColor: 'oklch(0.15 0 0)',
    borderRadius: 0,
  },
  sections: [
    {
      id: 'hero-1',
      type: 'hero',
      enabled: true,
      order: 0,
      config: {
        mediaType: 'image',
        mediaUrl: '',
        titleEn: 'Welcome',
        titleKh: 'សូមស្វាគមន៍',
      },
    },
    {
      id: 'products-1',
      type: 'products',
      enabled: true,
      order: 1,
      config: {
        titleEn: 'Products',
        titleKh: 'ផលិតផល',
        displayType: 'featured',
        columns: 4,
        maxProducts: 8,
      },
    },
  ],
}

describe('Customizer API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/customizer', () => {
    it('should return existing customization config', async () => {
      const mockCustomization = {
        id: '1',
        version: 1,
        isActive: true,
        config: mockConfig,
        updatedAt: new Date(),
      }

      vi.mocked(prisma.shopCustomization.findFirst).mockResolvedValue(mockCustomization as never)

      const request = new NextRequest('http://localhost:3000/api/customizer')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.config).toEqual(mockConfig)
      expect(data.version).toBe(1)
    })

    it('should return default config when no customization exists', async () => {
      vi.mocked(prisma.shopCustomization.findFirst).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.config).toBeDefined()
      expect(data.config.theme).toBeDefined()
      expect(data.config.sections).toBeDefined()
      expect(data.version).toBe(0)
    })

    it('should return config with theme and sections', async () => {
      vi.mocked(prisma.shopCustomization.findFirst).mockResolvedValue({
        id: '1',
        version: 2,
        isActive: true,
        config: mockConfig,
        updatedAt: new Date(),
      } as never)

      const response = await GET()
      const data = await response.json()

      expect(data.config.theme.primaryColor).toBeDefined()
      expect(data.config.sections).toBeInstanceOf(Array)
      expect(data.config.sections.length).toBeGreaterThan(0)
    })
  })

  describe('PUT /api/customizer', () => {
    it('should create new customization version', async () => {
      const currentCustomization = {
        id: '1',
        version: 1,
        isActive: true,
        config: mockConfig,
      }

      vi.mocked(prisma.shopCustomization.findFirst).mockResolvedValue(currentCustomization as never)
      vi.mocked(prisma.shopCustomization.updateMany).mockResolvedValue({ count: 1 } as never)
      vi.mocked(prisma.shopCustomization.create).mockResolvedValue({
        id: '2',
        version: 2,
        isActive: true,
        config: mockConfig,
        updatedAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/customizer', {
        method: 'PUT',
        body: JSON.stringify({ config: mockConfig }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.version).toBe(2)
    })

    it('should increment version number', async () => {
      vi.mocked(prisma.shopCustomization.findFirst).mockResolvedValue({
        id: '1',
        version: 5,
        isActive: true,
        config: mockConfig,
      } as never)
      vi.mocked(prisma.shopCustomization.updateMany).mockResolvedValue({ count: 1 } as never)
      vi.mocked(prisma.shopCustomization.create).mockResolvedValue({
        id: '2',
        version: 6,
        isActive: true,
        config: mockConfig,
        updatedAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/customizer', {
        method: 'PUT',
        body: JSON.stringify({ config: mockConfig }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(data.version).toBe(6)
    })

    it('should reject request without config', async () => {
      const request = new NextRequest('http://localhost:3000/api/customizer', {
        method: 'PUT',
        body: JSON.stringify({}),
      })

      const response = await PUT(request)

      expect(response.status).toBe(400)
    })

    it('should deactivate old versions', async () => {
      vi.mocked(prisma.shopCustomization.findFirst).mockResolvedValue({
        id: '1',
        version: 1,
        isActive: true,
        config: mockConfig,
      } as never)
      vi.mocked(prisma.shopCustomization.updateMany).mockResolvedValue({ count: 1 } as never)
      vi.mocked(prisma.shopCustomization.create).mockResolvedValue({
        id: '2',
        version: 2,
        isActive: true,
        config: mockConfig,
        updatedAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/customizer', {
        method: 'PUT',
        body: JSON.stringify({ config: mockConfig }),
      })

      await PUT(request)

      expect(prisma.shopCustomization.updateMany).toHaveBeenCalledWith({
        where: { isActive: true },
        data: { isActive: false },
      })
    })
  })
})
