"use client"

import { useEffect, useState, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  Plus,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Image,
  LayoutGrid,
  Package,
  PanelBottom,
  Palette,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  useShopCustomization,
  useUpdateShopCustomization,
  ShopCustomizationConfig,
  ShopSection,
  SectionType,
  HeroConfig,
  PromotionsConfig,
  ProductsConfig,
  FooterConfig,
} from "@/lib/api-hooks"
import { HeroEditor } from "./editors/hero-editor"
import { PromotionsEditor } from "./editors/promotions-editor"
import { ProductsEditor } from "./editors/products-editor"
import { FooterEditor } from "./editors/footer-editor"
import { ThemeEditor } from "./editors/theme-editor"
import { HeroRenderer } from "./renderers/hero-renderer"
import { PromotionsRenderer } from "./renderers/promotions-renderer"
import { ProductsRenderer } from "./renderers/products-renderer"
import { FooterRenderer } from "./renderers/footer-renderer"

type DeviceType = "desktop" | "tablet" | "mobile"

const sectionIcons: Record<SectionType, React.ReactNode> = {
  hero: <Image size={18} />,
  promotions: <LayoutGrid size={18} />,
  products: <Package size={18} />,
  footer: <PanelBottom size={18} />,
}

const sectionLabels: Record<SectionType, { en: string; type: string }> = {
  hero: { en: "Hero Banner", type: "hero" },
  promotions: { en: "Promotion Cards", type: "promotions" },
  products: { en: "Product Section", type: "products" },
  footer: { en: "Footer", type: "footer" },
}

const defaultSectionConfigs: Record<SectionType, object> = {
  hero: {
    mediaType: "image",
    mediaUrl: "",
    overlayOpacity: 40,
    overlayColor: "#000000",
    titleEn: "Welcome",
    titleKh: "សូមស្វាគមន៍",
    subtitleEn: "",
    subtitleKh: "",
    ctaTextEn: "Shop Now",
    ctaTextKh: "ទិញឥឡូវ",
    ctaLink: "#products",
    ctaStyle: "primary",
    textAlignment: "center",
    height: "medium",
  },
  promotions: {
    titleEn: "Special Offers",
    titleKh: "ការផ្តល់ជូនពិសេស",
    layout: "grid",
    columns: 3,
    cards: [],
  },
  products: {
    titleEn: "Featured Products",
    titleKh: "ផលិតផលពិសេស",
    displayType: "featured",
    layout: "grid",
    columns: 4,
    maxProducts: 8,
    showPrice: true,
    showStock: true,
    showAddToCart: true,
  },
  footer: {
    backgroundColor: "oklch(0.15 0 0)",
    textColor: "oklch(0.9 0 0)",
    columns: [],
    copyrightEn: "© 2024 Shop. All rights reserved.",
    copyrightKh: "© 2024 Shop។ រក្សាសិទ្ធិគ្រប់យ៉ាង។",
    showSocialIcons: true,
    socialLinks: {},
  },
}

