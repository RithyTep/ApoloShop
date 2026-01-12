/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * Defines system roles, permissions, and access control helpers.
 */

// ============================================
// SYSTEM ROLES
// ============================================

export const SystemRoles = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const

export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles]

export interface RoleDefinition {
  name: SystemRole
  displayName: string
  description: string
  isSystem: boolean
}

export const roleDefinitions: RoleDefinition[] = [
  {
    name: SystemRoles.SUPER_ADMIN,
    displayName: "Super Admin",
    description: "Full system access with client management capabilities",
    isSystem: true,
  },
  {
    name: SystemRoles.ADMIN,
    displayName: "Administrator",
    description: "Full access to shop management features",
    isSystem: true,
  },
  {
    name: SystemRoles.MANAGER,
    displayName: "Manager",
    description: "Manage products, orders, and customers",
    isSystem: true,
  },
  {
    name: SystemRoles.STAFF,
    displayName: "Staff",
    description: "Limited access for daily operations",
    isSystem: true,
  },
]

// ============================================
// RESOURCES & ACTIONS
// ============================================

export const Resources = {
  PRODUCTS: "products",
  ORDERS: "orders",
  CUSTOMERS: "customers",
  INVENTORY: "inventory",
  PROMOTIONS: "promotions",
  CONTENT: "content",
  USERS: "users",
  ROLES: "roles",
  SETTINGS: "settings",
  REPORTS: "reports",
  CATEGORIES: "categories",
  PAYMENTS: "payments",
  REVIEWS: "reviews",
  AUDIT_LOGS: "audit_logs",
  CLIENTS: "clients",
} as const

export type Resource = (typeof Resources)[keyof typeof Resources]

export const Actions = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
  EXPORT: "export",
  MANAGE: "manage", // Full control including special operations
} as const

export type Action = (typeof Actions)[keyof typeof Actions]

// ============================================
// PERMISSION DEFINITIONS
// ============================================

export interface PermissionDefinition {
  name: string // e.g., "products:read"
  resource: Resource
  action: Action
  displayName: string
  description: string
}

// Generate permission name from resource and action
export function permissionName(resource: Resource, action: Action): string {
  return `${resource}:${action}`
}

