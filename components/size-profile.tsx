"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Ruler, Save, Trash2 } from "lucide-react"
import { translations } from "@/lib/i18n"

interface SizeProfileData {
  id: string
  gender?: "MALE" | "FEMALE" | "UNISEX"
  height?: number
  weight?: number
  age?: number
  chest?: number
  waist?: number
  hips?: number
  inseam?: number
  shoulder?: number
  armLength?: number
  footLength?: number
  footWidth?: number
  preferredFit: "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZED"
  savedSizes?: Record<string, string>
}

interface SizeProfileProps {
  customerId?: string
  guestId?: string
  language: "EN" | "KH"
  onSave?: (profile: SizeProfileData) => void
}

const profileText = {
  en: {
    title: "My Size Profile",
    subtitle: "Save your measurements for accurate size recommendations",
    personal: "Personal Info",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    height: "Height (cm)",
    weight: "Weight (kg)",
    age: "Age",
    measurements: "Body Measurements",
    measurementsSubtitle: "All measurements in centimeters (cm)",
    chest: "Chest",
    waist: "Waist",
    hips: "Hips",
    inseam: "Inseam",
    shoulder: "Shoulder",
    armLength: "Arm Length",
    footMeasurements: "Foot Measurements",
    footLength: "Foot Length",
    footWidth: "Foot Width",
    fitPreference: "Fit Preference",
    slim: "Slim Fit",
    regular: "Regular Fit",
    relaxed: "Relaxed Fit",
    oversized: "Oversized",
    savedSizes: "Saved Sizes",
    savedSizesSubtitle: "Your saved sizes for different categories",
    tops: "Tops",
    bottoms: "Bottoms",
    dresses: "Dresses",
    shoes: "Shoes",
    save: "Save Profile",
    saving: "Saving...",
    saved: "Profile Saved!",
    delete: "Delete Profile",
    loading: "Loading profile...",
    noProfile: "No profile found",
  },
  kh: {
    title: "ប្រវត្តិរូបទំហំរបស់ខ្ញុំ",
    subtitle: "រក្សាទុករង្វាស់របស់អ្នកសម្រាប់អនុសាសន៍ទំហំត្រឹមត្រូវ",
    personal: "ព័ត៌មានផ្ទាល់ខ្លួន",
    gender: "ភេទ",
    male: "ប្រុស",
    female: "ស្រី",
    other: "ផ្សេងៗ",
    height: "កម្ពស់ (cm)",
    weight: "ទម្ងន់ (kg)",
    age: "អាយុ",
    measurements: "រង្វាស់រាងកាយ",
    measurementsSubtitle: "រង្វាស់ទាំងអស់ជា សង់ទីម៉ែត្រ (cm)",
    chest: "ទ្រូង",
    waist: "ចង្កេះ",
    hips: "សាច់ដុំ",
    inseam: "ជើង​ខាងក្នុង",
    shoulder: "ស្មា",
    armLength: "ប្រវែងដៃ",
    footMeasurements: "រង្វាស់ជើង",
    footLength: "ប្រវែងជើង",
    footWidth: "ទទឹងជើង",
    fitPreference: "ចំណូលចិត្តសម្បុរ",
    slim: "សម្បុរតឹង",
    regular: "សម្បុរធម្មតា",
    relaxed: "សម្បុរធូរធារ",
    oversized: "ធំជាង",
    savedSizes: "ទំហំដែលបានរក្សាទុក",
    savedSizesSubtitle: "ទំហំដែលអ្នកបានរក្សាទុកសម្រាប់ប្រភេទផ្សេងៗ",
    tops: "អាវ",
    bottoms: "ខោ",
    dresses: "រ៉ូប",
    shoes: "ស្បែកជើង",
    save: "រក្សាទុកប្រវត្តិរូប",
    saving: "កំពុងរក្សាទុក...",
    saved: "បានរក្សាទុកប្រវត្តិរូប!",
    delete: "លុបប្រវត្តិរូប",
    loading: "កំពុងផ្ទុកប្រវត្តិរូប...",
    noProfile: "រកមិនឃើញប្រវត្តិរូប",
  },
}

// Size options for saved sizes
const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]

