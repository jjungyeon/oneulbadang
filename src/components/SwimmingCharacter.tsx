import WaterplayScene from "./WaterplayScene";

/** Compatibility wrapper for the original swimming preview entry point. */
export default function SwimmingCharacter({ tideRatio, paused = false }: { tideRatio?: number; paused?: boolean }) {
  return <WaterplayScene status="SWIMMING" tideRatio={tideRatio} paused={paused} />;
}
