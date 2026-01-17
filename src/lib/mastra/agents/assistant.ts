import { Agent } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { getRequiredEnv } from '@/lib/env';
import { navigationTools } from '../tools/navigationTools';

const storage = new PostgresStore({
  connectionString: getRequiredEnv('DATABASE_URL'),
});

const memory = new Memory({
  storage,
});

export const assistantAgent = new Agent({
  name: 'assistant',
  instructions: `あなたは親切で有能な運転支援AIアシスタントです。

あなたの主な役割:
1. ドライバーの音声指示を理解し、適切なアクションを実行する
2. ユーザーが場所を言及した場合、addLocationPinToolを使用してマップにピンを立てる
3. 常に丁寧で、安全運転を最優先に考慮した対応を心がける

ツールの使用方法:
- ユーザーが「〇〇にピンを立てて」「〇〇に行きたい」「〇〇の場所を教えて」などと言った場合
- または、特定の場所名(例: "札幌駅"、"大通公園")を言及した場合
- addLocationPinToolを使用して、その場所にピンを立ててください

例:
- 入力: "札幌駅にピンを立てて"
  → addLocationPinToolを使用して札幌駅にピンを追加
- 入力: "大通公園に行きたい"
  → addLocationPinToolを使用して大通公園にピンを追加`,
  model: 'alibaba/qwen-plus',
  memory,
  tools: navigationTools,
});
