"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, MapPin, X, Navigation } from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoPlayer } from "@/components/video-player";
import { createRealtimeService } from "@/lib/services/realtimeService";

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];

const containerStyle = {
  width: "100%",
  height: "100%",
};

// 札幌周辺の駐車場の座標 (例: タイムズステーション札幌駅前付近)
const SAPPORO_PARKING_LOCATION = {
  lat: 43.0696,
  lng: 141.3514,
};

const NAVIGATION_ZOOM_LEVEL = 18;

interface Location {
  lat: number;
  lng: number;
}

interface RouteInfo {
  distance: string;
  duration: string;
  steps: google.maps.DirectionsStep[];
}

interface CustomPin {
  id: string;
  location: Location;
  label: string;
}

export function DriverMap() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 現在地を札幌の駐車場に固定
  const [currentLocation] = useState<Location>(SAPPORO_PARKING_LOCATION);

  const [destination, setDestination] = useState<string>("");
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    supporterId: string;
    driverId: string;
  } | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // WebRTC connection
  const { localStream, remoteStream, isConnected } = useWebRTC({
    sessionId: activeSession?.sessionId || "",
    myId: activeSession?.driverId || "driver_001",
    peerId: activeSession?.supporterId || "",
    isInitiator: true,
    videoEnabled: true, // ドライバーはビデオ送信
  });

  // 現在地を取得（初回のみ）
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("このブラウザでは位置情報がサポートされていません");
      setIsLoadingLocation(false);
      return;
    }

    console.log("[Geolocation] Requesting current position...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        console.log("[Geolocation] Current position obtained:", location);
        setCurrentLocation(location);
        setIsLoadingLocation(false);
      },
      (err) => {
        console.error("[Geolocation] Failed to get position:", err);
        setCurrentLocation(defaultCenter);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const [customPins, setCustomPins] = useState<CustomPin[]>([]);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinLocationInput, setPinLocationInput] = useState("");
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  const [customPinDirections, setCustomPinDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoadingCustomPinRoute, setIsLoadingCustomPinRoute] = useState(false);

  // 初回ロード時に地図の中心を固定位置に合わせる
  useEffect(() => {
    if (map) {
      map.panTo(SAPPORO_PARKING_LOCATION);
    }
  }, [map]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
    },
    []
  );

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      // Safety check: Ensure place and necessary properties exist
      if (!place || !place.geometry) {
        console.log("No details available for input: '" + place?.name + "'");
        return;
      }

      if (place.formatted_address) {
        setDestination(place.formatted_address);
      } else if (place.name) {
        setDestination(place.name);
      }
    }
  }, []);

  const searchRoute = useCallback(async () => {
    if (!destination) {
      setError("目的地を設定してください");
      return;
    }

    setIsLoadingRoute(true);
    setError(null);

    const directionsService = new google.maps.DirectionsService();

    try {
      const result = await directionsService.route({
        origin: currentLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        language: "ja",
      });

      setDirections(result);

      if (result.routes[0]?.legs[0]) {
        const leg = result.routes[0].legs[0];
        setRouteInfo({
          distance: leg.distance?.text || "",
          duration: leg.duration?.text || "",
          steps: leg.steps || [],
        });
        if (leg.end_location) {
          setDestinationLocation({
            lat: leg.end_location.lat(),
            lng: leg.end_location.lng(),
          });
        }
      }
    } catch (err) {
      console.error("経路検索エラー:", err);
      setError("経路を検索できませんでした。");
    } finally {
      setIsLoadingRoute(false);
    }
  }, [currentLocation, destination]);

  const clearRoute = useCallback(() => {
    setDirections(null);
    setRouteInfo(null);
    setDestinationLocation(null);
    setDestination("");
    setError(null);
  }, []);

  const zoomToLocation = useCallback((location: Location) => {
    if (map) {
      map.panTo(location);
      map.setZoom(NAVIGATION_ZOOM_LEVEL);
    }
  }, [map]);

  // コール開始
  const startCall = useCallback(async () => {
    // 固定セッションIDを使用（デモ用）
    const sessionId = "demo-session-001";

    // Realtime経由で着信リクエストを送信
    const realtimeService = createRealtimeService();
    realtimeService.subscribeToSession(sessionId);
    await realtimeService.subscribe();

    await realtimeService.broadcastCallRequest(
      "driver_001",
      "観光太郎",
      destination || undefined
    );

    console.log("[Driver] Call request sent");

    setActiveSession({
      sessionId,
      supporterId: "supporter_001",
      driverId: "driver_001", // ドライバーIDを追加
    });

    // チャンネルをクリーンアップ（WebRTC接続が確立するまで十分な時間を待つ）
    // ICE候補の交換が完了するまで接続を維持
  }, [destination]);

  // コール終了
  const endCall = useCallback(async () => {
    if (activeSession) {
      try {
        await fetch("/api/driver/end-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession.sessionId }),
        });
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    }
    setActiveSession(null);
  }, [activeSession]);

  // コール開始
  const startCall = useCallback(async () => {
    // 固定セッションIDを使用（デモ用）
    const sessionId = "demo-session-001";

    // Realtime経由で着信リクエストを送信
    const realtimeService = createRealtimeService();
    realtimeService.subscribeToSession(sessionId);
    await realtimeService.subscribe();

    await realtimeService.broadcastCallRequest(
      "driver_001",
      "観光太郎",
      destination || undefined
    );

    console.log("[Driver] Call request sent");

    setActiveSession({
      sessionId,
      supporterId: "supporter_001",
      driverId: "driver_001", // ドライバーIDを追加
    });

    // チャンネルをクリーンアップ（WebRTC接続が確立するまで十分な時間を待つ）
    // ICE候補の交換が完了するまで接続を維持
  }, [destination]);

  // コール終了
  const endCall = useCallback(async () => {
    if (activeSession) {
      try {
        await fetch("/api/driver/end-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession.sessionId }),
        });
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    }
    setActiveSession(null);
  }, [activeSession]);

  const addPinFromAddress = useCallback(async () => {
    if (!pinLocationInput.trim()) {
      setGeocodingError("場所を入力してください");
      return;
    }

    setIsGeocodingLoading(true);
    setGeocodingError(null);

    const geocoder = new google.maps.Geocoder();

    try {
      const result = await geocoder.geocode({
        address: pinLocationInput,
        region: "jp",
      });

      if (result.results.length === 0) {
        setGeocodingError("場所が見つかりませんでした");
        return;
      }

      const location = result.results[0].geometry.location;
      const newPin: CustomPin = {
        id: Date.now().toString(),
        location: {
          lat: location.lat(),
          lng: location.lng(),
        },
        label: pinLocationInput,
      };

      setCustomPins([newPin]);
      setCustomPinDirections(null);
      setPinLocationInput("");
      setIsPinDialogOpen(false);
    } catch (err) {
      setGeocodingError("場所の検索に失敗しました");
    } finally {
      setIsGeocodingLoading(false);
    }
  }, [pinLocationInput]);

  const removeCustomPin = useCallback((pinId: string) => {
    setCustomPins((prev) => prev.filter((pin) => pin.id !== pinId));
    setCustomPinDirections(null);
  }, []);

  const searchRouteToCustomPin = useCallback(async () => {
    if (customPins.length === 0) return;

    setIsLoadingCustomPinRoute(true);
    const directionsService = new google.maps.DirectionsService();
    const targetPin = customPins[0];

    try {
      const result = await directionsService.route({
        origin: currentLocation,
        destination: targetPin.location,
        travelMode: google.maps.TravelMode.DRIVING,
        language: "ja",
      });
      setCustomPinDirections(result);
    } catch (err) {
      console.error("カスタムピン経路エラー:", err);
    } finally {
      setIsLoadingCustomPinRoute(false);
    }
  }, [currentLocation, customPins]);

  const clearCustomPinRoute = useCallback(() => {
    setCustomPinDirections(null);
  }, []);

  if (loadError) return <div className="p-4 text-destructive">Google Mapsの読み込みに失敗しました</div>;
  if (!isLoaded) return <div className="p-4 text-muted-foreground">地図を読み込み中...</div>;

  return (
    <div className="relative flex h-full w-full">
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={currentLocation}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          <Marker
            position={currentLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            }}
            title="固定された現在地"
            onClick={() => zoomToLocation(currentLocation)}
          />

          {destinationLocation && directions && (
            <Marker
              position={destinationLocation}
              label={{ text: "G", color: "#ffffff", fontWeight: "bold" }}
              onClick={() => zoomToLocation(destinationLocation)}
            />
          )}

          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: { strokeColor: "#4285F4", strokeWeight: 5, strokeOpacity: 0.8 },
              }}
            />
          )}

          {customPins.map((pin) => (
            <Marker
              key={pin.id}
              position={pin.location}
              icon={{
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: "#E91E63",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
              title={pin.label}
              onClick={() => removeCustomPin(pin.id)}
            />
          ))}

          {customPinDirections && (
            <DirectionsRenderer
              directions={customPinDirections}
              options={{
                suppressMarkers: true,
                polylineOptions: { strokeColor: "#E91E63", strokeWeight: 4, strokeOpacity: 0.7 },
              }}
            />
          )}
        </GoogleMap>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col p-4">
        <div className="pointer-events-auto flex w-full flex-col gap-4 lg:w-80">
          {!directions ? (
            <Card className="bg-background shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">経路検索 (テスト用固定位置)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">出発地点 (固定)</label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
                    札幌駅
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">目的地</label>
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{
                      componentRestrictions: { country: "jp" },
                      fields: ["formatted_address", "geometry", "name"] // Only get what you use
                    }}
                  >
                    <Input
                      placeholder="目的地を入力..."
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </Autocomplete>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button onClick={searchRoute} disabled={!destination || isLoadingRoute} className="w-full">
                  {isLoadingRoute ? "検索中..." : "経路検索"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-background/95 shadow-lg backdrop-blur">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex gap-4 text-sm">
                  <span className="font-medium">{routeInfo?.distance}</span>
                  <span className="text-muted-foreground">{routeInfo?.duration}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearRoute}>終了</Button>
              </CardContent>
            </Card>
          )}
        </div>

        {directions && (
          <div className="pointer-events-auto fixed bottom-8 left-1/2 z-[10000] -translate-x-1/2">
            {activeSession ? (
              <Button
                size="lg"
                onClick={endCall}
                className="h-16 gap-3 rounded-full bg-red-500 px-10 text-xl font-bold text-white shadow-2xl hover:bg-red-600"
              >
                <PhoneOff className="h-7 w-7" />
                通話終了
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={startCall}
                className="h-16 gap-3 rounded-full bg-green-500 px-10 text-xl font-bold text-white shadow-2xl hover:bg-green-600"
              >
                <Phone className="h-7 w-7" />
                コールする
              </Button>
            )}
          </div>
        )}

        {/* リモートオーディオプレーヤー（音声のみ、非表示） */}
        {remoteStream && (
          <div className="hidden">
            <VideoPlayer stream={remoteStream} muted={false} />
          </div>
        )}

        <div className="pointer-events-auto fixed bottom-8 right-4 z-[10000] flex flex-col gap-3">
          {customPins.length > 0 && (
            customPinDirections ? (
              <Button size="lg" onClick={clearCustomPinRoute} className="h-14 w-14 rounded-full bg-gray-500 p-0 shadow-xl">
                <X className="h-6 w-6" />
              </Button>
            ) : (
              <Button size="lg" onClick={searchRouteToCustomPin} disabled={isLoadingCustomPinRoute} className="h-14 w-14 rounded-full bg-pink-500 p-0 shadow-xl">
                <Navigation className="h-6 w-6" />
              </Button>
            )
          )}
          <Button size="lg" onClick={() => setIsPinDialogOpen(true)} className="h-14 w-14 rounded-full bg-pink-500 p-0 shadow-xl">
            <MapPin className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {isPinDialogOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/50">
          <Card className="mx-4 w-full max-w-md bg-background">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">ピンを追加</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsPinDialogOpen(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="例: 大通公園..."
                value={pinLocationInput}
                onChange={(e) => setPinLocationInput(e.target.value)}
              />
              {geocodingError && <p className="text-sm text-destructive">{geocodingError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsPinDialogOpen(false)} className="flex-1">キャンセル</Button>
                <Button onClick={addPinFromAddress} disabled={!pinLocationInput.trim() || isGeocodingLoading} className="flex-1">
                  {isGeocodingLoading ? "検索中..." : "ピンを立てる"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}