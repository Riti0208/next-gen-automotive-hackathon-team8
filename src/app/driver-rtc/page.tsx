"use client";

import { useState } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoPlayer } from "@/components/video-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DriverRTCPage() {
  const [sessionId, setSessionId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    supporterId: string;
  } | null>(null);

  const webrtc = useWebRTC({
    sessionId: sessionData?.sessionId || "",
    myId: `driver_${driverName}`,
    peerId: sessionData?.supporterId || "",
    isInitiator: true,
    videoEnabled: true,
  });

  const handleStartSession = async () => {
    if (!driverName) {
      alert("名前を入力してください");
      return;
    }

    try {
      const response = await fetch("/api/driver/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverName }),
      });

      const data = await response.json();

      if (data.sessionId) {
        setSessionData({
          sessionId: data.sessionId,
          supporterId: data.supporterId || "supporter_001",
        });
        setIsStarted(true);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("セッション開始に失敗しました");
    }
  };

  const handleEndSession = async () => {
    if (sessionData) {
      await fetch("/api/driver/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionData.sessionId }),
      });
    }
    setIsStarted(false);
    setSessionData(null);
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ドライバー側 - 通話開始</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                お名前
              </label>
              <Input
                type="text"
                placeholder="観光太郎"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <Button
              onClick={handleStartSession}
              className="w-full"
              size="lg"
            >
              通話を開始
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>ドライバー側 - 通話中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>セッションID: {sessionData?.sessionId}</div>
              <div>サポーター: {sessionData?.supporterId}</div>
              <div className="flex items-center gap-2">
                接続状態:
                {webrtc.isConnected ? (
                  <span className="text-green-600 font-bold">✓ 接続中</span>
                ) : (
                  <span className="text-yellow-600">接続中...</span>
                )}
              </div>
              {webrtc.error && (
                <div className="text-red-600">エラー: {webrtc.error}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <VideoPlayer
            stream={webrtc.localStream}
            muted={true}
            label="自分の映像（プレビュー）"
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleEndSession}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              通話を終了
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
