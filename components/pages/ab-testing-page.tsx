"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Trash,
  Play,
  Pause,
  BarChart3,
  Trophy,
  X,
  Users,
  TrendingUp,
  Target,
} from "lucide-react"
import {
  useExperiments,
  useExperimentStats,
  useCreateExperiment,
  useUpdateExperiment,
  useDeleteExperiment,
  Experiment,
  ExperimentStatus,
  ExperimentType,
  CreateExperimentInput,
} from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import {
  AdminPageHeader,
  AdminFilterCard,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

const experimentTypes: { value: ExperimentType; label: string }[] = [
  { value: "PRODUCT_PAGE", label: "Product Page" },
  { value: "CHECKOUT", label: "Checkout" },
  { value: "PRICING", label: "Pricing" },
  { value: "HOMEPAGE", label: "Homepage" },
  { value: "PROMOTION", label: "Promotion" },
  { value: "CUSTOM", label: "Custom" },
]

const goalTypes = [
  { value: "conversion", label: "Conversion Rate" },
  { value: "revenue", label: "Revenue" },
  { value: "clicks", label: "Click Rate" },
  { value: "add_to_cart", label: "Add to Cart" },
]

const confidenceLevels = [90, 95, 99]

interface VariantForm {
  name: string
  description: string
  isControl: boolean
  trafficWeight: number
}

export function ABTestingPage() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [statsDialogId, setStatsDialogId] = useState<string | null>(null)
  const [deleteExperiment, setDeleteExperiment] = useState<Experiment | null>(null)
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | "">("")

  const { data, isLoading } = useExperiments(
    statusFilter ? { status: statusFilter } : undefined
  )
  const { data: statsData, isLoading: statsLoading } = useExperimentStats(statsDialogId)
  const createMutation = useCreateExperiment()
  const updateMutation = useUpdateExperiment()
  const deleteMutation = useDeleteExperiment()

  const experiments = data?.experiments || []

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "CUSTOM" as ExperimentType,
    trafficPercent: 100,
    goalType: "conversion",
    goalDescription: "",
    confidenceLevel: 95,
    minSampleSize: 100,
    autoEndEnabled: true,
    autoEndOnSignificance: true,
  })

  const [variants, setVariants] = useState<VariantForm[]>([
    { name: "Control", description: "", isControl: true, trafficWeight: 50 },
    { name: "Variant A", description: "", isControl: false, trafficWeight: 50 },
  ])

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "CUSTOM",
      trafficPercent: 100,
      goalType: "conversion",
      goalDescription: "",
      confidenceLevel: 95,
      minSampleSize: 100,
      autoEndEnabled: true,
      autoEndOnSignificance: true,
    })
    setVariants([
      { name: "Control", description: "", isControl: true, trafficWeight: 50 },
      { name: "Variant A", description: "", isControl: false, trafficWeight: 50 },
    ])
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const addVariant = () => {
    const variantNum = variants.length
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const letter = letters[variantNum - 1] || variantNum.toString()
    setVariants([
      ...variants,
      { name: `Variant ${letter}`, description: "", isControl: false, trafficWeight: 0 },
    ])
  }

  const removeVariant = (index: number) => {
    if (variants.length <= 2) {
      toast({ title: "Minimum 2 variants required", variant: "destructive" })
      return
    }
    if (variants[index].isControl) {
      toast({ title: "Cannot remove control variant", variant: "destructive" })
      return
    }
    setVariants(variants.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, field: keyof VariantForm, value: string | number | boolean) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], [field]: value }
    setVariants(updated)
  }

  const balanceWeights = () => {
    const equalWeight = Math.floor(100 / variants.length)
    const remainder = 100 - equalWeight * variants.length
    setVariants(
      variants.map((v, i) => ({
        ...v,
        trafficWeight: equalWeight + (i < remainder ? 1 : 0),
      }))
    )
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.trafficWeight, 0)

  const handleSubmit = async () => {
    try {
      if (totalWeight !== 100) {
        toast({
          title: "Invalid traffic weights",
          description: `Weights must sum to 100 (currently ${totalWeight})`,
          variant: "destructive",
        })
        return
      }

      const createData: CreateExperimentInput = {
        ...formData,
        variants: variants.map((v) => ({
          name: v.name,
          description: v.description || undefined,
          isControl: v.isControl,
          trafficWeight: v.trafficWeight,
        })),
      }

      await createMutation.mutateAsync(createData)
      toast({ title: "Experiment created successfully" })
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleStatusChange = async (experiment: Experiment, newStatus: ExperimentStatus) => {
    try {
      await updateMutation.mutateAsync({ id: experiment.id, status: newStatus })
      toast({ title: `Experiment ${newStatus.toLowerCase()}` })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteExperiment) return
    try {
      await deleteMutation.mutateAsync(deleteExperiment.id)
      toast({ title: "Experiment deleted successfully" })
      setDeleteExperiment(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const getStatusBadgeVariant = (status: ExperimentStatus): "default" | "secondary" | "outline" | "destructive" => {
    const variants: Record<ExperimentStatus, "default" | "secondary" | "outline" | "destructive"> = {
      DRAFT: "secondary",
      RUNNING: "default",
      PAUSED: "outline",
      COMPLETED: "secondary",
    }
    return variants[status]
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`

  if (isLoading) {
    return (
      <AdminLoading
        title="A/B Testing"
        subtitle="Create and manage experiments to optimize conversions"
        rows={3}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="A/B Testing"
        subtitle="Create and manage experiments to optimize conversions"
      >
        <Button
          onClick={openCreateDialog}
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} /> New Experiment
        </Button>
      </AdminPageHeader>

      {/* Filter */}
      <AdminFilterCard>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : (v as ExperimentStatus))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">{experiments.length} experiments</div>
      </AdminFilterCard>

      {/* Experiments Table */}
      <AdminDataCard>
        {experiments.length > 0 ? (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Name</AdminTableHead>
                <AdminTableHead>Type</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Variants</AdminTableHead>
                <AdminTableHead>Visitors</AdminTableHead>
                <AdminTableHead>Conversions</AdminTableHead>
                <AdminTableHead>Created</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {experiments.map((exp) => {
                const totalVisitors = exp.variants.reduce((sum, v) => sum + v.visitors, 0)
                const totalConversions = exp.variants.reduce((sum, v) => sum + v.conversions, 0)
                return (
                  <AdminTableRow key={exp.id}>
                    <AdminTableCell className="font-medium">
                      <div>
                        {exp.name}
                        {exp.isSignificant && (
                          <Trophy className="inline ml-2 text-yellow-500" size={14} />
                        )}
                      </div>
                      {exp.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {exp.description}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {exp.type.replace("_", " ")}
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={getStatusBadgeVariant(exp.status)}>
                        {exp.status}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {exp.variants.length}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {totalVisitors.toLocaleString()}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {totalConversions.toLocaleString()}
                      {totalVisitors > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({((totalConversions / totalVisitors) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {formatDate(exp.createdAt)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        {exp.status === "DRAFT" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-transparent"
                            onClick={() => handleStatusChange(exp, "RUNNING")}
                            title="Start experiment"
                          >
                            <Play size={14} />
                          </Button>
                        )}
                        {exp.status === "RUNNING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-transparent"
                            onClick={() => handleStatusChange(exp, "PAUSED")}
                            title="Pause experiment"
                          >
                            <Pause size={14} />
                          </Button>
                        )}
                        {exp.status === "PAUSED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-transparent"
                            onClick={() => handleStatusChange(exp, "RUNNING")}
                            title="Resume experiment"
                          >
                            <Play size={14} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-transparent"
                          onClick={() => setStatsDialogId(exp.id)}
                          title="View statistics"
                        >
                          <BarChart3 size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive bg-transparent"
                          onClick={() => setDeleteExperiment(exp)}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState message="No experiments found. Create your first A/B test!" />
        )}
      </AdminDataCard>

      {/* Create Experiment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Experiment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Experiment Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Homepage Hero Test"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as ExperimentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {experimentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What are you testing?"
                rows={2}
              />
            </div>

            {/* Goal Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goalType">Goal Type</Label>
                <Select
                  value={formData.goalType}
                  onValueChange={(v) => setFormData({ ...formData, goalType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trafficPercent">Traffic Percentage</Label>
                <Input
                  id="trafficPercent"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.trafficPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, trafficPercent: parseInt(e.target.value) || 100 })
                  }
                />
              </div>
            </div>

            {/* Statistical Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="confidenceLevel">Confidence Level</Label>
                <Select
                  value={formData.confidenceLevel.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, confidenceLevel: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {confidenceLevels.map((c) => (
                      <SelectItem key={c} value={c.toString()}>
                        {c}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minSampleSize">Min Sample Size (per variant)</Label>
                <Input
                  id="minSampleSize"
                  type="number"
                  min="10"
                  value={formData.minSampleSize}
                  onChange={(e) =>
                    setFormData({ ...formData, minSampleSize: parseInt(e.target.value) || 100 })
                  }
                />
              </div>
            </div>

            {/* Auto-end Settings */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="autoEndEnabled"
                  checked={formData.autoEndEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoEndEnabled: checked })
                  }
                />
                <Label htmlFor="autoEndEnabled" className="text-sm">
                  Auto-end when significant
                </Label>
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Variants</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={balanceWeights}
                    className="text-xs"
                  >
                    Balance Weights
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariant}
                    className="text-xs"
                  >
                    <Plus size={12} className="mr-1" /> Add Variant
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {variants.map((variant, index) => (
                  <div key={index} className="flex gap-2 items-center p-3 border rounded-md">
                    <div className="flex-1">
                      <Input
                        placeholder="Variant name"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, "name", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Weight"
                        value={variant.trafficWeight}
                        onChange={(e) =>
                          updateVariant(index, "trafficWeight", parseInt(e.target.value) || 0)
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground w-8">{variant.trafficWeight}%</div>
                    {variant.isControl ? (
                      <AdminBadge variant="outline">Control</AdminBadge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {totalWeight !== 100 && (
                <p className="text-sm text-destructive">
                  Traffic weights must sum to 100 (currently {totalWeight})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || totalWeight !== 100 || !formData.name}
            >
              {createMutation.isPending ? "Creating..." : "Create Experiment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics Dialog */}
      <Dialog open={!!statsDialogId} onOpenChange={() => setStatsDialogId(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Experiment Statistics</DialogTitle>
          </DialogHeader>
          {statsLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : statsData ? (
            <div className="space-y-6 py-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Users size={16} />
                    Visitors
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {statsData.summary.totalVisitors.toLocaleString()}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Target size={16} />
                    Conversions
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {statsData.summary.totalConversions.toLocaleString()}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <TrendingUp size={16} />
                    Conversion Rate
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {formatPercent(statsData.summary.overallConversionRate)}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    Duration
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {statsData.summary.duration.formatted}
                  </div>
                </Card>
              </div>

              {/* Sample Progress */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Sample Progress</span>
                  <span className="text-sm font-medium">{statsData.summary.sampleProgress}%</span>
                </div>
                <Progress value={statsData.summary.sampleProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {statsData.summary.minSamplesReached
                    ? "Minimum sample size reached"
                    : `Need ${statsData.summary.requiredSampleSize} visitors per variant`}
                </p>
              </Card>

              {/* Winner Banner */}
              {statsData.winner && (
                <Card className="p-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    <span className="font-semibold">
                      Winner: {statsData.winner.name}
                      {statsData.winner.isControl ? " (Control)" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      - {formatPercent(statsData.winner.conversionRate)} conversion rate
                    </span>
                  </div>
                </Card>
              )}

              {/* Variants Table */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Variant Performance</h3>
                <AdminTable>
                  <AdminTableHeader>
                    <AdminTableHeadRow>
                      <AdminTableHead>Variant</AdminTableHead>
                      <AdminTableHead className="text-right">Visitors</AdminTableHead>
                      <AdminTableHead className="text-right">Conversions</AdminTableHead>
                      <AdminTableHead className="text-right">Conv. Rate</AdminTableHead>
                      <AdminTableHead className="text-right">Improvement</AdminTableHead>
                      <AdminTableHead className="text-right">Confidence</AdminTableHead>
                    </AdminTableHeadRow>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {statsData.variants.map((variant) => (
                      <AdminTableRow key={variant.id}>
                        <AdminTableCell className="font-medium">
                          {variant.name}
                          {variant.isControl && (
                            <AdminBadge variant="outline">Control</AdminBadge>
                          )}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          {variant.visitors.toLocaleString()}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          {variant.conversions.toLocaleString()}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          {formatPercent(variant.conversionRate)}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          {variant.significance ? (
                            <span
                              className={
                                variant.significance.relativeImprovement >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {variant.significance.relativeImprovement >= 0 ? "+" : ""}
                              {variant.significance.relativeImprovement.toFixed(2)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          {variant.significance ? (
                            <span
                              className={
                                variant.significance.isSignificant
                                  ? "text-green-600 font-medium"
                                  : ""
                              }
                            >
                              {variant.significance.confidence.toFixed(1)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              </Card>

              {/* Recommendation */}
              {statsData.variants.find((v) => v.formatted)?.formatted && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Recommendation</h3>
                  <p className="text-muted-foreground">
                    {statsData.variants.find((v) => v.formatted)?.formatted?.recommendation}
                  </p>
                </Card>
              )}
            </div>
          ) : (
            <AdminEmptyState message="Failed to load statistics" />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExperiment} onOpenChange={() => setDeleteExperiment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experiment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteExperiment?.name}&quot;?
              {deleteExperiment?.variants.some((v) => v.visitors > 0) && (
                <span className="block mt-2 text-yellow-600">
                  This experiment has data. It will be marked as completed instead of deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
