"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Types for export
export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  dateRange?: { from: Date; to: Date };
}

// ============================================
// EXCEL EXPORT
// ============================================

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
): void {
  const { filename, title, columns } = options;

  // Prepare data for Excel
  const worksheetData = data.map((row) => {
    const exportRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      exportRow[col.header] = row[col.key];
    });
    return exportRow;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  // Set column widths
  const colWidths = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length + 2, 15),
  }));
  worksheet["!cols"] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title || "Data");

  // Generate and download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}.xlsx`);
}

// ============================================
// PDF EXPORT
// ============================================

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
): void {
  const { filename, title, columns, dateRange } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Add title
  if (title) {
    doc.setFontSize(18);
    doc.text(title, 14, 20);
  }

  // Add date range if provided
  if (dateRange) {
    doc.setFontSize(10);
    doc.text(
      `Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`,
      14,
      title ? 28 : 20
    );
  }

  // Prepare table data
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => String(row[col.key] ?? "")));

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? (dateRange ? 35 : 28) : dateRange ? 28 : 20,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [63, 81, 181],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      if (col.width) {
        acc[idx] = { cellWidth: col.width };
      }
      return acc;
    }, {} as Record<number, { cellWidth: number }>),
  });

  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleString()}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Download
  doc.save(`${filename}.pdf`);
}

// ============================================
// SPECIFIC EXPORT FUNCTIONS
// ============================================

export interface OrderExportData {
  orderNumber: string;
  customerName: string;
  phone: string;
  status: string;
  items: number;
  totalUsd: number;
  totalKhr: number;
  channel: string;
  createdAt: string;
}

export function exportOrders(orders: OrderExportData[], format: "excel" | "pdf"): void {
  const columns: ExportColumn[] = [
    { key: "orderNumber", header: "Order #", width: 15 },
    { key: "customerName", header: "Customer", width: 20 },
    { key: "phone", header: "Phone", width: 15 },
    { key: "status", header: "Status", width: 12 },
    { key: "items", header: "Items", width: 8 },
    { key: "totalUsd", header: "Total (USD)", width: 12 },
    { key: "totalKhr", header: "Total (KHR)", width: 15 },
    { key: "channel", header: "Channel", width: 12 },
    { key: "createdAt", header: "Date", width: 18 },
  ];

  const options: ExportOptions = {
    filename: `orders-${new Date().toISOString().split("T")[0]}`,
    title: "Orders Report",
    columns,
  };

  if (format === "excel") {
    exportToExcel(orders, options);
  } else {
    exportToPDF(orders, options);
  }
}

export interface ProductExportData {
  sku: string;
  nameEn: string;
  nameKh: string;
  category: string;
  priceUsd: number;
  priceKhr: number;
  stock: number;
  status: string;
}

export function exportProducts(products: ProductExportData[], format: "excel" | "pdf"): void {
  const columns: ExportColumn[] = [
    { key: "sku", header: "SKU", width: 12 },
    { key: "nameEn", header: "Name (EN)", width: 25 },
    { key: "nameKh", header: "Name (KH)", width: 25 },
    { key: "category", header: "Category", width: 15 },
    { key: "priceUsd", header: "Price (USD)", width: 12 },
    { key: "priceKhr", header: "Price (KHR)", width: 15 },
    { key: "stock", header: "Stock", width: 10 },
    { key: "status", header: "Status", width: 10 },
  ];

  const options: ExportOptions = {
    filename: `products-${new Date().toISOString().split("T")[0]}`,
    title: "Products Report",
    columns,
  };

  if (format === "excel") {
    exportToExcel(products, options);
  } else {
    exportToPDF(products, options);
  }
}

export interface CustomerExportData {
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  tags: string;
  createdAt: string;
}

export function exportCustomers(customers: CustomerExportData[], format: "excel" | "pdf"): void {
  const columns: ExportColumn[] = [
    { key: "name", header: "Name", width: 20 },
    { key: "phone", header: "Phone", width: 15 },
    { key: "email", header: "Email", width: 25 },
    { key: "totalOrders", header: "Orders", width: 10 },
    { key: "totalSpent", header: "Total Spent", width: 15 },
    { key: "tags", header: "Tags", width: 20 },
    { key: "createdAt", header: "Since", width: 15 },
  ];

  const options: ExportOptions = {
    filename: `customers-${new Date().toISOString().split("T")[0]}`,
    title: "Customers Report",
    columns,
  };

  if (format === "excel") {
    exportToExcel(customers, options);
  } else {
    exportToPDF(customers, options);
  }
}

export interface InventoryExportData {
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  minLevel: number;
  status: string;
  lastUpdated: string;
}

export function exportInventory(inventory: InventoryExportData[], format: "excel" | "pdf"): void {
  const columns: ExportColumn[] = [
    { key: "sku", header: "SKU", width: 12 },
    { key: "productName", header: "Product", width: 30 },
    { key: "category", header: "Category", width: 15 },
    { key: "quantity", header: "Quantity", width: 12 },
    { key: "minLevel", header: "Min Level", width: 12 },
    { key: "status", header: "Status", width: 12 },
    { key: "lastUpdated", header: "Last Updated", width: 18 },
  ];

  const options: ExportOptions = {
    filename: `inventory-${new Date().toISOString().split("T")[0]}`,
    title: "Inventory Report",
    columns,
  };

  if (format === "excel") {
    exportToExcel(inventory, options);
  } else {
    exportToPDF(inventory, options);
  }
}

// Helper function to download blob
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// SALES REPORT EXPORT
// ============================================

export interface SalesReportData {
  date: string;
  orders: number;
  revenue: number;
  averageOrder: number;
  topProduct: string;
}

export function exportSalesReport(
  data: SalesReportData[],
  format: "excel" | "pdf",
  dateRange?: { from: Date; to: Date }
): void {
  const columns: ExportColumn[] = [
    { key: "date", header: "Date", width: 15 },
    { key: "orders", header: "Orders", width: 12 },
    { key: "revenue", header: "Revenue ($)", width: 15 },
    { key: "averageOrder", header: "Avg Order ($)", width: 15 },
    { key: "topProduct", header: "Top Product", width: 25 },
  ];

  const options: ExportOptions = {
    filename: `sales-report-${new Date().toISOString().split("T")[0]}`,
    title: "Sales Report",
    columns,
    dateRange,
  };

  if (format === "excel") {
    exportToExcel(data, options);
  } else {
    exportToPDF(data, options);
  }
}
