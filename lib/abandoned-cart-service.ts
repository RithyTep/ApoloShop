/**
 * Abandoned Cart Recovery Service
 * Enhanced service for abandoned cart tracking and recovery with discount support
 */

import { prisma } from "@/lib/prisma"
import { sendMarketingEmail, type CartItem } from "@/lib/email-marketing"

// Recovery discount configuration
export interface RecoveryDiscount {
  code?: string       // Optional coupon code to include
  percent?: number    // Percentage discount (e.g., 10 for 10%)
  amount?: number     // Fixed amount discount
  expiresIn?: number  // Hours until discount expires (default: 24)
}

// Default discount for email sequence
const EMAIL_DISCOUNTS: Record<1 | 2 | 3, RecoveryDiscount | null> = {
  1: null,                               // No discount on first email
  2: { percent: 5, expiresIn: 24 },      // 5% off after 24 hours
  3: { percent: 10, expiresIn: 12 },     // 10% off (last chance)
}

/**
 * Get or create discount code for recovery email
 */
async function getRecoveryDiscountCode(
  cartId: string,
  discount: RecoveryDiscount
): Promise<string | null> {
  if (!discount.percent && !discount.amount) return null

  // Check if a custom code was provided
  if (discount.code) {
    // Verify the coupon exists
    const coupon = await prisma.coupon.findUnique({
      where: { code: discount.code },
    })
    return coupon ? discount.code : null
  }

  // Generate a unique recovery code
  const code = `RECOVER-${cartId.slice(-8).toUpperCase()}`
  const expiresAt = new Date(Date.now() + (discount.expiresIn || 24) * 60 * 60 * 1000)

  // Create or update the coupon
  await prisma.coupon.upsert({
    where: { code },
    update: {
      expiresAt,
      isActive: true,
    },
    create: {
      code,
      type: discount.percent ? "PERCENTAGE" : "FIXED_AMOUNT",
      value: discount.percent || discount.amount || 0,
      minOrderValue: 0,
      maxUsageCount: 1,
      currentUsageCount: 0,
      isActive: true,
      expiresAt,
      descriptionEn: "Cart recovery discount",
      descriptionKh: "ការបញ្ចុះតម្លៃនៃការសង្គ្រោះរទេះ",
    },
  })

  return code
}

/**
 * Send recovery email with optional discount
 */
