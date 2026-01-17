# WebRTC ビデオ・音声通話 実装ガイド

## 概要

Supabase Realtimeを使ったWebRTCシグナリングによるビデオ・音声通話機能。

### 通話の仕様
- **ビデオ**: ドライバー → サポーター（一方向）
- **音声**: ドライバー ⇔ サポーター（双方向）

## アーキテクチャ

```
┌─────────────┐                    ┌──────────────┐
│  ドライバー │                    │ サポーター   │
│  (スマホ)   │                    │   (PC)       │
└─────────────┘                    └──────────────┘
      │                                    │
      │  Offer/Answer/ICE Candidate        │
      │ ←──── Supabase Realtime ────→     │
      │                                    │
      │  Video Stream (一方向)             │
      │ ──────── WebRTC P2P ──────→       │
      │                                    │
      │  Audio Stream (双方向)             │
      │ ←─────── WebRTC P2P ───────→      │
      │                                    │
```

## 実装済みコンポーネント

### 1. カスタムフック: `useWebRTC`

**ファイル**: `src/hooks/useWebRTC.ts`

WebRTC接続を管理するReactフック。

**主な機能:**
- メディアストリーム取得（カメラ・マイク）
- PeerConnection確立
- Supabase Realtime経由でシグナリング
- ICE Candidate交換
- 接続状態管理

**使い方:**

```typescript
const { localStream, remoteStream, isConnected, error } = useWebRTC({
  sessionId: "session_123",
  myId: "driver_001",
  peerId: "supporter_001",
  isInitiator: true, // ドライバーはtrue、サポーターはfalse
  videoEnabled: true, // ビデオ送信を有効化
});
```

### 2. ビデオプレーヤー: `VideoPlayer`

**ファイル**: `src/components/video-player.tsx`

MediaStreamを表示するコンポーネント。

**Props:**
- `stream`: MediaStream | null - 表示するストリーム
- `muted`: boolean - ミュート設定
- `label`: string - ラベル表示

### 3. ドライバー側ページ

**URL**: `/driver-rtc`
**ファイル**: `src/app/driver-rtc/page.tsx`

**機能:**
- セッション開始
- カメラ・マイクアクセス
- ビデオプレビュー
- WebRTC接続確立（Offer送信側）
- セッション終了

**フロー:**
1. 名前を入力
2. 「通話を開始」ボタンをクリック
3. カメラ・マイクの許可を求められる
4. 自動的にオンラインサポーターとマッチング
5. WebRTC接続確立
6. ビデオ・音声通話開始

### 4. サポーター側ページ

**URL**: `/supporter-rtc`
**ファイル**: `src/app/supporter-rtc/page.tsx`

**機能:**
- アクティブセッション一覧表示
- 着信応答
- ドライバーの映像受信
- WebRTC接続確立（Answer送信側）
- 双方向音声通話
- 通話終了

**フロー:**
1. アクティブセッション一覧を自動更新（5秒ごと）
2. 着信があったら「応答」ボタンをクリック
3. マイクの許可を求められる
4. WebRTC接続確立
5. ドライバーの映像を受信
6. 双方向音声通話開始

## セットアップ手順

### 1. 環境変数設定

`.env`ファイルにSupabase認証情報を追加:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Supabaseプロジェクト設定

Supabaseダッシュボードで以下を確認:
- **Realtime機能が有効** になっていること
- プロジェクトURLとAnon Keyを取得

### 3. 開発サーバー起動

```bash
docker-compose up
```

### 4. テスト手順

#### ステップ1: サポーター側を開く

ブラウザで http://localhost:3000/supporter-rtc を開く

#### ステップ2: ドライバー側を開く

**別のブラウザまたはシークレットモード**で http://localhost:3000/driver-rtc を開く

> **注意**: 同じブラウザの別タブでは、MediaStreamの制約により正しく動作しない場合があります。

#### ステップ3: ドライバー側で通話開始

1. 名前を入力（例: 観光太郎）
2. 「通話を開始」をクリック
3. カメラ・マイクの許可を承認