// All available permissions
export const permissionDefinitions: PermissionDefinition[] = [
  // Products
  { name: permissionName(Resources.PRODUCTS, Actions.READ), resource: Resources.PRODUCTS, action: Actions.READ, displayName: "View Products", description: "View product catalog and details" },
  { name: permissionName(Resources.PRODUCTS, Actions.WRITE), resource: Resources.PRODUCTS, action: Actions.WRITE, displayName: "Edit Products", description: "Create and update products" },
  { name: permissionName(Resources.PRODUCTS, Actions.DELETE), resource: Resources.PRODUCTS, action: Actions.DELETE, displayName: "Delete Products", description: "Remove products from catalog" },
  { name: permissionName(Resources.PRODUCTS, Actions.EXPORT), resource: Resources.PRODUCTS, action: Actions.EXPORT, displayName: "Export Products", description: "Export product data to CSV" },

  // Orders
  { name: permissionName(Resources.ORDERS, Actions.READ), resource: Resources.ORDERS, action: Actions.READ, displayName: "View Orders", description: "View order list and details" },
  { name: permissionName(Resources.ORDERS, Actions.WRITE), resource: Resources.ORDERS, action: Actions.WRITE, displayName: "Edit Orders", description: "Update order status and details" },
  { name: permissionName(Resources.ORDERS, Actions.DELETE), resource: Resources.ORDERS, action: Actions.DELETE, displayName: "Delete Orders", description: "Cancel or remove orders" },

  // Customers
  { name: permissionName(Resources.CUSTOMERS, Actions.READ), resource: Resources.CUSTOMERS, action: Actions.READ, displayName: "View Customers", description: "View customer information" },
  { name: permissionName(Resources.CUSTOMERS, Actions.WRITE), resource: Resources.CUSTOMERS, action: Actions.WRITE, displayName: "Edit Customers", description: "Update customer records" },
  { name: permissionName(Resources.CUSTOMERS, Actions.DELETE), resource: Resources.CUSTOMERS, action: Actions.DELETE, displayName: "Delete Customers", description: "Remove customer records" },

  // Inventory
  { name: permissionName(Resources.INVENTORY, Actions.READ), resource: Resources.INVENTORY, action: Actions.READ, displayName: "View Inventory", description: "View stock levels" },
  { name: permissionName(Resources.INVENTORY, Actions.WRITE), resource: Resources.INVENTORY, action: Actions.WRITE, displayName: "Edit Inventory", description: "Update stock quantities" },

  // Promotions
  { name: permissionName(Resources.PROMOTIONS, Actions.READ), resource: Resources.PROMOTIONS, action: Actions.READ, displayName: "View Promotions", description: "View promotion campaigns" },
  { name: permissionName(Resources.PROMOTIONS, Actions.WRITE), resource: Resources.PROMOTIONS, action: Actions.WRITE, displayName: "Edit Promotions", description: "Create and update promotions" },
  { name: permissionName(Resources.PROMOTIONS, Actions.DELETE), resource: Resources.PROMOTIONS, action: Actions.DELETE, displayName: "Delete Promotions", description: "Remove promotion campaigns" },

  // Content
  { name: permissionName(Resources.CONTENT, Actions.READ), resource: Resources.CONTENT, action: Actions.READ, displayName: "View Content", description: "View CMS content" },
  { name: permissionName(Resources.CONTENT, Actions.WRITE), resource: Resources.CONTENT, action: Actions.WRITE, displayName: "Edit Content", description: "Create and update content" },
  { name: permissionName(Resources.CONTENT, Actions.DELETE), resource: Resources.CONTENT, action: Actions.DELETE, displayName: "Delete Content", description: "Remove CMS content" },

  // Users
  { name: permissionName(Resources.USERS, Actions.READ), resource: Resources.USERS, action: Actions.READ, displayName: "View Users", description: "View user accounts" },
  { name: permissionName(Resources.USERS, Actions.WRITE), resource: Resources.USERS, action: Actions.WRITE, displayName: "Edit Users", description: "Create and update users" },
  { name: permissionName(Resources.USERS, Actions.DELETE), resource: Resources.USERS, action: Actions.DELETE, displayName: "Delete Users", description: "Remove user accounts" },

  // Roles
  { name: permissionName(Resources.ROLES, Actions.READ), resource: Resources.ROLES, action: Actions.READ, displayName: "View Roles", description: "View role configurations" },
  { name: permissionName(Resources.ROLES, Actions.WRITE), resource: Resources.ROLES, action: Actions.WRITE, displayName: "Edit Roles", description: "Modify role permissions" },
  { name: permissionName(Resources.ROLES, Actions.MANAGE), resource: Resources.ROLES, action: Actions.MANAGE, displayName: "Manage Roles", description: "Create and delete roles" },

  // Settings
  { name: permissionName(Resources.SETTINGS, Actions.READ), resource: Resources.SETTINGS, action: Actions.READ, displayName: "View Settings", description: "View system settings" },
  { name: permissionName(Resources.SETTINGS, Actions.WRITE), resource: Resources.SETTINGS, action: Actions.WRITE, displayName: "Edit Settings", description: "Modify system settings" },

  // Reports
  { name: permissionName(Resources.REPORTS, Actions.READ), resource: Resources.REPORTS, action: Actions.READ, displayName: "View Reports", description: "View analytics and reports" },
  { name: permissionName(Resources.REPORTS, Actions.EXPORT), resource: Resources.REPORTS, action: Actions.EXPORT, displayName: "Export Reports", description: "Export report data" },

  // Categories
  { name: permissionName(Resources.CATEGORIES, Actions.READ), resource: Resources.CATEGORIES, action: Actions.READ, displayName: "View Categories", description: "View product categories" },
  { name: permissionName(Resources.CATEGORIES, Actions.WRITE), resource: Resources.CATEGORIES, action: Actions.WRITE, displayName: "Edit Categories", description: "Manage product categories" },
  { name: permissionName(Resources.CATEGORIES, Actions.DELETE), resource: Resources.CATEGORIES, action: Actions.DELETE, displayName: "Delete Categories", description: "Remove product categories" },

  // Payments
  { name: permissionName(Resources.PAYMENTS, Actions.READ), resource: Resources.PAYMENTS, action: Actions.READ, displayName: "View Payments", description: "View payment records" },
  { name: permissionName(Resources.PAYMENTS, Actions.WRITE), resource: Resources.PAYMENTS, action: Actions.WRITE, displayName: "Process Payments", description: "Record and update payments" },

  // Reviews
  { name: permissionName(Resources.REVIEWS, Actions.READ), resource: Resources.REVIEWS, action: Actions.READ, displayName: "View Reviews", description: "View product reviews" },
  { name: permissionName(Resources.REVIEWS, Actions.WRITE), resource: Resources.REVIEWS, action: Actions.WRITE, displayName: "Moderate Reviews", description: "Approve or reject reviews" },
  { name: permissionName(Resources.REVIEWS, Actions.DELETE), resource: Resources.REVIEWS, action: Actions.DELETE, displayName: "Delete Reviews", description: "Remove product reviews" },

  // Audit Logs
  { name: permissionName(Resources.AUDIT_LOGS, Actions.READ), resource: Resources.AUDIT_LOGS, action: Actions.READ, displayName: "View Audit Logs", description: "View system activity logs" },

  // Clients (multi-tenant)
  { name: permissionName(Resources.CLIENTS, Actions.READ), resource: Resources.CLIENTS, action: Actions.READ, displayName: "View Clients", description: "View client/tenant list" },
  { name: permissionName(Resources.CLIENTS, Actions.WRITE), resource: Resources.CLIENTS, action: Actions.WRITE, displayName: "Edit Clients", description: "Create and update clients" },
  { name: permissionName(Resources.CLIENTS, Actions.DELETE), resource: Resources.CLIENTS, action: Actions.DELETE, displayName: "Delete Clients", description: "Remove client accounts" },
  { name: permissionName(Resources.CLIENTS, Actions.MANAGE), resource: Resources.CLIENTS, action: Actions.MANAGE, displayName: "Manage Clients", description: "Full client management including impersonation" },
]

