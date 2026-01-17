"use client";

import { useEffect, useRef, useState } from "react";
import { createRealtimeService } from "@/lib/services/realtimeService";
import type { WebRTCMessage } from "@/types/webrtc";

interface UseWebRTCOptions {
  sessionId: string;
  myId: string;
  peerId: string;
  isInitiator: boolean; // true = ドライバー（Offer送信側）, false = サポーター（Answer送信側）
  videoEnabled?: boolean; // ビデオ送信を有効化
}

export function useWebRTC({
  sessionId,
  myId,
  peerId,
  isInitiator,
  videoEnabled = true,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const realtimeServiceRef = useRef(createRealtimeService());

  useEffect(() => {
    // sessionIdが空の場合は実行しない
    if (!sessionId || !myId || !peerId) {
      console.log("Skipping WebRTC initialization - missing required parameters");
      return;
    }

    const init = async () => {
      try {
        console.log("Initializing WebRTC with sessionId:", sessionId);
        // メディアストリーム取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: true,
        });
        setLocalStream(stream);

        // PeerConnection作成
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        peerConnectionRef.current = pc;

        // ローカルストリーム追加
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // リモートストリーム受信
        const remote = new MediaStream();
        setRemoteStream(remote);

        pc.ontrack = (event) => {
          console.log("Received remote track:", event.track.kind);
          if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach((track) => {
              remote.addTrack(track);
            });
          } else if (event.track) {
            remote.addTrack(event.track);
          }
        };

        // ICE Candidate
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            realtimeServiceRef.current.broadcastWebRTCSignal(sessionId, {
              type: "ice-candidate",
              sessionId,
              fromId: myId,
              toId: peerId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        // 接続状態監視
        pc.onconnectionstatechange = () => {
          console.log("Connection state:", pc.connectionState);
          setIsConnected(pc.connectionState === "connected");
        };

        // ICE接続状態監視
        pc.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", pc.iceConnectionState);
        };

        // ICE収集状態監視
        pc.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", pc.iceGatheringState);
        };

        // Realtime購読
        const rtService = realtimeServiceRef.current;
        rtService.subscribeToSession(sessionId);
        rtService.onWebRTCSignal(handleSignal);
        await rtService.subscribe();

        // Initiatorの場合、Offer作成
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await rtService.broadcastWebRTCSignal(sessionId, {
            type: "offer",
            sessionId,
            fromId: myId,
            toId: peerId,
            sdp: offer,
          });
        }
      } catch (err) {
        console.error("WebRTC initialization error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    const handleSignal = async (message: WebRTCMessage) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (message.type === "offer" && !isInitiator) {
          await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await realtimeServiceRef.current.broadcastWebRTCSignal(sessionId, {
            type: "answer",
            sessionId,
            fromId: myId,
            toId: peerId,
            sdp: answer,
          });
        } else if (message.type === "answer" && isInitiator) {
          await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.type === "ice-candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      } catch (err) {
        console.error("Signal handling error:", err);
        setError(err instanceof Error ? err.message : "Signal error");
      }
    };

    init();

    return () => {
      // クリーンアップ
      localStream?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
      realtimeServiceRef.current.unsubscribe();
    };
  }, [sessionId, myId, peerId, isInitiator, videoEnabled]);

  return {
    localStream,
    remoteStream,
    isConnected,
    error,
  };
}
