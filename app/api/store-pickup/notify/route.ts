import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PickupStatus } from "@prisma/client"
import { sendTelegramNotification, sendEmailNotification } from "@/lib/notification-service"

// POST /api/store-pickup/notify - Send pickup notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pickupId, type } = body

    if (!pickupId) {
      return NextResponse.json(
        { error: "Pickup ID is required" },
        { status: 400 }
      )
    }

    const pickup = await prisma.storePickup.findUnique({
      where: { id: pickupId },
      include: {
        store: true,
        timeSlot: true,
      },
    })

    if (!pickup) {
      return NextResponse.json(
        { error: "Pickup not found" },
        { status: 404 }
      )
    }

    let notificationSent = false
    let message = ""

    switch (type) {
      case "ready": {
        // Send "ready for pickup" notification
        if (pickup.status !== PickupStatus.READY) {
          return NextResponse.json(
            { error: "Pickup is not in READY status" },
            { status: 400 }
          )
        }

        if (pickup.readyNotificationSent) {
          return NextResponse.json(
            { error: "Ready notification already sent" },
            { status: 400 }
          )
        }

        const readyMessage = `🛒 Your order is ready for pickup at ${pickup.store.name}!\n\n📍 Address: ${pickup.store.address}\n🔑 Verification Code: ${pickup.verificationCode}\n\nShow this code at the store to collect your order.`

        // Send via configured channels
        const notificationPromises: Promise<unknown>[] = []

        if (pickup.customerPhone) {
          // Send via Telegram if configured
          notificationPromises.push(
            sendTelegramNotification(pickup.customerPhone, readyMessage)
              .catch(err => console.error("Telegram notification failed:", err))
          )
        }

        if (pickup.customerEmail) {
          // Send via email
          notificationPromises.push(
            sendEmailNotification(
              pickup.customerEmail,
              "Your Order is Ready for Pickup",
              `
                <h2>Your Order is Ready!</h2>
                <p>Dear ${pickup.customerName},</p>
                <p>Great news! Your order is ready for pickup at <strong>${pickup.store.name}</strong>.</p>
                <p><strong>Verification Code:</strong> <code style="font-size: 1.5em; background: #f0f0f0; padding: 0.25em 0.5em; border-radius: 4px;">${pickup.verificationCode}</code></p>
                <p><strong>Store Address:</strong> ${pickup.store.address}</p>
                ${pickup.store.phone ? `<p><strong>Store Phone:</strong> ${pickup.store.phone}</p>` : ""}
                ${pickup.timeSlot ? `<p><strong>Scheduled Time:</strong> ${pickup.timeSlot.startTime} - ${pickup.timeSlot.endTime}</p>` : ""}
                <p>Please show this code or the QR code in your order confirmation when you arrive.</p>
                <p>Thank you for shopping with us!</p>
              `
            ).catch(err => console.error("Email notification failed:", err))
          )
        }

        await Promise.all(notificationPromises)

        // Update pickup record
        await prisma.storePickup.update({
          where: { id: pickupId },
          data: { readyNotificationSent: true },
        })

        // Log status history
        await prisma.pickupStatusHistory.create({
          data: {
            pickupId,
            status: PickupStatus.READY,
            notes: "Ready for pickup notification sent",
            notificationSent: true,
          },
        })

        notificationSent = true
        message = "Ready for pickup notification sent"
        break
      }

      case "reminder": {
        // Send pickup reminder (for day before)
        if (pickup.reminderSent) {
          return NextResponse.json(
            { error: "Reminder already sent" },
            { status: 400 }
          )
        }

        const scheduledDate = new Date(pickup.scheduledDate)
        const reminderMessage = `⏰ Reminder: Pick up your order tomorrow at ${pickup.store.name}\n\n📍 ${pickup.store.address}\n🔑 Code: ${pickup.verificationCode}`

        const notificationPromises: Promise<unknown>[] = []

        if (pickup.customerPhone) {
          notificationPromises.push(
            sendTelegramNotification(pickup.customerPhone, reminderMessage)
              .catch(err => console.error("Telegram notification failed:", err))
          )
        }

        if (pickup.customerEmail) {
          notificationPromises.push(
            sendEmailNotification(
              pickup.customerEmail,
              "Reminder: Pick Up Your Order Tomorrow",
              `
                <h2>Pickup Reminder</h2>
                <p>Dear ${pickup.customerName},</p>
                <p>This is a friendly reminder that your order is scheduled for pickup tomorrow.</p>
                <p><strong>Store:</strong> ${pickup.store.name}</p>
                <p><strong>Address:</strong> ${pickup.store.address}</p>
                ${pickup.timeSlot ? `<p><strong>Time Slot:</strong> ${pickup.timeSlot.startTime} - ${pickup.timeSlot.endTime}</p>` : ""}
                <p><strong>Verification Code:</strong> <code style="font-size: 1.5em; background: #f0f0f0; padding: 0.25em 0.5em; border-radius: 4px;">${pickup.verificationCode}</code></p>
                <p>See you tomorrow!</p>
              `
            ).catch(err => console.error("Email notification failed:", err))
          )
        }

        await Promise.all(notificationPromises)

        // Update pickup record
        await prisma.storePickup.update({
          where: { id: pickupId },
          data: { reminderSent: true },
        })

        notificationSent = true
        message = "Pickup reminder sent"
        break
      }

      case "confirmed": {
        // Send confirmation notification
        if (pickup.customerEmail) {
          await sendEmailNotification(
            pickup.customerEmail,
            "Store Pickup Confirmed",
            `
              <h2>Pickup Confirmed!</h2>
              <p>Dear ${pickup.customerName},</p>
              <p>Your store pickup has been confirmed.</p>
              <p><strong>Store:</strong> ${pickup.store.name}</p>
              <p><strong>Address:</strong> ${pickup.store.address}</p>
              <p><strong>Date:</strong> ${new Date(pickup.scheduledDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              ${pickup.timeSlot ? `<p><strong>Time Slot:</strong> ${pickup.timeSlot.startTime} - ${pickup.timeSlot.endTime}</p>` : ""}
              <p><strong>Verification Code:</strong> <code style="font-size: 1.5em; background: #f0f0f0; padding: 0.25em 0.5em; border-radius: 4px;">${pickup.verificationCode}</code></p>
              <p>We'll notify you when your order is ready for pickup.</p>
              <p>Thank you!</p>
            `
          ).catch(err => console.error("Email notification failed:", err))
        }

        notificationSent = true
        message = "Confirmation notification sent"
        break
      }

      default:
        return NextResponse.json(
          { error: "Invalid notification type. Use: ready, reminder, or confirmed" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: notificationSent,
      message,
      pickupId,
      type,
    })
  } catch (error) {
    console.error("Store pickup notification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/store-pickup/notify - Check for pending notifications to send
// This can be called by a cron job to send reminders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "pending-reminders") {
      // Find pickups scheduled for tomorrow that haven't received reminders
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const endOfTomorrow = new Date(tomorrow)
      endOfTomorrow.setHours(23, 59, 59, 999)

      const pendingReminders = await prisma.storePickup.findMany({
        where: {
          scheduledDate: {
            gte: tomorrow,
            lte: endOfTomorrow,
          },
          reminderSent: false,
          status: {
            in: [PickupStatus.PENDING, PickupStatus.CONFIRMED, PickupStatus.PREPARING],
          },
        },
        select: {
          id: true,
          customerName: true,
          scheduledDate: true,
          store: {
            select: { name: true },
          },
        },
      })

      return NextResponse.json({
        pendingReminders,
        count: pendingReminders.length,
      })
    }

    if (action === "pending-ready") {
      // Find pickups marked as READY that haven't been notified
      const pendingReady = await prisma.storePickup.findMany({
        where: {
          status: PickupStatus.READY,
          readyNotificationSent: false,
        },
        select: {
          id: true,
          customerName: true,
          store: {
            select: { name: true },
          },
        },
      })

      return NextResponse.json({
        pendingReady,
        count: pendingReady.length,
      })
    }

    return NextResponse.json({
      availableActions: ["pending-reminders", "pending-ready"],
      description: "Use ?action= to query pending notifications",
    })
  } catch (error) {
    console.error("Store pickup notification check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