// Get all permission names
export const allPermissionNames = permissionDefinitions.map(p => p.name)

// Group permissions by resource
export function getPermissionsByResource(): Record<Resource, PermissionDefinition[]> {
  return permissionDefinitions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<Resource, PermissionDefinition[]>)
}

// ============================================
// DEFAULT ROLE PERMISSIONS
// ============================================

// Default permissions for each system role
export const defaultRolePermissions: Record<SystemRole, string[]> = {
  [SystemRoles.SUPER_ADMIN]: allPermissionNames, // All permissions

  [SystemRoles.ADMIN]: [
    // Products
    permissionName(Resources.PRODUCTS, Actions.READ),
    permissionName(Resources.PRODUCTS, Actions.WRITE),
    permissionName(Resources.PRODUCTS, Actions.DELETE),
    permissionName(Resources.PRODUCTS, Actions.EXPORT),
    // Orders
    permissionName(Resources.ORDERS, Actions.READ),
    permissionName(Resources.ORDERS, Actions.WRITE),
    permissionName(Resources.ORDERS, Actions.DELETE),
    // Customers
    permissionName(Resources.CUSTOMERS, Actions.READ),
    permissionName(Resources.CUSTOMERS, Actions.WRITE),
    permissionName(Resources.CUSTOMERS, Actions.DELETE),
    // Inventory
    permissionName(Resources.INVENTORY, Actions.READ),
    permissionName(Resources.INVENTORY, Actions.WRITE),
    // Promotions
    permissionName(Resources.PROMOTIONS, Actions.READ),
    permissionName(Resources.PROMOTIONS, Actions.WRITE),
    permissionName(Resources.PROMOTIONS, Actions.DELETE),
    // Content
    permissionName(Resources.CONTENT, Actions.READ),
    permissionName(Resources.CONTENT, Actions.WRITE),
    permissionName(Resources.CONTENT, Actions.DELETE),
    // Users
    permissionName(Resources.USERS, Actions.READ),
    permissionName(Resources.USERS, Actions.WRITE),
    permissionName(Resources.USERS, Actions.DELETE),
    // Roles
    permissionName(Resources.ROLES, Actions.READ),
    permissionName(Resources.ROLES, Actions.WRITE),
    // Settings
    permissionName(Resources.SETTINGS, Actions.READ),
    permissionName(Resources.SETTINGS, Actions.WRITE),
    // Reports
    permissionName(Resources.REPORTS, Actions.READ),
    permissionName(Resources.REPORTS, Actions.EXPORT),
    // Categories
    permissionName(Resources.CATEGORIES, Actions.READ),
    permissionName(Resources.CATEGORIES, Actions.WRITE),
    permissionName(Resources.CATEGORIES, Actions.DELETE),
    // Payments
    permissionName(Resources.PAYMENTS, Actions.READ),
    permissionName(Resources.PAYMENTS, Actions.WRITE),
    // Reviews
    permissionName(Resources.REVIEWS, Actions.READ),
    permissionName(Resources.REVIEWS, Actions.WRITE),
    permissionName(Resources.REVIEWS, Actions.DELETE),
    // Audit Logs
    permissionName(Resources.AUDIT_LOGS, Actions.READ),
  ],

  [SystemRoles.MANAGER]: [
    // Products
    permissionName(Resources.PRODUCTS, Actions.READ),
    permissionName(Resources.PRODUCTS, Actions.WRITE),
    // Orders
    permissionName(Resources.ORDERS, Actions.READ),
    permissionName(Resources.ORDERS, Actions.WRITE),
    // Customers
    permissionName(Resources.CUSTOMERS, Actions.READ),
    permissionName(Resources.CUSTOMERS, Actions.WRITE),
    // Inventory
    permissionName(Resources.INVENTORY, Actions.READ),
    permissionName(Resources.INVENTORY, Actions.WRITE),
    // Promotions
    permissionName(Resources.PROMOTIONS, Actions.READ),
    permissionName(Resources.PROMOTIONS, Actions.WRITE),
    // Content
    permissionName(Resources.CONTENT, Actions.READ),
    permissionName(Resources.CONTENT, Actions.WRITE),
    // Users (read only)
    permissionName(Resources.USERS, Actions.READ),
    // Roles (read only)
    permissionName(Resources.ROLES, Actions.READ),
    // Settings (read only)
    permissionName(Resources.SETTINGS, Actions.READ),
    // Reports
    permissionName(Resources.REPORTS, Actions.READ),
    // Categories
    permissionName(Resources.CATEGORIES, Actions.READ),
    permissionName(Resources.CATEGORIES, Actions.WRITE),
    // Payments
    permissionName(Resources.PAYMENTS, Actions.READ),
    permissionName(Resources.PAYMENTS, Actions.WRITE),
    // Reviews
    permissionName(Resources.REVIEWS, Actions.READ),
    permissionName(Resources.REVIEWS, Actions.WRITE),
  ],

  [SystemRoles.STAFF]: [
    // Products (read only)
    permissionName(Resources.PRODUCTS, Actions.READ),
    // Orders
    permissionName(Resources.ORDERS, Actions.READ),
    permissionName(Resources.ORDERS, Actions.WRITE),
    // Customers (read only)
    permissionName(Resources.CUSTOMERS, Actions.READ),
    // Inventory (read only)
    permissionName(Resources.INVENTORY, Actions.READ),
    // Categories (read only)
    permissionName(Resources.CATEGORIES, Actions.READ),
    // Payments (read only)
    permissionName(Resources.PAYMENTS, Actions.READ),
    // Reviews (read only)
    permissionName(Resources.REVIEWS, Actions.READ),
  ],
}

