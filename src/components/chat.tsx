"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const result = await response.json();

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.text },
        ]);
      } else {
        const errorMessage = result.error || "申し訳ございません。エラーが発生しました。";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMessage },
        ]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "応答の取得に失敗しました。";
      console.error("Chat error:", errorMessage, error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `エラーが発生しました: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex h-[600px] w-full max-w-2xl flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">自動車 AI アシスタント</h2>
        <p className="text-sm text-muted-foreground">
          Qwen × Mastra で動作
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p>AI アシスタントとの会話を始めましょう</p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2">
                <p className="text-sm text-muted-foreground">考え中...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="自動車について質問してください..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            送信
          </Button>
        </div>
      </form>
    </Card>
  );
}
