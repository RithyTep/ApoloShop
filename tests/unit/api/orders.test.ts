import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    inventory: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { GET, POST, PUT } from '@/app/api/orders/route'
import { prisma } from '@/lib/prisma'

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/orders', () => {
    it('should return orders list', async () => {
      const mockOrders = [
        { id: '1', orderNumber: 'ORD-001', status: 'NEW', totalUsd: 10 },
        { id: '2', orderNumber: 'ORD-002', status: 'COMPLETED', totalUsd: 25 },
      ]

      vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as never)
      vi.mocked(prisma.order.count).mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/orders')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(2)
    })

    it('should filter by status', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([])
      vi.mocked(prisma.order.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/orders?status=NEW')
      await GET(request)

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'NEW' }),
        })
      )
    })
  })

  describe('POST /api/orders', () => {
    it('should create an order with existing customer', async () => {
      const customer = { id: 'cust-1', name: 'John', phone: '+855123456789' }
      const product = { id: 'prod-1', priceUsd: 5, priceKhr: 20000, nameEn: 'Coffee' }
      const newOrder = {
        id: 'order-1',
        orderNumber: 'ORD-20251223-001',
        status: 'NEW',
        totalUsd: 10,
        totalKhr: 40000,
        customer,
        items: [],
      }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(customer as never)
      vi.mocked(prisma.product.findMany).mockResolvedValue([product] as never)
      vi.mocked(prisma.order.create).mockResolvedValue(newOrder as never)
      vi.mocked(prisma.inventory.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'John',
          customerPhone: '+855123456789',
          items: [{ productId: 'prod-1', quantity: 2 }],
          channel: 'WEBSITE',
          currency: 'USD',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should create customer if not exists', async () => {
      const newCustomer = { id: 'cust-new', name: 'New Customer', phone: '+855999888777' }
      const product = { id: 'prod-1', priceUsd: 5, priceKhr: 20000, nameEn: 'Coffee' }
      const newOrder = { id: 'order-1', orderNumber: 'ORD-001', customer: newCustomer, items: [] }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.customer.create).mockResolvedValue(newCustomer as never)
      vi.mocked(prisma.product.findMany).mockResolvedValue([product] as never)
      vi.mocked(prisma.order.create).mockResolvedValue(newOrder as never)
      vi.mocked(prisma.inventory.updateMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'New Customer',
          customerPhone: '+855999888777',
          items: [{ productId: 'prod-1', quantity: 1 }],
          channel: 'WEBSITE',
          currency: 'USD',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('PUT /api/orders (Status Transitions)', () => {
    const validTransitions = [
      { from: 'NEW', to: 'CONFIRMED' },
      { from: 'CONFIRMED', to: 'PREPARING' },
      { from: 'PREPARING', to: 'READY' },
      { from: 'READY', to: 'COMPLETED' },
      { from: 'NEW', to: 'CANCELLED' },
    ]

    validTransitions.forEach(({ from, to }) => {
      it(`should allow ${from} → ${to}`, async () => {
        const order = { id: '1', status: from }
        const updatedOrder = { ...order, status: to }

        vi.mocked(prisma.order.findUnique).mockResolvedValue(order as never)
        vi.mocked(prisma.order.update).mockResolvedValue(updatedOrder as never)

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'PUT',
          body: JSON.stringify({ id: '1', status: to }),
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.status).toBe(to)
      })
    })

    const invalidTransitions = [
      { from: 'COMPLETED', to: 'NEW' },
      { from: 'CANCELLED', to: 'CONFIRMED' },
      { from: 'READY', to: 'NEW' },
    ]

    invalidTransitions.forEach(({ from, to }) => {
      it(`should reject ${from} → ${to}`, async () => {
        const order = { id: '1', status: from }

        vi.mocked(prisma.order.findUnique).mockResolvedValue(order as never)

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'PUT',
          body: JSON.stringify({ id: '1', status: to }),
        })

        const response = await PUT(request)

        expect(response.status).toBe(400)
      })
    })

    it('should return 404 for non-existent order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'PUT',
        body: JSON.stringify({ id: 'non-existent', status: 'CONFIRMED' }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(404)
    })
  })
})
