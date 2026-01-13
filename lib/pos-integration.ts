/**
 * POS Integration Service
 * Supports Square and Loyverse POS systems
 * Handles inventory sync, sales import, and customer database unification
 */

import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"
import crypto from "crypto"

// Types
export type POSProviderType = "SQUARE" | "LOYVERSE"
export type POSSyncStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
export type POSSyncDirection = "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL"
export type POSSyncType = "inventory" | "sales" | "customers" | "products" | "full"

export interface POSCredentials {
  accessToken: string
  refreshToken?: string
  locationId?: string
  merchantId?: string
}

export interface POSProduct {
  id: string
  name: string
  sku?: string
  price: number
  currency: "USD" | "KHR"
  stock: number
  variationId?: string
}

export interface POSSaleItem {
  productId?: string
  posItemId: string
  name: string
  quantity: number
  price: number
  discount?: number
}

export interface POSSaleData {
  transactionId: string
  receiptNumber?: string
  totalAmount: number
  currency: "USD" | "KHR"
  taxAmount?: number
  discountAmount?: number
  paymentMethod?: string
  customerId?: string
  posCustomerId?: string
  items: POSSaleItem[]
  saleDate: Date
}

export interface POSCustomer {
  id: string
  name: string
  phone?: string
  email?: string
}

export interface SyncResult {
  success: boolean
  created: number
  updated: number
  failed: number
  errors: string[]
}

// Square API Configuration
const SQUARE_API_BASE = "https://connect.squareup.com/v2"
const SQUARE_SANDBOX_BASE = "https://connect.squareupsandbox.com/v2"

// Loyverse API Configuration
const LOYVERSE_API_BASE = "https://api.loyverse.com/v1.0"

/**
 * Get the API base URL for Square based on environment
 */
function getSquareApiBase(): string {
  return process.env.SQUARE_ENVIRONMENT === "sandbox"
    ? SQUARE_SANDBOX_BASE
    : SQUARE_API_BASE
}

/**
 * Generate a webhook secret for a new POS provider
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Verify Square webhook signature
 */
