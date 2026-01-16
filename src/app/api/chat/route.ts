import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/lib/services/chatService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "メッセージが必要です" },
        { status: 400 }
      );
    }

    const text = await ChatService.generateResponse(message);

    return NextResponse.json({
      success: true,
      text,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("Chat API error:", errorMessage, error);

    // 開発環境では詳細なエラーメッセージを返す
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { success: false, error: `エラー: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: "応答の生成に失敗しました" },
      { status: 500 }
    );
  }
}
