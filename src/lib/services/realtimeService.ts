import { supabase } from "../supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { LocationBroadcast } from "@/types/location";
import type { WebRTCMessage } from "@/types/webrtc";

export class RealtimeService {
  private channel: RealtimeChannel | null = null;

  subscribeToSession(sessionId: string) {
    this.channel = supabase.channel(`session:${sessionId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    return this.channel;
  }

  broadcastLocation(sessionId: string, location: LocationBroadcast) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.send({
      type: "broadcast",
      event: "location",
      payload: location,
    });
  }

  onLocationUpdate(callback: (payload: LocationBroadcast) => void) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.on(
      "broadcast",
      { event: "location" },
      ({ payload }) => {
        callback(payload as LocationBroadcast);
      }
    );
  }

  broadcastWebRTCSignal(sessionId: string, message: WebRTCMessage) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.send({
      type: "broadcast",
      event: "webrtc-signal",
      payload: {
        sessionId,
        message,
      },
    });
  }

  onWebRTCSignal(callback: (message: WebRTCMessage) => void) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.on(
      "broadcast",
      { event: "webrtc-signal" },
      ({ payload }) => {
        callback(payload.message as WebRTCMessage);
      }
    );
  }

  broadcastCallRequest(driverId: string, driverName: string, destination?: string) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.send({
      type: "broadcast",
      event: "call-request",
      payload: {
        driverId,
        driverName,
        destination,
        timestamp: new Date().toISOString(),
      },
    });
  }

  onCallRequest(callback: (payload: {
    driverId: string;
    driverName: string;
    destination?: string;
    timestamp: string;
  }) => void) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.on(
      "broadcast",
      { event: "call-request" },
      ({ payload }) => {
        callback(payload as any);
      }
    );
  }

  broadcastSessionEnd(sessionId: string, fromId: string, toId: string) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.send({
      type: "broadcast",
      event: "session-end",
      payload: {
        sessionId,
        fromId,
        toId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  onSessionEnd(callback: (payload: {
    sessionId: string;
    fromId: string;
    toId: string;
    timestamp: string;
  }) => void) {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.on(
      "broadcast",
      { event: "session-end" },
      ({ payload }) => {
        callback(payload as any);
      }
    );
  }

  async subscribe() {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call subscribeToSession first.");
    }

    return this.channel.subscribe();
  }

  unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export function createRealtimeService() {
  return new RealtimeService();
}
