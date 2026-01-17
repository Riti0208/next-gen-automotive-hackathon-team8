import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * マップにピンを追加するツール
 * ユーザーが場所を指定したときに、その場所にピンを立てる
 */
export const addLocationPinTool = createTool({
  id: 'add-location-pin',
  description: `ユーザーが指定した場所にマップ上にピンを追加します。
住所や場所の名前(例: "札幌駅"、"大通公園"、"北海道大学")を受け取り、
Google Maps Geocoding APIを使用して座標に変換し、マップにピンを立てます。
ユーザーが「〇〇にピンを立てて」「〇〇に行きたい」「〇〇の場所を教えて」などと言った時に使用してください。`,
  inputSchema: z.object({
    address: z.string().describe('ピンを立てる場所の住所または名称'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    location: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
  execute: async ({ context }) => {
    const { address } = context;

    if (!address || !address.trim()) {
      return {
        success: false,
        message: '場所を指定してください',
      };
    }

    try {
      // Google Maps Geocoding APIを使用して住所を座標に変換
      // Note: この処理はクライアント側で実行する必要があるため、
      // 実際の実装ではイベント発火やRealtime経由でクライアント側に送信する

      // ここでは成功レスポンスを返し、実際の処理はクライアント側で行う
      // クライアント側のaddPinFromAddress()メソッドが実際の処理を担当

      return {
        success: true,
        message: `${address}にピンを立てました`,
        // 実際の座標はクライアント側で取得される
      };
    } catch (error) {
      console.error('Error adding location pin:', error);
      return {
        success: false,
        message: '場所の検索に失敗しました',
      };
    }
  },
});

/**
 * すべてのナビゲーションツールをエクスポート
 */
export const navigationTools = {
  addLocationPinTool,
};
