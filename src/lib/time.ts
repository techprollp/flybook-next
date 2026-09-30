/** UAE / Asia/Dubai helpers */

export function dubaiNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" })
  );
}

export function todayDubai(): string {
  const d = dubaiNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function timeDubai(): string {
  const d = dubaiNow();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** After 12:00 noon UAE, date is locked to today for new entries */
export function isDateLocked(): boolean {
  return dubaiNow().getHours() >= 12;
}

export function formatDisplayDate(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function countFmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