#### ステップ4: サポーター側で応答

1. セッション一覧にドライバーが表示される
2. 「応答」ボタンをクリック
3. マイクの許可を承認

#### ステップ5: 接続確認

- サポーター側にドライバーの映像が表示される
- 双方向で音声が聞こえる
- 接続状態が「✓ 接続中」になる

## トラブルシューティング

### カメラ・マイクが使えない

**原因**: ブラウザの権限設定

**解決策**:
1. ブラウザのアドレスバーのカメラアイコンをクリック
2. カメラとマイクの権限を「許可」に変更
3. ページをリロード

### 接続状態が「接続中...」のまま

**原因**: Supabase Realtime設定またはシグナリング失敗

**確認事項**:
1. `.env`のSupabase認証情報が正しいか
2. ブラウザのコンソールにエラーが出ていないか
3. Supabase Realtimeが有効になっているか

**解決策**:
```bash
# ブラウザのコンソールで確認
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

### 映像は見えるが音声が聞こえない

**原因**: ミュート設定またはオーディオトラック送信失敗

**確認事項**:
1. ドライバー側のビデオプレーヤーが `muted={true}` になっているか
2. サポーター側のビデオプレーヤーが `muted={false}` になっているか
3. ブラウザの音量設定

### HTTPS必須エラー

**原因**: WebRTCは本番環境ではHTTPS必須

**開発環境の場合**:
- localhostはHTTPでも動作する

**本番環境の場合**:
- Vercelなどのホスティングサービスは自動的にHTTPSを提供

## WebRTCシグナリングフロー

### 1. Offer/Answer交換

```typescript
// ドライバー側（Initiator）
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);
await realtimeService.broadcastWebRTCSignal(sessionId, {
  type: 'offer',
  fromId: driverId,
  toId: supporterId,
  sdp: offer,
});

// サポーター側
realtimeService.onWebRTCSignal(async (message) => {
  if (message.type === 'offer') {
    await peerConnection.setRemoteDescription(message.sdp);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await realtimeService.broadcastWebRTCSignal(sessionId, {
      type: 'answer',
      fromId: supporterId,
      toId: driverId,
      sdp: answer,
    });
  }
});
```

### 2. ICE Candidate交換

```typescript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    realtimeService.broadcastWebRTCSignal(sessionId, {
      type: 'ice-candidate',
      fromId: myId,
      toId: peerId,
      candidate: event.candidate.toJSON(),
    });
  }
};

realtimeService.onWebRTCSignal(async (message) => {
  if (message.type === 'ice-candidate') {
    await peerConnection.addIceCandidate(message.candidate);
  }
});
```

## ストリーム設定

### ドライバー側（ビデオ + 音声）

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,  // カメラON
  audio: true,  // マイクON
});
```

### サポーター側（音声のみ）

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: false, // カメラOFF
  audio: true,  // マイクON
});
```

## ブラウザ互換性

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

## セキュリティ考慮事項

### 本番環境での注意点

1. **HTTPS必須**: WebRTCはHTTPS環境でのみ動作
2. **Supabase RLS**: Row Level Securityの設定
3. **認証**: 本番環境では認証機能を追加すべき
4. **TURN サーバー**: ファイアウォール越えのためのTURNサーバー設定

### STUNサーバー

現在はGoogleの無料STUNサーバーを使用:

```typescript
{
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]
}
```

本番環境では独自のTURN/STUNサーバーの使用を推奨。

## パフォーマンス最適化

### ビデオ品質設定

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audio: true,
});
```

### 帯域幅制限

```typescript
const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
const parameters = sender.getParameters();
parameters.encodings[0].maxBitrate = 1000000; // 1Mbps
await sender.setParameters(parameters);
```

## 次のステップ

- [ ] 地図表示との統合
- [ ] 位置情報のリアルタイム同期
- [ ] 画面共有機能
- [ ] 録画機能
- [ ] チャット機能
- [ ] ネットワーク品質インジケーター
