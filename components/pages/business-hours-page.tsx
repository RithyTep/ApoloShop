"use client"

import { useState } from "react"
import { Clock, Plus, Trash2, Calendar, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  useBusinessHours,
  useUpdateBusinessHours,
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  type BusinessHoursDay,
  type Holiday,
} from "@/lib/api-hooks"

const DAYS = [
  { value: 0, label: "Sunday", labelKh: "អាទិត្យ" },
  { value: 1, label: "Monday", labelKh: "ច័ន្ទ" },
  { value: 2, label: "Tuesday", labelKh: "អង្គារ" },
  { value: 3, label: "Wednesday", labelKh: "ពុធ" },
  { value: 4, label: "Thursday", labelKh: "ព្រហស្បតិ៍" },
  { value: 5, label: "Friday", labelKh: "សុក្រ" },
  { value: 6, label: "Saturday", labelKh: "សៅរ៍" },
]

export function BusinessHoursPage() {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()

  // Business Hours state
  const { data: hoursData, isLoading: hoursLoading } = useBusinessHours()
  const updateHours = useUpdateBusinessHours()
  const [localHours, setLocalHours] = useState<BusinessHoursDay[] | null>(null)
  const [hasHoursChanges, setHasHoursChanges] = useState(false)

  // Holidays state
  const { data: holidaysData, isLoading: holidaysLoading } = useHolidays(currentYear)
  const createHoliday = useCreateHoliday()
  const updateHoliday = useUpdateHoliday()
  const deleteHoliday = useDeleteHoliday()

  // Dialog state
  const [holidayDialog, setHolidayDialog] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Holiday form state
  const [holidayForm, setHolidayForm] = useState({
    date: "",
    nameEn: "",
    nameKh: "",
    isFullDay: true,
    openTime: "09:00",
    closeTime: "17:00",
  })

  // Initialize local hours from server data
  const hours = localHours || hoursData?.hours || []

  const handleHoursChange = (dayOfWeek: number, field: string, value: string | boolean) => {
    const newHours = hours.map((h) =>
      h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
    )
    setLocalHours(newHours)
    setHasHoursChanges(true)
  }

  const handleSaveHours = async () => {
    if (!localHours) return

    try {
      await updateHours.mutateAsync(localHours)
      setHasHoursChanges(false)
      toast({ title: "Business hours saved successfully" })
    } catch {
      toast({ title: "Failed to save business hours", variant: "destructive" })
    }
  }

  const handleOpenHolidayDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday)
      setHolidayForm({
        date: holiday.date.split("T")[0],
        nameEn: holiday.nameEn,
        nameKh: holiday.nameKh,
        isFullDay: holiday.isFullDay,
        openTime: holiday.openTime || "09:00",
        closeTime: holiday.closeTime || "17:00",
      })
    } else {
      setEditingHoliday(null)
      setHolidayForm({
        date: "",
        nameEn: "",
        nameKh: "",
        isFullDay: true,
        openTime: "09:00",
        closeTime: "17:00",
      })
    }
    setHolidayDialog(true)
  }

  const handleSaveHoliday = async () => {
    if (!holidayForm.date || !holidayForm.nameEn || !holidayForm.nameKh) {
      toast({ title: "Please fill in all required fields", variant: "destructive" })
      return
    }

    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({
          id: editingHoliday.id,
          ...holidayForm,
        })
        toast({ title: "Holiday updated successfully" })
      } else {
        await createHoliday.mutateAsync(holidayForm as Omit<Holiday, "id" | "createdAt">)
        toast({ title: "Holiday created successfully" })
      }
      setHolidayDialog(false)
    } catch {
      toast({ title: "Failed to save holiday", variant: "destructive" })
    }
  }

  const handleDeleteHoliday = async () => {
    if (!deleteConfirm) return

    try {
      await deleteHoliday.mutateAsync(deleteConfirm)
      toast({ title: "Holiday deleted successfully" })
      setDeleteConfirm(null)
    } catch {
      toast({ title: "Failed to delete holiday", variant: "destructive" })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  if (hoursLoading || holidaysLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Hours</h1>
          <p className="text-muted-foreground mt-2">
            Set your store's operating hours and holidays
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Weekly Schedule</CardTitle>
              </div>
              {hasHoursChanges && (
                <Button
                  size="sm"
                  onClick={handleSaveHours}
                  disabled={updateHours.isPending}
                >
                  {updateHours.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              )}
            </div>
            <CardDescription>
              Configure your regular operating hours for each day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS.map((day) => {
              const hourData = hours.find((h) => h.dayOfWeek === day.value)
              const isOpen = hourData?.isOpen ?? true

              return (
                <div
                  key={day.value}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <Switch
                      checked={isOpen}
                      onCheckedChange={(checked) =>
                        handleHoursChange(day.value, "isOpen", checked)
                      }
                    />
                    <div>
                      <p className="font-medium text-sm">{day.label}</p>
                      <p className="text-xs text-muted-foreground">{day.labelKh}</p>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hourData?.openTime || "09:00"}
                        onChange={(e) =>
                          handleHoursChange(day.value, "openTime", e.target.value)
                        }
                        className="w-28"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hourData?.closeTime || "21:00"}
                        onChange={(e) =>
                          handleHoursChange(day.value, "closeTime", e.target.value)
                        }
                        className="w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Closed</span>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Holidays */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Holidays ({currentYear})</CardTitle>
              </div>
              <Button size="sm" onClick={() => handleOpenHolidayDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>
            <CardDescription>
              Mark special days when your store is closed or has different hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {holidaysData?.holidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No holidays configured</p>
                <p className="text-sm">Add holidays to mark special closures</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holidaysData?.holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{holiday.nameEn}</p>
                      <p className="text-xs text-muted-foreground">
                        {holiday.nameKh} • {formatDate(holiday.date)}
                      </p>
                      {!holiday.isFullDay && (
                        <p className="text-xs text-primary mt-1">
                          Special hours: {holiday.openTime} - {holiday.closeTime}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenHolidayDialog(holiday)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(holiday.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holiday Dialog */}
      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "Edit Holiday" : "Add Holiday"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={holidayForm.date}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, date: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name (English)</Label>
                <Input
                  placeholder="e.g., Khmer New Year"
                  value={holidayForm.nameEn}
                  onChange={(e) =>
                    setHolidayForm({ ...holidayForm, nameEn: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Name (Khmer)</Label>
                <Input
                  placeholder="e.g., ចូលឆ្នាំខ្មែរ"
                  value={holidayForm.nameKh}
                  onChange={(e) =>
                    setHolidayForm({ ...holidayForm, nameKh: e.target.value })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Full Day Closure</Label>
                <p className="text-xs text-muted-foreground">
                  Turn off for special hours
                </p>
              </div>
              <Switch
                checked={holidayForm.isFullDay}
                onCheckedChange={(checked) =>
                  setHolidayForm({ ...holidayForm, isFullDay: checked })
                }
              />
            </div>

            {!holidayForm.isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Open Time</Label>
                  <Input
                    type="time"
                    value={holidayForm.openTime}
                    onChange={(e) =>
                      setHolidayForm({ ...holidayForm, openTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Close Time</Label>
                  <Input
                    type="time"
                    value={holidayForm.closeTime}
                    onChange={(e) =>
                      setHolidayForm({ ...holidayForm, closeTime: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveHoliday}
              disabled={createHoliday.isPending || updateHoliday.isPending}
            >
              {(createHoliday.isPending || updateHoliday.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingHoliday ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The holiday will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHoliday}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
