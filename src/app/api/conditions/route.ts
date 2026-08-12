import { NextResponse } from "next/server";

import { buildAllReadings } from "@/lib/adapters";
import { buildMockReadings } from "@/data/mock";

/**
 * 화면이 부르는 유일한 API. 인증키는 이 안에서만 쓰이고 브라우저로 나가지 않는다(NF-04).
 *
 * 어떤 이유로든 실패하면 예시 데이터를 그대로 돌려준다. 화면이 깨지지 않는다(NF-03).
 */
export async function GET() {
  try {
    const readings = await buildAllReadings();
    return NextResponse.json({ readings });
  } catch {
    return NextResponse.json({ readings: buildMockReadings() });
  }
}
