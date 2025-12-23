import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
  compare: vi.fn(),
}))

vi.mock('@/lib/jwt', () => ({
  signToken: vi.fn(() => 'mock-token'),
  verifyToken: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = {
        id: 'user-1',
        email: 'admin@apolodev.com',
        passwordHash: 'hashed-password',
        name: 'Admin',
        role: { name: 'admin', permissions: {} },
        isActive: true,
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'session-1',
        token: 'mock-token',
      } as never)

      // Import after mocks
      const { POST } = await import('@/app/api/auth/login/route')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@apolodev.com',
          password: 'admin123',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should reject invalid email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const { POST } = await import('@/app/api/auth/login/route')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'password',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should reject wrong password', async () => {
      const user = {
        id: 'user-1',
        email: 'admin@apolodev.com',
        passwordHash: 'hashed-password',
        isActive: true,
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      const { POST } = await import('@/app/api/auth/login/route')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@apolodev.com',
          password: 'wrongpassword',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should reject inactive user', async () => {
      const user = {
        id: 'user-1',
        email: 'inactive@test.com',
        passwordHash: 'hashed-password',
        isActive: false,
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never)

      const { POST } = await import('@/app/api/auth/login/route')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'inactive@test.com',
          password: 'password',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout and clear session', async () => {
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 })

      const { POST } = await import('@/app/api/auth/logout/route')

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: 'auth-token=mock-token',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/auth/session', () => {
    it('should return session for valid token', async () => {
      const session = {
        id: 'session-1',
        user: {
          id: 'user-1',
          email: 'admin@apolodev.com',
          name: 'Admin',
          role: { name: 'admin' },
        },
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(session as never)

      const { GET } = await import('@/app/api/auth/session/route')

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: 'auth-token=mock-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authenticated).toBe(true)
      expect(data.user.email).toBe('admin@apolodev.com')
    })

    it('should return unauthenticated for missing token', async () => {
      const { GET } = await import('@/app/api/auth/session/route')

      const request = new NextRequest('http://localhost:3000/api/auth/session')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authenticated).toBe(false)
    })

    it('should return unauthenticated for expired session', async () => {
      const session = {
        id: 'session-1',
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago (expired)
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(session as never)

      const { GET } = await import('@/app/api/auth/session/route')

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: 'auth-token=expired-token',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authenticated).toBe(false)
    })
  })
})
