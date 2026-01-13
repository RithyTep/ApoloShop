"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getTranslation, type Language } from "@/lib/i18n"
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Navigation,
  ExternalLink,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react"

// Store location type from API
interface StoreHours {
  open: string
  close: string
  closed?: boolean
}

interface StoreLocation {
  id: string
  name: string
  nameKh: string | null
  address: string
  addressKh: string | null
  lat: number
  lng: number
  phone: string | null
  email: string | null
  hours: Record<string, StoreHours> | null
  hoursNote: string | null
  hoursNoteKh: string | null
  description: string | null
  descriptionKh: string | null
  imageUrl: string | null
  isActive: boolean
  isPrimary: boolean
  sortOrder: number
  distance?: number
}

interface StoreLocatorProps {
  language: Language
  showMap?: boolean
  maxStores?: number
}

// Day name mapping
const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

// Check if store is currently open
function isStoreOpen(hours: Record<string, StoreHours> | null): {
  isOpen: boolean
  opensAt?: string
  closesAt?: string
} {
  if (!hours) return { isOpen: false }

  const now = new Date()
  const dayName = DAYS[now.getDay()]
  const todayHours = hours[dayName]

  if (!todayHours || todayHours.closed) {
    // Find next opening day
    for (let i = 1; i <= 7; i++) {
      const nextDay = DAYS[(now.getDay() + i) % 7]
      const nextHours = hours[nextDay]
      if (nextHours && !nextHours.closed) {
        return { isOpen: false, opensAt: nextHours.open }
      }
    }
    return { isOpen: false }
  }

  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`

  const isOpen =
    currentTime >= todayHours.open && currentTime < todayHours.close

  return {
    isOpen,
    opensAt: isOpen ? undefined : todayHours.open,
    closesAt: isOpen ? todayHours.close : undefined,
  }
}

// Format distance
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

export function StoreLocator({
  language,
  showMap = true,
  maxStores = 10,
}: StoreLocatorProps) {
  const [stores, setStores] = useState<StoreLocation[]>([])
  const [nearestStore, setNearestStore] = useState<StoreLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null)

  const t = getTranslation(language)

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t.storeLocator?.locationError || "Location not supported")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationError(null)
      },
      () => {
        setLocationError(
          t.storeLocator?.locationError || "Unable to get location"
        )
      }
    )
  }, [t])

  // Fetch stores
  const fetchStores = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        active: "true",
        limit: maxStores.toString(),
      })

      if (userLocation) {
        params.set("lat", userLocation.lat.toString())
        params.set("lng", userLocation.lng.toString())
      }

      const response = await fetch(`/api/stores?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch stores")
      }

      const data = await response.json()
      setStores(data.stores || [])
      setNearestStore(data.nearest || null)

      // Auto-select nearest store if available
      if (data.nearest && !selectedStore) {
        setSelectedStore(data.nearest)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stores"
      )
    } finally {
      setIsLoading(false)
    }
  }, [userLocation, maxStores, selectedStore])

  // Get user location on mount
  useEffect(() => {
    getUserLocation()
  }, [getUserLocation])

  // Fetch stores when location changes
  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  // Get display name based on language
  const getStoreName = (store: StoreLocation) => {
    return language === "kh" && store.nameKh ? store.nameKh : store.name
  }

  const getStoreAddress = (store: StoreLocation) => {
    return language === "kh" && store.addressKh
      ? store.addressKh
      : store.address
  }

  const getHoursNote = (store: StoreLocation) => {
    return language === "kh" && store.hoursNoteKh
      ? store.hoursNoteKh
      : store.hoursNote
  }

  const getDescription = (store: StoreLocation) => {
    return language === "kh" && store.descriptionKh
      ? store.descriptionKh
      : store.description
  }

  // Get day translation
  const getDayName = (day: string) => {
    const dayKey = day as keyof typeof t.storeLocator
    return t.storeLocator?.[dayKey] || day
  }

  // Generate Google Maps URL
  const getDirectionsUrl = (store: StoreLocation) => {
    const destination = `${store.lat},${store.lng}`
    if (userLocation) {
      return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destination}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${destination}`
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.storeLocator?.title || "Our Stores"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-20 w-20 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.storeLocator?.title || "Our Stores"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fetchStores()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No stores
  if (stores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.storeLocator?.title || "Our Stores"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t.storeLocator?.noStores || "No stores found"}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t.storeLocator?.title || "Our Stores"}
            </div>
            {!userLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={getUserLocation}
                disabled={!!locationError}
              >
                <Navigation className="h-4 w-4 mr-2" />
                {t.storeLocator?.findStore || "Find Nearest"}
              </Button>
            )}
          </CardTitle>
          {locationError && (
            <p className="text-xs text-muted-foreground">{locationError}</p>
          )}
        </CardHeader>

        {/* Map placeholder - using iframe embed for simplicity */}
        {showMap && selectedStore && (
          <CardContent className="pt-0">
            <div className="w-full h-64 bg-muted rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=&q=${selectedStore.lat},${selectedStore.lng}&zoom=15`}
                title={`Map showing ${getStoreName(selectedStore)}`}
              />
              {/* Fallback for when API key is not set */}
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedStore.lat},${selectedStore.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MapPin className="h-8 w-8" />
                  <span className="text-sm">
                    {t.storeLocator?.viewOnMap || "View on Map"}
                  </span>
                </a>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Nearest Store Highlight */}
      {nearestStore && userLocation && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-primary">
                {t.storeLocator?.nearestStore || "Nearest Store"}
              </CardTitle>
              {nearestStore.distance !== undefined && (
                <Badge variant="secondary">
                  {formatDistance(nearestStore.distance)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <StoreCard
              store={nearestStore}
              language={language}
              t={t}
              isSelected={selectedStore?.id === nearestStore.id}
              onSelect={() => setSelectedStore(nearestStore)}
              getStoreName={getStoreName}
              getStoreAddress={getStoreAddress}
              getHoursNote={getHoursNote}
              getDescription={getDescription}
              getDayName={getDayName}
              getDirectionsUrl={getDirectionsUrl}
            />
          </CardContent>
        </Card>
      )}

      {/* All Stores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t.storeLocator?.allStores || "All Stores"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                language={language}
                t={t}
                isSelected={selectedStore?.id === store.id}
                onSelect={() => setSelectedStore(store)}
                getStoreName={getStoreName}
                getStoreAddress={getStoreAddress}
                getHoursNote={getHoursNote}
                getDescription={getDescription}
                getDayName={getDayName}
                getDirectionsUrl={getDirectionsUrl}
                showDistance={!!userLocation}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Store Card Component
interface StoreCardProps {
  store: StoreLocation
  language: Language
  t: ReturnType<typeof getTranslation>
  isSelected: boolean
  onSelect: () => void
  getStoreName: (store: StoreLocation) => string
  getStoreAddress: (store: StoreLocation) => string
  getHoursNote: (store: StoreLocation) => string | null
  getDescription: (store: StoreLocation) => string | null
  getDayName: (day: string) => string
  getDirectionsUrl: (store: StoreLocation) => string
  showDistance?: boolean
}

function StoreCard({
  store,
  language,
  t,
  isSelected,
  onSelect,
  getStoreName,
  getStoreAddress,
  getHoursNote,
  getDescription,
  getDayName,
  getDirectionsUrl,
  showDistance = false,
}: StoreCardProps) {
  const openStatus = isStoreOpen(store.hours)

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex gap-4">
        {/* Store Image */}
        {store.imageUrl && (
          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            <img
              src={store.imageUrl}
              alt={getStoreName(store)}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Store Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-foreground flex items-center gap-2">
                {getStoreName(store)}
                {store.isPrimary && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {t.storeLocator?.primaryStore || "Main"}
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {getStoreAddress(store)}
              </p>
            </div>

            {/* Distance Badge */}
            {showDistance && store.distance !== undefined && (
              <Badge variant="outline" className="flex-shrink-0">
                {formatDistance(store.distance)}
              </Badge>
            )}
          </div>

          {/* Description */}
          {getDescription(store) && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {getDescription(store)}
            </p>
          )}

          {/* Open/Closed Status */}
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {openStatus.isOpen ? (
              <span className="text-sm text-green-600">
                {t.storeLocator?.openNow || "Open Now"}
                {openStatus.closesAt && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {t.storeLocator?.closesAt || "Closes"} {openStatus.closesAt}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-sm text-red-600">
                {t.storeLocator?.closedNow || "Closed"}
                {openStatus.opensAt && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {t.storeLocator?.opensAt || "Opens"} {openStatus.opensAt}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Store Hours (expanded when selected) */}
          {isSelected && store.hours && (
            <div className="mt-3 pt-3 border-t border-border">
              <h4 className="text-sm font-medium mb-2">
                {t.storeLocator?.hours || "Hours"}
              </h4>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {DAYS.slice(1)
                  .concat(DAYS.slice(0, 1))
                  .map((day) => {
                    const dayHours = store.hours?.[day]
                    const isToday = DAYS[new Date().getDay()] === day
                    return (
                      <div
                        key={day}
                        className={`flex justify-between py-1 ${
                          isToday ? "font-medium" : ""
                        }`}
                      >
                        <span className="text-muted-foreground">
                          {getDayName(day)}
                        </span>
                        <span>
                          {dayHours?.closed
                            ? t.storeLocator?.closed || "Closed"
                            : dayHours
                            ? `${dayHours.open} - ${dayHours.close}`
                            : "-"}
                        </span>
                      </div>
                    )
                  })}
              </div>
              {getHoursNote(store) && (
                <p className="text-xs text-muted-foreground mt-2">
                  {getHoursNote(store)}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {store.phone && (
              <a href={`tel:${store.phone}`}>
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-1" />
                  {t.storeLocator?.callStore || "Call"}
                </Button>
              </a>
            )}

            {store.email && (
              <a href={`mailto:${store.email}`}>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-1" />
                  {t.storeLocator?.email || "Email"}
                </Button>
              </a>
            )}

            <a
              href={getDirectionsUrl(store)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Navigation className="h-4 w-4 mr-1" />
                {t.storeLocator?.getDirections || "Directions"}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
