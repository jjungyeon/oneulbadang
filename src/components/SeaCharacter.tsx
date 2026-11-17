import type { PlaceStatus } from "@/types/condition";
import WaterplayScene from "./WaterplayScene";

/** Public interface preserved; all artwork now comes from the user-provided waterplay sheet. */
export default function SeaCharacter({ status, tideRatio }: { status: PlaceStatus; tideRatio?: number }) {
  return <div className="-mx-6 overflow-hidden rounded-b-3xl"><WaterplayScene status={status} tideRatio={tideRatio} /></div>;
}
