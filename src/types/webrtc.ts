export type WebRTCMessageType = "offer" | "answer" | "ice-candidate";

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

export type WebRTCMessage = WebRTCOffer | WebRTCAnswer | WebRTCIceCandidate;

export interface WebRTCBroadcastPayload {
  sessionId: string;
  message: WebRTCMessage;
}
