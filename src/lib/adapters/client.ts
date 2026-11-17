import https from "node:https";
import { BEACH_INDEX_ENDPOINT, RIP_CURRENT_ENDPOINT, WEATHER_WARNING_ENDPOINT } from "./config";
import { createHash } from "node:crypto";
import { SERVICE_KEY_PARAM, TIDE_RECENT_ENDPOINT, TIDE_RANGE_ENDPOINT, TIDE_EXTREMES_ENDPOINT, TIDE_SERIES_ENDPOINT, WEATHER_ENDPOINT } from "./config";
import { createResponseCache, type RawResponse } from "./responseCache";
export type { RawResponse } from "./responseCache";

const allowed = new Set([TIDE_RECENT_ENDPOINT, TIDE_RANGE_ENDPOINT, TIDE_EXTREMES_ENDPOINT, TIDE_SERIES_ENDPOINT, WEATHER_ENDPOINT, BEACH_INDEX_ENDPOINT, RIP_CURRENT_ENDPOINT, WEATHER_WARNING_ENDPOINT]);
export function getServiceKey(): string | null {
  const raw = process.env.DATA_GO_KR_KEY?.trim();
  if (!raw) return null;
  try { return raw.includes("%") ? decodeURIComponent(raw) : raw; } catch { return null; }
}
const cached = createResponseCache();

/** Absolute deadline covers DNS, connection and slow-body stalls. Never log raw errors/URLs. */
export function requestJson(url: URL, get = https.get, deadlineMs = 8000): Promise<RawResponse | null> {
  return new Promise((resolve) => {
    let finished = false;
    let request: ReturnType<typeof https.get> | undefined;
    const finish = (value: RawResponse | null) => {
      if (finished) return;
      finished = true; clearTimeout(deadline); resolve(value);
    };
    const deadline = setTimeout(() => { finish(null); request?.destroy(); }, deadlineMs);
    try {
      request = get(url, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (part: string) => {
          body += part;
          if (body.length > 2_000_000) { finish(null); response.destroy(); request?.destroy(); }
        });
        response.on("error", () => finish(null));
        response.on("aborted", () => finish(null));
        response.on("end", () => {
          let json: unknown = null;
          try { json = JSON.parse(body); } catch { /* Retain status, never provider text. */ }
          finish({ ok: response.statusCode === 200 && json !== null, status: response.statusCode ?? 0, json });
        });
      });
      request.on("error", () => finish(null));
    } catch { finish(null); }
  });
}

export async function callDataGoKr(endpoint: string, params: Record<string, string>): Promise<RawResponse | null> {
  const key = getServiceKey();
  if (!key || !allowed.has(endpoint)) return null;
  const url = new URL(endpoint);
  url.searchParams.set(SERVICE_KEY_PARAM, key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const credentialScope = createHash("sha256").update(key).digest("hex");
  const cacheKey = credentialScope + endpoint + JSON.stringify(Object.entries(params).sort());
  return cached(cacheKey, () => requestJson(url), [TIDE_RECENT_ENDPOINT, RIP_CURRENT_ENDPOINT, WEATHER_WARNING_ENDPOINT].includes(endpoint) ? 60000 : 300000);
}
