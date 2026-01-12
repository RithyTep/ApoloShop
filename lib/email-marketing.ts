/**
 * Email Marketing Service
 * Handles newsletter subscriptions, abandoned cart recovery, and email campaigns
 */

import { prisma } from "@/lib/prisma"
import { sendEmailNotification } from "@/lib/notification-service"
import { translations, type Language } from "@/lib/i18n"
import crypto from "crypto"

// Types
export type EmailProvider = "smtp" | "sendgrid"

export interface EmailConfig {
  provider: EmailProvider
  sendgridApiKey?: string
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  fromEmail: string
  fromName: string
}

export interface CartItem {
  productId: string
  name: string
  nameKh?: string
  quantity: number
  priceUsd: number
  priceKhr: number
  imageUrl?: string
}

// Get email configuration from environment
export function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || "smtp") as EmailProvider

  return {
    provider,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || "587"),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.EMAIL_FROM || "noreply@apoloshop.com",
    fromName: process.env.EMAIL_FROM_NAME || "ApoloShop",
  }
}

// Generate secure random token
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Generate tracking ID for email opens/clicks
export function generateTrackingId(): string {
  return crypto.randomUUID()
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    return { success: false, error: "SendGrid API key not configured" }
  }

  const config = getEmailConfig()

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.fromEmail, name: config.fromName },
        subject,
        content: [
          ...(textContent ? [{ type: "text/plain", value: textContent }] : []),
          { type: "text/html", value: htmlContent },
        ],
      }),
    })

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get("x-message-id") || undefined
      return { success: true, messageId }
    }

    const error = await response.text()
    return { success: false, error: `SendGrid error: ${error}` }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send marketing email (uses SendGrid if available, falls back to SMTP)
 */
export async function sendMarketingEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getEmailConfig()

  // Try SendGrid first if configured
  if (config.provider === "sendgrid" && config.sendgridApiKey) {
    return sendViaSendGrid(to, subject, htmlContent, textContent)
  }

  // Fall back to SMTP
  const result = await sendEmailNotification(to, subject, textContent || htmlContent)
  return {
    success: result.success,
    error: result.error,
  }
}

// ============================================
// NEWSLETTER SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to newsletter
 */
export async function subscribeToNewsletter(
  email: string,
  options?: {
    name?: string
    customerId?: string
    source?: string
    language?: string
    ipAddress?: string
    userAgent?: string
  }
): Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }> {
  try {
    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      if (existing.status === "ACTIVE") {
        return { success: true } // Already subscribed
      }
      // Resubscribe
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          unsubscribedAt: null,
          confirmedAt: new Date(),
        },
      })
      return { success: true }
    }

    // Create new subscriber
    const unsubscribeToken = generateToken()
    await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        name: options?.name,
        customerId: options?.customerId,
        source: options?.source || "website",
        language: options?.language || "en",
        unsubscribeToken,
        confirmedAt: new Date(), // Direct confirmation (no double opt-in for simplicity)
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      },
    })

    // Send welcome email
    const language = (options?.language || "en") as Language
    await sendWelcomeNewsletterEmail(email, language, unsubscribeToken)

    return { success: true }
  } catch (error) {
    console.error("[EmailMarketing] Subscribe error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Subscription failed",
    }
  }
}

/**
 * Unsubscribe from newsletter
 */
export async function unsubscribeFromNewsletter(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    })

    if (!subscriber) {
      return { success: false, error: "Invalid unsubscribe link" }
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    console.error("[EmailMarketing] Unsubscribe error:", error)
    return { success: false, error: "Unsubscribe failed" }
  }
}

/**
 * Send welcome newsletter email
 */
async function sendWelcomeNewsletterEmail(
  email: string,
  language: Language,
  unsubscribeToken: string
): Promise<void> {
  const t = translations[language]
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://apoloshop.com"
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`

  const subject = language === "en"
    ? "Welcome to our newsletter!"
    : "សូមស្វាគមន៍មកកាន់ព្រឹត្តិបត្រព័ត៌មានរបស់យើង!"

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333;">${subject}</h1>
  <p>${language === "en"
    ? "Thank you for subscribing! You'll receive updates on new products, promotions, and exclusive offers."
    : "សូមអរគុណសម្រាប់ការចុះឈ្មោះ! អ្នកនឹងទទួលបានព័ត៌មានថ្មីៗអំពីផលិតផល ការផ្សព្វផ្សាយ និងការផ្តល់ជូនពិសេស។"
  }</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
  <p style="color: #666; font-size: 12px;">
    ${language === "en"
      ? `<a href="${unsubscribeUrl}">Unsubscribe</a> from this newsletter`
      : `<a href="${unsubscribeUrl}">ឈប់ជាវ</a> ពីព្រឹត្តិបត្រព័ត៌មាននេះ`
    }
  </p>
</body>
</html>`

  await sendMarketingEmail(email, subject, html)
}

