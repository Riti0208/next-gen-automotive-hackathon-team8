import { Agent } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { getRequiredEnv } from '@/lib/env';

const storage = new PostgresStore({
  connectionString: getRequiredEnv('DATABASE_URL'),
});

const memory = new Memory({
  storage,
});

export const assistantAgent = new Agent({
  name: 'assistant',
  instructions: `あなたは親切で有能なAIアシスタントです。
ユーザーの質問に対して、正確で分かりやすい回答を提供してください。
常に丁寧で、専門的な対応を心がけてください。`,
  model: 'alibaba/qwen-plus',
  memory,
});
