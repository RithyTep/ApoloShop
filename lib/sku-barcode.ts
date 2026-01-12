/**
 * SKU and Barcode Utilities
 *
 * Auto-generate SKU based on category/product name
 * Support barcode generation and validation
 */

import prisma from "@/lib/prisma"

// SKU Generation Configuration
export interface SKUConfig {
  categoryPrefix?: boolean  // Include category code in SKU
  includeDate?: boolean     // Include creation date
  maxLength?: number        // Maximum SKU length
}

const DEFAULT_SKU_CONFIG: SKUConfig = {
  categoryPrefix: true,
  includeDate: false,
  maxLength: 20,
}

/**
 * Generate a category code from category name
 * Takes first 3 letters of category slug or name, uppercased
 */
export function getCategoryCode(categorySlug: string): string {
  // Remove special characters and take first 3 chars
  const clean = categorySlug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return clean.substring(0, 3).padEnd(3, 'X')
}

/**
 * Generate a product code from product name
 * Takes first letter of each word (max 4), uppercased
 */
export function getProductCode(productName: string): string {
  const words = productName.trim().split(/\s+/)
  const initials = words
    .slice(0, 4)
    .map(word => word.charAt(0).toUpperCase())
    .filter(char => /[A-Z]/.test(char))
    .join('')
  return initials.padEnd(2, 'X').substring(0, 4)
}

/**
 * Generate a unique sequence number
 * Queries database to find next available number for the prefix
 */
export async function getNextSequenceNumber(prefix: string): Promise<string> {
  // Find existing SKUs with this prefix
  const existingSkus = await prisma.product.findMany({
    where: {
      sku: {
        startsWith: prefix,
      },
    },
    select: { sku: true },
    orderBy: { sku: 'desc' },
  })

  if (existingSkus.length === 0) {
    return '001'
  }

  // Extract highest number from existing SKUs
  let maxNum = 0
  for (const { sku } of existingSkus) {
    const suffix = sku.replace(prefix, '')
    const num = parseInt(suffix, 10)
    if (!isNaN(num) && num > maxNum) {
      maxNum = num
    }
  }

  const nextNum = maxNum + 1
  return nextNum.toString().padStart(3, '0')
}

/**
 * Auto-generate SKU based on category and product name
 * Format: {CAT}-{PROD}{SEQ}
 * Example: COF-LC001 (Coffee category, Latte Coffee, sequence 001)
 */
export async function generateSKU(
  categorySlug: string,
  productName: string,
  config: SKUConfig = DEFAULT_SKU_CONFIG
): Promise<string> {
  const parts: string[] = []

  if (config.categoryPrefix) {
    parts.push(getCategoryCode(categorySlug))
  }

  const productCode = getProductCode(productName)
  const prefix = config.categoryPrefix ? `${parts[0]}-${productCode}` : productCode
  const sequence = await getNextSequenceNumber(prefix)

  let sku = `${prefix}${sequence}`

  // Truncate to max length if needed
  if (config.maxLength && sku.length > config.maxLength) {
    sku = sku.substring(0, config.maxLength)
  }

  return sku
}

/**
 * Generate SKU without database lookup (for preview/suggestion)
 */
export function generateSKUPreview(
  categorySlug: string,
  productName: string,
  config: SKUConfig = DEFAULT_SKU_CONFIG
): string {
  const parts: string[] = []

  if (config.categoryPrefix) {
    parts.push(getCategoryCode(categorySlug))
  }

  const productCode = getProductCode(productName)
  const prefix = config.categoryPrefix ? `${parts[0]}-${productCode}` : productCode

  return `${prefix}XXX` // XXX as placeholder for sequence
}

/**
 * Validate SKU format
 */
export function validateSKU(sku: string): { valid: boolean; error?: string } {
  if (!sku || sku.length === 0) {
    return { valid: false, error: 'SKU is required' }
  }

  if (sku.length < 3) {
    return { valid: false, error: 'SKU must be at least 3 characters' }
  }

  if (sku.length > 30) {
    return { valid: false, error: 'SKU must be at most 30 characters' }
  }

  // Only allow alphanumeric and hyphens
  if (!/^[A-Za-z0-9-]+$/.test(sku)) {
    return { valid: false, error: 'SKU can only contain letters, numbers, and hyphens' }
  }

  return { valid: true }
}

// ============================================
// Barcode Types and Validation
// ============================================

export type BarcodeFormat =
  | 'EAN13'      // European Article Number (13 digits)
  | 'EAN8'       // Short EAN (8 digits)
  | 'UPC'        // Universal Product Code (12 digits)
  | 'CODE128'    // Alphanumeric (variable length)
  | 'CODE39'     // Alphanumeric (variable length)
  | 'QR'         // QR Code

export interface BarcodeInfo {
  format: BarcodeFormat
  value: string
  isValid: boolean
  checksum?: string
}

/**
 * Calculate EAN-13 check digit
 */
