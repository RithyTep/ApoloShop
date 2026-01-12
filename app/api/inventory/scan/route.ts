import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { searchBySKU, validateBarcode, generateEAN13FromSKU } from "@/lib/sku-barcode"

/**
 * POST /api/inventory/scan
 * Quick inventory update via barcode/SKU scan
 * Body: { code, action, quantity?, reason? }
 * action: 'lookup' | 'add' | 'subtract' | 'set'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, action = 'lookup', quantity = 1, reason } = body

    if (!code) {
      return NextResponse.json(
        { error: "Barcode or SKU code is required" },
        { status: 400 }
      )
    }

    // Validate the barcode/SKU format
    const barcodeInfo = validateBarcode(code)

    // First, try to find product by exact SKU match
    let product = await prisma.product.findFirst({
      where: { sku: code.toUpperCase() },
      include: {
        category: { select: { id: true, nameEn: true, nameKh: true } },
        inventory: true,
      },
    })

    // If not found by SKU, check if it's a generated barcode
    if (!product) {
      // Search all products and check if barcode matches
      const allProducts = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: { select: { id: true, nameEn: true, nameKh: true } },
          inventory: true,
        },
      })

      for (const p of allProducts) {
        const generatedBarcode = generateEAN13FromSKU(p.sku)
        if (generatedBarcode === code || p.sku === code) {
          product = p
          break
        }
      }
    }

    if (!product) {
      return NextResponse.json({
        success: false,
        error: "Product not found",
        code,
        barcodeInfo,
        suggestions: await searchBySKU(code.substring(0, 4), { limit: 5 }),
      }, { status: 404 })
    }

    // Lookup only - return product info
    if (action === 'lookup') {
      return NextResponse.json({
        success: true,
        action: 'lookup',
        product: {
          id: product.id,
          sku: product.sku,
          barcode: generateEAN13FromSKU(product.sku),
          nameEn: product.nameEn,
          nameKh: product.nameKh,
          priceUsd: product.priceUsd,
          priceKhr: product.priceKhr,
          imageUrl: product.imageUrl,
          isActive: product.isActive,
          category: product.category,
        },
        inventory: product.inventory ? {
          id: product.inventory.id,
          quantity: product.inventory.quantity,
          minLevel: product.inventory.minLevel,
          lastUpdated: product.inventory.lastUpdated,
        } : null,
        barcodeInfo,
      })
    }

    // Inventory actions require quantity validation
    if (!['add', 'subtract', 'set'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: lookup, add, subtract, or set" },
        { status: 400 }
      )
    }

    const numQuantity = parseInt(quantity, 10)
    if (isNaN(numQuantity) || numQuantity < 0) {
      return NextResponse.json(
        { error: "Quantity must be a non-negative number" },
        { status: 400 }
      )
    }

    // Get current inventory
    let inventory = product.inventory

    if (!inventory) {
      // Create inventory record if it doesn't exist
      inventory = await prisma.inventory.create({
        data: {
          productId: product.id,
          quantity: 0,
          minLevel: 10,
        },
      })
    }

    // Calculate new quantity based on action
    let newQuantity: number
    switch (action) {
      case 'add':
        newQuantity = inventory.quantity + numQuantity
        break
      case 'subtract':
        newQuantity = Math.max(0, inventory.quantity - numQuantity)
        break
      case 'set':
        newQuantity = numQuantity
        break
      default:
        newQuantity = inventory.quantity
    }

    // Update inventory
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      action,
      product: {
        id: product.id,
        sku: product.sku,
        barcode: generateEAN13FromSKU(product.sku),
        nameEn: product.nameEn,
        nameKh: product.nameKh,
        imageUrl: product.imageUrl,
        category: product.category,
      },
      inventory: {
        id: updatedInventory.id,
        previousQuantity: inventory.quantity,
        newQuantity: updatedInventory.quantity,
        change: newQuantity - inventory.quantity,
        minLevel: updatedInventory.minLevel,
        lastUpdated: updatedInventory.lastUpdated,
      },
      reason,
      barcodeInfo,
    })
  } catch (error) {
    console.error("Inventory scan error:", error)
    return NextResponse.json(
      { error: "Failed to process scan" },
      { status: 500 }
    )
  }
}
