"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createRealtimeService } from "@/lib/services/realtimeService";
import type { WebRTCMessage } from "@/types/webrtc";

interface UseWebRTCOptions {
  sessionId: string;
  myId: string;
  peerId: string;
  isInitiator: boolean; // true = ドライバー（Offer送信側）, false = サポーター（Answer送信側）
  videoEnabled?: boolean; // ビデオ送信を有効化
  onSessionEnded?: () => void; // セッション終了時のコールバック
}

export function useWebRTC({
  sessionId,
  myId,
  peerId,
  isInitiator,
  videoEnabled = true,
  onSessionEnded,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const realtimeServiceRef = useRef(createRealtimeService());
  const localStreamRef = useRef<MediaStream | null>(null);
  const onSessionEndedRef = useRef(onSessionEnded);

  // onSessionEndedの最新の参照を保持
  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
  }, [onSessionEnded]);

  useEffect(() => {
    // sessionIdが空の場合は実行しない
    if (!sessionId || !myId || !peerId) {
      console.log("Skipping WebRTC initialization - missing required parameters");
      return;
    }

    // モバイル検出
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // メディア制約を生成
    const getMediaConstraints = () => {
      if (!videoEnabled) {
        return { video: false, audio: true };
      }

      // Driver (Initiator) with video
      const videoConstraints = isMobile
        ? {
            facingMode: { ideal: "environment" }, // リアカメラを優先
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          };

      const audioConstraints = isMobile
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : true;

      return {
        video: videoConstraints,
        audio: audioConstraints,
      };
    };

    // エラーハンドリング
    const handleMediaError = (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : "Unknown media error";

      if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission denied")) {
        setError(
          "カメラ/マイクへのアクセスが拒否されました。\n" +
          (isMobile
            ? "スマートフォンの場合:\n" +
              "1. ブラウザの設定でカメラとマイクの権限を許可してください\n" +
              "2. 他のアプリでカメラが使用中でないか確認してください\n" +
              "3. HTTPSで接続していることを確認してください"
            : "ブラウザの設定でカメラとマイクの権限を許可してください。")
        );
      } else if (errorMsg.includes("NotFoundError")) {
        setError("カメラまたはマイクが見つかりません。デバイスが接続されているか確認してください。");
      } else if (errorMsg.includes("NotReadableError")) {
        setError(
          "カメラ/マイクにアクセスできません。\n" +
          "他のアプリケーションで使用中の可能性があります。"
        );
      } else if (errorMsg.includes("OverconstrainedError")) {
        setError(
          "要求されたカメラ設定がデバイスでサポートされていません。\n" +
          "別のブラウザまたはデバイスをお試しください。"
        );
      } else if (errorMsg.includes("SecurityError")) {
        setError(
          "セキュリティエラー: HTTPSで接続してください。\n" +
          (isMobile ? "スマートフォンではHTTPSが必須です。" : "")
        );
      } else {
        setError(`メディアストリームの取得に失敗しました: ${errorMsg}`);
      }
    };

    const init = async () => {
      try {
        console.log("Initializing WebRTC with sessionId:", sessionId);
        console.log("Device type:", isMobile ? "Mobile" : "Desktop");

        // メディアストリーム取得
        let stream: MediaStream;
        const constraints = getMediaConstraints();

        console.log("Requesting media with constraints:", constraints);

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("Media stream acquired successfully");
          console.log("Available tracks:", stream.getTracks().map(track => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
            settings: track.getSettings(),
          })));
        } catch (mediaError) {
          console.error("Failed to get media stream:", mediaError);

          // フォールバック: 制約を緩めて再試行
          if (constraints.video && typeof constraints.video === 'object') {
            console.log("Trying fallback constraints...");
            try {
              const fallbackConstraints = {
                video: isMobile
                  ? {
                      facingMode: "environment",
                      width: { ideal: 640 },
                      height: { ideal: 480 },
                    }
                  : {
                      width: { ideal: 640 },
                      height: { ideal: 480 },
                    },
                audio: true,
              };
              console.log("Fallback constraints:", fallbackConstraints);
              stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
              console.log("Fallback constraints succeeded");
              console.log("Fallback tracks:", stream.getTracks().map(track => ({
                kind: track.kind,
                label: track.label,
                settings: track.getSettings(),
              })));
            } catch (fallbackError) {
              console.error("Fallback also failed:", fallbackError);
              handleMediaError(mediaError);
              throw mediaError;
            }
          } else {
            handleMediaError(mediaError);
            throw mediaError;
          }
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        // PeerConnection作成
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            // TURN server for mobile networks (carrier-grade NAT対策)
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
        });
        peerConnectionRef.current = pc;

        // ローカルストリーム追加
        stream.getTracks().forEach((track) => {
          console.log(`Adding local track: ${track.kind}`);
          pc.addTrack(track, stream);
        });

        // リモートストリーム受信
        const remote = new MediaStream();
        setRemoteStream(remote);

        pc.ontrack = (event) => {
          console.log("Received remote track:", event.track.kind);
          if (event.streams && event.streams[0]) {
            console.log("Adding tracks from stream, track count:", event.streams[0].getTracks().length);
            event.streams[0].getTracks().forEach((track) => {
              remote.addTrack(track);
            });
          } else if (event.track) {
            console.log("Adding single track");
            remote.addTrack(event.track);
          }
          console.log("Remote stream now has tracks:", remote.getTracks().length);
          setRemoteStream(new MediaStream(remote.getTracks()));
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
          const isConn = pc.connectionState === "connected";
          setIsConnected(isConn);
          if (isConn) {
            console.log("WebRTC connection established successfully");
            console.log("Local tracks:", localStreamRef.current?.getTracks().map(t => t.kind));
            console.log("Remote tracks:", remote.getTracks().map(t => t.kind));
          }
        };

        // ICE接続状態監視（詳細ログ）
        pc.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            console.error("ICE connection failed - TURN server may be needed or network issue");
            console.error("Local description:", pc.localDescription);
            console.error("Remote description:", pc.remoteDescription);
          } else if (pc.iceConnectionState === 'disconnected') {
            console.warn("ICE connection disconnected - attempting to reconnect");
          } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log("ICE connection successful");
          }
        };

        // ICE収集状態監視
        pc.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete') {
            console.log("ICE gathering completed");
          }
        };

        // Realtime購読（重要: リスナー登録を先に行う）
        const rtService = realtimeServiceRef.current;
        rtService.subscribeToSession(sessionId);
        rtService.onWebRTCSignal(handleSignal);
        rtService.onSessionEnd(handleSessionEnd);

        // 購読完了を待ってから進める
        await rtService.subscribe();
        console.log("Realtime subscription completed");

        // 非Initiator（Supporter）の場合、準備完了を通知
        if (!isInitiator) {
          console.log("Sending ready signal to initiator");
          await rtService.broadcastWebRTCSignal(sessionId, {
            type: "ready",
            sessionId,
            fromId: myId,
            toId: peerId,
          });
          console.log("Waiting for offer as non-initiator");
        } else {
          console.log("Waiting for ready signal from peer before sending offer");
        }
      } catch (err) {
        console.error("WebRTC initialization error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    const handleSessionEnd = (payload: {
      sessionId: string;
      fromId: string;
      toId: string;
      timestamp: string;
    }) => {
      console.log(`Session ended by ${payload.fromId} at ${payload.timestamp}`);

      // 自分宛の終了通知のみ処理
      if (payload.toId !== myId) {
        console.log(`Ignoring session end not for me. toId: ${payload.toId}, myId: ${myId}`);
        return;
      }

      // PeerConnectionをクローズ
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // ローカルストリームを停止
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
      setIsConnected(false);

      // コールバックを実行
      if (onSessionEndedRef.current) {
        onSessionEndedRef.current();
      }
    };

    const handleSignal = async (message: WebRTCMessage) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      // メッセージフィルタリング: 自分宛のメッセージのみ処理
      if (message.toId !== myId) {
        console.log(`Ignoring message not for me. toId: ${message.toId}, myId: ${myId}`);
        return;
      }

      // 送信元が期待するピアIDと一致するか確認
      if (message.fromId !== peerId) {
        console.log(`Ignoring message from unexpected peer. fromId: ${message.fromId}, expected: ${peerId}`);
        return;
      }

      console.log(`Received WebRTC signal: ${message.type} from ${message.fromId}`);

      try {
        if (message.type === "ready" && isInitiator) {
          // Supporter側の準備が完了したので、Offerを送信
          console.log("Peer is ready, creating and sending offer");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await realtimeServiceRef.current.broadcastWebRTCSignal(sessionId, {
            type: "offer",
            sessionId,
            fromId: myId,
            toId: peerId,
            sdp: offer,
          });
          console.log("Offer sent successfully");
        } else if (message.type === "offer" && !isInitiator) {
          console.log("Processing offer and creating answer");
          await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("Sending answer");
          await realtimeServiceRef.current.broadcastWebRTCSignal(sessionId, {
            type: "answer",
            sessionId,
            fromId: myId,
            toId: peerId,
            sdp: answer,
          });
        } else if (message.type === "answer" && isInitiator) {
          console.log("Processing answer");
          await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.type === "ice-candidate") {
          console.log("Adding ICE candidate");
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
      console.log("Cleaning up WebRTC connection");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      realtimeServiceRef.current.unsubscribe();
      setLocalStream(null);
      setRemoteStream(null);
      setIsConnected(false);
      setError(null);
    };
  }, [sessionId, myId, peerId, isInitiator, videoEnabled]);

  const endSession = useCallback(async () => {
    if (!sessionId || !myId || !peerId) return;

    const rtService = realtimeServiceRef.current;
    await rtService.broadcastSessionEnd(sessionId, myId, peerId);
    console.log("Session end notification sent via WebRTC hook");
  }, [sessionId, myId, peerId]);

  return {
    localStream,
    remoteStream,
    isConnected,
    error,
    endSession,
  };
}
