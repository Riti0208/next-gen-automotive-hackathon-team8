import { DriverMap } from "@/components/driver-map";

// 動的レンダリングを強制（WebRTC/Supabaseを使用するため）
export const dynamic = "force-dynamic";

export default function DriverPage() {
  return (
    <main className="flex h-screen flex-col">
      <DriverMap />
    </main>
  );
}
