import { SERVICE_KEY_PARAM } from "./config";

/**
 * data.go.kr 호출 공통부. 서버에서만 실행된다.
 *
 * 인증키는 .env.local의 DATA_GO_KR_KEY 하나를 세 API가 함께 쓴다.
 * 이 파일은 Route Handler를 통해서만 불린다. 키가 브라우저로 나가면 안 된다(NF-04).
 */

const TIMEOUT_MS = 6000;

export function getServiceKey(): string | null {
  const key = process.env.DATA_GO_KR_KEY?.trim();
  return key ? key : null;
}

export interface RawResponse {
  ok: boolean;
  status: number;
  text: string;
  json: unknown;
}

/**
 * 한 번 호출하고 원문을 그대로 돌려준다.
 * 실패·시간초과·키 없음·주소 없음은 전부 null이다. 호출한 쪽은 예시 데이터로 넘어간다(NF-03).
 */
export async function callDataGoKr(
  endpoint: string,
  params: Record<string, string>,
): Promise<RawResponse | null> {
  const key = getServiceKey();
  if (!key || !endpoint) return null;

  const url = new URL(endpoint);
  // 디코딩 키에는 +와 =가 들어 있다. URLSearchParams가 알아서 인코딩한다.
  url.searchParams.set(SERVICE_KEY_PARAM, key);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // 관측값은 자주 바뀐다. 5분만 재사용한다.
      next: { revalidate: 300 },
    });
    const text = await response.text();

    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // XML로 오는 경우가 있다. 원문은 그대로 남겨 둔다.
    }

    return { ok: response.ok, status: response.status, text, json };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
