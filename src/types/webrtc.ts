export type WebRTCMessageType = "offer" | "answer" | "ice-candidate" | "ready" | "session-end";

export interface WebRTCOffer {
  type: "offer";
  sessionId: string;
  fromId: string;
  toId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCAnswer {
  type: "answer";
  sessionId: string;
  fromId: string;
  toId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidate {
  type: "ice-candidate";
  sessionId: string;
  fromId: string;
  toId: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCReady {
  type: "ready";
  sessionId: string;
  fromId: string;
  toId: string;
}

export interface WebRTCSessionEnd {
  type: "session-end";
  sessionId: string;
  fromId: string;
  toId: string;
}

export type WebRTCMessage = WebRTCOffer | WebRTCAnswer | WebRTCIceCandidate | WebRTCReady | WebRTCSessionEnd;

export interface WebRTCBroadcastPayload {
  sessionId: string;
  message: WebRTCMessage;
}
