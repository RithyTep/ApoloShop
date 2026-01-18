"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Shield } from "lucide-react"
import { useUsers, useRoles, useCreateUser, useUpdateUser, useDeleteUser, User } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import {
  AdminPageHeader,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminActionButtons,
  AdminEditButton,
  AdminDeleteButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

export function UsersPage() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)

  const { data: usersData, isLoading: usersLoading } = useUsers()
  const { data: rolesData, isLoading: rolesLoading } = useRoles()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const users = usersData?.users || []
  const roles = rolesData?.roles || []
  const isLoading = usersLoading || rolesLoading

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    isActive: true,
  })

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      roleId: roles[0]?.id || "",
      isActive: true,
    })
    setEditingUser(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setFormData((prev) => ({ ...prev, roleId: roles[0]?.id || "" }))
    setIsDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleId,
      isActive: user.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData: Record<string, unknown> = {
          id: editingUser.id,
          name: formData.name,
          email: formData.email,
          roleId: formData.roleId,
          isActive: formData.isActive,
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        await updateMutation.mutateAsync(updateData as Parameters<typeof updateMutation.mutateAsync>[0])
        toast({ title: "User updated successfully" })
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId,
        })
        toast({ title: "User created successfully" })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    try {
      await deleteMutation.mutateAsync(deleteUser.id)
      toast({ title: "User deleted successfully" })
      setDeleteUser(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Users & Roles"
        subtitle="Manage users and permission settings"
        rows={3}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Users & Roles"
        subtitle="Manage users and permission settings"
      >
        <Button onClick={openCreateDialog}>
          <Plus size={16} className="mr-2" /> Add User
        </Button>
      </AdminPageHeader>

      {/* Roles Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="p-4">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-primary" />
              <div>
                <p className="font-medium">{role.name}</p>
                <p className="text-sm text-muted-foreground">
                  {role._count?.users || 0} users
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AdminDataCard>
        {users.length > 0 ? (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Name</AdminTableHead>
                <AdminTableHead>Email</AdminTableHead>
                <AdminTableHead>Role</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Last Login</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {users.map((user) => (
                <AdminTableRow key={user.id}>
                  <AdminTableCell className="font-medium">{user.name}</AdminTableCell>
                  <AdminTableCell>{user.email}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant="secondary">
                      {user.role?.name || "No Role"}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell className="text-sm">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminActionButtons>
                      <AdminEditButton onClick={() => openEditDialog(user)} />
                      <AdminDeleteButton onClick={() => setDeleteUser(user)} />
                    </AdminActionButtons>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState message="No users found. Add your first user!" />
        )}
      </AdminDataCard>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingUser && "(leave empty to keep current)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "••••••••" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleId">Role</Label>
              <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteUser?.name}&quot;? This action cannot be undone.
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
