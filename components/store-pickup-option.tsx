"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Clock,
  Phone,
  ChevronRight,
  Store,
  Calendar,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { translations } from "@/lib/i18n"
import { format, addDays, isSameDay, isAfter, isBefore } from "date-fns"

interface StoreHours {
  open: string
  close: string
  closed?: boolean
}

interface StoreWithPickup {
  id: string
  name: string
  nameKh: string | null
  address: string
  addressKh: string | null
  phone: string | null
  hours: Record<string, StoreHours> | null
  lat: number
  lng: number
  isPrimary: boolean
  pickupEnabled: boolean
  timeSlots: TimeSlot[]
}

interface TimeSlot {
  id: string
  storeId: string
  dayOfWeek: number | null
  specificDate: string | null
  startTime: string
  endTime: string
  maxPickups: number
  isActive: boolean
  bookedCount?: number
  availableCount?: number
  isAvailable?: boolean
}

interface PickupSelection {
  storeId: string
  storeName: string
  storeAddress: string
  storePhone: string | null
  scheduledDate: Date
  timeSlotId: string | null
  timeSlotDisplay: string | null
  customerNotes: string
}

interface StorePickupOptionProps {
  language: "EN" | "KH"
  onSelectPickup: (pickup: PickupSelection | null) => void
  selectedPickup: PickupSelection | null
  customerLat?: number
  customerLng?: number
}

const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

// Check if store is currently open
function isStoreOpen(hours: Record<string, StoreHours> | null): boolean {
  if (!hours) return true // Assume open if no hours specified
  const now = new Date()
  const dayName = DAYS_OF_WEEK[now.getDay()]
  const dayHours = hours[dayName]
  if (!dayHours || dayHours.closed) return false
  const currentTime = format(now, "HH:mm")
  return currentTime >= dayHours.open && currentTime < dayHours.close
}

// Get store hours display for a day
function getHoursDisplay(
  hours: Record<string, StoreHours> | null,
  dayIndex: number
): string {
  if (!hours) return "N/A"
  const dayName = DAYS_OF_WEEK[dayIndex]
  const dayHours = hours[dayName]
  if (!dayHours || dayHours.closed) return "Closed"
  return `${dayHours.open} - ${dayHours.close}`
}

