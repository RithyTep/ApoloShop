// Delivery date estimation service
// Calculates expected delivery dates based on shipping zones and business days

// Cambodia public holidays (approximate dates - some vary by lunar calendar)
// These should be updated annually
const CAMBODIA_HOLIDAYS_2025: string[] = [
  "2025-01-01", // International New Year
  "2025-01-07", // Victory Day
  "2025-02-04", // Meak Bochea Day
  "2025-03-08", // International Women's Day
  "2025-04-13", // Khmer New Year
  "2025-04-14", // Khmer New Year
  "2025-04-15", // Khmer New Year
  "2025-04-16", // Khmer New Year
  "2025-05-01", // Labor Day
  "2025-05-06", // Royal Birthday
  "2025-05-14", // Royal Plowing Ceremony
  "2025-05-14", // Visak Bochea Day
  "2025-06-18", // Queen's Birthday
  "2025-09-24", // Constitution Day
  "2025-10-14", // Pchum Ben Day
  "2025-10-15", // Pchum Ben Day
  "2025-10-16", // Pchum Ben Day
  "2025-10-29", // King Coronation Day
  "2025-11-04", // Water Festival
  "2025-11-05", // Water Festival
  "2025-11-06", // Water Festival
  "2025-11-09", // Independence Day
]

// 2026 holidays
const CAMBODIA_HOLIDAYS_2026: string[] = [
  "2026-01-01", // International New Year
  "2026-01-07", // Victory Day
  "2026-02-22", // Meak Bochea Day (varies)
  "2026-03-08", // International Women's Day
  "2026-04-13", // Khmer New Year
  "2026-04-14", // Khmer New Year
  "2026-04-15", // Khmer New Year
  "2026-04-16", // Khmer New Year
  "2026-05-01", // Labor Day
  "2026-05-06", // Royal Birthday
  "2026-05-14", // Royal Plowing Ceremony
  "2026-05-22", // Visak Bochea Day (varies)
  "2026-06-18", // Queen's Birthday
  "2026-09-24", // Constitution Day
  "2026-10-03", // Pchum Ben Day (varies)
  "2026-10-04", // Pchum Ben Day
  "2026-10-05", // Pchum Ben Day
  "2026-10-29", // King Coronation Day
  "2026-10-24", // Water Festival (varies)
  "2026-10-25", // Water Festival
  "2026-10-26", // Water Festival
  "2026-11-09", // Independence Day
]

// Combine all holidays
const CAMBODIA_HOLIDAYS = new Set([
  ...CAMBODIA_HOLIDAYS_2025,
  ...CAMBODIA_HOLIDAYS_2026,
])

export interface ShippingZoneInfo {
  id: string
  nameEn: string
  nameKh: string
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
  rateType: string
}

export interface DeliveryEstimateResult {
  zoneId: string
  zoneName: { en: string; kh: string }
  estimatedRange: {
    earliest: string // ISO date string
    latest: string // ISO date string
    earliestFormatted: { en: string; kh: string }
    latestFormatted: { en: string; kh: string }
  }
  businessDays: {
    min: number
    max: number
  }
  isExpress: boolean // If delivery is within 1-2 business days
  shippingMethod: string
}

export interface DeliveryEstimateInput {
  region?: string // Province/region code
  shippingZoneId?: string // Specific zone ID
  startDate?: Date // Order date (defaults to now)
}

/**
 * Check if a date is a weekend (Saturday = 6, Sunday = 0)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Check if a date is a Cambodia public holiday
 */
export function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split("T")[0]
  return CAMBODIA_HOLIDAYS.has(dateStr)
}

/**
 * Check if a date is a business day (not weekend, not holiday)
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date)
}

/**
 * Add business days to a date, skipping weekends and holidays
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate)
  let daysAdded = 0

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1)
    if (isBusinessDay(result)) {
      daysAdded++
    }
  }

  return result
}

/**
 * Format a date for display
 */
export function formatDeliveryDate(date: Date, language: "en" | "kh"): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  }

  if (language === "en") {
    return date.toLocaleDateString("en-US", options)
  }

  // Khmer format - use Khmer locale if available, otherwise format manually
  try {
    return date.toLocaleDateString("km-KH", options)
  } catch {
    // Fallback: manual Khmer formatting
    const days = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍"]
    const months = [
      "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
      "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
    ]
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
  }
}

/**
 * Calculate delivery estimate for a shipping zone
 */
export function calculateDeliveryEstimate(
  zone: ShippingZoneInfo,
  startDate: Date = new Date()
): DeliveryEstimateResult {
  // Default delivery days if not specified
  const minDays = zone.minDeliveryDays ?? 2
  const maxDays = zone.maxDeliveryDays ?? 5

  // Calculate earliest and latest delivery dates
  const earliestDate = addBusinessDays(startDate, minDays)
  const latestDate = addBusinessDays(startDate, maxDays)

  // Check if this is express delivery (1-2 days)
  const isExpress = minDays <= 2

  // Determine shipping method description
  let shippingMethod = "standard"
  if (zone.rateType === "FREE") {
    shippingMethod = "free_shipping"
  } else if (isExpress) {
    shippingMethod = "express"
  }

  return {
    zoneId: zone.id,
    zoneName: {
      en: zone.nameEn,
      kh: zone.nameKh,
    },
    estimatedRange: {
      earliest: earliestDate.toISOString(),
      latest: latestDate.toISOString(),
      earliestFormatted: {
        en: formatDeliveryDate(earliestDate, "en"),
        kh: formatDeliveryDate(earliestDate, "kh"),
      },
      latestFormatted: {
        en: formatDeliveryDate(latestDate, "en"),
        kh: formatDeliveryDate(latestDate, "kh"),
      },
    },
    businessDays: {
      min: minDays,
      max: maxDays,
    },
    isExpress,
    shippingMethod,
  }
}

/**
 * Get the next business day from a given date
 */
export function getNextBusinessDay(date: Date = new Date()): Date {
  const result = new Date(date)

  // If current time is past cutoff (e.g., 3 PM), start from next day
  const cutoffHour = 15 // 3 PM
  if (result.getHours() >= cutoffHour) {
    result.setDate(result.getDate() + 1)
  }

  // Find next business day
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1)
  }

  return result
}

/**
 * Check if order will be processed today
 * Orders placed before cutoff time on business days are processed same day
 */
export function willProcessToday(date: Date = new Date()): boolean {
  const cutoffHour = 15 // 3 PM cutoff
  return isBusinessDay(date) && date.getHours() < cutoffHour
}

/**
 * Get upcoming holidays for display
 */
export function getUpcomingHolidays(count: number = 3): { date: string; name: string }[] {
  const today = new Date().toISOString().split("T")[0]
  const holidayNames: Record<string, string> = {
    "01-01": "New Year",
    "01-07": "Victory Day",
    "03-08": "Women's Day",
    "04-13": "Khmer New Year",
    "04-14": "Khmer New Year",
    "04-15": "Khmer New Year",
    "04-16": "Khmer New Year",
    "05-01": "Labor Day",
    "05-06": "Royal Birthday",
    "06-18": "Queen's Birthday",
    "09-24": "Constitution Day",
    "10-29": "Coronation Day",
    "11-09": "Independence Day",
  }

  const upcoming: { date: string; name: string }[] = []

  for (const holiday of Array.from(CAMBODIA_HOLIDAYS).sort()) {
    if (holiday >= today) {
      const monthDay = holiday.slice(5) // "MM-DD"
      const name = holidayNames[monthDay] || "Public Holiday"
      upcoming.push({ date: holiday, name })
      if (upcoming.length >= count) break
    }
  }

  return upcoming
}
