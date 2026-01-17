"use client";

import { useState, useEffect } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoPlayer } from "@/components/video-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Session {
  id: string;
  driver: { name: string };
  status: string;
  startedAt: string;
}

export default function SupporterRTCPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);

  const webrtc = useWebRTC({
    sessionId: selectedSession?.id || "",
    myId: "supporter_001",
    peerId: `driver_${selectedSession?.driver?.name || ""}`,
    isInitiator: false,
    videoEnabled: false, // サポーターはビデオ送信なし
  });

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/supporter/sessions");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const handleAcceptCall = async (session: Session) => {
    try {
      await fetch("/api/supporter/accept-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          supporterId: "supporter_001",
        }),
      });

      setSelectedSession(session);
      setIsAccepted(true);
    } catch (error) {
      console.error("Failed to accept call:", error);
      alert("コール応答に失敗しました");
    }
  };

  const handleEndCall = () => {
    setSelectedSession(null);
    setIsAccepted(false);
  };

  if (!isAccepted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>サポーター側 - 待機中</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 mb-4">
                着信を待っています...
              </div>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  現在、アクティブなセッションはありません
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <Card key={session.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="font-bold">
                            {session.driver.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            セッションID: {session.id.slice(0, 8)}...
                          </div>
                          <div className="text-sm text-gray-600">
                            ステータス: {session.status}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAcceptCall(session)}
                          size="lg"
                        >
                          応答
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>サポーター側 - 通話中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>ドライバー: {selectedSession?.driver.name}</div>
              <div>セッションID: {selectedSession?.id}</div>
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
            stream={webrtc.remoteStream}
            muted={false}
            label="ドライバーの映像"
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                音声通話が有効です（双方向）
              </div>
              <Button
                onClick={handleEndCall}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                通話を終了
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