// ============================================
// ABANDONED CART RECOVERY
// ============================================

/**
 * Track cart activity (call when cart is updated)
 */
export async function trackCartActivity(
  cartItems: CartItem[],
  cartTotal: number,
  options: {
    customerId?: string
    guestId?: string
    email?: string
    currency?: "USD" | "KHR"
  }
): Promise<string> {
  // Find existing cart or create new
  const existingCart = await prisma.abandonedCart.findFirst({
    where: {
      OR: [
        options.customerId ? { customerId: options.customerId } : {},
        options.guestId ? { guestId: options.guestId } : {},
      ].filter(c => Object.keys(c).length > 0),
      status: { in: ["ACTIVE", "ABANDONED"] },
    },
  })

  if (existingCart) {
    // Update existing cart
    await prisma.abandonedCart.update({
      where: { id: existingCart.id },
      data: {
        cartItems: cartItems as unknown as object,
        cartTotal,
        email: options.email || existingCart.email,
        lastActivityAt: new Date(),
        status: "ACTIVE",
      },
    })
    return existingCart.id
  }

  // Create new cart tracking
  const recoveryToken = generateToken()
  const cart = await prisma.abandonedCart.create({
    data: {
      customerId: options.customerId,
      guestId: options.guestId,
      email: options.email,
      cartItems: cartItems as unknown as object,
      cartTotal,
      currency: options.currency || "USD",
      lastActivityAt: new Date(),
      recoveryToken,
    },
  })

  return cart.id
}

/**
 * Mark cart as recovered (called after successful order)
 */
export async function markCartRecovered(
  orderId: string,
  customerId?: string,
  guestId?: string
): Promise<void> {
  const whereClause: { customerId?: string; guestId?: string } = {}
  if (customerId) whereClause.customerId = customerId
  if (guestId) whereClause.guestId = guestId

  if (Object.keys(whereClause).length === 0) return

  await prisma.abandonedCart.updateMany({
    where: {
      ...whereClause,
      status: { in: ["ACTIVE", "ABANDONED", "EMAIL_1_SENT", "EMAIL_2_SENT", "EMAIL_3_SENT"] },
    },
    data: {
      status: "RECOVERED",
      recoveredAt: new Date(),
      orderId,
    },
  })
}

/**
 * Process abandoned carts and send recovery emails
 * Should be called by a cron job
 */
export async function processAbandonedCarts(): Promise<{
  processed: number
  email1Sent: number
  email2Sent: number
  email3Sent: number
}> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  let email1Sent = 0, email2Sent = 0, email3Sent = 0

  // Mark active carts as abandoned if no activity for 1 hour
  await prisma.abandonedCart.updateMany({
    where: {
      status: "ACTIVE",
      lastActivityAt: { lt: oneHourAgo },
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
      abandonedAt: { lt: oneHourAgo },
    },
    take: 50,
  })

  for (const cart of cartsForEmail1) {
    if (!cart.email) continue
    await sendAbandonedCartEmail(cart, 1)
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { status: "EMAIL_1_SENT", email1SentAt: now },
    })
    email1Sent++
  }

  // Get carts needing email 2 (email 1 sent 24+ hours ago)
  const cartsForEmail2 = await prisma.abandonedCart.findMany({
    where: {
      status: "EMAIL_1_SENT",
      email: { not: null },
      email2SentAt: null,
      email1SentAt: { lt: oneDayAgo },
    },
    take: 50,
  })

  for (const cart of cartsForEmail2) {
    if (!cart.email) continue
    await sendAbandonedCartEmail(cart, 2)
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { status: "EMAIL_2_SENT", email2SentAt: now },
    })
    email2Sent++
  }

  // Get carts needing email 3 (email 2 sent 72+ hours ago)
  const cartsForEmail3 = await prisma.abandonedCart.findMany({
    where: {
      status: "EMAIL_2_SENT",
      email: { not: null },
      email3SentAt: null,
      email2SentAt: { lt: threeDaysAgo },
    },
    take: 50,
  })

  for (const cart of cartsForEmail3) {
    if (!cart.email) continue
    await sendAbandonedCartEmail(cart, 3)
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { status: "EMAIL_3_SENT", email3SentAt: now },
    })
    email3Sent++
  }

  // Mark carts as unrecoverable after email 3
  await prisma.abandonedCart.updateMany({
    where: {
      status: "EMAIL_3_SENT",
      email3SentAt: { lt: oneDayAgo },
    },
    data: { status: "UNRECOVERABLE" },
  })

  return {
    processed: cartsForEmail1.length + cartsForEmail2.length + cartsForEmail3.length,
    email1Sent,
    email2Sent,
    email3Sent,
  }
}

