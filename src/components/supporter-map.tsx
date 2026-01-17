"use client";

import { useState, useCallback, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Clock, MapPin, Phone, X, TestTube2, Video, VideoOff } from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoPlayer } from "@/components/video-player";
import { createRealtimeService } from "@/lib/services/realtimeService";

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];

const containerStyle = {
  width: "100%",
  height: "100%",
};

// 北海道函館市の中心座標（函館市役所付近）
const HAKODATE_CENTER = {
  lat: 41.7687,
  lng: 140.7288,
};

// ドライバーの座標ハードコード
const SAPPORO_PARKING_LOCATION = { lat: 43.0696, lng: 141.3514 };
const HAKODATE_IC_LOCATION = { lat: 41.8394, lng: 140.7375 };
const HAKODATE_DESTINATION = { lat: 41.7684953, lng: 140.7294259 };

// ドライバーのステータス
type DriverStatus = "available" | "busy" | "offline";

interface Driver {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  status: DriverStatus;
  currentTask?: string;
  lastUpdate: string;
  heading: number; // 0-360度
}

interface CallRequest {
  driver: Driver;
  timestamp: Date;
  destination?: string;
}

// ステータスごとの色設定
const statusColors: Record<DriverStatus, { fill: string; stroke: string; label: string }> = {
  available: { fill: "#22c55e", stroke: "#16a34a", label: "空車" },
  busy: { fill: "#f59e0b", stroke: "#d97706", label: "運行中" },
  offline: { fill: "#6b7280", stroke: "#4b5563", label: "オフライン" },
};