export function StorePickupOption({
  language,
  onSelectPickup,
  selectedPickup,
  customerLat,
  customerLng,
}: StorePickupOptionProps) {
  const [stores, setStores] = useState<StoreWithPickup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    selectedPickup?.storeId || null
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    selectedPickup?.scheduledDate || null
  )
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(
    selectedPickup?.timeSlotId || null
  )
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [customerNotes, setCustomerNotes] = useState(
    selectedPickup?.customerNotes || ""
  )

  const t = translations[language === "EN" ? "en" : "kh"]
  const tp = t.storePickup

  // Fetch stores with pickup enabled
  useEffect(() => {
    async function fetchStores() {
      try {
        setIsLoading(true)
        let url = "/api/store-pickup?action=stores"
        if (customerLat && customerLng) {
          url += `&lat=${customerLat}&lng=${customerLng}`
        }
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setStores(data.stores || [])
        }
      } catch (error) {
        console.error("Error fetching stores:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStores()
  }, [customerLat, customerLng])

  // Fetch available time slots when store and date are selected
  const fetchTimeSlots = useCallback(async () => {
    if (!selectedStoreId || !selectedDate) {
      setAvailableSlots([])
      return
    }

    try {
      setIsLoadingSlots(true)
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const response = await fetch(
        `/api/store-pickup?action=slots&storeId=${selectedStoreId}&date=${dateStr}`
      )
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error("Error fetching time slots:", error)
    } finally {
      setIsLoadingSlots(false)
    }
  }, [selectedStoreId, selectedDate])

  useEffect(() => {
    fetchTimeSlots()
  }, [fetchTimeSlots])

  // Update parent when selection changes
  useEffect(() => {
    if (selectedStoreId && selectedDate) {
      const store = stores.find((s) => s.id === selectedStoreId)
      if (store) {
        const slot = availableSlots.find((s) => s.id === selectedTimeSlot)
        onSelectPickup({
          storeId: selectedStoreId,
          storeName: language === "KH" && store.nameKh ? store.nameKh : store.name,
          storeAddress:
            language === "KH" && store.addressKh
              ? store.addressKh
              : store.address,
          storePhone: store.phone,
          scheduledDate: selectedDate,
          timeSlotId: selectedTimeSlot,
          timeSlotDisplay: slot
            ? `${slot.startTime} - ${slot.endTime}`
            : null,
          customerNotes,
        })
      }
    } else {
      onSelectPickup(null)
    }
  }, [
    selectedStoreId,
    selectedDate,
    selectedTimeSlot,
    customerNotes,
    stores,
    availableSlots,
    language,
    onSelectPickup,
  ])

  // Get available dates (next 7 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  const selectedStore = stores.find((s) => s.id === selectedStoreId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{tp.loadingStores}</span>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{tp.noStoresAvailable}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Store */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            1
          </div>
          <h3 className="font-medium">{tp.selectStore}</h3>
        </div>

        <RadioGroup
          value={selectedStoreId || ""}
          onValueChange={(value) => {
            setSelectedStoreId(value)
            setSelectedTimeSlot(null) // Reset time slot when store changes
          }}
          className="space-y-3"
        >
          {stores.map((store) => {
            const isOpen = isStoreOpen(store.hours)
            const storeName =
              language === "KH" && store.nameKh ? store.nameKh : store.name
            const storeAddress =
              language === "KH" && store.addressKh
                ? store.addressKh
                : store.address

            return (
              <Card
                key={store.id}
                className={`cursor-pointer transition-colors ${
                  selectedStoreId === store.id
                    ? "border-primary ring-1 ring-primary"
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => {
                  setSelectedStoreId(store.id)
                  setSelectedTimeSlot(null)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={store.id} id={store.id} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Label
                          htmlFor={store.id}
                          className="font-medium cursor-pointer"
                        >
                          {storeName}
                        </Label>
                        {store.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            {tp.mainStore}
                          </Badge>
                        )}
                        <Badge
                          variant={isOpen ? "default" : "secondary"}
                          className={`text-xs ${
                            isOpen
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isOpen ? tp.open : tp.closed}
                        </Badge>
                      </div>
                      <div className="flex items-start gap-1 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{storeAddress}</span>
                      </div>
                      {store.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        selectedStoreId === store.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </RadioGroup>
      </div>

      {/* Step 2: Select Date */}
      {selectedStoreId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              2
            </div>
            <h3 className="font-medium">{tp.selectDate}</h3>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {availableDates.map((date) => {
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isToday = isSameDay(date, new Date())
              const dayOfWeek = date.getDay()
              const storeHours = selectedStore?.hours
              const hours = getHoursDisplay(
                storeHours as Record<string, StoreHours> | null,
                dayOfWeek
              )
              const isClosed = hours === "Closed"

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    if (!isClosed) {
                      setSelectedDate(date)
                      setSelectedTimeSlot(null)
                    }
                  }}
                  disabled={isClosed}
                  className={`flex flex-col items-center p-3 rounded-lg border min-w-[80px] transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isClosed
                      ? "border-muted bg-muted/50 opacity-50 cursor-not-allowed"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xs text-muted-foreground uppercase">
                    {format(date, "EEE")}
                  </span>
                  <span className="text-lg font-semibold">
                    {format(date, "d")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(date, "MMM")}
                  </span>
                  {isToday && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {tp.today}
                    </Badge>
                  )}
                  {isClosed && (
                    <span className="text-xs text-muted-foreground mt-1">
                      {tp.closed}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Select Time Slot */}
      {selectedStoreId && selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              3
            </div>
            <h3 className="font-medium">{tp.selectTimeSlot}</h3>
          </div>

          {isLoadingSlots ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                {tp.loadingSlots}
              </span>
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {tp.noSlotsAvailable}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableSlots.map((slot) => {
                const isSelected = selectedTimeSlot === slot.id
                const spotsLeft = slot.availableCount || 0
                const isUnavailable = !slot.isAvailable

                return (
                  <button
                    key={slot.id}
                    onClick={() => !isUnavailable && setSelectedTimeSlot(slot.id)}
                    disabled={isUnavailable}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : isUnavailable
                        ? "border-muted bg-muted/50 opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        isUnavailable
                          ? "text-destructive"
                          : spotsLeft <= 3
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isUnavailable
                        ? tp.fullyBooked
                        : spotsLeft <= 3
                        ? `${spotsLeft} ${tp.spotsLeft}`
                        : tp.available}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Add Notes (Optional) */}
      {selectedStoreId && selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
              4
            </div>
            <h3 className="font-medium text-muted-foreground">
              {tp.addNotes}{" "}
              <span className="font-normal text-sm">({tp.optional})</span>
            </h3>
          </div>

          <Textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder={tp.notesPlaceholder}
            className="resize-none"
            rows={2}
          />
        </div>
      )}

      {/* Selection Summary */}
      {selectedStoreId && selectedDate && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              {tp.pickupSummary}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Store className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>
                {language === "KH" && selectedStore?.nameKh
                  ? selectedStore.nameKh
                  : selectedStore?.name}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
            </div>
            {selectedTimeSlot && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>
                  {availableSlots.find((s) => s.id === selectedTimeSlot)?.startTime} -{" "}
                  {availableSlots.find((s) => s.id === selectedTimeSlot)?.endTime}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {language === "KH" && selectedStore?.addressKh
                  ? selectedStore.addressKh
                  : selectedStore?.address}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