/**
 * Send abandoned cart recovery email
 */
async function sendAbandonedCartEmail(
  cart: { id: string; email: string | null; cartItems: unknown; cartTotal: unknown; recoveryToken: string },
  emailNumber: 1 | 2 | 3
): Promise<void> {
  if (!cart.email) return

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://apoloshop.com"
  const recoveryUrl = `${baseUrl}/cart/recover?token=${cart.recoveryToken}`
  const items = cart.cartItems as CartItem[]
  const total = Number(cart.cartTotal)

  const subjects = {
    1: "You left something behind!",
    2: "Your cart is waiting for you",
    3: "Last chance to complete your order!",
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333;">${subjects[emailNumber]}</h1>
  <p>You have items waiting in your cart:</p>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    ${items.map(item => `
      <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;">` : ''}
        <div>
          <strong>${item.name}</strong><br>
          <span style="color: #666;">Qty: ${item.quantity} × $${item.priceUsd.toFixed(2)}</span>
        </div>
      </div>
    `).join('')}
    <div style="text-align: right; padding-top: 15px; font-size: 18px;">
      <strong>Total: $${total.toFixed(2)}</strong>
    </div>
  </div>
  ${emailNumber === 3 ? '<p style="color: #e74c3c;"><strong>⏰ This is your last reminder!</strong></p>' : ''}
  <a href="${recoveryUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
    Complete Your Order
  </a>
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  <p style="color: #666; font-size: 12px;">
    If you no longer wish to receive these emails, your cart will expire automatically.
  </p>
</body>
</html>`

  await sendMarketingEmail(cart.email, subjects[emailNumber], html)
}

// ============================================
// WELCOME EMAIL SERIES
// ============================================

/**
 * Start welcome email series for new customer/subscriber
 */
export async function startWelcomeSeries(
  email: string,
  options?: { customerId?: string; subscriberId?: string }
): Promise<void> {
  // Check if already in progress
  const existing = await prisma.welcomeEmailProgress.findUnique({
    where: { email },
  })

  if (existing) return

  // Create progress record
  await prisma.welcomeEmailProgress.create({
    data: {
      email,
      customerId: options?.customerId,
      subscriberId: options?.subscriberId,
    },
  })

  // Send first email immediately
  await sendWelcomeEmail(email, 1)
  await prisma.welcomeEmailProgress.update({
    where: { email },
    data: { email1SentAt: new Date() },
  })
}

/**
 * Process welcome email series (call via cron)
 */
export async function processWelcomeSeries(): Promise<{ email2Sent: number; email3Sent: number }> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  let email2Sent = 0, email3Sent = 0

  // Send email 2 (1 day after email 1)
  const needsEmail2 = await prisma.welcomeEmailProgress.findMany({
    where: {
      email1SentAt: { lt: oneDayAgo },
      email2SentAt: null,
      completedAt: null,
    },
    take: 50,
  })

  for (const progress of needsEmail2) {
    await sendWelcomeEmail(progress.email, 2)
    await prisma.welcomeEmailProgress.update({
      where: { id: progress.id },
      data: { email2SentAt: now },
    })
    email2Sent++
  }

  // Send email 3 (3 days after email 1)
  const needsEmail3 = await prisma.welcomeEmailProgress.findMany({
    where: {
      email1SentAt: { lt: threeDaysAgo },
      email2SentAt: { not: null },
      email3SentAt: null,
      completedAt: null,
    },
    take: 50,
  })

  for (const progress of needsEmail3) {
    await sendWelcomeEmail(progress.email, 3)
    await prisma.welcomeEmailProgress.update({
      where: { id: progress.id },
      data: { email3SentAt: now, completedAt: now },
    })
    email3Sent++
  }

  return { email2Sent, email3Sent }
}

/**
 * Send welcome series email
 */
async function sendWelcomeEmail(email: string, emailNumber: 1 | 2 | 3): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://apoloshop.com"

  const content = {
    1: {
      subject: "Welcome to ApoloShop! 🎉",
      body: `
        <h1>Welcome aboard!</h1>
        <p>Thank you for joining ApoloShop. We're excited to have you!</p>
        <p>Browse our collection and find something special for yourself.</p>
        <a href="${baseUrl}/shop" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Start Shopping
        </a>
      `,
    },
    2: {
      subject: "Tips for shopping at ApoloShop",
      body: `
        <h1>Get the most out of ApoloShop</h1>
        <p>Here are some tips to enhance your shopping experience:</p>
        <ul>
          <li>🔔 Enable notifications to never miss a deal</li>
          <li>❤️ Save items to your wishlist</li>
          <li>⭐ Join our loyalty program for rewards</li>
        </ul>
        <a href="${baseUrl}/shop" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Explore Now
        </a>
      `,
    },
    3: {
      subject: "Special offer just for you! 🎁",
      body: `
        <h1>Your first order awaits!</h1>
        <p>Ready to make your first purchase? Here's a special welcome offer:</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #007bff;">10% OFF</span><br>
          <span style="color: #666;">Use code: <strong>WELCOME10</strong></span>
        </div>
        <a href="${baseUrl}/shop" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Shop Now
        </a>
      `,
    },
  }

  const { subject, body } = content[emailNumber]
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${body}
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  <p style="color: #666; font-size: 12px;">ApoloShop - Your favorite local shop</p>
</body>
</html>`

  await sendMarketingEmail(email, subject, html)
}

// ============================================
// ORDER NOTIFICATION EMAILS
// ============================================

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  email: string,
  order: {
    orderNumber: string
    items: Array<{ name: string; quantity: number; priceUsd: number }>
    totalUsd: number
    customerName: string
  },
  language: Language = "en"
): Promise<void> {
  const subject = language === "en"
    ? `Order Confirmed: #${order.orderNumber}`
    : `ការបញ្ជាទិញបានបញ្ជាក់: #${order.orderNumber}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #27ae60;">✓ ${language === "en" ? "Order Confirmed!" : "ការបញ្ជាទិញបានបញ្ជាក់!"}</h1>
  <p>${language === "en" ? `Hi ${order.customerName},` : `សួស្តី ${order.customerName},`}</p>
  <p>${language === "en"
    ? "Thank you for your order! We're preparing it now."
    : "សូមអរគុណសម្រាប់ការបញ្ជាទិញរបស់អ្នក! យើងកំពុងរៀបចំវា។"
  }</p>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>${language === "en" ? "Order" : "លេខបញ្ជាទិញ"}: #${order.orderNumber}</strong></p>
    ${order.items.map(item => `
      <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
        ${item.name} × ${item.quantity} - $${(item.priceUsd * item.quantity).toFixed(2)}
      </div>
    `).join('')}
    <div style="text-align: right; padding-top: 15px; font-size: 18px;">
      <strong>${language === "en" ? "Total" : "សរុប"}: $${order.totalUsd.toFixed(2)}</strong>
    </div>
  </div>
  <p style="color: #666;">${language === "en"
    ? "We'll notify you when your order is ready."
    : "យើងនឹងជូនដំណឹងដល់អ្នកនៅពេលការបញ្ជាទិញរបស់អ្នករួចរាល់។"
  }</p>
</body>
</html>`

  await sendMarketingEmail(email, subject, html)
}

