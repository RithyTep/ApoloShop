import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AWS SDK before any imports
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class MockS3Client {
      send = vi.fn().mockResolvedValue({})
    },
    PutObjectCommand: class MockPutObjectCommand {
      constructor(public input: unknown) {}
    },
    DeleteObjectCommand: class MockDeleteObjectCommand {
      constructor(public input: unknown) {}
    },
  }
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned-url.example.com'),
}))

describe('R2 Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateFileName', () => {
    it('should generate unique filename with timestamp', async () => {
      // Dynamic import to get fresh module
      const { generateFileName } = await import('@/lib/r2')

      const fileName1 = generateFileName('test.jpg')
      const fileName2 = generateFileName('test.jpg')

      // Should have .jpg extension
      expect(fileName1).toMatch(/\.jpg$/)
      expect(fileName2).toMatch(/\.jpg$/)

      // Should match expected format: timestamp-random.ext
      expect(fileName1).toMatch(/^\d+-[a-z0-9]+\.jpg$/)
    })

    it('should preserve file extension', async () => {
      const { generateFileName } = await import('@/lib/r2')

      expect(generateFileName('photo.png')).toMatch(/\.png$/)
      expect(generateFileName('image.webp')).toMatch(/\.webp$/)
      expect(generateFileName('doc.PDF')).toMatch(/\.pdf$/) // lowercase
    })

    it('should handle multiple dots in filename', async () => {
      const { generateFileName } = await import('@/lib/r2')
      expect(generateFileName('my.photo.file.png')).toMatch(/\.png$/)
    })

    it('should use last part as extension even for unusual names', async () => {
      const { generateFileName } = await import('@/lib/r2')
      // For 'noextension', it takes 'noextension' as the extension
      const result = generateFileName('noextension')
      expect(result).toMatch(/^\d+-[a-z0-9]+\.noextension$/)
    })
  })

  describe('getPublicUrl', () => {
    it('should return a valid URL with the key', async () => {
      const { getPublicUrl } = await import('@/lib/r2')
      const url = getPublicUrl('uploads/test.jpg')

      // Should return a URL containing the key
      expect(url).toContain('uploads/test.jpg')
      expect(url).toMatch(/^https?:\/\//)
    })

    it('should handle keys with nested folders', async () => {
      const { getPublicUrl } = await import('@/lib/r2')
      const url = getPublicUrl('products/images/photo.jpg')

      expect(url).toContain('products/images/photo.jpg')
    })
  })

  describe('extractKeyFromUrl', () => {
    it('should extract key from r2.dev URL', async () => {
      const { extractKeyFromUrl } = await import('@/lib/r2')
      const key = extractKeyFromUrl('https://pub-abc123.r2.dev/uploads/image.png')
      expect(key).toBe('uploads/image.png')
    })

    it('should return null for empty URL', async () => {
      const { extractKeyFromUrl } = await import('@/lib/r2')
      expect(extractKeyFromUrl('')).toBeNull()
    })

    it('should return null for non-R2 URLs', async () => {
      const { extractKeyFromUrl } = await import('@/lib/r2')
      expect(extractKeyFromUrl('https://other-domain.com/image.jpg')).toBeNull()
    })

    it('should handle nested folder paths in r2.dev URL', async () => {
      const { extractKeyFromUrl } = await import('@/lib/r2')
      const key = extractKeyFromUrl('https://pub-xyz.r2.dev/products/category/image.jpg')
      expect(key).toBe('products/category/image.jpg')
    })

    it('should extract key from cloudflarestorage URL', async () => {
      const { extractKeyFromUrl } = await import('@/lib/r2')
      const key = extractKeyFromUrl('https://account.r2.cloudflarestorage.com/bucket/folder/file.jpg')
      expect(key).toBe('folder/file.jpg')
    })
  })
})
