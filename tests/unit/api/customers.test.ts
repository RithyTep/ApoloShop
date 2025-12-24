import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    order: {
      aggregate: vi.fn(),
    },
  },
}))

import { GET, POST, PUT } from '@/app/api/customers/route'
import { prisma } from '@/lib/prisma'

describe('Customers API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/customers', () => {
    it('should return customers list with stats', async () => {
      const mockCustomers = [
        {
          id: '1',
          name: 'John Doe',
          phone: '+855123456789',
          tags: ['VIP'],
          orders: [{ id: 'order-1', createdAt: new Date() }],
          _count: { orders: 5 },
        },
      ]

      vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers as never)
      vi.mocked(prisma.customer.count).mockResolvedValue(1)
      vi.mocked(prisma.order.aggregate).mockResolvedValue({
        _sum: { totalUsd: 150.5 },
      } as never)

      const request = new NextRequest('http://localhost:3000/api/customers')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers).toHaveLength(1)
      expect(data.customers[0].totalSpent).toBe(150.5)
      expect(data.customers[0].orderCount).toBe(5)
    })

    it('should filter by search term', async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])
      vi.mocked(prisma.customer.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/customers?search=john')
      await GET(request)

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ phone: expect.any(Object) }),
            ]),
          }),
        })
      )
    })

    it('should support pagination', async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])
      vi.mocked(prisma.customer.count).mockResolvedValue(50)

      const request = new NextRequest('http://localhost:3000/api/customers?page=2&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      )
      expect(data.pagination.totalPages).toBe(5)
    })
  })

  describe('POST /api/customers', () => {
    it('should create a customer with valid data', async () => {
      const newCustomer = {
        id: '1',
        name: 'New Customer',
        phone: '+855999888777',
        email: 'new@example.com',
        notes: 'Test customer',
        tags: ['New'],
      }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.customer.create).mockResolvedValue(newCustomer as never)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Customer',
          phone: '+855999888777',
          email: 'new@example.com',
          notes: 'Test customer',
          tags: ['New'],
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should reject duplicate phone number', async () => {
      const existingCustomer = { id: '1', phone: '+855111222333' }
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(existingCustomer as never)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate',
          phone: '+855111222333',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(409)
    })

    it('should reject invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // Invalid: empty
          phone: '', // Invalid: empty
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle optional email validation', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          phone: '+855777888999',
          email: 'invalid-email', // Invalid email format
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/customers', () => {
    it('should update a customer', async () => {
      const existingCustomer = { id: '1', name: 'Old Name', phone: '+855111222333' }
      const updatedCustomer = { ...existingCustomer, name: 'New Name' }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(existingCustomer as never)
      vi.mocked(prisma.customer.update).mockResolvedValue(updatedCustomer as never)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'PUT',
        body: JSON.stringify({ id: '1', name: 'New Name' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('New Name')
    })

    it('should return 404 for non-existent customer', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'PUT',
        body: JSON.stringify({ id: 'non-existent', name: 'Test' }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(404)
    })

    it('should reject duplicate phone when changing', async () => {
      const existingCustomer = { id: '1', name: 'Customer', phone: '+855111111111' }
      const otherCustomer = { id: '2', phone: '+855222222222' }

      vi.mocked(prisma.customer.findUnique)
        .mockResolvedValueOnce(existingCustomer as never) // First call for existing check
        .mockResolvedValueOnce(otherCustomer as never) // Second call for phone uniqueness

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'PUT',
        body: JSON.stringify({
          id: '1',
          phone: '+855222222222', // Trying to use another customer's phone
        }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(409)
    })

    it('should allow same phone for same customer', async () => {
      const existingCustomer = { id: '1', name: 'Customer', phone: '+855111111111' }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(existingCustomer as never)
      vi.mocked(prisma.customer.update).mockResolvedValue({ ...existingCustomer, name: 'Updated' } as never)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'PUT',
        body: JSON.stringify({
          id: '1',
          name: 'Updated',
          phone: '+855111111111', // Same phone
        }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })

    it('should update tags', async () => {
      const existingCustomer = { id: '1', name: 'Customer', phone: '+855111111111', tags: ['Old'] }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(existingCustomer as never)
      vi.mocked(prisma.customer.update).mockResolvedValue({ ...existingCustomer, tags: ['VIP', 'Frequent'] } as never)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'PUT',
        body: JSON.stringify({
          id: '1',
          tags: ['VIP', 'Frequent'],
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tags).toEqual(['VIP', 'Frequent'])
    })
  })
})
