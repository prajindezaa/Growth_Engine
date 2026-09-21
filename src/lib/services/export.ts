/**
 * GrowthEngine Export Engine
 * Generates formatted CSV and printable documents for Reports, Invoices, Customers, Products, Suppliers, and Khata.
 */

export interface ExportColumn<T = any> {
  header: string;
  key: keyof T | string;
  format?: (value: any, item: T) => string;
}

export const ExportService = {
  /**
   * Convert array of objects to CSV string
   */
  generateCSV<T extends Record<string, any>>(data: T[], columns: ExportColumn<T>[]): string {
    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");
    const rows = data.map((item) => {
      return columns
        .map((col) => {
          let val = (item as any)[col.key];
          if (col.format) {
            val = col.format(val, item);
          } else if (val === null || val === undefined) {
            val = "";
          }
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",");
    });
    return [headers, ...rows].join("\r\n");
  },

  /**
   * Trigger browser file download for CSV content
   */
  downloadCSV(csvContent: string, fileName: string) {
    if (typeof window === "undefined") return;
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName.endsWith(".csv") ? fileName : `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Print or save as PDF via system print dialog
   */
  triggerPrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  },

  /**
   * Generate wa.me WhatsApp URL with encoded message
   */
  getWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  },
};
