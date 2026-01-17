import { Mastra } from '@mastra/core';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { assistantAgent } from './agents/assistant';

export const mastra = new Mastra({
  agents: {
    assistant: assistantAgent,
  },
});

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});