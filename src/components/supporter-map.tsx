"use client";

import { useState, useCallback, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Clock, MapPin, Phone, X, TestTube2 } from "lucide-react";

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];

const containerStyle = {
  width: "100%",
  height: "100%",
};

// 秩父市の中心座標
const CHICHIBU_CENTER = {
  lat: 35.9913,
  lng: 139.0858,
};

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
  heading: number; // 0-360度、0が北
}

interface CallRequest {
  driver: Driver;
  timestamp: Date;
  destination?: string;
}

// モックドライバーデータ（秩父中心付近に適度に分散）
const mockDrivers: Driver[] = [
  {
    id: "D001",
    name: "田中 太郎",
    location: { lat: 35.9945, lng: 139.0805 },
    status: "available",
    lastUpdate: "1分前",
    heading: 45,
  },
  {
    id: "D002",
    name: "佐藤 花子",
    location: { lat: 35.9875, lng: 139.0920 },
    status: "busy",
    currentTask: "西武秩父駅 → 三峯神社",
    lastUpdate: "3分前",
    heading: 270,
  },
  {
    id: "D003",
    name: "鈴木 一郎",
    location: { lat: 35.9960, lng: 139.0890 },
    status: "available",
    lastUpdate: "2分前",
    heading: 180,
  },
  {
    id: "D004",
    name: "高橋 次郎",
    location: { lat: 35.9855, lng: 139.0780 },
    status: "busy",
    currentTask: "秩父神社 → 長瀞駅",
    lastUpdate: "5分前",
    heading: 0,
  },
  {
    id: "D005",
    name: "渡辺 美咲",
    location: { lat: 35.9930, lng: 139.0950 },
    status: "offline",
    lastUpdate: "30分前",
    heading: 90,
  },
  {
    id: "D006",
    name: "伊藤 健太",
    location: { lat: 35.9880, lng: 139.0830 },
    status: "available",
    lastUpdate: "1分前",
    heading: 315,
  },
];

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
  const [drivers] = useState<Driver[]>(mockDrivers);
  const [incomingCall, setIncomingCall] = useState<CallRequest | null>(null);

  useEffect(() => {
    if (isLoaded) {
      console.log("[Supporter Map] Google Maps API loaded successfully");
    }
    if (loadError) {
      console.error("[Supporter Map] Failed to load Maps API:", loadError);
    }
  }, [isLoaded, loadError]);

  const onLoad = useCallback(() => {
    console.log("[Supporter Map] Map initialized with center:", CHICHIBU_CENTER);
  }, []);

  const onUnmount = useCallback(() => {
    console.log("[Supporter Map] Map unmounted");
  }, []);

  const handleMarkerClick = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
  }, []);

  // テストコールをトリガー
  const triggerTestCall = useCallback(() => {
    const availableDrivers = drivers.filter(d => d.status === "available");
    if (availableDrivers.length === 0) return;

    const randomDriver = availableDrivers[Math.floor(Math.random() * availableDrivers.length)];
    const destinations = ["三峯神社", "秩父神社", "長瀞駅", "西武秩父駅", "羊山公園"];
    const randomDestination = destinations[Math.floor(Math.random() * destinations.length)];

    setIncomingCall({
      driver: randomDriver,
      timestamp: new Date(),
      destination: randomDestination,
    });
  }, [drivers]);

  // コールを閉じる
  const dismissCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // コールに応答
  const acceptCall = useCallback(() => {
    console.log("[Supporter] Call accepted:", incomingCall);
    setIncomingCall(null);
  }, [incomingCall]);

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
      {/* 地図を全画面表示 */}
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={CHICHIBU_CENTER}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            draggable: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            gestureHandling: "none",
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
              },
            ],
          }}
        >
          {/* 中心地マーカー */}
          <Marker
            position={CHICHIBU_CENTER}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              strokeColor: "#3b82f6",
              strokeWeight: 2,
            }}
            title="モニター中心（秩父）"
          />

          {/* ドライバーマーカー（車アイコン） */}
          {drivers.map((driver) => (
            <Marker
              key={driver.id}
              position={driver.location}
              icon={{
                // 車の形のSVGパス（上向きが基準）
                path: "M-8,-12 L8,-12 L10,-6 L10,8 L8,12 L-8,12 L-10,8 L-10,-6 Z M-6,-10 L-6,-4 L6,-4 L6,-10 Z M-6,2 L-6,8 L-2,8 L-2,2 Z M2,2 L2,8 L6,8 L6,2 Z",
                fillColor: statusColors[driver.status].fill,
                fillOpacity: 1,
                strokeColor: statusColors[driver.status].stroke,
                strokeWeight: 2,
                scale: 1.2,
                rotation: driver.heading,
                anchor: new google.maps.Point(0, 0),
              }}
              title={`${driver.name} (${statusColors[driver.status].label})`}
              onClick={() => handleMarkerClick(driver)}
            />
          ))}

          {/* 選択されたドライバーの情報ウィンドウ */}
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
                  {selectedDriver.currentTask && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{selectedDriver.currentTask}</span>
                    </div>
                  )}
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

      {/* オーバーレイ: ステータスパネル */}
      <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col p-4">
        {/* 上部: タイトルとステータス */}
        <div className="pointer-events-auto flex w-full flex-col gap-4 lg:w-96">
          <Card className="bg-background/95 shadow-lg backdrop-blur">
            <CardContent className="p-4">
              <h2 className="mb-3 text-lg font-bold">ドライバーモニター</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                <MapPin className="mr-1 inline h-4 w-4" />
                秩父エリア
              </p>

              {/* ステータス一覧 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-green-100 p-2 text-center dark:bg-green-900/50">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{counts.available}</div>
                  <div className="text-xs text-green-700 dark:text-green-300">空車</div>
                </div>
                <div className="rounded-lg bg-amber-100 p-2 text-center dark:bg-amber-900/50">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.busy}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300">運行中</div>
                </div>
                <div className="rounded-lg bg-gray-200 p-2 text-center dark:bg-gray-700/50">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{counts.offline}</div>
                  <div className="text-xs text-gray-700 dark:text-gray-400">オフライン</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* テストボタン（右下） */}
      <div className="pointer-events-auto absolute bottom-6 right-6 z-[1001]">
        <Button
          onClick={triggerTestCall}
          className="gap-2 bg-purple-600 text-white shadow-lg hover:bg-purple-700"
        >
          <TestTube2 className="h-5 w-5" />
          テストコール
        </Button>
      </div>

      {/* コール着信ポップアップ */}
      {incomingCall && (
        <div className="pointer-events-auto absolute inset-0 z-[2000] flex items-center justify-center bg-black/50">
          <Card className="mx-4 w-full max-w-md animate-pulse border-4 border-green-500 bg-white text-gray-900 shadow-2xl">
            <CardContent className="p-6">
              {/* ヘッダー */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <Phone className="h-6 w-6 animate-bounce" />
                  <span className="text-lg font-bold">着信中</span>
                </div>
                <button
                  onClick={dismissCall}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* ドライバー情報 */}
              <div className="mb-4 rounded-lg bg-gray-100 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Car className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{incomingCall.driver.name}</div>
                    <div className="text-sm text-gray-600">ID: {incomingCall.driver.id}</div>
                  </div>
                </div>

                {incomingCall.destination && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>行き先: <strong>{incomingCall.destination}</strong></span>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{incomingCall.timestamp.toLocaleTimeString("ja-JP")}</span>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-3">
                <Button
                  onClick={dismissCall}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  後で対応
                </Button>
                <Button
                  onClick={acceptCall}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  応答する
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
