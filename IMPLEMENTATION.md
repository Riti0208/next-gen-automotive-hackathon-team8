# 高齢者サポーター × 観光客ドライバー マッチングサービス

## 概要

免許返納後の高齢者に生きがいを提供しつつ、観光客が地元の知見を得られる非対称型サービスのバックエンド実装。

### 主要機能
- **リアルタイム位置情報同期**: Supabase Realtimeで緯度・経度・向きを共有
- **WebRTC通話**: Supabase Realtime経由でシグナリング
- **セッション管理**: ドライバーとサポーターのマッチング
- **固定マッチング**: デモ用にオンラインサポーターに自動接続

## アーキテクチャ

### 技術スタック
- **Next.js 16** - フルスタックフレームワーク
- **TypeScript 5** - 型安全性
- **Prisma 7** - ORM
- **PostgreSQL 16** - データベース
- **Supabase Realtime** - リアルタイム通信 (位置情報 + WebRTCシグナリング)
- **WebRTC** - P2Pビデオ/音声通話

### データベーススキーマ

```prisma
model Driver {
  id              String   // ドライバーID
  name            String   // 名前
  currentSessionId String? // 現在のセッションID
  sessions        Session[]
}

model Supporter {
  id          String   // サポーターID
  name        String   // 名前
  facilityId  String   // 施設ID
  isOnline    Boolean  // オンライン状態
  sessions    Session[]
}

model Session {
  id          String        // セッションID
  driverId    String        // ドライバーID
  supporterId String?       // サポーターID
  status      SessionStatus // ステータス (WAITING/CONNECTING/ACTIVE/ENDED)
  startedAt   DateTime      // 開始時刻
  endedAt     DateTime?     // 終了時刻
  locations   Location[]
}

model Location {
  id        String   // ロケーションID
  sessionId String   // セッションID
  latitude  Float    // 緯度
  longitude Float    // 経度
  heading   Float?   // 向き (0-360度)
  timestamp DateTime // タイムスタンプ
}
```

## APIエンドポイント

### ドライバー用

#### `POST /api/driver/start-session`
セッション開始（自動的にオンラインサポーターとマッチング）

**Request:**
```json
{
  "driverName": "観光太郎"
}
```

**Response:**
```json
{
  "sessionId": "clxxx...",
  "status": "CONNECTING",
  "supporterId": "supporter_001"
}
```

#### `POST /api/driver/update-location`
位置情報更新（DBに保存）

**Request:**
```json
{
  "sessionId": "clxxx...",
  "latitude": 35.6812,
  "longitude": 139.7671,
  "heading": 90.5
}
```

#### `POST /api/driver/end-session`
セッション終了

**Request:**
```json
{
  "sessionId": "clxxx..."
}
```

### サポーター用

#### `GET /api/supporter/sessions`
アクティブなセッション一覧取得

**Response:**
```json
{
  "sessions": [
    {
      "id": "clxxx...",
      "driver": { "name": "観光太郎" },
      "status": "ACTIVE",
      "startedAt": "2026-01-17T..."
    }
  ]
}
```

#### `GET /api/supporter/location/[sessionId]`
セッションの最新位置情報取得

**Response:**
```json
{
  "location": {
    "latitude": 35.6812,
    "longitude": 139.7671,
    "heading": 90.5,
    "timestamp": "2026-01-17T..."
  }
}
```

#### `POST /api/supporter/accept-call`
コール応答

**Request:**
```json
{
  "sessionId": "clxxx...",
  "supporterId": "supporter_001"
}
```

### WebRTC用

#### `GET /api/webrtc/session/[sessionId]`
セッション詳細取得

## Supabase Realtime使用方法

### クライアント初期化

```typescript
import { createRealtimeService } from '@/lib/services/realtimeService';

const realtimeService = createRealtimeService();
```

### セッションへの参加

```typescript
// チャンネル作成
realtimeService.subscribeToSession(sessionId);

// 購読開始
await realtimeService.subscribe();
```

### 位置情報のブロードキャスト（ドライバー側）

```typescript
// 位置情報送信
await realtimeService.broadcastLocation(sessionId, {
  sessionId,
  driverId: 'driver_001',
  latitude: 35.6812,
  longitude: 139.7671,
  heading: 90.5,
});
```

### 位置情報の受信（サポーター側）

```typescript
// 位置情報を受信
realtimeService.onLocationUpdate((location) => {
  console.log('New location:', location);
  // 地図を更新
});
```

### WebRTCシグナリング

#### Offer送信（ドライバー側）

```typescript
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

await realtimeService.broadcastWebRTCSignal(sessionId, {
  type: 'offer',
  sessionId,
  fromId: driverId,
  toId: supporterId,
  sdp: offer,
});
```

#### Answer送信（サポーター側）

```typescript
realtimeService.onWebRTCSignal(async (message) => {
  if (message.type === 'offer') {
    await peerConnection.setRemoteDescription(message.sdp);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await realtimeService.broadcastWebRTCSignal(sessionId, {
      type: 'answer',
      sessionId,
      fromId: supporterId,
      toId: driverId,
      sdp: answer,
    });
  }
});
```

#### ICE Candidate交換

```typescript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    realtimeService.broadcastWebRTCSignal(sessionId, {
      type: 'ice-candidate',
      sessionId,
      fromId: myId,
      toId: otherId,
      candidate: event.candidate,
    });
  }
};

realtimeService.onWebRTCSignal(async (message) => {
  if (message.type === 'ice-candidate') {
    await peerConnection.addIceCandidate(message.candidate);
  }
});
```

### クリーンアップ

```typescript
// 購読解除
realtimeService.unsubscribe();
```

## セットアップ

### 1. 環境変数設定

`.env`ファイルを作成:

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/car_ai
```

### 2. データベースセットアップ

```bash
# マイグレーション実行
docker exec car-ai-app pnpm db:migrate

# シードデータ投入
docker exec car-ai-app pnpm db:seed
```

### 3. Supabaseプロジェクト設定

Supabaseダッシュボードで以下を有効化:
- Realtime機能
- Anonymous認証 (認証なしの場合)

### 4. 開発サーバー起動

```bash
docker-compose up
```

## デモ用シードデータ

### サポーター

| ID | 名前 | 施設ID | オンライン |
|---|---|---|---|
| supporter_001 | 田中太郎 | facility_tokyo_001 | ✅ |
| supporter_002 | 佐藤花子 | facility_osaka_001 | ❌ |
| supporter_003 | 鈴木一郎 | facility_tokyo_002 | ✅ |

## 実装済み機能

✅ Prismaスキーマ (Driver, Supporter, Session, Location)
✅ マイグレーション
✅ 型定義
✅ Supabaseクライアント設定
✅ RealtimeService (位置情報 + WebRTCシグナリング)
✅ LocationService (位置情報管理)
✅ SessionService (セッション管理)
✅ ドライバー用API
✅ サポーター用API
✅ WebRTC用API
✅ シードデータ

## 未実装（フロントエンド）

- ドライバー側UI (スマホ)
- サポーター側UI (PC)
- 地図表示 (Google Maps API / Mapbox)
- WebRTC接続UI

## 注意事項

- 現在は認証なしで実装
- デモ用の固定マッチング（オンラインの最初のサポーター）
- 本番環境ではSupabase RLS（Row Level Security）の設定が必要
