"use client";

import { useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const defaultCenter = {
  lat: 41.7687,
  lng: 140.7288,
};

export default function PickLocationPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [copied, setCopied] = useState(false);
  const [lastClick, setLastClick] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const text = `{ lat: ${lat}, lng: ${lng} }`;

    setLastClick({ lat, lng });
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={14}
        onClick={handleMapClick}
      />
      {copied && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded bg-black/80 px-4 py-2 text-white">
          コピーしました: {`{ lat: ${lastClick?.lat}, lng: ${lastClick?.lng} }`}
        </div>
      )}
    </div>
  );
}
