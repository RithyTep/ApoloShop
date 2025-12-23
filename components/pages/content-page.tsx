"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

const pages = [
  { id: 1, title: "About Us", type: "Page", status: "Published", lastEdited: "Dec 15" },
  { id: 2, title: "Contact", type: "Page", status: "Published", lastEdited: "Dec 10" },
  { id: 3, title: "News Dec 2024", type: "Blog", status: "Draft", lastEdited: "Dec 22" },
]

export function ContentPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Management</h1>
          <p className="text-muted-foreground mt-2">Manage pages, blog posts, and SEO content</p>
        </div>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Page
        </Button>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Title</TableHead>
                <TableHead className="text-foreground font-semibold">Type</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Last Edited</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{page.title}</TableCell>
                  <TableCell className="text-foreground">{page.type}</TableCell>
                  <TableCell>
                    <Badge variant={page.status === "Published" ? "default" : "secondary"} className="rounded-sm">
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{page.lastEdited}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
