import { SupporterMap } from "@/components/supporter-map";

// 動的レンダリングを強制（WebRTC/Supabaseを使用するため）
export const dynamic = "force-dynamic";

export default function SupporterPage() {
  return (
    <main className="flex h-screen flex-col">
      <SupporterMap />
    </main>
  );
}
