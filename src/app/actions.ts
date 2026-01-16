"use server";

import { mastra } from "@/mastra";

type GenerateResponseResult =
  | { success: true; text: string }
  | { success: false; error: string };

export async function generateResponse(
  prompt: string
): Promise<GenerateResponseResult> {
  try {
    const agent = mastra.getAgent("assistant");
    const result = await agent.generate(prompt);
    return { success: true, text: result.text };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("Agent generation error:", errorMessage, error);

    // 開発環境では詳細なエラーメッセージを返す
    if (process.env.NODE_ENV === "development") {
      return { success: false, error: `エラー: ${errorMessage}` };
    }

    return { success: false, error: "応答の生成に失敗しました" };
  }
}
