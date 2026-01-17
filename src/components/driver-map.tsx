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
import { Phone } from "lucide-react";

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 35.6812,
  lng: 139.7671,
};

const NAVIGATION_ZOOM_LEVEL = 18; // カーナビ用ズームレベル

interface Location {
  lat: number;
  lng: number;
}

interface RouteInfo {
  distance: string;
  duration: string;
  steps: google.maps.DirectionsStep[];
}

export function DriverMap() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Google Maps API ロード状態のログ出力
  useEffect(() => {
    if (isLoaded) {
      console.log("[Google Maps API] Maps JavaScript API loaded successfully");
    }
    if (loadError) {
      console.error("[Google Maps API] Failed to load Maps JavaScript API:", loadError);
    }
  }, [isLoaded, loadError]);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [destination, setDestination] = useState<string>("");
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const watchIdRef = useRef<number | null>(null);

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

  // 現在地を常に追跡
  useEffect(() => {
    if (!navigator.geolocation) return;

    console.log("[Geolocation] Starting position watch...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        console.log("[Geolocation] Position updated:", location);
        setCurrentLocation(location);
      },
      (err) => {
        console.error("[Geolocation] Watch position error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        console.log("[Geolocation] Stopping position watch");
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // 現在地が更新されたらマップを追従
  useEffect(() => {
    if (map && currentLocation) {
      map.panTo(currentLocation);
    }
  }, [map, currentLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      console.log("[Google Maps API] Places Autocomplete initialized");
      autocompleteRef.current = autocomplete;
    },
    []
  );

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (!place) {
        console.log("[Google Maps API] Places Autocomplete - no place returned");
        return;
      }
      console.log("[Google Maps API] Places Autocomplete - place selected:", {
        name: place.name,
        formatted_address: place.formatted_address,
        place_id: place.place_id,
      });
      if (place.formatted_address) {
        setDestination(place.formatted_address);
      } else if (place.name) {
        setDestination(place.name);
      }
    }
  }, []);

  // 経路検索
  const searchRoute = useCallback(async () => {
    if (!currentLocation || !destination) {
      setError("現在地と目的地を設定してください");
      return;
    }

    setIsLoadingRoute(true);
    setError(null);

    const directionsService = new google.maps.DirectionsService();

    console.log("[Google Maps API] Directions API - requesting route:", {
      origin: currentLocation,
      destination: destination,
      travelMode: "DRIVING",
    });

    try {
      const result = await directionsService.route({
        origin: currentLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        language: "ja",
      });

      console.log("[Google Maps API] Directions API - route received:", {
        status: result.request,
        routesCount: result.routes.length,
        distance: result.routes[0]?.legs[0]?.distance?.text,
        duration: result.routes[0]?.legs[0]?.duration?.text,
      });

      setDirections(result);

      if (result.routes[0]?.legs[0]) {
        const leg = result.routes[0].legs[0];
        setRouteInfo({
          distance: leg.distance?.text || "",
          duration: leg.duration?.text || "",
          steps: leg.steps || [],
        });
        // 目的地の座標を保存
        if (leg.end_location) {
          setDestinationLocation({
            lat: leg.end_location.lat(),
            lng: leg.end_location.lng(),
          });
        }
      }
    } catch (err) {
      console.error("経路検索エラー:", err);
      setError("経路を検索できませんでした。目的地を確認してください。");
    } finally {
      setIsLoadingRoute(false);
    }
  }, [currentLocation, destination]);

  // 経路クリア
  const clearRoute = useCallback(() => {
    setDirections(null);
    setRouteInfo(null);
    setDestinationLocation(null);
    setDestination("");
    setError(null);
  }, []);

  // マーカークリックでカーナビ用ズームレベルに拡大
  const zoomToLocation = useCallback((location: Location) => {
    if (map) {
      map.panTo(location);
      map.setZoom(NAVIGATION_ZOOM_LEVEL);
    }
  }, [map]);

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

  return (
    <div className="relative flex h-full w-full">
      {/* 地図を全画面表示 */}
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={currentLocation || defaultCenter}
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
          {/* 現在地マーカー (A地点) - クリックでカーナビズームに */}
          {currentLocation && (
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
              title="現在地をタップでカーナビモード"
              onClick={() => zoomToLocation(currentLocation)}
            />
          )}

          {/* 目的地マーカー (B地点) - クリックでカーナビズームに */}
          {destinationLocation && directions && (
            <Marker
              position={destinationLocation}
              label={{
                text: "G",
                color: "#ffffff",
                fontWeight: "bold",
              }}
              title="目的地をタップでカーナビモード"
              onClick={() => zoomToLocation(destinationLocation)}
            />
          )}

          {/* 経路表示 - マーカーは自前で表示するため非表示に */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: "#4285F4",
                  strokeWeight: 5,
                  strokeOpacity: 0.8,
                },
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* オーバーレイ: コントロールパネル */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 z-[1000] flex h-full flex-col p-4">
        {/* 上部: 検索カードまたはナビ情報 */}
        <div className="pointer-events-auto flex w-full flex-col gap-4 lg:w-80">
          {/* 検索カード - 経路表示中は非表示 */}
          {!directions && (
            <Card className="bg-background shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">経路検索</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">
                    現在地
                  </label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
                    {isLoadingLocation
                      ? "取得中..."
                      : currentLocation
                        ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                        : "取得できませんでした"}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">
                    目的地
                  </label>
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{
                      componentRestrictions: { country: "jp" },
                    }}
                  >
                    <Input
                      placeholder="目的地を入力..."
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </Autocomplete>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  onClick={searchRoute}
                  disabled={!destination || isLoadingRoute}
                  className="w-full"
                >
                  {isLoadingRoute ? "検索中..." : "経路検索"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 経路表示中: コンパクトな情報表示 */}
          {directions && routeInfo && (
            <Card className="bg-background/95 shadow-lg backdrop-blur">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex gap-4 text-sm">
                  <span className="font-medium">{routeInfo.distance}</span>
                  <span className="text-muted-foreground">{routeInfo.duration}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearRoute}>
                  終了
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 下部: コールボタン - 経路表示中のみ */}
        {directions && (
          <div className="pointer-events-auto fixed bottom-8 left-1/2 z-[10000] -translate-x-1/2">
            <Button
              size="lg"
              className="h-16 gap-3 rounded-full bg-green-500 px-10 text-xl font-bold text-white shadow-2xl hover:bg-green-600"
            >
              <Phone className="h-7 w-7" />
              コールする
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