// ============================================
// PERMISSION CHECKING HELPERS
// ============================================

/**
 * Check if a user has a specific permission
 */
export function checkPermission(
  userPermissions: string[] | Record<string, string[]>,
  resource: Resource,
  action: Action
): boolean {
  const requiredPermission = permissionName(resource, action)

  // Handle array of permission strings (new format)
  if (Array.isArray(userPermissions)) {
    return userPermissions.includes(requiredPermission) || userPermissions.includes("*")
  }

  // Handle legacy object format { resource: ["action1", "action2"] }
  const resourcePerms = userPermissions[resource] || []
  return resourcePerms.includes(action) || resourcePerms.includes("*")
}

/**
 * Check if a user has any of the specified permissions
 */
export function checkAnyPermission(
  userPermissions: string[] | Record<string, string[]>,
  permissions: Array<{ resource: Resource; action: Action }>
): boolean {
  return permissions.some(({ resource, action }) =>
    checkPermission(userPermissions, resource, action)
  )
}

/**
 * Check if a user has all of the specified permissions
 */
export function checkAllPermissions(
  userPermissions: string[] | Record<string, string[]>,
  permissions: Array<{ resource: Resource; action: Action }>
): boolean {
  return permissions.every(({ resource, action }) =>
    checkPermission(userPermissions, resource, action)
  )
}

