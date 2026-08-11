import type { ReactNode } from "react";

import type { PlaceStatus } from "@/types/condition";

/**
 * 여섯 상태의 캐릭터.
 *
 * ref/ref_01.png을 따른다 — 분홍빛 피부, 아주 작은 머리, 굵고 긴 팔다리,
 * 덩어리진 머리카락, 몸을 기울인 느슨한 자세. 프레임을 꽉 채워 아래가 잘린다.
 * 배경은 투명이다. 하늘·물·파도 띠는 시트의 배너가 만든다.
 *
 * 여섯이 공유하는 것: 머리·얼굴·몸통·팔다리 모양과 색.
 * 상태마다 바뀌는 것: 팔다리 각도 / 기울기 / 입 / 소품 / 움직임.
 *
 * CLAUDE.md 형태 규칙: stroke 없이 채운 도형만, 끝은 둥글게,
 * 얼굴은 점 두 개와 짧은 선 하나. 코와 눈썹은 없다.
 */

/* ref에서 뽑은 색. 살색은 살구빛이 아니라 분홍에 가깝다. */
const SKIN = "#F5A5A2";
const INK = "#1A1A1A";
const WHITE = "#FFFFFF";
const SUIT = "#FF8FB1"; // 수영복 분홍
const TUBE = "#A8E063"; // 튜브 연두
const BALL = "#FFD64F"; // 공 노랑
const SHELL = "#FF6B5A"; // 조개 빨강

/* 뼈대. 여섯 상태가 같은 값을 쓴다. */
const HAIR = { x: 100, y: 34, r: 13.5 };
const HEAD = { x: 100, y: 38, r: 11 };
const BANGS_HALF = 10.58; // 머리 반지름 11에서 y를 3 올렸을 때의 반현
const TORSO = { x: 81, y: 49, w: 38, h: 50, rx: 19 };
const SHOULDER_L = { x: 85, y: 59 };
const SHOULDER_R = { x: 115, y: 59 };
const HIP_L = { x: 90, y: 95 };
const HIP_R = { x: 110, y: 95 };
const ARM_W = 22;
const LEG_W = 24;

/** 굵은 팔다리 하나. 어깨(엉덩이)를 축으로 돌린다. 끝은 뭉툭하게 둥글다. */
function Limb({
  pivot,
  width,
  length,
  angle,
}: {
  pivot: { x: number; y: number };
  width: number;
  length: number;
  angle: number;
}) {
  const half = width / 2;
  return (
    <rect
      x={pivot.x - half}
      y={pivot.y - half}
      width={width}
      height={length}
      rx={half}
      fill={SKIN}
      transform={`rotate(${angle} ${pivot.x} ${pivot.y})`}
    />
  );
}

/* ── 입 (짧은 선 하나) ────────────────────────────── */

const M_SMILE = <path d="M94.8 45 Q100 50.4 105.2 45 Q100 47.6 94.8 45 Z" fill={INK} />;
const M_SOFT = <path d="M96.2 45.2 Q100 49 103.8 45.2 Q100 47.2 96.2 45.2 Z" fill={INK} />;
const M_FLAT = <rect x="95.8" y="45" width="8.4" height="2.3" rx="1.15" fill={INK} />;
const M_SMALL = <rect x="97.4" y="45" width="5.2" height="2.3" rx="1.15" fill={INK} />;
const M_TILT = (
  <rect x="95.8" y="44.8" width="8.4" height="2.3" rx="1.15" fill={INK} transform="rotate(-11 100 45.9)" />
);
const M_FROWN = <path d="M95.4 48 Q100 43 104.6 48 Q100 45.7 95.4 48 Z" fill={INK} />;

/* ── 상태별 설정 ──────────────────────────────────── */

interface Look {
  mouth: ReactNode;
  armL: number;
  armR: number;
  armLen: number;
  legL: number;
  legR: number;
  /** 몸 전체 기울기. 정면 대칭으로 세워 두면 뻣뻣해 보인다. */
  tilt: number;
  armsInFront?: boolean;
  bodyClass: string;
  behind?: ReactNode;
  front?: ReactNode;
}