// Sortable Section Item Component
function SortableSectionItem({
  section,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
}: {
  section: ShopSection
  isSelected: boolean
  onSelect: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 border rounded bg-card cursor-pointer transition-all",
        "hover:bg-muted/50",
        isSelected && "ring-2 ring-primary border-primary",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={16} />
      </button>

      <div className="text-muted-foreground">{sectionIcons[section.type]}</div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{sectionLabels[section.type].en}</p>
      </div>

      <Switch
        checked={section.enabled}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}

export function CustomizerPage() {
  const { data, isLoading } = useShopCustomization()
  const updateMutation = useUpdateShopCustomization()

  const [config, setConfig] = useState<ShopCustomizationConfig | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [previewDevice, setPreviewDevice] = useState<DeviceType>("desktop")
  const [hasChanges, setHasChanges] = useState(false)
  const [addSectionOpen, setAddSectionOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load config when data arrives
  useEffect(() => {
    if (data?.config && !config) {
      setConfig(data.config)
    }
  }, [data, config])

  // Update config handler
  const updateConfig = useCallback((updates: Partial<ShopCustomizationConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : prev))
    setHasChanges(true)
  }, [])

  // Update section config
  const updateSectionConfig = useCallback(
    (sectionId: string, sectionConfig: object) => {
      if (!config) return
      const newSections = config.sections.map((s) =>
        s.id === sectionId ? { ...s, config: sectionConfig } : s
      )
      updateConfig({ sections: newSections })
    },
    [config, updateConfig]
  )

  // Toggle section visibility
  const toggleSection = useCallback(
    (sectionId: string) => {
      if (!config) return
      const newSections = config.sections.map((s) =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
      updateConfig({ sections: newSections })
    },
    [config, updateConfig]
  )

  // Delete section
  const deleteSection = useCallback(
    (sectionId: string) => {
      if (!config) return
      const newSections = config.sections.filter((s) => s.id !== sectionId)
      updateConfig({ sections: newSections })
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null)
      }
    },
    [config, updateConfig, selectedSectionId]
  )

  // Add new section
  const addSection = useCallback(
    (type: SectionType) => {
      if (!config) return
      const newSection: ShopSection = {
        id: `${type}-${Date.now()}`,
        type,
        enabled: true,
        order: config.sections.length,
        config: defaultSectionConfigs[type] as HeroConfig | PromotionsConfig | ProductsConfig | FooterConfig,
      }
      updateConfig({ sections: [...config.sections, newSection] })
      setSelectedSectionId(newSection.id)
      setAddSectionOpen(false)
    },
    [config, updateConfig]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!config || !over || active.id === over.id) return

      const oldIndex = config.sections.findIndex((s) => s.id === active.id)
      const newIndex = config.sections.findIndex((s) => s.id === over.id)

      const newSections = arrayMove(config.sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order: i,
      }))
      updateConfig({ sections: newSections })
    },
    [config, updateConfig]
  )

  // Save handler
  const handleSave = async () => {
    if (!config) return
    await updateMutation.mutateAsync({ config })
    setHasChanges(false)
  }

  const selectedSection = config?.sections.find((s) => s.id === selectedSectionId)

  const deviceWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  }

  if (isLoading) {
    return (
      <div className="h-full flex">
        <div className="w-[400px] border-r p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load customization</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Shop Customizer</h1>
          {hasChanges && (
            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Device Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <Button
                key={device}
                variant={previewDevice === device ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPreviewDevice(device)}
              >
                {device === "desktop" && <Monitor size={16} />}
                {device === "tablet" && <Tablet size={16} />}
                {device === "mobile" && <Smartphone size={16} />}
              </Button>
            ))}
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            <Save size={16} className="mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-[400px] border-r flex flex-col bg-background overflow-hidden">
          <Tabs defaultValue="sections" className="flex-1 flex flex-col">
            <TabsList className="m-4 mb-0">
              <TabsTrigger value="sections" className="flex items-center gap-2">
                <Layers size={14} />
                Sections
              </TabsTrigger>
              <TabsTrigger value="theme" className="flex items-center gap-2">
                <Palette size={14} />
                Theme
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sections" className="flex-1 overflow-hidden flex flex-col m-0">
              {/* Section List */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">Page Sections</h3>
                  <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus size={14} className="mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Section</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-3 py-4">
                        {(Object.keys(sectionLabels) as SectionType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => addSection(type)}
                            className="p-4 border rounded hover:bg-muted/50 text-left transition-colors"
                          >
                            <div className="text-primary mb-2">{sectionIcons[type]}</div>
                            <p className="font-medium text-sm">{sectionLabels[type].en}</p>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={config.sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {config.sections
                        .sort((a, b) => a.order - b.order)
                        .map((section) => (
                          <SortableSectionItem
                            key={section.id}
                            section={section}
                            isSelected={selectedSectionId === section.id}
                            onSelect={() => setSelectedSectionId(section.id)}
                            onToggle={() => toggleSection(section.id)}
                            onDelete={() => deleteSection(section.id)}
                          />
                        ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {config.sections.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No sections yet. Click "Add" to get started.
                  </p>
                )}
              </div>

              {/* Section Editor */}
              <div className="flex-1 overflow-auto p-4">
                {selectedSection ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {sectionIcons[selectedSection.type]}
                        {sectionLabels[selectedSection.type].en} Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedSection.type === "hero" && (
                        <HeroEditor
                          config={selectedSection.config as HeroConfig}
                          onChange={(c) => updateSectionConfig(selectedSection.id, c)}
                        />
                      )}
                      {selectedSection.type === "promotions" && (
                        <PromotionsEditor
                          config={selectedSection.config as PromotionsConfig}
                          onChange={(c) => updateSectionConfig(selectedSection.id, c)}
                        />
                      )}
                      {selectedSection.type === "products" && (
                        <ProductsEditor
                          config={selectedSection.config as ProductsConfig}
                          onChange={(c) => updateSectionConfig(selectedSection.id, c)}
                        />
                      )}
                      {selectedSection.type === "footer" && (
                        <FooterEditor
                          config={selectedSection.config as FooterConfig}
                          onChange={(c) => updateSectionConfig(selectedSection.id, c)}
                        />
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Select a section to edit
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="theme" className="flex-1 overflow-auto p-4 m-0">
              <ThemeEditor theme={config.theme} onChange={(t) => updateConfig({ theme: t })} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-muted/30 overflow-auto p-6">
          <div className="flex justify-center">
            <div
              className={cn(
                "bg-background shadow-xl transition-all duration-300 overflow-hidden",
                previewDevice !== "desktop" && "rounded-lg border"
              )}
              style={{
                width: deviceWidths[previewDevice],
                maxWidth: "100%",
              }}
            >
              <div className="max-h-[calc(100vh-180px)] overflow-auto">
                {/* Preview Header */}
                <div className="bg-background border-b p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: config.theme.primaryColor }}
                      >
                        S
                      </div>
                      <span className="font-bold">Simple Shop</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>EN</span>
                      <span>|</span>
                      <span>USD</span>
                    </div>
                  </div>
                </div>

                {/* Render Sections */}
                {config.sections
                  .filter((s) => s.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <div
                      key={section.id}
                      className={cn(
                        "transition-all",
                        selectedSectionId === section.id && "ring-2 ring-primary ring-inset"
                      )}
                      onClick={() => setSelectedSectionId(section.id)}
                    >
                      {section.type === "hero" && (
                        <HeroRenderer config={section.config as HeroConfig} language="EN" />
                      )}
                      {section.type === "promotions" && (
                        <PromotionsRenderer
                          config={section.config as PromotionsConfig}
                          language="EN"
                        />
                      )}
                      {section.type === "products" && (
                        <ProductsRenderer
                          config={section.config as ProductsConfig}
                          language="EN"
                          currency="USD"
                        />
                      )}
                      {section.type === "footer" && (
                        <FooterRenderer config={section.config as FooterConfig} language="EN" />
                      )}
                    </div>
                  ))}

                {config.sections.filter((s) => s.enabled).length === 0 && (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Enable sections to preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
