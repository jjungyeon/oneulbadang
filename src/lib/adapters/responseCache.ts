import { itemsFrom, record } from "./parse";

export interface RawResponse {
  ok: boolean; status: number; json: unknown;
  refreshDelayed?: boolean; receivedAt?: string;
}
const transient = (r: RawResponse | null) => !r || (r.status === 200 && !r.ok) || r.status === 408 || r.status === 429 || r.status >= 500;

/** Bounded memory only. Empty responses retry soon; sensor gaps are never filled. */
export function createResponseCache(
  now = () => Date.now(),
  pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
) {
  type Entry = { expires: number; value?: RawResponse | null; good?: RawResponse; goodAt?: number; pending?: Promise<RawResponse | null> };
  const entries = new Map<string, Entry>();
  return async (key: string, request: () => Promise<RawResponse | null>, freshMs = 300000) => {
    let entry = entries.get(key);
    if (entry?.pending) return entry.pending;
    if (entry && entry.expires > now()) return entry.value ?? null;
    if (!entry) {
      if (entries.size >= 128) {
        const idle = [...entries].find(([, item]) => !item.pending);
        if (idle) entries.delete(idle[0]);
        else return null;
      }
      entry = { expires: 0 }; entries.set(key, entry);
    }
    const target = entry;
    const run = async () => {
      const attempt = () => request().catch(() => null);
      let result = await attempt();
      if (transient(result)) { await pause(200); result = await attempt(); }
      const at = now();
      if (result?.ok && itemsFrom(result.json).length > 0) {
        result = { ...result, receivedAt: new Date(at).toISOString(), refreshDelayed: false };
        target.good = result; target.goodAt = at; target.expires = at + freshMs;
      } else {
        const root = record(result?.json);
        const response = record(root?.response) ?? root;
        const emptySuccess = result?.ok && /^(00|0)$/.test(String(record(response?.header)?.resultCode));
        // Never hide revoked credentials, access denial or provider validation errors.
        const canRetain = transient(result) || emptySuccess;
        let retainedUntil: number | undefined;
        if (canRetain && target.good && target.goodAt !== undefined && at - target.goodAt < 600000) {
          result = { ...target.good, refreshDelayed: true };
          retainedUntil = target.goodAt + 600000;
        } else if (!canRetain) {
          target.good = undefined; target.goodAt = undefined;
        }
        target.expires = Math.min(at + 15000, retainedUntil ?? Infinity);
      }
      target.value = result;
      return result;
    };
    target.pending = run().finally(() => { target.pending = undefined; });
    return target.pending;
  };
}