function calculateEAN13Checksum(digits: string): number {
  if (digits.length !== 12) return -1

  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10)
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit
}

/**
 * Calculate UPC check digit
 */
function calculateUPCChecksum(digits: string): number {
  if (digits.length !== 11) return -1

  let sumOdd = 0
  let sumEven = 0

  for (let i = 0; i < 11; i++) {
    const digit = parseInt(digits[i], 10)
    if (i % 2 === 0) {
      sumOdd += digit
    } else {
      sumEven += digit
    }
  }

  const total = (sumOdd * 3) + sumEven
  const checkDigit = (10 - (total % 10)) % 10
  return checkDigit
}

/**
 * Validate barcode format and value
 */
export function validateBarcode(value: string): BarcodeInfo {
  // Clean value - remove spaces
  const cleanValue = value.replace(/\s/g, '')

  // Detect format based on length and content
  if (/^\d{13}$/.test(cleanValue)) {
    // EAN-13
    const digits = cleanValue.substring(0, 12)
    const expectedChecksum = calculateEAN13Checksum(digits)
    const actualChecksum = parseInt(cleanValue[12], 10)
    return {
      format: 'EAN13',
      value: cleanValue,
      isValid: expectedChecksum === actualChecksum,
      checksum: expectedChecksum.toString(),
    }
  }

  if (/^\d{8}$/.test(cleanValue)) {
    // EAN-8
    return {
      format: 'EAN8',
      value: cleanValue,
      isValid: true, // Simplified validation
    }
  }

  if (/^\d{12}$/.test(cleanValue)) {
    // UPC-A
    const digits = cleanValue.substring(0, 11)
    const expectedChecksum = calculateUPCChecksum(digits)
    const actualChecksum = parseInt(cleanValue[11], 10)
    return {
      format: 'UPC',
      value: cleanValue,
      isValid: expectedChecksum === actualChecksum,
      checksum: expectedChecksum.toString(),
    }
  }

  // CODE128/CODE39 - alphanumeric
  if (/^[A-Za-z0-9\-\.\$\/\+%\s]+$/.test(cleanValue) && cleanValue.length >= 1) {
    return {
      format: 'CODE128',
      value: cleanValue,
      isValid: true,
    }
  }

  return {
    format: 'CODE128',
    value: cleanValue,
    isValid: false,
  }
}

/**
 * Generate EAN-13 barcode from SKU
 * Converts SKU to a valid EAN-13 by padding/hashing
 */
export function generateEAN13FromSKU(sku: string): string {
  // Create a numeric representation from SKU
  let numericValue = ''

  for (const char of sku.toUpperCase()) {
    if (/\d/.test(char)) {
      numericValue += char
    } else if (/[A-Z]/.test(char)) {
      // Convert letter to 2-digit number (A=10, B=11, etc.)
      numericValue += (char.charCodeAt(0) - 55).toString().padStart(2, '0')
    }
  }

  // Pad or truncate to 12 digits
  numericValue = numericValue.padEnd(12, '0').substring(0, 12)

  // Calculate check digit
  const checkDigit = calculateEAN13Checksum(numericValue)

  return numericValue + checkDigit.toString()
}

/**
 * Product barcode data for label printing
 */
export interface BarcodeLabelData {
  sku: string
  barcode: string
  barcodeFormat: BarcodeFormat
  productName: string
  price: string
  categoryName?: string
}

/**
 * Generate barcode label data for a product
 */
export function generateBarcodeLabelData(product: {
  sku: string
  nameEn: string
  priceUsd: number | string
  category?: { nameEn: string }
}): BarcodeLabelData {
  const barcode = generateEAN13FromSKU(product.sku)

  return {
    sku: product.sku,
    barcode,
    barcodeFormat: 'EAN13',
    productName: product.nameEn,
    price: `$${Number(product.priceUsd).toFixed(2)}`,
    categoryName: product.category?.nameEn,
  }
}

// ============================================
// SKU Search Utilities
// ============================================

export interface SKUSearchResult {
  productId: string
  sku: string
  productName: string
  categoryName: string
  stock: number
  isActive: boolean
}

/**
 * Search products by SKU (exact or partial match)
 */
export async function searchBySKU(
  query: string,
  options: { exact?: boolean; limit?: number } = {}
): Promise<SKUSearchResult[]> {
  const { exact = false, limit = 10 } = options

  const products = await prisma.product.findMany({
    where: exact
      ? { sku: query.toUpperCase() }
      : { sku: { contains: query.toUpperCase(), mode: 'insensitive' } },
    include: {
      category: { select: { nameEn: true } },
      inventory: { select: { quantity: true } },
    },
    take: limit,
  })

  return products.map(p => ({
    productId: p.id,
    sku: p.sku,
    productName: p.nameEn,
    categoryName: p.category.nameEn,
    stock: p.inventory?.quantity ?? 0,
    isActive: p.isActive,
  }))
}
