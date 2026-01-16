import { Chat } from "@/components/chat";

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">AI アシスタント</h1>
        <p className="text-sm text-muted-foreground">自動車に関する質問にお答えします</p>
      </div>
      <Chat />
    </div>
  );
}
