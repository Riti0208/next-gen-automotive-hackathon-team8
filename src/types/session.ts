import { SessionStatus } from "@prisma/client";

export interface SessionData {
  id: string;
  driverId: string;
  supporterId?: string;
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date;
}

export interface CreateSessionRequest {
  driverName: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: SessionStatus;
  supporterId?: string;
}

export interface UpdateSessionStatusRequest {
  sessionId: string;
  status: SessionStatus;
}
