"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "phosphor-react"

const users = [
  { id: 1, name: "Admin User", email: "admin@shop.com", role: "Admin", permissions: "All" },
  { id: 2, name: "Manager", email: "manager@shop.com", role: "Manager", permissions: "Edit/View" },
  { id: 3, name: "Staff", email: "staff@shop.com", role: "Staff", permissions: "View Only" },
]

export function UsersPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users & Roles</h1>
          <p className="text-muted-foreground mt-2">Manage users and permission settings</p>
        </div>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add User
        </Button>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Name</TableHead>
                <TableHead className="text-foreground font-semibold">Email</TableHead>
                <TableHead className="text-foreground font-semibold">Role</TableHead>
                <TableHead className="text-foreground font-semibold">Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{user.name}</TableCell>
                  <TableCell className="text-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-sm">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{user.permissions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
