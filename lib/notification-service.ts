/**
 * Notification Service for Order Status Updates
 * Supports Telegram and Email notifications
 */

import { prisma } from "@/lib/prisma"
import { translations, type Language } from "@/lib/i18n"

// Types
export type NotificationChannel = "TELEGRAM" | "EMAIL" | "SMS"
export type OrderStatusType = "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"

export interface NotificationResult {
  success: boolean
  channel: NotificationChannel
  error?: string
}

export interface OrderNotificationData {
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  status: OrderStatusType
  totalUsd: number
  totalKhr: number
  currency: "USD" | "KHR"
  items?: Array<{
    productName: string
    quantity: number
    priceUsd: number
    priceKhr: number
  }>
}

// Status to preference field mapping
const statusPreferenceMap: Record<OrderStatusType, string> = {
  NEW: "orderConfirmation", // New orders also trigger confirmation notification
  CONFIRMED: "orderConfirmation",
  PREPARING: "orderPreparing",
  READY: "orderReady",
  COMPLETED: "orderCompleted",
  CANCELLED: "orderCancelled",
}

/**
 * Get notification message for a given order status
 */
export function getStatusMessage(
  status: OrderStatusType,
  orderNumber: string,
  language: Language = "en"
): string {
  const t = translations[language].orderStatus
  const statusLabels: Record<OrderStatusType, string> = {
    NEW: t.new,
    CONFIRMED: t.confirmed,
    PREPARING: t.preparing,
    READY: language === "en" ? "Ready" : "រួចរាល់",
    COMPLETED: t.completed,
    CANCELLED: t.cancelled,
  }

  const statusLabel = statusLabels[status]

  const messages: Record<Language, Record<OrderStatusType, string>> = {
    en: {
      NEW: `Order #${orderNumber} has been received! We'll notify you when it's confirmed.`,
      CONFIRMED: `Great news! Order #${orderNumber} has been confirmed and is being processed.`,
      PREPARING: `Order #${orderNumber} is now being prepared. Please wait a moment.`,
      READY: `Order #${orderNumber} is ready for pickup/delivery!`,
      COMPLETED: `Order #${orderNumber} has been completed. Thank you for your purchase!`,
      CANCELLED: `Order #${orderNumber} has been cancelled. Please contact us if you have questions.`,
    },
    kh: {
      NEW: `ការបញ្ជាទិញ #${orderNumber} បានទទួល! យើងនឹងជូនដំណឹងពេលបានបញ្ជាក់។`,
      CONFIRMED: `ដំណឹងល្អ! ការបញ្ជាទិញ #${orderNumber} បានបញ្ជាក់ហើយកំពុងដំណើរការ។`,
      PREPARING: `ការបញ្ជាទិញ #${orderNumber} កំពុងរៀបចំ។ សូមរង់ចាំបន្តិច។`,
      READY: `ការបញ្ជាទិញ #${orderNumber} រួចរាល់សម្រាប់យកទៅ/ដឹកជញ្ជូន!`,
      COMPLETED: `ការបញ្ជាទិញ #${orderNumber} បានបញ្ចប់។ សូមអរគុណសម្រាប់ការទិញ!`,
      CANCELLED: `ការបញ្ជាទិញ #${orderNumber} ត្រូវបានលុបចោល។ សូមទាក់ទងមកយើងប្រសិនបើមានសំណួរ។`,
    },
  }

  return messages[language][status]
}

/**
 * Send notification via Telegram Bot API
 */