export function SizeProfile({
  customerId,
  guestId,
  language,
  onSave,
}: SizeProfileProps) {
  const [profile, setProfile] = useState<Partial<SizeProfileData>>({
    preferredFit: "REGULAR",
    savedSizes: {},
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")
  const [error, setError] = useState<string | null>(null)

  const t = profileText[language === "EN" ? "en" : "kh"]

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!customerId && !guestId) {
        setIsLoading(false)
        return
      }

      try {
        const params = new URLSearchParams()
        if (customerId) params.set("customerId", customerId)
        if (guestId) params.set("guestId", guestId)

        const response = await fetch(`/api/size-profiles?${params}`)
        if (response.ok) {
          const data = await response.json()
          if (data.profile) {
            setProfile(data.profile)
          }
        }
      } catch (error) {
        console.error("Error loading size profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [customerId, guestId])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/size-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          guestId: guestId || `guest_${Date.now()}`,
          ...profile,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save profile")
      }

      const data = await response.json()
      setProfile(data.profile)
      setSaveStatus("saved")
      onSave?.(data.profile)

      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setError(language === "EN" ? "Failed to save profile" : "បរាជ័យក្នុងការរក្សាទុក")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(language === "EN" ? "Are you sure you want to delete your size profile?" : "តើអ្នកប្រាកដថាចង់លុបប្រវត្តិរូបទំហំរបស់អ្នក?")) {
      return
    }

    try {
      const params = new URLSearchParams()
      if (customerId) params.set("customerId", customerId)
      if (guestId) params.set("guestId", guestId)

      const response = await fetch(`/api/size-profiles?${params}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProfile({ preferredFit: "REGULAR", savedSizes: {} })
      }
    } catch (error) {
      console.error("Error deleting profile:", error)
    }
  }

  const updateSavedSize = (category: string, size: string) => {
    setProfile({
      ...profile,
      savedSizes: {
        ...(profile.savedSizes || {}),
        [category]: size,
      },
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Info Section */}
        <div className="space-y-4">
          <h3 className="font-medium">{t.personal}</h3>

          <div className="space-y-2">
            <Label>{t.gender}</Label>
            <RadioGroup
              value={profile.gender}
              onValueChange={(value) => setProfile({ ...profile, gender: value as SizeProfileData["gender"] })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MALE" id="profile-male" />
                <Label htmlFor="profile-male">{t.male}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FEMALE" id="profile-female" />
                <Label htmlFor="profile-female">{t.female}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="UNISEX" id="profile-other" />
                <Label htmlFor="profile-other">{t.other}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-height">{t.height}</Label>
              <Input
                id="profile-height"
                type="number"
                value={profile.height || ""}
                onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-weight">{t.weight}</Label>
              <Input
                id="profile-weight"
                type="number"
                value={profile.weight || ""}
                onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-age">{t.age}</Label>
              <Input
                id="profile-age"
                type="number"
                value={profile.age || ""}
                onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) || undefined })}
              />
            </div>
          </div>
        </div>

        {/* Body Measurements Section */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              {t.measurements}
            </h3>
            <p className="text-sm text-muted-foreground">{t.measurementsSubtitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-chest">{t.chest}</Label>
              <Input
                id="profile-chest"
                type="number"
                value={profile.chest || ""}
                onChange={(e) => setProfile({ ...profile, chest: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-waist">{t.waist}</Label>
              <Input
                id="profile-waist"
                type="number"
                value={profile.waist || ""}
                onChange={(e) => setProfile({ ...profile, waist: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-hips">{t.hips}</Label>
              <Input
                id="profile-hips"
                type="number"
                value={profile.hips || ""}
                onChange={(e) => setProfile({ ...profile, hips: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-shoulder">{t.shoulder}</Label>
              <Input
                id="profile-shoulder"
                type="number"
                value={profile.shoulder || ""}
                onChange={(e) => setProfile({ ...profile, shoulder: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-inseam">{t.inseam}</Label>
              <Input
                id="profile-inseam"
                type="number"
                value={profile.inseam || ""}
                onChange={(e) => setProfile({ ...profile, inseam: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-arm">{t.armLength}</Label>
              <Input
                id="profile-arm"
                type="number"
                value={profile.armLength || ""}
                onChange={(e) => setProfile({ ...profile, armLength: Number(e.target.value) || undefined })}
              />
            </div>
          </div>
        </div>

        {/* Foot Measurements */}
        <div className="space-y-4">
          <h3 className="font-medium">{t.footMeasurements}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-footLength">{t.footLength}</Label>
              <Input
                id="profile-footLength"
                type="number"
                step="0.1"
                value={profile.footLength || ""}
                onChange={(e) => setProfile({ ...profile, footLength: Number(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-footWidth">{t.footWidth}</Label>
              <Input
                id="profile-footWidth"
                type="number"
                step="0.1"
                value={profile.footWidth || ""}
                onChange={(e) => setProfile({ ...profile, footWidth: Number(e.target.value) || undefined })}
              />
            </div>
          </div>
        </div>

        {/* Fit Preference */}
        <div className="space-y-2">
          <Label>{t.fitPreference}</Label>
          <RadioGroup
            value={profile.preferredFit}
            onValueChange={(value) => setProfile({ ...profile, preferredFit: value as SizeProfileData["preferredFit"] })}
            className="flex flex-wrap gap-4"
          >
            {[
              { value: "SLIM", label: t.slim },
              { value: "REGULAR", label: t.regular },
              { value: "RELAXED", label: t.relaxed },
              { value: "OVERSIZED", label: t.oversized },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`fit-pref-${option.value}`} />
                <Label htmlFor={`fit-pref-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Saved Sizes */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">{t.savedSizes}</h3>
            <p className="text-sm text-muted-foreground">{t.savedSizesSubtitle}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "tops", label: t.tops },
              { key: "bottoms", label: t.bottoms },
              { key: "dresses", label: t.dresses },
              { key: "shoes", label: t.shoes },
            ].map((category) => (
              <div key={category.key} className="space-y-2">
                <Label>{category.label}</Label>
                <Select
                  value={profile.savedSizes?.[category.key] || ""}
                  onValueChange={(value) => updateSavedSize(category.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          {t.delete}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            t.saving
          ) : saveStatus === "saved" ? (
            <>
              <span className="text-green-500">✓</span> {t.saved}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t.save}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
