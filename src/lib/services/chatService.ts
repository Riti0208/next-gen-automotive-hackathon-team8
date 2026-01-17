import { mastra } from '@/lib/mastra';

export interface ChatResponse {
  text: string;
  toolCalls?: Array<{
    toolName: string;
    input: any;
    output: any;
  }>;
}

export class ChatService {
  /**
   * Mastraエージェントを使用してメッセージを処理し、レスポンスを生成
   * @param message - ユーザーからのメッセージ
   * @returns エージェントのレスポンスとツール実行結果
   */
  static async generateResponse(message: string): Promise<ChatResponse> {
    const agent = mastra.getAgent('assistant');
    const result = await agent.generate(message);

    console.log('[ChatService] Full result:', JSON.stringify(result, null, 2));
    console.log('[ChatService] result.toolCalls:', result.toolCalls);

    // ツール実行結果を抽出
    const toolCalls =
      result.toolCalls?.map((call: any) => {
        console.log('[ChatService] Processing tool call:', call);
        console.log('[ChatService] call keys:', Object.keys(call));
        return {
          toolName: call.payload?.toolName,
          input: call.payload?.args,
          output: call.payload?.result,
        };
      }) || [];

    console.log('[ChatService] Mapped toolCalls:', toolCalls);

    return {
      text: result.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * レガシー互換性のため、テキストのみを返すメソッド
   * @deprecated generateResponse を使用してください
   */
  static async generateText(message: string): Promise<string> {
    const response = await this.generateResponse(message);
    return response.text;
  }
}
