import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedUsers() {
  console.log('Seeding users...');

  // サンプルユーザーを作成
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        email: 'alice@example.com',
        name: 'Alice',
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        email: 'bob@example.com',
        name: 'Bob',
      },
    }),
    prisma.user.upsert({
      where: { email: 'charlie@example.com' },
      update: {},
      create: {
        email: 'charlie@example.com',
        name: 'Charlie',
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);
  return users;
}

// 直接実行された場合
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('Seeding completed');
      prisma.$disconnect();
    })
    .catch((e) => {
      console.error('Seeding failed:', e);
      prisma.$disconnect();
      process.exit(1);
    });
}
