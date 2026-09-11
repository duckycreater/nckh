/** Calendar-day key for BMO's Vietnam deployment (UTC+7, no DST). */
export function getVietnamDayKey(now: Date | number | string = Date.now()): string {
  if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
  const timestamp =
    now instanceof Date ? now.getTime() : typeof now === "string" ? Date.parse(now) : now;
  if (!Number.isFinite(timestamp)) throw new RangeError("Invalid date value");
  return new Date(timestamp + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
