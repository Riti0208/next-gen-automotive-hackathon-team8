import { DriverMap } from "@/components/driver-map";
import type { Metadata, Viewport } from "next";

// 動的レンダリングを強制（WebRTC/Supabaseを使用するため）
export const dynamic = "force-dynamic";

// スマホ専用のviewport設定
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "ドライバー画面 | 観光ナビ",
  description: "観光客ドライバー向けナビゲーション画面",
};

export default function DriverPage() {
  return (
    <main className="flex h-screen flex-col">
      <DriverMap />
    </main>
  );
}
