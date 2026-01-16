# Next-Gen Automotive Hackathon

Next.js + Mastra + Qwen (DashScope) によるAIエージェント実装プロジェクト

## 技術スタック

- **Frontend/Backend**: Next.js 16 (App Router)
- **AI**: Mastra + Qwen (DashScope API)
- **Database**: PostgreSQL + Prisma
- **UI**: shadcn/ui + Tailwind CSS v4
- **Deploy**: Vercel

## セットアップ

### 1. 環境変数の設定

`.env.local`ファイルを作成：

```bash
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

APIキーは [DashScope Console](https://dashscope.console.aliyun.com/) から取得

### 2. 起動

```bash
docker compose up -d
```

→ http://localhost:3000

### 3. データベース管理

```bash
# Seeding（サンプルデータ投入）
docker exec car-ai-app pnpm db:seed

# DB GUI表示
pnpm db:studio

# Migration作成
npx prisma migrate dev --name your_migration_name
```

## プロジェクト構造

```
src/
├── app/
│   ├── api/              # API Routes（ルーティング）
│   └── (pages)/          # UIページ
├── lib/
│   ├── services/         # ビジネスロジック
│   ├── mastra/           # AI設定
│   └── env.ts, utils.ts  # ユーティリティ
└── components/           # UIコンポーネント
```

## デプロイ

1. GitHubにプッシュ
2. [Vercel](https://vercel.com) でインポート
3. Vercel Postgresを作成（Storage → Create Database）
4. 環境変数 `DASHSCOPE_API_KEY` を設定

以降、mainブランチへのプッシュで自動デプロイ

## よく使うコマンド

```bash
# コンテナ起動/停止
docker compose up -d
docker compose down

# ログ確認
docker compose logs -f app

# コンテナ内でコマンド実行
docker exec car-ai-app pnpm db:seed
```
