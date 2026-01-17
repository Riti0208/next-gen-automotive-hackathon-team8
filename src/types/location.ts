export interface LocationData {
  latitude: number;
  longitude: number;
  heading?: number; // 0-360度
}

export interface LocationUpdate extends LocationData {
  sessionId: string;
  timestamp: Date;
}

export interface LocationBroadcast extends LocationData {
  sessionId: string;
  driverId: string;
}
