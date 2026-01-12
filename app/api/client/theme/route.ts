import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getClientFromRequest } from "@/lib/client-middleware"

// GET /api/client/theme - Get client theme (public)
// Can be called with ?slug= parameter or uses hostname detection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("slug")

    let client

    if (slug) {
      // Explicit slug lookup
      client = await prisma.client.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          faviconUrl: true,
          isActive: true,
        },
      })
    } else {
      // Use hostname detection from middleware
      const clientContext = await getClientFromRequest(request)
      if (clientContext) {
        return NextResponse.json({
          client: {
            id: clientContext.id,
            name: clientContext.name,
            slug: clientContext.slug,
            domain: clientContext.domain,
            theme: clientContext.theme,
            isActive: clientContext.isActive,
          },
          theme: clientContext.theme,
        })
      }
    }

    if (!client) {
      return NextResponse.json({
        client: null,
        theme: null,
      })
    }

    const theme = {
      primaryColor: client.primaryColor,
      secondaryColor: client.secondaryColor,
      logoUrl: client.logoUrl,
      faviconUrl: client.faviconUrl,
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        slug: client.slug,
        domain: client.domain,
        theme,
        isActive: client.isActive,
      },
      theme,
    })
  } catch (error) {
    console.error("Error fetching client theme:", error)
    return NextResponse.json({ error: "Failed to fetch client theme" }, { status: 500 })
  }
}

// PUT /api/client/theme - Update client theme (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, theme } = body

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
    }

    // Verify client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Update theme fields
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(theme.primaryColor !== undefined && { primaryColor: theme.primaryColor }),
        ...(theme.secondaryColor !== undefined && { secondaryColor: theme.secondaryColor }),
        ...(theme.logoUrl !== undefined && { logoUrl: theme.logoUrl }),
        ...(theme.faviconUrl !== undefined && { faviconUrl: theme.faviconUrl }),
      },
      select: {
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
        faviconUrl: true,
      },
    })

    return NextResponse.json({
      success: true,
      theme: {
        primaryColor: updatedClient.primaryColor,
        secondaryColor: updatedClient.secondaryColor,
        logoUrl: updatedClient.logoUrl,
        faviconUrl: updatedClient.faviconUrl,
      },
    })
  } catch (error) {
    console.error("Error updating client theme:", error)
    return NextResponse.json({ error: "Failed to update client theme" }, { status: 500 })
  }
}
