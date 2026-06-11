import { toast } from "sonner";

export function formatCsvCell(
  value: unknown,
  preserveText = false
): string {
  if (value === null || value === undefined) {
    return "";
  }

  // If the value is already a formatted CSV cell, return it as-is to prevent double-escaping
  if (typeof value === "string" && (
    (value.startsWith('="') && value.endsWith('"')) ||
    (value.startsWith('"') && value.endsWith('"'))
  )) {
    return value;
  }

  let stringValue = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Formula Injection Protection
  if (/^[=+\-@]/.test(stringValue.trimStart())) {
    stringValue = "'" + stringValue;
  }

  // Preserve leading zeros when explicitly requested
  if (preserveText) {
    return `="${stringValue.replace(/"/g, '""')}"`;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function getCsvDateSuffix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: unknown[][]
): void {
  if (!rows || rows.length === 0) {
    toast.warning("No data available to export.");
    return;
  }

  if (rows.length > 10000) {
    const proceed = window.confirm("Large export detected. Continue?");
    if (!proceed) {
      return;
    }
  }

  const csvContent = [
    headers.map((h) => formatCsvCell(h)).join(","),
    ...rows.map((row) =>
      row.map((cell) => formatCsvCell(cell)).join(",")
    ),
  ].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeFilename = filename
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_");

  link.href = url;
  link.download = `${safeFilename}_${getCsvDateSuffix()}.csv`;
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
