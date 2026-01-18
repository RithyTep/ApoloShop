"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Shield,
  ShieldCheck,
  Users,
  Lock,
  Plus,
  Save,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  useRoles,
  usePermissions,
  useUpdateRole,
  useCreateRole,
  useSeedRoles,
  useSeedPermissions,
  Role,
} from "@/lib/api-hooks"
import {
  Resources,
  Actions,
  resourceDisplayNames,
  actionDisplayNames,
  permissionName,
  defaultRolePermissions,
  SystemRoles,
  type Resource,
  type Action,
} from "@/lib/rbac"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const roleColors: Record<string, string> = {
  super_admin: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-info/10 text-info border-info/20",
  manager: "bg-success/10 text-success border-success/20",
  staff: "bg-warning/10 text-warning border-warning/20",
}

const roleIcons: Record<string, React.ReactNode> = {
  super_admin: <ShieldCheck className="w-4 h-4" />,
  admin: <Shield className="w-4 h-4" />,
  manager: <Users className="w-4 h-4" />,
  staff: <Lock className="w-4 h-4" />,
}

export function RolePermissionsPage() {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editedPermissions, setEditedPermissions] = useState<Set<string>>(new Set())
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set(Object.values(Resources)))
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newRoleData, setNewRoleData] = useState({ name: "", displayName: "", description: "" })
  const [resetConfirmRole, setResetConfirmRole] = useState<Role | null>(null)

  const { data: rolesData, isLoading: rolesLoading } = useRoles({ includePermissions: true })
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions()
  const updateRoleMutation = useUpdateRole()
  const createRoleMutation = useCreateRole()
  const seedRolesMutation = useSeedRoles()
  const seedPermissionsMutation = useSeedPermissions()

  const roles = rolesData?.roles || []
  const isLoading = rolesLoading || permissionsLoading

  // Get permissions as a lookup map
  const permissionsByResource = useMemo(() => {
    if (!permissionsData?.byResource) return {}
    return permissionsData.byResource
  }, [permissionsData])

  // Convert legacy permissions to set
  const getRolePermissionsSet = (role: Role): Set<string> => {
    if (role.permissionNames) {
      return new Set(role.permissionNames)
    }
    // Convert from legacy format
    const perms = new Set<string>()
    if (role.permissions) {
      for (const [resource, actions] of Object.entries(role.permissions)) {
        for (const action of actions) {
          perms.add(`${resource}:${action}`)
        }
      }
    }
    return perms
  }

  // Handle role selection
  const handleSelectRole = (role: Role) => {
    setSelectedRole(role)
    setEditedPermissions(getRolePermissionsSet(role))
  }

  // Toggle permission
  const togglePermission = (permName: string) => {
    const newPerms = new Set(editedPermissions)
    if (newPerms.has(permName)) {
      newPerms.delete(permName)
    } else {
      newPerms.add(permName)
    }
    setEditedPermissions(newPerms)
  }

  // Toggle all permissions for a resource
  const toggleResourcePermissions = (resource: string, enable: boolean) => {
    const newPerms = new Set(editedPermissions)
    const resourcePerms = permissionsByResource[resource] || []

    for (const perm of resourcePerms) {
      if (enable) {
        newPerms.add(perm.name)
      } else {
        newPerms.delete(perm.name)
      }
    }

    setEditedPermissions(newPerms)
  }

  // Check if resource is fully enabled
  const isResourceFullyEnabled = (resource: string): boolean => {
    const resourcePerms = permissionsByResource[resource] || []
    return resourcePerms.every((p) => editedPermissions.has(p.name))
  }

  // Check if resource is partially enabled
  const isResourcePartiallyEnabled = (resource: string): boolean => {
    const resourcePerms = permissionsByResource[resource] || []
    const enabledCount = resourcePerms.filter((p) => editedPermissions.has(p.name)).length
    return enabledCount > 0 && enabledCount < resourcePerms.length
  }

  // Check if permissions have changed
  const hasChanges = useMemo(() => {
    if (!selectedRole) return false
    const originalPerms = getRolePermissionsSet(selectedRole)
    if (originalPerms.size !== editedPermissions.size) return true
    for (const perm of editedPermissions) {
      if (!originalPerms.has(perm)) return true
    }
    return false
  }, [selectedRole, editedPermissions])

  // Save permissions
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    try {
      await updateRoleMutation.mutateAsync({
        id: selectedRole.id,
        permissionNames: Array.from(editedPermissions),
      })
      toast({ title: "Permissions updated successfully" })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  // Reset to default permissions
  const handleResetToDefault = async () => {
    if (!resetConfirmRole) return

    const defaultPerms = defaultRolePermissions[resetConfirmRole.name as keyof typeof defaultRolePermissions]
    if (!defaultPerms) {
      toast({
        title: "Error",
        description: "No default permissions defined for this role",
        variant: "destructive",
      })
      setResetConfirmRole(null)
      return
    }

    try {
      await updateRoleMutation.mutateAsync({
        id: resetConfirmRole.id,
        permissionNames: defaultPerms,
      })
      setEditedPermissions(new Set(defaultPerms))
      toast({ title: "Permissions reset to defaults" })
      setResetConfirmRole(null)
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  // Create new role
  const handleCreateRole = async () => {
    if (!newRoleData.name) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      })
      return
    }

    try {
      await createRoleMutation.mutateAsync({
        name: newRoleData.name,
        displayName: newRoleData.displayName || newRoleData.name,
        description: newRoleData.description,
        permissions: {},
      })
      toast({ title: "Role created successfully" })
      setIsCreateDialogOpen(false)
      setNewRoleData({ name: "", displayName: "", description: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  // Seed system roles
  const handleSeedRoles = async () => {
    try {
      const result = await seedRolesMutation.mutateAsync()
      toast({
        title: "System roles seeded",
        description: `Created: ${result.created.join(", ") || "none"}, Updated: ${result.updated.join(", ") || "none"}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  // Toggle resource expansion
  const toggleResourceExpansion = (resource: string) => {
    const newExpanded = new Set(expandedResources)
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource)
    } else {
      newExpanded.add(resource)
    }
    setExpandedResources(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Role Permissions</h1>
            <p className="text-muted-foreground mt-2">Manage role-based access control (RBAC)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="p-4">
            <Skeleton className="h-8 w-full mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-3 p-4">
            <Skeleton className="h-[500px] w-full" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Role Permissions</h1>
          <p className="text-muted-foreground mt-2">Manage role-based access control (RBAC)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedRoles} disabled={seedRolesMutation.isPending}>
            {seedRolesMutation.isPending ? "Seeding..." : "Seed System Roles"}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus size={16} /> Create Role
          </Button>
        </div>
      </div>

      {/* System Roles Info */}
      <Card className="p-4 bg-info/10 border-info/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-info mt-0.5" />
          <div>
            <h3 className="font-medium text-foreground">System Roles</h3>
            <p className="text-sm text-muted-foreground mt-1">
              System roles ({Object.values(SystemRoles).join(", ")}) are predefined and cannot be deleted.
              You can customize their permissions, but cannot rename them.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role List */}
        <Card className="p-4">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Roles
          </h2>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={cn(
                  "w-full p-3 rounded-lg border text-left transition-colors",
                  selectedRole?.id === role.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                  roleColors[role.name] || ""
                )}
              >
                <div className="flex items-center gap-2">
                  {roleIcons[role.name] || <Shield className="w-4 h-4" />}
                  <span className="font-medium">{role.displayName || role.name}</span>
                  {role.isSystem && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      System
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{role._count?.users || 0} users</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Permission Matrix */}
        <Card className="lg:col-span-3 p-4">
          {selectedRole ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    {roleIcons[selectedRole.name] || <Shield className="w-5 h-5" />}
                    {selectedRole.displayName || selectedRole.name} Permissions
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editedPermissions.size} permissions enabled
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedRole.isSystem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetConfirmRole(selectedRole)}
                    >
                      Reset to Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSavePermissions}
                    disabled={!hasChanges || updateRoleMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateRoleMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>

              {hasChanges && (
                <div className="mb-4 p-2 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm text-warning">You have unsaved changes</span>
                </div>
              )}

              <Tabs defaultValue="matrix" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>

                <TabsContent value="matrix">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {Object.values(Resources).map((resource) => {
                        const resourcePerms = permissionsByResource[resource] || []
                        const isExpanded = expandedResources.has(resource)
                        const isFullyEnabled = isResourceFullyEnabled(resource)
                        const isPartiallyEnabled = isResourcePartiallyEnabled(resource)

                        return (
                          <div key={resource} className="border rounded-lg">
                            <button
                              onClick={() => toggleResourceExpansion(resource)}
                              className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <span className="font-medium">
                                  {resourceDisplayNames[resource as Resource] || resource}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {resourcePerms.filter((p) => editedPermissions.has(p.name)).length}/
                                  {resourcePerms.length}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isFullyEnabled}
                                  ref={(el) => {
                                    if (el && isPartiallyEnabled) {
                                      el.dataset.state = "indeterminate"
                                    }
                                  }}
                                  onCheckedChange={(checked) =>
                                    toggleResourcePermissions(resource, checked === true)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-sm text-muted-foreground">All</span>
                              </div>
                            </button>

                            {isExpanded && resourcePerms.length > 0 && (
                              <div className="border-t p-3 space-y-2 bg-muted/20">
                                {resourcePerms.map((perm) => (
                                  <div
                                    key={perm.name}
                                    className="flex items-center justify-between py-1"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={perm.name}
                                        checked={editedPermissions.has(perm.name)}
                                        onCheckedChange={() => togglePermission(perm.name)}
                                      />
                                      <label
                                        htmlFor={perm.name}
                                        className="text-sm cursor-pointer"
                                      >
                                        {perm.displayName}
                                      </label>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {actionDisplayNames[perm.action as Action] || perm.action}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="list">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-1">
                      {Array.from(editedPermissions)
                        .sort()
                        .map((perm) => (
                          <div
                            key={perm}
                            className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded"
                          >
                            <span className="text-sm font-mono">{perm}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePermission(perm)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      {editedPermissions.size === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No permissions enabled for this role
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Shield className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a role to manage its permissions</p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name (identifier)</Label>
              <Input
                id="roleName"
                value={newRoleData.name}
                onChange={(e) =>
                  setNewRoleData((prev) => ({
                    ...prev,
                    name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  }))
                }
                placeholder="e.g., content_editor"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters and underscores only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={newRoleData.displayName}
                onChange={(e) =>
                  setNewRoleData((prev) => ({ ...prev, displayName: e.target.value }))
                }
                placeholder="e.g., Content Editor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newRoleData.description}
                onChange={(e) =>
                  setNewRoleData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what this role can do..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending || !newRoleData.name}
            >
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={!!resetConfirmRole} onOpenChange={() => setResetConfirmRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Permissions to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all permissions for &quot;{resetConfirmRole?.displayName || resetConfirmRole?.name}&quot;
              to their default values. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefault}>
              {updateRoleMutation.isPending ? "Resetting..." : "Reset to Default"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