export async function sendTelegramNotification(
  chatId: string,
  message: string
): Promise<NotificationResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    console.warn("[NotificationService] TELEGRAM_BOT_TOKEN not configured")
    return {
      success: false,
      channel: "TELEGRAM",
      error: "Telegram bot token not configured",
    }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data.ok) {
      return {
        success: false,
        channel: "TELEGRAM",
        error: data.description || "Failed to send Telegram message",
      }
    }

    return { success: true, channel: "TELEGRAM" }
  } catch (error) {
    console.error("[NotificationService] Telegram error:", error)
    return {
      success: false,
      channel: "TELEGRAM",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send notification via Email (SMTP)
 */
export async function sendEmailNotification(
  email: string,
  subject: string,
  message: string
): Promise<NotificationResult> {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[NotificationService] SMTP not fully configured")
    return {
      success: false,
      channel: "EMAIL",
      error: "SMTP not configured",
    }
  }

  try {
    // Dynamic import of nodemailer (only when needed)
    // Note: nodemailer needs to be installed: bun add nodemailer
    const nodemailer = await import("nodemailer").catch(() => null)

    if (!nodemailer) {
      return {
        success: false,
        channel: "EMAIL",
        error: "Email service not available (nodemailer not installed)",
      }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || "587"),
      secure: smtpPort === "465",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    await transporter.sendMail({
      from: smtpFrom || smtpUser,
      to: email,
      subject,
      text: message,
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated notification from ApoloShop</p>
      </div>`,
    })

    return { success: true, channel: "EMAIL" }
  } catch (error) {
    console.error("[NotificationService] Email error:", error)
    return {
      success: false,
      channel: "EMAIL",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Log notification attempt to database
 */
async function logNotification(
  customerId: string,
  orderId: string | undefined,
  channel: NotificationChannel,
  type: string,
  message: string,
  status: "sent" | "failed" | "pending",
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        customerId,
        orderId,
        channel,
        type,
        message,
        status,
        errorMessage,
      },
    })
  } catch (error) {
    console.error("[NotificationService] Failed to log notification:", error)
  }
}

/**
 * Send order status notification to customer
 * Checks customer preferences and sends via enabled channels
 */
export async function sendOrderStatusNotification(
  order: OrderNotificationData,
  language: Language = "en"
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = []

  // Get customer notification preferences
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      customerId: order.customerId,
      enabled: true,
    },
  })

  // Get the preference field name for this status
  const preferenceField = statusPreferenceMap[order.status]

  // Generate the notification message
  const message = getStatusMessage(order.status, order.orderNumber, language)
  const emailSubject = language === "en"
    ? `Order #${order.orderNumber} Status Update`
    : `អាប់ដេតការបញ្ជាទិញ #${order.orderNumber}`

  // Process each enabled channel
  for (const pref of preferences) {
    // Check if this status type is enabled for notifications
    const statusEnabled = (pref as Record<string, unknown>)[preferenceField] as boolean
    if (!statusEnabled) {
      continue
    }

    let result: NotificationResult

    switch (pref.channel) {
      case "TELEGRAM":
        if (pref.telegramChatId) {
          result = await sendTelegramNotification(pref.telegramChatId, message)
        } else {
          result = {
            success: false,
            channel: "TELEGRAM",
            error: "No Telegram chat ID configured",
          }
        }
        break

      case "EMAIL":
        if (order.customerEmail) {
          result = await sendEmailNotification(order.customerEmail, emailSubject, message)
        } else {
          result = {
            success: false,
            channel: "EMAIL",
            error: "No email address available",
          }
        }
        break

      case "SMS":
        // SMS not implemented yet
        result = {
          success: false,
          channel: "SMS",
          error: "SMS notifications not yet implemented",
        }
        break

      default:
        continue
    }

    // Log the notification attempt
    await logNotification(
      order.customerId,
      order.orderId,
      pref.channel,
      `order_${order.status.toLowerCase()}`,
      message,
      result.success ? "sent" : "failed",
      result.error
    )

    results.push(result)
  }

  // If no preferences exist, log a warning but don't fail
  if (preferences.length === 0) {
    console.log(`[NotificationService] No notification preferences for customer ${order.customerId}`)
  }

  return results
}

/**
 * Create default notification preferences for a new customer
 */
export async function createDefaultNotificationPreferences(
  customerId: string,
  options?: {
    telegramChatId?: string
    email?: string
  }
): Promise<void> {
  try {
    const preferencesToCreate: Array<{
      customerId: string
      channel: NotificationChannel
      telegramChatId?: string
    }> = []

    // Always create Telegram preference (most common in Cambodia)
    preferencesToCreate.push({
      customerId,
      channel: "TELEGRAM",
      telegramChatId: options?.telegramChatId,
    })

    // Create email preference if email is available
    if (options?.email) {
      preferencesToCreate.push({
        customerId,
        channel: "EMAIL",
      })
    }

    await prisma.notificationPreference.createMany({
      data: preferencesToCreate,
      skipDuplicates: true,
    })
  } catch (error) {
    console.error("[NotificationService] Failed to create default preferences:", error)
  }
}

/**
 * Get notification preferences for a customer
 */
export async function getCustomerNotificationPreferences(customerId: string) {
  return prisma.notificationPreference.findMany({
    where: { customerId },
  })
}

/**
 * Update notification preference
 */
export async function updateNotificationPreference(
  customerId: string,
  channel: NotificationChannel,
  updates: {
    enabled?: boolean
    telegramChatId?: string
    orderConfirmation?: boolean
    orderPreparing?: boolean
    orderReady?: boolean
    orderCompleted?: boolean
    orderCancelled?: boolean
  }
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: {
      customerId_channel: {
        customerId,
        channel,
      },
    },
    create: {
      customerId,
      channel,
      ...updates,
    },
    update: updates,
  })
}