export function SupporterMap() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  // モックデータを削除し、空の状態で初期化
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [incomingCall, setIncomingCall] = useState<CallRequest | null>(null);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    driverId: string;
    driverName: string;
  } | null>(null);

  // Realtime通知をリッスン
  useEffect(() => {
    const realtimeService = createRealtimeService();
    const channel = realtimeService.subscribeToSession("demo-session-001");

    realtimeService.onCallRequest((payload) => {
      console.log("[Supporter] Incoming call request:", payload);

      // 着信ポップアップを表示
      setIncomingCall({
        driver: {
          id: payload.driverId,
          name: payload.driverName,
          location: { lat: 0, lng: 0 }, // モック
          status: "available",
          lastUpdate: "今",
          heading: 0,
        },
        timestamp: new Date(payload.timestamp),
        destination: payload.destination,
      });
    });

    realtimeService.subscribe();

    return () => {
      realtimeService.unsubscribe();
    };
  }, []);

  // WebRTC connection
  const { remoteStream, isConnected, endSession } = useWebRTC({
    sessionId: activeSession?.sessionId || "",
    myId: "supporter_001",
    peerId: activeSession?.driverId || "",
    isInitiator: false,
    videoEnabled: false, // サポーターはビデオ送信しない
    onSessionEnded: () => {
      console.log("Session ended by peer");
      setActiveSession(null);
    },
  });

  useEffect(() => {
    if (isLoaded) {
      console.log("[Supporter Map] Google Maps API loaded successfully");
    }
    if (loadError) {
      console.error("[Supporter Map] Failed to load Maps API:", loadError);
    }
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (activeSession && isLoaded) {
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: SAPPORO_PARKING_LOCATION, // スタート
          destination: HAKODATE_DESTINATION, // ゴール
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result); // 経路情報をセット
          }
        }
      );
    } else {
      setDirections(null); // 通話終了時に経路を消去
    }
  }, [activeSession, isLoaded]);

  const onLoad = useCallback(() => {
    console.log("[Supporter Map] Map initialized with center:", HAKODATE_CENTER);
  }, []);

  const onUnmount = useCallback(() => {
    console.log("[Supporter Map] Map unmounted");
  }, []);

  const handleMarkerClick = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
  }, []);

  // テストコール（ドライバーがいる場合のみ動作）
  const triggerTestCall = useCallback(() => {
    const availableDrivers = drivers.filter(d => d.status === "available");
    if (availableDrivers.length === 0) {
      alert("現在、テスト可能な空車ドライバーがいません。");
      return;
    }

    const randomDriver = availableDrivers[Math.floor(Math.random() * availableDrivers.length)];
    const destinations = ["函館山展望台", "五稜郭公園", "金森赤レンガ倉庫", "函館駅", "湯の川温泉"];
    const randomDestination = destinations[Math.floor(Math.random() * destinations.length)];

    setIncomingCall({
      driver: randomDriver,
      timestamp: new Date(),
      destination: randomDestination,
    });
  }, [drivers]);

  const dismissCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;

    console.log("[Supporter] Call accepted:", incomingCall);

    // 固定セッションIDを使用（デモ用）
    setActiveSession({
      sessionId: "demo-session-001",
      driverId: incomingCall.driver.id,
      driverName: incomingCall.driver.name,
    });

    setIncomingCall(null);
  }, [incomingCall]);

  // 通話を終了
  const endCall = useCallback(async () => {
    if (activeSession) {
      try {
        // API呼び出し
        await fetch("/api/driver/end-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession.sessionId }),
        });

        // Realtime経由で終了通知を送信
        await endSession();
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    }
    setActiveSession(null);
  }, [activeSession, endSession]);

  const getDriverCounts = useCallback(() => {
    return {
      available: drivers.filter(d => d.status === "available").length,
      busy: drivers.filter(d => d.status === "busy").length,
      offline: drivers.filter(d => d.status === "offline").length,
      total: drivers.length,
    };
  }, [drivers]);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Google Mapsの読み込みに失敗しました
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">地図を読み込み中...</div>
      </div>
    );
  }

  const counts = getDriverCounts();

  return (
    <div className="relative flex h-full w-full">
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={activeSession ? HAKODATE_IC_LOCATION : HAKODATE_CENTER}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          }}
        >
          {/* A. 経路の描画 (DirectionsRenderer) */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{ 
                preserveViewport: true,
                polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 5 }
              }}
            />
          )}

          {/* B. 通話中のみ表示するドライバーの現在地マーカー */}
          {activeSession && (
            <Marker
              position={HAKODATE_IC_LOCATION}
              icon={{
                path: "M-8,-12 L8,-12 L10,-6 L10,8 L8,12 L-8,12 L-10,8 L-10,-6 Z M-6,-10 L-6,-4 L6,-4 L6,-10 Z", // 車のパス
                fillColor: "#ef4444",
                fillOpacity: 1,
                strokeWeight: 2,
                scale: 1.5,
                rotation: 180, // 進行方向
              }}
            />
          )}

          {/* 函館中心地マーカー */}
          <Marker
            position={HAKODATE_CENTER}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#ef4444",
              fillOpacity: 0.3,
              strokeColor: "#ef4444",
              strokeWeight: 2,
            }}
            title="モニター中心（函館）"
          />

          {/* ドライバーマーカーのレンダリング */}
          {drivers.map((driver) => (
            <Marker
              key={driver.id}
              position={driver.location}
              icon={{
                path: "M-8,-12 L8,-12 L10,-6 L10,8 L8,12 L-8,12 L-10,8 L-10,-6 Z M-6,-10 L-6,-4 L6,-4 L6,-10 Z M-6,2 L-6,8 L-2,8 L-2,2 Z M2,2 L2,8 L6,8 L6,2 Z",
                fillColor: statusColors[driver.status].fill,
                fillOpacity: 1,
                strokeColor: statusColors[driver.status].stroke,
                strokeWeight: 2,
                scale: 1.2,
                rotation: driver.heading,
                anchor: new google.maps.Point(0, 0),
              }}
              onClick={() => handleMarkerClick(driver)}
            />
          ))}

          {selectedDriver && (
            <InfoWindow
              position={selectedDriver.location}
              onCloseClick={() => setSelectedDriver(null)}
            >
              <div className="min-w-[200px] p-2">
                <div className="mb-2 flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  <span className="font-bold">{selectedDriver.name}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: statusColors[selectedDriver.status].fill }}
                    />
                    <span>{statusColors[selectedDriver.status].label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>更新: {selectedDriver.lastUpdate}</span>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* 右上: ビデオ表示 */}
      {activeSession && (
        <div className="pointer-events-auto absolute right-4 top-4 z-[1000]">
          <Card className="w-80 overflow-hidden bg-background/95 shadow-lg backdrop-blur">
            <CardContent className="p-0">
              {/* ビデオプレーヤー */}
              <div className="relative aspect-video bg-gray-900">
                {remoteStream ? (
                  <VideoPlayer
                    stream={remoteStream}
                    muted={false}
                    label=""
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white">
                    <VideoOff className="h-12 w-12" />
                  </div>
                )}
              </div>

              {/* コントロールバー */}
              <div className="flex items-center justify-between bg-gray-800 p-2 text-white">
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4" />
                  <span>{activeSession.driverName}</span>
                  {isConnected && (
                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500" />
                  )}
                </div>
                <Button
                  onClick={endCall}
                  size="sm"
                  variant="destructive"
                  className="h-8"
                >
                  <Phone className="mr-1 h-4 w-4" />
                  終了
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* コール着信ポップアップ（incomingCallがある場合のみ） */}
      {incomingCall && (
        <div className="pointer-events-auto absolute inset-0 z-[2000] flex items-center justify-center bg-black/50">
          <Card className="mx-4 w-full max-w-md animate-pulse border-4 border-green-500 bg-white text-gray-900 shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <Phone className="h-6 w-6 animate-bounce" />
                  <span className="text-lg font-bold">着信中</span>
                </div>
                <button onClick={dismissCall} className="rounded-full p-1 text-gray-500 hover:bg-gray-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-4 rounded-lg bg-gray-100 p-4">
                <div className="text-lg font-bold">{incomingCall.driver.name}</div>
                <div className="text-sm text-gray-600">目的地: {incomingCall.destination}</div>
              </div>
              <div className="flex gap-3">
                <Button onClick={dismissCall} variant="outline" className="flex-1">後で</Button>
                <Button onClick={acceptCall} className="flex-1 bg-green-600 text-white">応答</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}