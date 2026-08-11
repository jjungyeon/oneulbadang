// PRD 11. 데이터 구조
export interface Place {
  id: string;
  name: string;
  type: "BEACH" | "PORT";
  lat: number;
  lng: number;
  region: "NORTH" | "EAST" | "WEST" | "SOUTH";
  tideStationId?: string;
}