const LOOKS: Record<PlaceStatus, Look> = {
  /* 굵은 튜브에 몸을 기대고 한 팔을 번쩍 든다 */
  SWIMMING: {
    mouth: M_SMILE,
    armL: 132, armR: -62, armLen: 64, legL: 30, legR: 4,
    tilt: -9,
    bodyClass: "badang-bob",
    front: (
      <path
        fillRule="evenodd"
        d="M100 100 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0 M100 100 m-23 0 a23 23 0 1 1 46 0 a23 23 0 1 1 -46 0"
        fill={TUBE}
      />
    ),
  },

  /* 추워서 두 팔을 몸 앞으로 모았다 */
  COLD: {
    mouth: M_SMALL,
    armL: -62, armR: 62, armLen: 40, legL: 7, legR: -7,
    tilt: 4,
    armsInFront: true,
    bodyClass: "badang-shiver",
    behind: (
      <>
        <rect x="44" y="30" width="6" height="19" rx="3" fill={WHITE} opacity="0.9" transform="rotate(-18 47 39)" />
        <rect x="59" y="22" width="6" height="13" rx="3" fill={WHITE} opacity="0.7" transform="rotate(-18 62 28)" />
        <rect x="150" y="30" width="6" height="19" rx="3" fill={WHITE} opacity="0.9" transform="rotate(18 153 39)" />
        <rect x="135" y="22" width="6" height="13" rx="3" fill={WHITE} opacity="0.7" transform="rotate(18 138 28)" />
      </>
    ),
  },

  /* 한 팔을 높이 뻗어 공을 받는다 */
  HOT: {
    mouth: M_SOFT,
    armL: 146, armR: -44, armLen: 64, legL: 14, legR: -18,
    tilt: -7,
    bodyClass: "badang-float",
    /* 비치볼. 노란 공에 흰 띠 하나 */
    behind: (
      <g>
        <circle cx="36" cy="42" r="19" fill={BALL} />
        <path d="M17.8 36.6 a19 19 0 0 1 36.4 0 a44 44 0 0 0 -36.4 0 z" fill={WHITE} opacity="0.85" />
      </g>
    ),
  },

  /* 바람에 밀려 한 팔이 옆으로 뻗는다 */
  WINDY: {
    mouth: M_TILT,
    armL: 98, armR: -22, armLen: 64, legL: 22, legR: -4,
    tilt: 12,
    bodyClass: "badang-lean",
    behind: (
      <>
        <rect className="badang-drift" x="4" y="44" width="46" height="7" rx="3.5" fill={WHITE} opacity="0.95" />
        <rect className="badang-drift" style={{ animationDelay: "0.5s" }} x="14" y="70" width="34" height="6.4" rx="3.2" fill={WHITE} opacity="0.85" />
        <rect className="badang-drift" style={{ animationDelay: "1.1s" }} x="0" y="94" width="38" height="6" rx="3" fill={WHITE} opacity="0.75" />
      </>
    ),
  },

  /* 수영복 차림 그대로 비를 맞는다. 우산은 씌우지 않는다. */
  RAIN: {
    mouth: M_FLAT,
    armL: 104, armR: -104, armLen: 62, legL: 11, legR: -11,
    tilt: -3,
    bodyClass: "badang-settle",
    behind: (
      <>
        {[
          { x: 18, d: "0s" }, { x: 44, d: "0.45s" }, { x: 66, d: "0.9s" },
          { x: 132, d: "0.2s" }, { x: 158, d: "0.65s" }, { x: 180, d: "1.05s" },
        ].map(({ x, d }) => (
          <rect key={x} className="badang-drop" style={{ animationDelay: d }}
            x={x} y="30" width="6" height="19" rx="3" fill={WHITE} opacity="0.95" />
        ))}
      </>
    ),
  },

  /* 물이 빠져 드러난 바닥에 서 있다 */
  LOW_TIDE: {
    mouth: M_FROWN,
    armL: 34, armR: -34, armLen: 64, legL: 11, legR: -11,
    tilt: 5,
    bodyClass: "badang-settle",
    /* 드러난 바닥에 놓인 조개. 밑면을 평평하게 둔다. */
    front: (
      <>
        <path d="M40 130 a9 9 0 0 1 18 0 z" fill={SHELL} />
        <path d="M154 133 a6.5 6.5 0 0 1 13 0 z" fill={SHELL} opacity="0.85" />
      </>
    ),
  },
};

interface SeaCharacterProps {
  status: PlaceStatus;
  size?: number;
}

export default function SeaCharacter({ status, size = 292 }: SeaCharacterProps) {
  const look = LOOKS[status];

  const arms = (
    <>
      <Limb pivot={SHOULDER_L} width={ARM_W} length={look.armLen} angle={look.armL} />
      <Limb pivot={SHOULDER_R} width={ARM_W} length={look.armLen} angle={look.armR} />
    </>
  );

  return (
    <svg
      width={size}
      height={(size * 150) / 200}
      viewBox="0 0 200 150"
      role="img"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      {look.behind}

      <g className={`badang-anim ${look.bodyClass}`}>
        <g transform={`rotate(${look.tilt} 100 96)`}>
          {/* 다리 */}
          <Limb pivot={HIP_L} width={LEG_W} length={62} angle={look.legL} />
          <Limb pivot={HIP_R} width={LEG_W} length={62} angle={look.legR} />

          {/* 팔은 보통 몸 뒤, 몸 앞으로 모으는 자세일 때만 앞 */}
          {!look.armsInFront && arms}

          {/* 몸통 = 수영복 */}
          <rect x={TORSO.x} y={TORSO.y} width={TORSO.w} height={TORSO.h} rx={TORSO.rx} fill={SUIT} />

          {look.armsInFront && arms}

          {/* 목 */}
          <rect x={HEAD.x - 5} y={HEAD.y + 4} width="10" height="13" rx="5" fill={SKIN} />

          {/* 머리카락 덩어리. 머리보다 크고 위로 올라앉아 부피가 생긴다. */}
          <circle cx={HAIR.x} cy={HAIR.y} r={HAIR.r} fill={INK} />
          {/* 옆으로 넘긴 한 가닥 */}
          <ellipse cx="87" cy="29" rx="7" ry="4.6" fill={INK} transform="rotate(-28 87 29)" />

          {/* 얼굴 */}
          <circle cx={HEAD.x} cy={HEAD.y} r={HEAD.r} fill={SKIN} />
          {/* 앞머리 */}
          <path
            d={`M${HEAD.x - BANGS_HALF} ${HEAD.y - 3} A${HEAD.r} ${HEAD.r} 0 0 1 ${HEAD.x + BANGS_HALF} ${HEAD.y - 3} Z`}
            fill={INK}
          />
          {/* 얼굴 = 점 두 개와 짧은 선 하나 */}
          <circle cx="95.8" cy="40.6" r="2.1" fill={INK} />
          <circle cx="104.2" cy="40.6" r="2.1" fill={INK} />
          {look.mouth}
        </g>
      </g>

      {look.front}
    </svg>
  );
}
