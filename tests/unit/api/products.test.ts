import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    inventory: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { GET, POST, PUT, DELETE } from '@/app/api/products/route'
import { prisma } from '@/lib/prisma'

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/products', () => {
    it('should return products list', async () => {
      const mockProducts = [
        { id: '1', nameEn: 'Espresso', priceUsd: 2.5, isActive: true },
        { id: '2', nameEn: 'Latte', priceUsd: 4.0, isActive: true },
      ]

      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as never)
      vi.mocked(prisma.product.count).mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
    })

    it('should filter by categoryId', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([])
      vi.mocked(prisma.product.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/products?categoryId=cat-1')
      await GET(request)

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-1' }),
        })
      )
    })

    it('should support search', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([])
      vi.mocked(prisma.product.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/products?search=coffee')
      await GET(request)

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ nameEn: expect.any(Object) }),
            ]),
          }),
        })
      )
    })
  })

  describe('POST /api/products', () => {
    it('should create a product with valid data', async () => {
      const newProduct = {
        id: '1',
        nameEn: 'New Coffee',
        nameKh: 'កាហ្វេថ្មី',
        priceUsd: 3.5,
        priceKhr: 14000,
        categoryId: 'cat-1',
        sku: 'NEW-001',
        isActive: true,
      }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.product.create).mockResolvedValue(newProduct as never)

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.nameEn).toBe('New Coffee')
    })

    it('should reject duplicate SKU', async () => {
      const existingProduct = { id: '1', sku: 'EXIST-001' }
      vi.mocked(prisma.product.findUnique).mockResolvedValue(existingProduct as never)

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          nameEn: 'Test',
          nameKh: 'Test',
          priceUsd: 1,
          priceKhr: 4000,
          categoryId: 'cat-1',
          sku: 'EXIST-001',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(409)
    })

    it('should reject invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          nameEn: '', // Invalid: empty
          priceUsd: -1, // Invalid: negative
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/products', () => {
    it('should update a product', async () => {
      const existingProduct = { id: '1', nameEn: 'Old Name', sku: 'SKU-001' }
      const updatedProduct = { ...existingProduct, nameEn: 'New Name' }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(existingProduct as never)
      vi.mocked(prisma.product.update).mockResolvedValue(updatedProduct as never)

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'PUT',
        body: JSON.stringify({ id: '1', nameEn: 'New Name' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.nameEn).toBe('New Name')
    })

    it('should return 404 for non-existent product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'PUT',
        body: JSON.stringify({ id: 'non-existent', nameEn: 'Test' }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/products', () => {
    it('should delete a product without orders', async () => {
      const product = { id: '1', orderItems: [] }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(product as never)
      vi.mocked(prisma.$transaction).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/products?id=1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should soft delete a product with orders', async () => {
      const product = { id: '1', orderItems: [{ id: 'order-1' }] }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(product as never)
      vi.mocked(prisma.product.update).mockResolvedValue({ ...product, isActive: false } as never)

      const request = new NextRequest('http://localhost:3000/api/products?id=1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.softDeleted).toBe(true)
    })

    it('should require product ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(400)
    })
  })
})
