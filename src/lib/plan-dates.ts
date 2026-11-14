/** Local calendar date as YYYY-MM-DD (the household plans in its own time zone). */
export function isoLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOptions(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const daysToMonday = (8 - today.getDay()) % 7 || 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysToMonday);
  return [
    { key: "today", date: isoLocal(today) },
    { key: "tomorrow", date: isoLocal(tomorrow) },
    { key: "nextMonday", date: isoLocal(monday) },
  ] as const;
}
