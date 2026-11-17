"use client";

import { useState } from "react";
import Link from "next/link";
import WaterplayScene from "@/components/WaterplayScene";
import type { PlaceStatus } from "@/types/condition";

const scenes: {status: PlaceStatus; label: string}[] = [
  {status: "SWIMMING", label: "스노클링"}, {status: "HOT", label: "더운 날"},
  {status: "COLD", label: "차가운 물"}, {status: "WINDY", label: "강한 바람"},
  {status: "RAIN", label: "비 오는 날"}, {status: "LOW_TIDE", label: "낮은 물높이"},
];

export default function CharacterPreview() {
  const [paused, setPaused] = useState(false);
  const [ratio, setRatio] = useState(0.5);
  const [status, setStatus] = useState<PlaceStatus>("SWIMMING");
  return (
    <main className="h-dvh overflow-y-auto bg-[#F6FAF7] px-4 py-10 text-ink">
      <div className="mx-auto max-w-[540px]">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-bold text-deep">← 오늘바당 지도</Link>
        <p className="mt-8 text-[12px] font-bold tracking-[0.18em] text-deep">오늘바당 · 캐릭터 미리보기</p>
        <h1 className="mt-3 text-3xl font-black leading-tight">오늘의 바다를<br />움직이는 장면으로.</h1>
        <p className="mt-4 text-sm leading-6 text-ink/60">상황을 골라 캐릭터와 주변 요소의 움직임을 확인해 보세요.</p>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="캐릭터 상황 선택">
          {scenes.map(scene => <button key={scene.status} type="button" aria-pressed={status === scene.status}
            onClick={() => setStatus(scene.status)} className={`min-h-11 rounded-full px-4 text-sm font-bold ${status === scene.status ? "bg-deep text-white" : "bg-white text-ink"}`}>{scene.label}</button>)}
        </div>
        <div className="mt-6 overflow-hidden rounded-[28px] bg-white">
          <WaterplayScene status={status} paused={paused} tideRatio={ratio} />
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-lg font-bold">{scenes.find(scene => scene.status === status)?.label}</p><p className="mt-1 text-xs text-ink/50">캐릭터 동작 시안 · 예시 장면</p></div>
              <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} className="min-h-11 shrink-0 rounded-full bg-mist px-5 text-sm font-bold">{paused ? "다시 재생" : "일시 정지"}</button>
            </div>
            <label htmlFor="water-level" className="mt-7 block text-sm font-bold">물높이 표현</label>
            <input id="water-level" type="range" min="0" max="1" step="0.1" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} className="mt-2 h-11 w-full accent-[#1EA7D4]" />
            <p className="text-xs leading-5 text-ink/50">움직임을 확인하기 위한 예시입니다. 실제 수심·파고나 입수 안전을 뜻하지 않아요. 기기의 ‘동작 줄이기’ 설정에서는 정지된 모습으로 보여요.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
