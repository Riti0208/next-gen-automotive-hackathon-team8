import { createOpenAI } from '@ai-sdk/openai';

export const qwen = createOpenAI({
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY,
});
