export function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

/** Reject provider errors even when the HTTP status is 200. */
export function itemsFrom(raw: unknown): Record<string, unknown>[] {
  const root = record(raw);
  const response = record(root?.response) ?? root;
  const header = record(response?.header);
  if (!["00", "0"].includes(String(header?.resultCode))) return [];
  const body = record(response?.body);
  const items = record(body?.items)?.item;
  return (Array.isArray(items) ? items : items ? [items] : [])
    .map(record).filter((item): item is Record<string, unknown> => Boolean(item));
}

export function finiteValue(value: unknown, min = -Infinity, max = Infinity): number | undefined {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") return;
  const n = Number(value);
  return Number.isFinite(n) && ![-999, -9999, 9999].includes(n) && n >= min && n <= max ? n : undefined;
}

export function koreanDate(now: Date, days = 0): string {
  return new Date(now.getTime() + 9 * 3600000 + days * 86400000).toISOString().slice(0, 10).replaceAll("-", "");
}

/** Provider timestamps without an offset are KST, independent of the server timezone. */
export function koreanTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const m = value.trim().match(/^(\d{4})-?(\d{2})-?(\d{2})[ T]?(\d{2}):?(\d{2})(?::?(\d{2}))?(?:\+09:00)?$/);
  if (!m) return;
  const local = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}`;
  const stamp = Date.parse(`${local}+09:00`);
  if (!Number.isFinite(stamp) || new Date(stamp + 9 * 3600000).toISOString().slice(0, 19) !== local) return;
  return `${local}+09:00`;
}

export function freshObservation(time: string | undefined, now: Date, maxAgeMinutes = 90): boolean {
  if (!time) return false;
  const age = now.getTime() - Date.parse(time);
  return age >= -60000 && age <= maxAgeMinutes * 60000;
}
