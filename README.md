# Next-Gen Automotive Hackathon

Next.js + Mastra + Qwen (DashScope) によるAIエージェント実装プロジェクト

## 技術スタック

- **Frontend/Backend**: Next.js 15 (App Router + Server Actions)
- **AI Agent Framework**: Mastra
- **LLM**: Qwen (DashScope API)
- **Database**: PostgreSQL (ローカル: Docker Compose / 本番: Vercel Postgres)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Deploy**: Vercel

## セットアップ手順

### 1. 環境変数の設定

`.env.local`ファイルを作成し、DashScope APIキーを設定：

```bash
# DashScope API Key
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

DashScope APIキーは [https://dashscope.console.aliyun.com/](https://dashscope.console.aliyun.com/) から取得してください。

### 2. Dockerコンテナの起動

```bash
docker compose up -d
```

このコマンドだけで、PostgreSQLとNext.jsアプリが自動的に起動します。

初回は以下が自動で実行されます：
- Dockerイメージのビルド
- 依存関係のインストール
- データベースの初期化

### 3. アクセス

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

チャットテストは [http://localhost:3000/chat](http://localhost:3000/chat) で利用できます。

## プロジェクト構成

```
├── src/
│   ├── app/
│   │   ├── actions.ts          # Server Actions
│   │   ├── page.tsx            # メインページ
│   │   ├── chat/               # チャットテストページ
│   │   └── globals.css         # グローバルスタイル
│   ├── components/
│   │   ├── chat.tsx            # チャットUIコンポーネント
│   │   └── ui/                 # shadcn/uiコンポーネント
│   ├── mastra/
│   │   ├── index.ts            # Mastra設定
│   │   ├── agents/
│   │   │   └── assistant.ts    # メインエージェント
│   │   └── lib/
│   │       └── qwen.ts         # Qwenプロバイダー設定
│   └── lib/
│       └── utils.ts            # ユーティリティ関数
├── prisma/
│   ├── schema.prisma           # Prismaスキーマ定義
│   ├── migrations/             # マイグレーションファイル
│   └── seeds/                  # シーディングスクリプト（オプション）
├── docker-compose.yml          # Docker設定
└── next.config.ts              # Next.js設定
```

## データベース管理

このプロジェクトでは**Mastra（自動テーブル作成）**と**Prisma（カスタムテーブル）**を併用します。

### Mastraのテーブル（自動作成）

以下のテーブルは、アプリ起動時にMastraが自動で作成します：
- `mastra_threads` - 会話スレッド
- `mastra_messages` - メッセージ
- `mastra_traces` - トレース情報
- etc.

### カスタムテーブルの追加（Prisma）

独自のテーブルが必要な場合：

1. `prisma/schema.prisma`でモデルを定義
2. マイグレーション作成：
   ```bash
   pnpm db:migrate
   ```
3. Docker環境では**自動でマイグレーション実行**されます

### Prismaコマンド

```bash
# マイグレーション作成（開発環境）
pnpm db:migrate

# マイグレーション適用（本番/Docker）
pnpm db:migrate:deploy

# Prisma Client再生成
pnpm db:generate

# Prisma Studio起動（GUIでDB確認）
pnpm db:studio
```

## Mastraエージェントの使い方

`src/mastra/agents/assistant.ts` にメインエージェントが実装されています。

```typescript
import { mastra } from "@/mastra";

const agent = mastra.getAgent("assistant");
const result = await agent.generate("質問内容");
console.log(result.text);
```

チャットUIでのテストは http://localhost:3000/chat で可能です。

## Vercelデプロイ手順

### 1. GitHubリポジトリにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. "Add New Project" をクリック
3. GitHubリポジトリを選択してインポート

### 3. Vercel Postgresを作成

1. Vercelプロジェクトの "Storage" タブを開く
2. "Create Database" → "Postgres" を選択
3. 自動的に `DATABASE_URL` が環境変数に設定されます

### 4. 環境変数の設定

Vercelプロジェクトの Settings → Environment Variables で以下を追加：

```
DASHSCOPE_API_KEY=<your-api-key>
```

（`DATABASE_URL`は自動設定されます）

### 5. ビルドコマンド設定（自動マイグレーション）

Vercelプロジェクトの Settings → General → Build & Development Settings で：

**Build Command**:
```
prisma migrate deploy && prisma generate && next build
```

これにより、デプロイ時に自動でマイグレーションが実行されます。

### 6. デプロイ

以降、`main`ブランチへのプッシュで自動デプロイされます。

## Docker関連コマンド

```bash
# コンテナ起動（初回はビルドも実行）
docker compose up -d

# コンテナ停止
docker compose down

# ログ確認
docker compose logs -f app

# コンテナ再ビルド（依存関係変更時）
docker compose up -d --build

# 状態確認
docker compose ps
```

## ローカル開発（Dockerを使わない場合）

Dockerを使わずにローカルで直接開発する場合：

```bash
# PostgreSQL起動
docker compose up -d postgres

# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# Lint
pnpm lint
```

## トラブルシューティング

### PostgreSQL接続エラー

```bash
# Dockerコンテナの状態確認
docker compose ps

# ログ確認
docker compose logs postgres
```

### Mastra初期化エラー

`.env.local`の`DATABASE_URL`が正しく設定されているか確認してください。

### DashScope APIエラー

APIキーが正しいか、クォータが残っているか確認してください。

## ライセンス

MIT
