"use client";

import { useEffect, useRef } from "react";
import { Card } from "./ui/card";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  label: string;
}

export function VideoPlayer({ stream, muted = false, label }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`[VideoPlayer] Setting stream for ${label}:`, stream.getTracks());
      videoRef.current.srcObject = stream;
    }
  }, [stream, label]);

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-gray-900 aspect-video">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📹</div>
              <div>{label}</div>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-sm">
          {label}
        </div>
      </div>
    </Card>
  );
}
