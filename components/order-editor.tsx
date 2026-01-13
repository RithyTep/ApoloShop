"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Edit2,
  Plus,
  X,
  Minus,
  MapPin,
  History,
  AlertCircle,
  Check,
  RefreshCw,
  Package,
  DollarSign,
  Clock,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  useOrderEdits,
  useApplyOrderEdits,
  useDisableOrderEditing,
  useProducts,
  Order,
  OrderItem,
  OrderEditInput,
  ShippingAddress,
  OrderEdit,
} from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"

interface OrderEditorProps {
  order: Order
  language?: "en" | "kh"
  currency?: "USD" | "KHR"
  onClose?: () => void
  onSuccess?: () => void
}

export function OrderEditor({
  order,
  language = "en",
  currency = "USD",
  onClose,
  onSuccess,
}: OrderEditorProps) {
  const { toast } = useToast()
  const t = translations[language].orderEdit

  const { data: editData, isLoading } = useOrderEdits(order.id)
  const applyEdits = useApplyOrderEdits()
  const disableEditing = useDisableOrderEditing()
  const { data: productsData } = useProducts()

  const [activeTab, setActiveTab] = useState("items")
  const [pendingEdits, setPendingEdits] = useState<OrderEditInput[]>([])
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddressEdit, setShowAddressEdit] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [addQuantity, setAddQuantity] = useState(1)
  const [editReason, setEditReason] = useState("")
  const [newAddress, setNewAddress] = useState<ShippingAddress>({
    street: "",
    city: "",
    province: "",
    postalCode: "",
    phone: "",
    recipientName: "",
  })

  const isEditable = editData?.order.isEditable ?? false
  const editHistory = editData?.edits ?? []
  const products = productsData?.products ?? []

  // Get current items with pending edits applied
  const getItemState = useCallback((item: OrderItem) => {
    const pendingEdit = pendingEdits.find(
      (e) => e.type === "QUANTITY_CHANGE" && e.itemId === item.id
    ) as { type: "QUANTITY_CHANGE"; itemId: string; newQuantity: number } | undefined

    const isCancelled = pendingEdits.some(
      (e) => e.type === "ITEM_CANCELLED" && e.itemId === item.id
    )

    return {
      quantity: pendingEdit?.newQuantity ?? item.quantity,
      isCancelled,
      hasChanges: !!pendingEdit || isCancelled,
    }
  }, [pendingEdits])

  // Handle quantity change
  const handleQuantityChange = (itemId: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta)

    // Remove any existing edit for this item
    const filtered = pendingEdits.filter(
      (e) => !(e.type === "QUANTITY_CHANGE" && e.itemId === itemId) &&
             !(e.type === "ITEM_CANCELLED" && e.itemId === itemId)
    )

    if (newQty === 0) {
      // Treat as cancellation
      setPendingEdits([...filtered, { type: "ITEM_CANCELLED", itemId }])
    } else {
      // Find original quantity
      const originalItem = order.items?.find((i) => i.id === itemId)
      if (originalItem && newQty !== originalItem.quantity) {
        setPendingEdits([...filtered, { type: "QUANTITY_CHANGE", itemId, newQuantity: newQty }])
      } else {
        setPendingEdits(filtered)
      }
    }
  }

  // Handle cancel item
  const handleCancelItem = (itemId: string) => {
    const filtered = pendingEdits.filter(
      (e) => !(e.type === "QUANTITY_CHANGE" && e.itemId === itemId) &&
             !(e.type === "ITEM_CANCELLED" && e.itemId === itemId)
    )
    setPendingEdits([...filtered, { type: "ITEM_CANCELLED", itemId }])
  }

  // Handle restore item
  const handleRestoreItem = (itemId: string) => {
    setPendingEdits(
      pendingEdits.filter(
        (e) => !(e.type === "ITEM_CANCELLED" && e.itemId === itemId)
      )
    )
  }

  // Handle add item
  const handleAddItem = () => {
    if (!selectedProductId || addQuantity < 1) return

    setPendingEdits([
      ...pendingEdits,
      {
        type: "ITEM_ADDED",
        productId: selectedProductId,
        quantity: addQuantity,
        reason: editReason || undefined,
      },
    ])
    setShowAddItem(false)
    setSelectedProductId("")
    setAddQuantity(1)
    setEditReason("")
  }

  // Handle address change
  const handleAddressChange = () => {
    if (!newAddress.street || !newAddress.city) {
      toast({ title: t.addressRequired, variant: "destructive" })
      return
    }

    // Remove any existing address change
    const filtered = pendingEdits.filter((e) => e.type !== "ADDRESS_CHANGE")
    setPendingEdits([
      ...filtered,
      { type: "ADDRESS_CHANGE", newAddress, reason: editReason || undefined },
    ])
    setShowAddressEdit(false)
    setEditReason("")
  }

  // Calculate total difference
  const calculateDifference = () => {
    let diffUsd = 0
    let diffKhr = 0

    for (const edit of pendingEdits) {
      if (edit.type === "QUANTITY_CHANGE") {
        const item = order.items?.find((i) => i.id === edit.itemId)
        if (item) {
          const qtyDiff = edit.newQuantity - item.quantity
          diffUsd += qtyDiff * item.priceUsd
          diffKhr += qtyDiff * item.priceKhr
        }
      } else if (edit.type === "ITEM_CANCELLED") {
        const item = order.items?.find((i) => i.id === edit.itemId)
        if (item) {
          diffUsd -= item.quantity * item.priceUsd
          diffKhr -= item.quantity * item.priceKhr
        }
      } else if (edit.type === "ITEM_ADDED") {
        const product = products.find((p) => p.id === edit.productId)
        if (product) {
          diffUsd += edit.quantity * Number(product.priceUsd)
          diffKhr += edit.quantity * product.priceKhr
        }
      }
    }

    return { diffUsd, diffKhr }
  }

  // Apply all edits
  const handleApplyEdits = async () => {
    if (pendingEdits.length === 0) return

    try {
      await applyEdits.mutateAsync({ orderId: order.id, edits: pendingEdits })
      toast({ title: t.editsApplied })
      setPendingEdits([])
      onSuccess?.()
    } catch (error) {
      toast({
        title: t.editFailed,
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  // Disable editing
  const handleDisableEditing = async () => {
    try {
      await disableEditing.mutateAsync(order.id)
      toast({ title: t.editingDisabled })
    } catch (error) {
      toast({
        title: t.error,
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number, curr: string = currency) => {
    if (curr === "KHR") return `${amount.toLocaleString()}`;
    return `$${Number(amount).toFixed(2)}`
  }

  const diff = calculateDifference()

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            {t.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.orderNumber}: {order.orderNumber}
          </p>
        </div>
        {isEditable ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Check className="h-3 w-3 mr-1" /> {t.editable}
          </Badge>
        ) : (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" /> {t.notEditable}
          </Badge>
        )}
      </div>

      {!isEditable && editData?.order.editableReason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{editData.order.editableReason}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">
            <Package className="h-4 w-4 mr-2" /> {t.items}
          </TabsTrigger>
          <TabsTrigger value="address">
            <MapPin className="h-4 w-4 mr-2" /> {t.address}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" /> {t.history}
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              {order.items?.map((item) => {
                const state = getItemState(item)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      state.isCancelled ? "bg-red-50 border-red-200 opacity-60" :
                      state.hasChanges ? "bg-yellow-50 border-yellow-200" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`font-medium ${state.isCancelled ? "line-through" : ""}`}>
                        {item.product?.nameEn || item.productName || "Product"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.priceUsd)} x {state.quantity}
                      </p>
                    </div>

                    {isEditable && !state.isCancelled && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item.id, state.quantity, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{state.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item.id, state.quantity, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleCancelItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {isEditable && state.isCancelled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestoreItem(item.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> {t.restore}
                      </Button>
                    )}

                    <div className="ml-4 text-right min-w-20">
                      <p className="font-medium">
                        {formatCurrency(item.priceUsd * state.quantity)}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Pending add items */}
              {pendingEdits
                .filter((e) => e.type === "ITEM_ADDED")
                .map((edit, idx) => {
                  const addEdit = edit as { type: "ITEM_ADDED"; productId: string; quantity: number }
                  const product = products.find((p) => p.id === addEdit.productId)
                  if (!product) return null
                  return (
                    <div
                      key={`add-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-green-50 border-green-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {product.nameEn} <Badge variant="secondary" className="ml-2">{t.newItem}</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(Number(product.priceUsd))} x {addEdit.quantity}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => {
                          setPendingEdits(
                            pendingEdits.filter((e) => e !== edit)
                          )
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="ml-4 text-right min-w-20">
                        <p className="font-medium text-green-600">
                          +{formatCurrency(Number(product.priceUsd) * addEdit.quantity)}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>

            {isEditable && (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setShowAddItem(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> {t.addItem}
              </Button>
            )}
          </Card>

          {/* Totals Summary */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t.currentTotal}:</span>
                <span>{formatCurrency(order.totalUsd)}</span>
              </div>
              {pendingEdits.length > 0 && (
                <>
                  <div className={`flex justify-between text-sm ${diff.diffUsd >= 0 ? "text-green-600" : "text-red-600"}`}>
                    <span>{t.difference}:</span>
                    <span>{diff.diffUsd >= 0 ? "+" : ""}{formatCurrency(diff.diffUsd)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>{t.newTotal}:</span>
                    <span>{formatCurrency(order.totalUsd + diff.diffUsd)}</span>
                  </div>
                  {diff.diffUsd < 0 && (
                    <Alert className="mt-2">
                      <DollarSign className="h-4 w-4" />
                      <AlertDescription>
                        {t.refundRequired}: {formatCurrency(Math.abs(diff.diffUsd))}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address">
          <Card className="p-4 space-y-4">
            {editData?.order.shippingAddress ? (
              <div className="space-y-2">
                <Label>{t.currentAddress}</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p>{editData.order.shippingAddress.recipientName}</p>
                  <p>{editData.order.shippingAddress.street}</p>
                  <p>{editData.order.shippingAddress.city}, {editData.order.shippingAddress.province}</p>
                  {editData.order.shippingAddress.phone && (
                    <p>{editData.order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{t.noAddress}</p>
            )}

            {/* Pending address change */}
            {pendingEdits.find((e) => e.type === "ADDRESS_CHANGE") && (
              <div className="space-y-2">
                <Label className="text-green-600">{t.newAddress}</Label>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  {(() => {
                    const edit = pendingEdits.find((e) => e.type === "ADDRESS_CHANGE") as { type: "ADDRESS_CHANGE"; newAddress: ShippingAddress }
                    return (
                      <>
                        <p>{edit.newAddress.recipientName}</p>
                        <p>{edit.newAddress.street}</p>
                        <p>{edit.newAddress.city}, {edit.newAddress.province}</p>
                        {edit.newAddress.phone && <p>{edit.newAddress.phone}</p>}
                      </>
                    )
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPendingEdits(pendingEdits.filter((e) => e.type !== "ADDRESS_CHANGE"))
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> {t.removeChange}
                </Button>
              </div>
            )}

            {isEditable && !pendingEdits.find((e) => e.type === "ADDRESS_CHANGE") && (
              <Button variant="outline" onClick={() => setShowAddressEdit(true)}>
                <MapPin className="h-4 w-4 mr-2" /> {t.changeAddress}
              </Button>
            )}
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="p-4">
            {editHistory.length > 0 ? (
              <div className="space-y-4">
                {editHistory.map((edit: OrderEdit) => (
                  <div
                    key={edit.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{edit.editType}</Badge>
                        <Badge variant={edit.status === "APPROVED" ? "default" : "secondary"}>
                          {edit.status}
                        </Badge>
                      </div>
                      {edit.productName && (
                        <p className="text-sm mt-1">{edit.productName}</p>
                      )}
                      {edit.previousQuantity !== undefined && edit.newQuantity !== undefined && (
                        <p className="text-sm text-muted-foreground">
                          {t.quantityChanged}: {edit.previousQuantity} {" -> "} {edit.newQuantity}
                        </p>
                      )}
                      {edit.totalDifferenceUsd !== undefined && (
                        <p className={`text-sm ${(edit.totalDifferenceUsd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {t.difference}: {(edit.totalDifferenceUsd ?? 0) >= 0 ? "+" : ""}{formatCurrency(edit.totalDifferenceUsd ?? 0)}
                        </p>
                      )}
                      {edit.editReason && (
                        <p className="text-sm text-muted-foreground mt-1">{t.reason}: {edit.editReason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(edit.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t.noHistory}</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      {isEditable && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDisableEditing}
            disabled={disableEditing.isPending}
          >
            {t.disableEditing}
          </Button>
          <div className="flex-1" />
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
          )}
          <Button
            onClick={handleApplyEdits}
            disabled={pendingEdits.length === 0 || applyEdits.isPending}
          >
            {applyEdits.isPending ? t.applying : t.applyChanges}
            {pendingEdits.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingEdits.length}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addItem}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.selectProduct}</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectProductPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.nameEn} - {formatCurrency(Number(product.priceUsd))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.quantity}</Label>
              <Input
                type="number"
                min={1}
                value={addQuantity}
                onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>{t.reasonOptional}</Label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleAddItem} disabled={!selectedProductId}>
              {t.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Edit Dialog */}
      <Dialog open={showAddressEdit} onOpenChange={setShowAddressEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.changeAddress}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.recipientName}</Label>
              <Input
                value={newAddress.recipientName || ""}
                onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
              />
            </div>
            <div>
              <Label>{t.street} *</Label>
              <Input
                value={newAddress.street}
                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.city} *</Label>
                <Input
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.province}</Label>
                <Input
                  value={newAddress.province || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.postalCode}</Label>
                <Input
                  value={newAddress.postalCode || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.phone}</Label>
                <Input
                  value={newAddress.phone || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t.reasonOptional}</Label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressEdit(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleAddressChange}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
