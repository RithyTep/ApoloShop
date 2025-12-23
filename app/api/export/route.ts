import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// GET /api/export - Export data as CSV/JSON for download
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // orders, products, customers, inventory
    const format = searchParams.get("format") || "json"; // json, csv
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!type) {
      return NextResponse.json({ error: "Export type required" }, { status: 400 });
    }

    let data: unknown[];
    let filename: string;

    switch (type) {
      case "orders": {
        const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
        if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
        if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };

        const orders = await prisma.order.findMany({
          where,
          include: {
            customer: true,
            items: {
              include: { product: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        data = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customer.name,
          phone: o.customer.phone,
          status: o.status,
          items: o.items.length,
          totalUsd: Number(o.totalUsd),
          totalKhr: o.totalKhr,
          currency: o.currency,
          channel: o.channel,
          note: o.note || "",
          createdAt: o.createdAt.toISOString(),
        }));
        filename = `orders-${new Date().toISOString().split("T")[0]}`;
        break;
      }

      case "products": {
        const products = await prisma.product.findMany({
          include: {
            category: true,
            inventory: true,
          },
          orderBy: { createdAt: "desc" },
        });

        data = products.map((p) => ({
          sku: p.sku,
          nameEn: p.nameEn,
          nameKh: p.nameKh,
          category: p.category.nameEn,
          priceUsd: Number(p.priceUsd),
          priceKhr: p.priceKhr,
          stock: p.inventory?.quantity || 0,
          minLevel: p.inventory?.minLevel || 0,
          isActive: p.isActive ? "Active" : "Inactive",
          createdAt: p.createdAt.toISOString(),
        }));
        filename = `products-${new Date().toISOString().split("T")[0]}`;
        break;
      }

      case "customers": {
        const customers = await prisma.customer.findMany({
          include: {
            orders: true,
          },
          orderBy: { createdAt: "desc" },
        });

        data = customers.map((c) => ({
          name: c.name,
          phone: c.phone,
          email: c.email || "",
          totalOrders: c.orders.length,
          totalSpent: c.orders.reduce((sum, o) => sum + Number(o.totalUsd), 0),
          tags: (c.tags as string[])?.join(", ") || "",
          notes: c.notes || "",
          createdAt: c.createdAt.toISOString(),
        }));
        filename = `customers-${new Date().toISOString().split("T")[0]}`;
        break;
      }

      case "inventory": {
        const inventory = await prisma.inventory.findMany({
          include: {
            product: {
              include: { category: true },
            },
          },
        });

        data = inventory.map((i) => ({
          sku: i.product.sku,
          productName: i.product.nameEn,
          category: i.product.category.nameEn,
          quantity: i.quantity,
          minLevel: i.minLevel,
          status: i.quantity <= i.minLevel ? "Low Stock" : "In Stock",
          lastUpdated: i.lastUpdated.toISOString(),
        }));
        filename = `inventory-${new Date().toISOString().split("T")[0]}`;
        break;
      }

      case "sales": {
        const where: { createdAt?: { gte?: Date; lte?: Date }; status?: { in: string[] } } = {
          status: { in: ["COMPLETED", "READY"] },
        };
        if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
        if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };

        const orders = await prisma.order.findMany({
          where,
          include: {
            items: {
              include: { product: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        // Group by date
        const salesByDate = new Map<
          string,
          { date: string; orders: number; revenue: number; products: Map<string, number> }
        >();

        for (const order of orders) {
          const date = order.createdAt.toISOString().split("T")[0];
          const existing = salesByDate.get(date) || {
            date,
            orders: 0,
            revenue: 0,
            products: new Map<string, number>(),
          };

          existing.orders++;
          existing.revenue += Number(order.totalUsd);

          for (const item of order.items) {
            const productName = item.product.nameEn;
            const count = existing.products.get(productName) || 0;
            existing.products.set(productName, count + item.quantity);
          }

          salesByDate.set(date, existing);
        }

        data = Array.from(salesByDate.values()).map((s) => {
          const topProduct = Array.from(s.products.entries()).sort((a, b) => b[1] - a[1])[0];
          return {
            date: s.date,
            orders: s.orders,
            revenue: s.revenue.toFixed(2),
            averageOrder: (s.revenue / s.orders).toFixed(2),
            topProduct: topProduct ? `${topProduct[0]} (${topProduct[1]})` : "-",
          };
        });
        filename = `sales-report-${new Date().toISOString().split("T")[0]}`;
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    // Return based on format
    if (format === "csv") {
      const worksheet = XLSX.utils.json_to_sheet(data as object[]);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // Default JSON
    return NextResponse.json({
      data,
      filename,
      exportedAt: new Date().toISOString(),
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