/**
 * Check if a role is a system role (super_admin, admin, manager, staff)
 */
export function isSystemRole(roleName: string): boolean {
  return Object.values(SystemRoles).includes(roleName as SystemRole)
}

/**
 * Check if a role is super_admin
 */
export function isSuperAdmin(roleName: string): boolean {
  return roleName === SystemRoles.SUPER_ADMIN
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(roleName: string): number {
  switch (roleName) {
    case SystemRoles.SUPER_ADMIN: return 100
    case SystemRoles.ADMIN: return 80
    case SystemRoles.MANAGER: return 60
    case SystemRoles.STAFF: return 40
    default: return 0
  }
}

/**
 * Check if roleA has higher or equal privileges than roleB
 */
export function hasHigherOrEqualRole(roleA: string, roleB: string): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB)
}

// ============================================
// LEGACY PERMISSIONS CONVERTER
// ============================================

/**
 * Convert legacy permissions object to new permission string array
 */
export function convertLegacyPermissions(
  legacyPerms: Record<string, string[]>
): string[] {
  const result: string[] = []

  for (const [resource, actions] of Object.entries(legacyPerms)) {
    for (const action of actions) {
      if (action === "*") {
        // Add all actions for this resource
        const resourceActions = permissionDefinitions
          .filter(p => p.resource === resource)
          .map(p => p.name)
        result.push(...resourceActions)
      } else {
        result.push(`${resource}:${action}`)
      }
    }
  }

  return [...new Set(result)] // Remove duplicates
}

/**
 * Convert permission string array to legacy object format
 */
export function convertToLegacyFormat(
  permissions: string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  for (const perm of permissions) {
    const [resource, action] = perm.split(":")
    if (!result[resource]) {
      result[resource] = []
    }
    if (!result[resource].includes(action)) {
      result[resource].push(action)
    }
  }

  return result
}

// ============================================
// RESOURCE DISPLAY INFO
// ============================================

export const resourceDisplayNames: Record<Resource, string> = {
  [Resources.PRODUCTS]: "Products",
  [Resources.ORDERS]: "Orders",
  [Resources.CUSTOMERS]: "Customers",
  [Resources.INVENTORY]: "Inventory",
  [Resources.PROMOTIONS]: "Promotions",
  [Resources.CONTENT]: "Content",
  [Resources.USERS]: "Users",
  [Resources.ROLES]: "Roles",
  [Resources.SETTINGS]: "Settings",
  [Resources.REPORTS]: "Reports",
  [Resources.CATEGORIES]: "Categories",
  [Resources.PAYMENTS]: "Payments",
  [Resources.REVIEWS]: "Reviews",
  [Resources.AUDIT_LOGS]: "Audit Logs",
  [Resources.CLIENTS]: "Clients",
}

export const actionDisplayNames: Record<Action, string> = {
  [Actions.READ]: "View",
  [Actions.WRITE]: "Edit",
  [Actions.DELETE]: "Delete",
  [Actions.EXPORT]: "Export",
  [Actions.MANAGE]: "Manage",
}