/**
 * Send shipping notification email
 */
export async function sendShippingNotificationEmail(
  email: string,
  order: {
    orderNumber: string
    customerName: string
    trackingNumber?: string
    estimatedDelivery?: string
  },
  language: Language = "en"
): Promise<void> {
  const subject = language === "en"
    ? `Your order #${order.orderNumber} is on its way!`
    : `ការបញ្ជាទិញ #${order.orderNumber} របស់អ្នកកំពុងដឹកជញ្ជូន!`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #3498db;">📦 ${language === "en" ? "Your order is on its way!" : "ការបញ្ជាទិញរបស់អ្នកកំពុងដឹកជញ្ជូន!"}</h1>
  <p>${language === "en" ? `Hi ${order.customerName},` : `សួស្តី ${order.customerName},`}</p>
  <p>${language === "en"
    ? `Great news! Your order #${order.orderNumber} has been shipped.`
    : `ដំណឹងល្អ! ការបញ្ជាទិញ #${order.orderNumber} របស់អ្នកត្រូវបានដឹកជញ្ជូន។`
  }</p>
  ${order.trackingNumber ? `
  <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>${language === "en" ? "Tracking Number" : "លេខតាមដាន"}:</strong> ${order.trackingNumber}</p>
    ${order.estimatedDelivery ? `<p><strong>${language === "en" ? "Estimated Delivery" : "ការប៉ាន់ស្មានការដឹកជញ្ជូន"}:</strong> ${order.estimatedDelivery}</p>` : ''}
  </div>
  ` : ''}
</body>
</html>`

  await sendMarketingEmail(email, subject, html)
}