export async function sendRecoveryEmailWithDiscount(
  cartId: string,
  discountCode?: string,
  discountPercent?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const cart = await prisma.abandonedCart.findUnique({
      where: { id: cartId },
    })

    if (!cart || !cart.email) {
      return { success: false, error: "Cart not found or no email" }
    }

    // Prepare discount
    const discount: RecoveryDiscount | null = discountCode || discountPercent
      ? { code: discountCode, percent: discountPercent, expiresIn: 24 }
      : null

    const code = discount ? await getRecoveryDiscountCode(cartId, discount) : null

    // Generate email content
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://apoloshop.com"
    const recoveryUrl = `${baseUrl}/cart/recover?token=${cart.recoveryToken}${code ? `&discount=${code}` : ""}`
    const items = cart.cartItems as CartItem[]
    const total = Number(cart.cartTotal)

    const discountHtml = discount?.percent
      ? `
        <div style="background: #f0fff4; border: 2px solid #38a169; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 18px; color: #38a169; font-weight: bold;">
            Special Offer: ${discount.percent}% OFF
          </p>
          ${code ? `<p style="margin: 5px 0 0; color: #666;">Use code: <strong style="color: #38a169; font-size: 20px;">${code}</strong></p>` : ""}
          ${discount.expiresIn ? `<p style="margin: 5px 0 0; color: #999; font-size: 12px;">Expires in ${discount.expiresIn} hours</p>` : ""}
        </div>
      `
      : ""

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7f7f7;">
  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #333; margin: 0 0 10px;">Complete Your Order</h1>
    <p style="color: #666; margin: 0 0 20px;">You left some great items in your cart. Come back and finish your purchase!</p>

    ${discountHtml}

    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      ${items.map(item => `
        <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;">` : '<div style="width: 60px; height: 60px; background: #eee; border-radius: 4px; margin-right: 15px;"></div>'}
          <div style="flex: 1;">
            <strong style="color: #333;">${item.name}</strong><br>
            <span style="color: #666;">Qty: ${item.quantity} &times; $${item.priceUsd.toFixed(2)}</span>
          </div>
        </div>
      `).join("")}
      <div style="text-align: right; padding-top: 15px;">
        ${discount?.percent ? `
          <div style="color: #999; text-decoration: line-through;">$${total.toFixed(2)}</div>
          <div style="font-size: 20px; font-weight: bold; color: #38a169;">$${(total * (1 - discount.percent / 100)).toFixed(2)}</div>
        ` : `
          <div style="font-size: 20px; font-weight: bold; color: #333;">Total: $${total.toFixed(2)}</div>
        `}
      </div>
    </div>

    <a href="${recoveryUrl}" style="display: block; text-align: center; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
      Complete Your Order Now
    </a>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      If you didn't add these items to your cart, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`

    const subject = discount?.percent
      ? `${discount.percent}% OFF - Complete your order now!`
      : "Your cart is waiting for you"

    const result = await sendMarketingEmail(cart.email, subject, html)

    if (result.success) {
      // Log the recovery attempt
      await prisma.abandonedCart.update({
        where: { id: cartId },
        data: {
          // Mark as email sent if not already
          status: cart.status === "ABANDONED" ? "EMAIL_1_SENT" : cart.status,
        },
      })
    }

    return result
  } catch (error) {
    console.error("[AbandonedCartService] Error sending recovery email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Enhanced processAbandonedCarts with discount support
 * Called by cron job - adds automatic discounts to later emails
 */
export async function processAbandonedCartsWithDiscounts(): Promise<{
  processed: number
  email1Sent: number
  email2Sent: number
  email3Sent: number
  discountsGenerated: number
}> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  let processed = 0
  let email1Sent = 0
  let email2Sent = 0
  let email3Sent = 0
  let discountsGenerated = 0

  // Mark active carts as abandoned if no activity for 1 hour
  await prisma.abandonedCart.updateMany({
    where: {
      status: "ACTIVE",
      lastActivityAt: { lt: oneHourAgo },
      email: { not: null },
    },
    data: {
      status: "ABANDONED",
      abandonedAt: now,
    },
  })

  // Get carts needing email 1 (abandoned 1+ hours ago, no email sent)
  const cartsForEmail1 = await prisma.abandonedCart.findMany({
    where: {
      status: "ABANDONED",
      email: { not: null },
      email1SentAt: null,
    },
    take: 50,
  })

  for (const cart of cartsForEmail1) {
    if (!cart.email) continue
    const discount = EMAIL_DISCOUNTS[1]
    const discountCode = discount ? await getRecoveryDiscountCode(cart.id, discount) : null

    await sendRecoveryEmailForSequence(cart, 1, discountCode, discount?.percent)
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { status: "EMAIL_1_SENT", email1SentAt: now },
    })
    email1Sent++
    processed++
  }

  // Get carts needing email 2 (email 1 sent 24+ hours ago)
  const cartsForEmail2 = await prisma.abandonedCart.findMany({
    where: {
      status: "EMAIL_1_SENT",
      email: { not: null },
      email1SentAt: { lt: oneDayAgo },
    },
    take: 50,
  })

  for (const cart of cartsForEmail2) {
    if (!cart.email) continue
    const discount = EMAIL_DISCOUNTS[2]
    const discountCode = discount ? await getRecoveryDiscountCode(cart.id, discount) : null
    if (discountCode) discountsGenerated++

    await sendRecoveryEmailForSequence(cart, 2, discountCode, discount?.percent)
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { status: "EMAIL_2_SENT", email2SentAt: now },
    })
    email2Sent++
    processed++
  }

  // Get carts needing email 3 (email 2 sent 48+ hours ago - 72hr total from abandonment)
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const cartsForEmail3 = await prisma.abandonedCart.findMany({
    where: {
      status: "EMAIL_2_SENT",
      email: { not: null },
      email2SentAt: { lt: twoDaysAgo },
    },
    take: 50,
  })

  for (const cart of cartsForEmail3) {
    if (!cart.email) continue
    const discount = EMAIL_DISCOUNTS[3]
    const discountCode = discount ? await getRecoveryDiscountCode(cart.id, discount) : null
    if (discountCode) discountsGenerated++

    await sendRecoveryEmailForSequence(cart, 3, discountCode, discount?.percent)
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { status: "EMAIL_3_SENT", email3SentAt: now },
    })
    email3Sent++
    processed++
  }

  // Mark carts as unrecoverable after email 3 (give 24hr for response)
  await prisma.abandonedCart.updateMany({
    where: {
      status: "EMAIL_3_SENT",
      email3SentAt: { lt: oneDayAgo },
    },
    data: {
      status: "UNRECOVERABLE",
    },
  })

  return { processed, email1Sent, email2Sent, email3Sent, discountsGenerated }
}

/**
 * Send recovery email for automated sequence
 */