export function verifySquareWebhook(
  body: string,
  signature: string,
  webhookSecret: string,
  signatureKey: string
): boolean {
  const hmac = crypto.createHmac("sha256", signatureKey)
  hmac.update(webhookSecret + body)
  const expectedSignature = hmac.digest("base64")
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Verify Loyverse webhook signature
 */
export function verifyLoyverseWebhook(
  body: string,
  signature: string,
  webhookSecret: string
): boolean {
  const hmac = crypto.createHmac("sha256", webhookSecret)
  hmac.update(body)
  const expectedSignature = hmac.digest("hex")
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// ============================================
// SQUARE INTEGRATION
// ============================================

interface SquareResponse<T> {
  data?: T
  errors?: Array<{ code: string; detail: string }>
}

async function squareRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: object
): Promise<SquareResponse<T>> {
  const decryptedToken = decrypt(accessToken)
  const response = await fetch(`${getSquareApiBase()}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${decryptedToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await response.json()
  if (!response.ok) {
    return { errors: json.errors || [{ code: "UNKNOWN", detail: response.statusText }] }
  }
  return { data: json }
}

/**
 * Fetch inventory from Square
 */
export async function fetchSquareInventory(
  accessToken: string,
  locationId: string
): Promise<POSProduct[]> {
  const products: POSProduct[] = []

  // Get catalog items
  const catalogResponse = await squareRequest<{ objects?: Array<{
    id: string
    item_data?: {
      name: string
      variations?: Array<{
        id: string
        item_variation_data?: {
          sku?: string
          price_money?: { amount: number; currency: string }
        }
      }>
    }
  }> }>(
    accessToken,
    "/catalog/list?types=ITEM"
  )

  if (catalogResponse.errors || !catalogResponse.data?.objects) {
    console.error("[POS/Square] Failed to fetch catalog:", catalogResponse.errors)
    return products
  }

  // Get inventory counts
  const catalogItemIds = catalogResponse.data.objects
    .flatMap(obj => obj.item_data?.variations?.map(v => v.id) || [])
    .filter(Boolean)

  if (catalogItemIds.length === 0) return products

  const inventoryResponse = await squareRequest<{ counts?: Array<{
    catalog_object_id: string
    quantity: string
  }> }>(
    accessToken,
    "/inventory/counts/batch-retrieve",
    "POST",
    {
      catalog_object_ids: catalogItemIds,
      location_ids: [locationId],
    }
  )

  const inventoryCounts = new Map(
    inventoryResponse.data?.counts?.map(c => [c.catalog_object_id, parseInt(c.quantity) || 0]) || []
  )

  // Map to POSProduct
  for (const obj of catalogResponse.data.objects) {
    if (!obj.item_data) continue

    for (const variation of obj.item_data.variations || []) {
      const varData = variation.item_variation_data
      products.push({
        id: obj.id,
        variationId: variation.id,
        name: obj.item_data.name,
        sku: varData?.sku,
        price: (varData?.price_money?.amount || 0) / 100,
        currency: (varData?.price_money?.currency === "KHR" ? "KHR" : "USD") as "USD" | "KHR",
        stock: inventoryCounts.get(variation.id) || 0,
      })
    }
  }

  return products
}

/**
 * Update Square inventory
 */
export async function updateSquareInventory(
  accessToken: string,
  locationId: string,
  variationId: string,
  quantity: number
): Promise<boolean> {
  const response = await squareRequest(
    accessToken,
    "/inventory/changes/batch-create",
    "POST",
    {
      idempotency_key: crypto.randomUUID(),
      changes: [{
        type: "ADJUSTMENT",
        adjustment: {
          catalog_object_id: variationId,
          location_id: locationId,
          quantity: quantity.toString(),
          occurred_at: new Date().toISOString(),
        },
      }],
    }
  )

  return !response.errors
}

/**
 * Fetch sales from Square
 */
export async function fetchSquareSales(
  accessToken: string,
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<POSSaleData[]> {
  const sales: POSSaleData[] = []

  const response = await squareRequest<{ orders?: Array<{
    id: string
    source?: { name?: string }
    total_money?: { amount: number; currency: string }
    total_tax_money?: { amount: number }
    total_discount_money?: { amount: number }
    tenders?: Array<{ type: string }>
    line_items?: Array<{
      catalog_object_id?: string
      name: string
      quantity: string
      base_price_money?: { amount: number }
      total_discount_money?: { amount: number }
    }>
    created_at: string
  }> }>(
    accessToken,
    "/orders/search",
    "POST",
    {
      location_ids: [locationId],
      query: {
        filter: {
          state_filter: { states: ["COMPLETED"] },
          date_time_filter: {
            created_at: {
              start_at: startDate.toISOString(),
              end_at: endDate.toISOString(),
            },
          },
        },
        sort: { sort_field: "CREATED_AT", sort_order: "DESC" },
      },
    }
  )

  if (response.errors || !response.data?.orders) {
    console.error("[POS/Square] Failed to fetch orders:", response.errors)
    return sales
  }

  for (const order of response.data.orders) {
    sales.push({
      transactionId: order.id,
      receiptNumber: order.source?.name,
      totalAmount: (order.total_money?.amount || 0) / 100,
      currency: (order.total_money?.currency === "KHR" ? "KHR" : "USD") as "USD" | "KHR",
      taxAmount: order.total_tax_money ? order.total_tax_money.amount / 100 : undefined,
      discountAmount: order.total_discount_money ? order.total_discount_money.amount / 100 : undefined,
      paymentMethod: order.tenders?.[0]?.type?.toLowerCase() || "unknown",
      items: (order.line_items || []).map(item => ({
        posItemId: item.catalog_object_id || "",
        name: item.name,
        quantity: parseInt(item.quantity) || 1,
        price: (item.base_price_money?.amount || 0) / 100,
        discount: item.total_discount_money ? item.total_discount_money.amount / 100 : undefined,
      })),
      saleDate: new Date(order.created_at),
    })
  }

  return sales
}

/**
 * Fetch customers from Square
 */
export async function fetchSquareCustomers(
  accessToken: string
): Promise<POSCustomer[]> {
  const customers: POSCustomer[] = []

  const response = await squareRequest<{ customers?: Array<{
    id: string
    given_name?: string
    family_name?: string
    phone_number?: string
    email_address?: string
  }> }>(
    accessToken,
    "/customers"
  )

  if (response.errors || !response.data?.customers) {
    console.error("[POS/Square] Failed to fetch customers:", response.errors)
    return customers
  }

  for (const customer of response.data.customers) {
    const name = [customer.given_name, customer.family_name].filter(Boolean).join(" ") || "Unknown"
    customers.push({
      id: customer.id,
      name,
      phone: customer.phone_number,
      email: customer.email_address,
    })
  }

  return customers
}

// ============================================
// LOYVERSE INTEGRATION
// ============================================

async function loyverseRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: object
): Promise<{ data?: T; error?: string }> {
  const decryptedToken = decrypt(accessToken)
  const response = await fetch(`${LOYVERSE_API_BASE}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${decryptedToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await response.json()
  if (!response.ok) {
    return { error: json.error?.message || response.statusText }
  }
  return { data: json }
}

/**
 * Fetch inventory from Loyverse
 */
export async function fetchLoyverseInventory(
  accessToken: string,
  storeId: string
): Promise<POSProduct[]> {
  const products: POSProduct[] = []

  // Get items
  const itemsResponse = await loyverseRequest<{ items?: Array<{
    id: string
    item_name: string
    sku?: string
    variants?: Array<{
      variant_id: string
      sku?: string
      default_price: number
      stores?: Array<{
        store_id: string
        in_stock: number
      }>
    }>
  }> }>(accessToken, "/items")

  if (itemsResponse.error || !itemsResponse.data?.items) {
    console.error("[POS/Loyverse] Failed to fetch items:", itemsResponse.error)
    return products
  }

  for (const item of itemsResponse.data.items) {
    for (const variant of item.variants || []) {
      const storeStock = variant.stores?.find(s => s.store_id === storeId)
      products.push({
        id: item.id,
        variationId: variant.variant_id,
        name: item.item_name,
        sku: variant.sku || item.sku,
        price: variant.default_price,
        currency: "USD", // Loyverse default
        stock: storeStock?.in_stock || 0,
      })
    }
  }

  return products
}

/**
 * Update Loyverse inventory
 */
export async function updateLoyverseInventory(
  accessToken: string,
  storeId: string,
  variantId: string,
  quantity: number
): Promise<boolean> {
  const response = await loyverseRequest(
    accessToken,
    "/inventory",
    "POST",
    {
      store_id: storeId,
      variant_id: variantId,
      in_stock: quantity,
    }
  )

  return !response.error
}

/**
 * Fetch sales from Loyverse
 */
export async function fetchLoyverseSales(
  accessToken: string,
  storeId: string,
  startDate: Date,
  endDate: Date
): Promise<POSSaleData[]> {
  const sales: POSSaleData[] = []

  const response = await loyverseRequest<{ receipts?: Array<{
    receipt_number: string
    total_money: number
    total_tax: number
    total_discount: number
    payment_type_id?: string
    customer_id?: string
    line_items?: Array<{
      item_id: string
      variant_id: string
      item_name: string
      quantity: number
      price: number
      total_discount: number
    }>
    receipt_date: string
  }> }>(
    accessToken,
    `/receipts?store_id=${storeId}&created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}`
  )

  if (response.error || !response.data?.receipts) {
    console.error("[POS/Loyverse] Failed to fetch receipts:", response.error)
    return sales
  }

  for (const receipt of response.data.receipts) {
    sales.push({
      transactionId: receipt.receipt_number,
      receiptNumber: receipt.receipt_number,
      totalAmount: receipt.total_money,
      currency: "USD",
      taxAmount: receipt.total_tax,
      discountAmount: receipt.total_discount,
      paymentMethod: receipt.payment_type_id || "unknown",
      posCustomerId: receipt.customer_id,
      items: (receipt.line_items || []).map(item => ({
        posItemId: item.variant_id || item.item_id,
        name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        discount: item.total_discount,
      })),
      saleDate: new Date(receipt.receipt_date),
    })
  }

  return sales
}

/**
 * Fetch customers from Loyverse
 */
export async function fetchLoyverseCustomers(
  accessToken: string
): Promise<POSCustomer[]> {
  const customers: POSCustomer[] = []

  const response = await loyverseRequest<{ customers?: Array<{
    id: string
    name: string
    phone_number?: string
    email?: string
  }> }>(accessToken, "/customers")

  if (response.error || !response.data?.customers) {
    console.error("[POS/Loyverse] Failed to fetch customers:", response.error)
    return customers
  }

  for (const customer of response.data.customers) {
    customers.push({
      id: customer.id,
      name: customer.name || "Unknown",
      phone: customer.phone_number,
      email: customer.email,
    })
  }

  return customers
}

// ============================================
// UNIFIED SYNC FUNCTIONS
// ============================================

/**
 * Create a new POS sync record
 */
export async function createPOSSync(
  providerId: string,
  direction: POSSyncDirection,
  syncType: POSSyncType,
  triggeredBy: "manual" | "scheduled" | "webhook"
): Promise<string> {
  const sync = await prisma.pOSSync.create({
    data: {
      providerId,
      direction,
      syncType,
      status: "PENDING",
      triggeredBy,
    },
  })
  return sync.id
}

/**
 * Update sync progress
 */
export async function updateSyncProgress(
  syncId: string,
  status: POSSyncStatus,
  progress?: {
    totalItems?: number
    processedItems?: number
    failedItems?: number
    summary?: object
    errorDetails?: string
  }
): Promise<void> {
  const updateData: Record<string, unknown> = { status }

  if (status === "IN_PROGRESS" && !progress?.totalItems) {
    updateData.startedAt = new Date()
  }

  if (status === "COMPLETED" || status === "FAILED") {
    updateData.completedAt = new Date()
  }

  if (progress) {
    if (progress.totalItems !== undefined) updateData.totalItems = progress.totalItems
    if (progress.processedItems !== undefined) updateData.processedItems = progress.processedItems
    if (progress.failedItems !== undefined) updateData.failedItems = progress.failedItems
    if (progress.summary !== undefined) updateData.summary = progress.summary
    if (progress.errorDetails !== undefined) updateData.errorDetails = progress.errorDetails
  }

  await prisma.pOSSync.update({
    where: { id: syncId },
    data: updateData,
  })
}

/**
 * Sync inventory from POS to ApoloShop
 */
export async function syncInventoryFromPOS(
  providerId: string,
  syncId: string
): Promise<SyncResult> {
  const result: SyncResult = { success: false, created: 0, updated: 0, failed: 0, errors: [] }

  try {
    const provider = await prisma.pOSProvider.findUnique({
      where: { id: providerId },
      include: { productMappings: true },
    })

    if (!provider || !provider.accessToken) {
      result.errors.push("Provider not found or not connected")
      return result
    }

    await updateSyncProgress(syncId, "IN_PROGRESS")

    // Fetch inventory from POS
    let posProducts: POSProduct[] = []

    if (provider.type === "SQUARE" && provider.locationId) {
      posProducts = await fetchSquareInventory(provider.accessToken, provider.locationId)
    } else if (provider.type === "LOYVERSE" && provider.locationId) {
      posProducts = await fetchLoyverseInventory(provider.accessToken, provider.locationId)
    }

    await updateSyncProgress(syncId, "IN_PROGRESS", { totalItems: posProducts.length })

    // Update mapped products
    for (const posProduct of posProducts) {
      try {
        const mapping = provider.productMappings.find(
          m => m.posItemId === posProduct.id || m.posVariationId === posProduct.variationId
        )

        if (mapping && mapping.syncInventory) {
          // Update ApoloShop inventory
          await prisma.inventory.updateMany({
            where: { productId: mapping.productId },
            data: {
              quantity: posProduct.stock,
              lastUpdated: new Date(),
            },
          })
          result.updated++
        }

        await updateSyncProgress(syncId, "IN_PROGRESS", {
          processedItems: result.updated + result.failed,
        })
      } catch (err) {
        result.failed++
        result.errors.push(`Failed to update ${posProduct.name}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    result.success = result.errors.length === 0
    await updateSyncProgress(syncId, result.success ? "COMPLETED" : "FAILED", {
      summary: { created: result.created, updated: result.updated, failed: result.failed },
      errorDetails: result.errors.length > 0 ? result.errors.join("\n") : undefined,
    })

    // Update provider last sync time
    await prisma.pOSProvider.update({
      where: { id: providerId },
      data: { lastSyncAt: new Date() },
    })

  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "Unknown error")
    await updateSyncProgress(syncId, "FAILED", { errorDetails: result.errors.join("\n") })
  }

  return result
}

/**
 * Import sales from POS to ApoloShop analytics
 */
export async function importSalesFromPOS(
  providerId: string,
  syncId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SyncResult> {
  const result: SyncResult = { success: false, created: 0, updated: 0, failed: 0, errors: [] }

  try {
    const provider = await prisma.pOSProvider.findUnique({
      where: { id: providerId },
      include: { productMappings: true, customerMappings: true },
    })

    if (!provider || !provider.accessToken) {
      result.errors.push("Provider not found or not connected")
      return result
    }

    await updateSyncProgress(syncId, "IN_PROGRESS")

    // Default to last 24 hours if no dates provided
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
    const end = endDate || new Date()

    // Fetch sales from POS
    let posSales: POSSaleData[] = []

    if (provider.type === "SQUARE" && provider.locationId) {
      posSales = await fetchSquareSales(provider.accessToken, provider.locationId, start, end)
    } else if (provider.type === "LOYVERSE" && provider.locationId) {
      posSales = await fetchLoyverseSales(provider.accessToken, provider.locationId, start, end)
    }

    await updateSyncProgress(syncId, "IN_PROGRESS", { totalItems: posSales.length })

    // Import sales
    for (const sale of posSales) {
      try {
        // Check if already imported
        const existing = await prisma.pOSSale.findUnique({
          where: { posTransactionId: sale.transactionId },
        })

        if (existing) {
          result.updated++
          continue
        }

        // Map customer if exists
        let customerId: string | undefined
        if (sale.posCustomerId) {
          const customerMapping = provider.customerMappings.find(
            m => m.posCustomerId === sale.posCustomerId
          )
          customerId = customerMapping?.customerId
        }

        // Map product IDs in items
        const mappedItems = sale.items.map(item => {
          const mapping = provider.productMappings.find(
            m => m.posItemId === item.posItemId || m.posVariationId === item.posItemId
          )
          return {
            ...item,
            productId: mapping?.productId,
          }
        })

        // Create POSSale record
        await prisma.pOSSale.create({
          data: {
            providerId,
            posTransactionId: sale.transactionId,
            posReceiptNumber: sale.receiptNumber,
            totalAmount: sale.totalAmount,
            currency: sale.currency,
            taxAmount: sale.taxAmount,
            discountAmount: sale.discountAmount,
            paymentMethod: sale.paymentMethod,
            customerId,
            posCustomerId: sale.posCustomerId,
            items: mappedItems,
            itemCount: mappedItems.length,
            saleDate: sale.saleDate,
          },
        })

        result.created++
        await updateSyncProgress(syncId, "IN_PROGRESS", {
          processedItems: result.created + result.updated + result.failed,
        })
      } catch (err) {
        result.failed++
        result.errors.push(`Failed to import sale ${sale.transactionId}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    result.success = result.errors.length === 0
    await updateSyncProgress(syncId, result.success ? "COMPLETED" : "FAILED", {
      summary: { created: result.created, updated: result.updated, failed: result.failed },
      errorDetails: result.errors.length > 0 ? result.errors.join("\n") : undefined,
    })

    // Update provider last sync time
    await prisma.pOSProvider.update({
      where: { id: providerId },
      data: { lastSyncAt: new Date() },
    })

  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "Unknown error")
    await updateSyncProgress(syncId, "FAILED", { errorDetails: result.errors.join("\n") })
  }

  return result
}

/**
 * Sync customers from POS to unified database
 */
export async function syncCustomersFromPOS(
  providerId: string,
  syncId: string
): Promise<SyncResult> {
  const result: SyncResult = { success: false, created: 0, updated: 0, failed: 0, errors: [] }

  try {
    const provider = await prisma.pOSProvider.findUnique({
      where: { id: providerId },
      include: { customerMappings: true },
    })

    if (!provider || !provider.accessToken) {
      result.errors.push("Provider not found or not connected")
      return result
    }

    await updateSyncProgress(syncId, "IN_PROGRESS")

    // Fetch customers from POS
    let posCustomers: POSCustomer[] = []

    if (provider.type === "SQUARE") {
      posCustomers = await fetchSquareCustomers(provider.accessToken)
    } else if (provider.type === "LOYVERSE") {
      posCustomers = await fetchLoyverseCustomers(provider.accessToken)
    }

    await updateSyncProgress(syncId, "IN_PROGRESS", { totalItems: posCustomers.length })

    for (const posCustomer of posCustomers) {
      try {
        // Check if already mapped
        const existingMapping = provider.customerMappings.find(
          m => m.posCustomerId === posCustomer.id
        )

        if (existingMapping) {
          // Update existing customer
          await prisma.customer.update({
            where: { id: existingMapping.customerId },
            data: {
              name: posCustomer.name,
              ...(posCustomer.email && { email: posCustomer.email }),
            },
          })
          result.updated++
        } else {
          // Try to find by phone
          let customer = posCustomer.phone
            ? await prisma.customer.findUnique({ where: { phone: posCustomer.phone } })
            : null

          if (!customer) {
            // Create new customer
            customer = await prisma.customer.create({
              data: {
                name: posCustomer.name,
                phone: posCustomer.phone || `pos-${posCustomer.id}`,
                email: posCustomer.email,
                clientId: provider.clientId,
              },
            })
            result.created++
          } else {
            result.updated++
          }

          // Create mapping
          await prisma.pOSCustomerMapping.create({
            data: {
              providerId,
              customerId: customer.id,
              posCustomerId: posCustomer.id,
            },
          })
        }

        await updateSyncProgress(syncId, "IN_PROGRESS", {
          processedItems: result.created + result.updated + result.failed,
        })
      } catch (err) {
        result.failed++
        result.errors.push(`Failed to sync customer ${posCustomer.name}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    result.success = result.errors.length === 0
    await updateSyncProgress(syncId, result.success ? "COMPLETED" : "FAILED", {
      summary: { created: result.created, updated: result.updated, failed: result.failed },
      errorDetails: result.errors.length > 0 ? result.errors.join("\n") : undefined,
    })

  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "Unknown error")
    await updateSyncProgress(syncId, "FAILED", { errorDetails: result.errors.join("\n") })
  }

  return result
}

/**
 * Update inventory in POS from ApoloShop (real-time sync)
 */
export async function pushInventoryToPOS(
  providerId: string,
  productId: string,
  newQuantity: number
): Promise<boolean> {
  try {
    const provider = await prisma.pOSProvider.findUnique({
      where: { id: providerId },
      include: {
        productMappings: {
          where: { productId },
        },
      },
    })

    if (!provider || !provider.accessToken || !provider.syncInventory) {
      return false
    }

    const mapping = provider.productMappings[0]
    if (!mapping || !mapping.syncInventory) {
      return false
    }

    const variationId = mapping.posVariationId || mapping.posItemId

    if (provider.type === "SQUARE" && provider.locationId) {
      return await updateSquareInventory(
        provider.accessToken,
        provider.locationId,
        variationId,
        newQuantity
      )
    } else if (provider.type === "LOYVERSE" && provider.locationId) {
      return await updateLoyverseInventory(
        provider.accessToken,
        provider.locationId,
        variationId,
        newQuantity
      )
    }

    return false
  } catch (err) {
    console.error("[POS] Failed to push inventory:", err)
    return false
  }
}

/**
 * Handle real-time stock update from webhook
 */
export async function handlePOSInventoryWebhook(
  providerId: string,
  posItemId: string,
  newQuantity: number
): Promise<boolean> {
  try {
    const mapping = await prisma.pOSProductMapping.findFirst({
      where: {
        providerId,
        OR: [
          { posItemId },
          { posVariationId: posItemId },
        ],
      },
    })

    if (!mapping || !mapping.syncInventory) {
      return false
    }

    await prisma.inventory.updateMany({
      where: { productId: mapping.productId },
      data: {
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
    })

    return true
  } catch (err) {
    console.error("[POS] Failed to handle inventory webhook:", err)
    return false
  }
}

/**
 * Test POS connection
 */
export async function testPOSConnection(
  type: POSProviderType,
  accessToken: string,
  locationId?: string
): Promise<{ success: boolean; error?: string; merchantId?: string }> {
  try {
    if (type === "SQUARE") {
      const response = await squareRequest<{ merchant?: { id: string } }>(
        accessToken,
        "/merchants/me"
      )
      if (response.errors) {
        return { success: false, error: response.errors[0]?.detail || "Unknown error" }
      }
      return { success: true, merchantId: response.data?.merchant?.id }
    } else if (type === "LOYVERSE") {
      const response = await loyverseRequest<{ owner?: { id: string } }>(
        accessToken,
        "/owner"
      )
      if (response.error) {
        return { success: false, error: response.error }
      }
      return { success: true, merchantId: response.data?.owner?.id }
    }
    return { success: false, error: "Unknown provider type" }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Connection failed" }
  }
}