async function sendRecoveryEmailForSequence(
  cart: { id: string; email: string | null; cartItems: unknown; cartTotal: unknown; recoveryToken: string },
  emailNumber: 1 | 2 | 3,
  discountCode?: string | null,
  discountPercent?: number
): Promise<void> {
  if (!cart.email) return

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://apoloshop.com"
  const recoveryUrl = `${baseUrl}/cart/recover?token=${cart.recoveryToken}${discountCode ? `&discount=${discountCode}` : ""}`
  const items = cart.cartItems as CartItem[]
  const total = Number(cart.cartTotal)

  const subjects = {
    1: "You left something behind!",
    2: `Save 5% - Your cart is waiting!`,
    3: `Final Offer: 10% OFF - Last chance!`,
  }

  const discountHtml = discountPercent
    ? `
      <div style="background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; color: white;">
        <p style="margin: 0; font-size: 24px; font-weight: bold;">
          ${discountPercent}% OFF Your Order!
        </p>
        ${discountCode ? `
          <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Use code at checkout:</p>
          <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${discountCode}</p>
        ` : ""}
        ${emailNumber === 3 ? `<p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">This is your final reminder - offer expires soon!</p>` : ""}
      </div>
    `
    : ""

  const urgencyHtml = emailNumber === 3
    ? `<p style="color: #e74c3c; font-weight: bold; text-align: center; margin: 0 0 20px;">
        This is your last reminder before your cart expires!
      </p>`
    : ""

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7f7f7;">
  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #333; margin: 0 0 10px;">${subjects[emailNumber]}</h1>
    <p style="color: #666; margin: 0 0 20px;">You have items waiting in your cart:</p>

    ${urgencyHtml}
    ${discountHtml}

    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      ${items.map(item => `
        <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;">` : '<div style="width: 60px; height: 60px; background: #eee; border-radius: 4px; margin-right: 15px;"></div>'}
          <div style="flex: 1;">
            <strong style="color: #333;">${item.name}</strong><br>
            <span style="color: #666;">Qty: ${item.quantity} &times; $${item.priceUsd.toFixed(2)}</span>
          </div>
        </div>
      `).join("")}
      <div style="text-align: right; padding-top: 15px;">
        ${discountPercent ? `
          <div style="color: #999; text-decoration: line-through; font-size: 14px;">$${total.toFixed(2)}</div>
          <div style="font-size: 20px; font-weight: bold; color: #38a169;">$${(total * (1 - discountPercent / 100)).toFixed(2)}</div>
        ` : `
          <div style="font-size: 20px; font-weight: bold; color: #333;">Total: $${total.toFixed(2)}</div>
        `}
      </div>
    </div>

    <a href="${recoveryUrl}" style="display: block; text-align: center; background: ${emailNumber === 3 ? '#e74c3c' : '#007bff'}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
      Complete Your Order ${discountPercent ? `& Save ${discountPercent}%` : 'Now'}
    </a>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      If you no longer wish to receive these emails, your cart will expire automatically.
    </p>
  </div>
</body>
</html>`

  await sendMarketingEmail(cart.email, subjects[emailNumber], html)
}

/**
 * Get recovery analytics summary
 */
export async function getRecoveryAnalytics(days: number = 30): Promise<{
  totalAbandoned: number
  totalRecovered: number
  recoveryRate: number
  revenueRecovered: number
  potentialRevenueLost: number
  emailConversionRates: {
    email1: number
    email2: number
    email3: number
  }
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const carts = await prisma.abandonedCart.findMany({
    where: { createdAt: { gte: startDate } },
    select: {
      status: true,
      cartTotal: true,
      email1SentAt: true,
      email2SentAt: true,
      email3SentAt: true,
      recoveredAt: true,
    },
  })

  const totalAbandoned = carts.length
  const recovered = carts.filter(c => c.status === "RECOVERED")
  const totalRecovered = recovered.length
  const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0

  const revenueRecovered = recovered.reduce((sum, c) => sum + Number(c.cartTotal || 0), 0)
  const totalValue = carts.reduce((sum, c) => sum + Number(c.cartTotal || 0), 0)
  const potentialRevenueLost = totalValue - revenueRecovered

  // Calculate email conversion rates
  const email1Recipients = carts.filter(c => c.email1SentAt).length
  const email2Recipients = carts.filter(c => c.email2SentAt).length
  const email3Recipients = carts.filter(c => c.email3SentAt).length

  // Simplified conversion: recovered after each email phase
  const recoveredAfterEmail1 = recovered.filter(c => c.email1SentAt && !c.email2SentAt).length
  const recoveredAfterEmail2 = recovered.filter(c => c.email2SentAt && !c.email3SentAt).length
  const recoveredAfterEmail3 = recovered.filter(c => c.email3SentAt).length

  return {
    totalAbandoned,
    totalRecovered,
    recoveryRate: Math.round(recoveryRate * 100) / 100,
    revenueRecovered: Math.round(revenueRecovered * 100) / 100,
    potentialRevenueLost: Math.round(potentialRevenueLost * 100) / 100,
    emailConversionRates: {
      email1: email1Recipients > 0 ? Math.round((recoveredAfterEmail1 / email1Recipients) * 10000) / 100 : 0,
      email2: email2Recipients > 0 ? Math.round((recoveredAfterEmail2 / email2Recipients) * 10000) / 100 : 0,
      email3: email3Recipients > 0 ? Math.round((recoveredAfterEmail3 / email3Recipients) * 10000) / 100 : 0,
    },
  }
}
