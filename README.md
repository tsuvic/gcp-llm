# ArticlePlay

ArticlePlay は、ウェブ記事を共有・要約・管理するための PWA アプリケーションです。

## 機能

- 📱 PWA 対応（インストール可能なウェブアプリ）
- 🔗 Share Target API 対応（ブラウザの共有機能から直接記事を共有可能）
- 🤖 AI 要約機能（LLM を使用して記事の要約を生成）
- 🔍 柔軟な検索フィルター（タイトル、URL、日付での絞り込み）
- 🌓 ダークモード対応
- 🔐 Google 認証によるセキュアなアクセス

## 技術スタック

- **フレームワーク**: [Remix](https://remix.run/)
- **認証**: [Remix Auth Google](https://github.com/remix-auth/remix-auth-google)
- **PWA**: [Remix PWA](https://remix-pwa.run/)
- **スタイリング**: [Tailwind CSS](https://tailwindcss.com/)
- **パッケージマネージャー**: [pnpm](https://pnpm.io/)
- **クラウド**: [Google Cloud Platform](https://cloud.google.com/)
  - Cloud Run
  - Cloud Functions
  - Pub/Sub
  - Firestore
- **AI**: LLM (Large Language Model)

## 開発環境のセットアップ

### 必要条件

- Node.js 18 以上
- pnpm
- Google Cloud アカウント

### Google Cloud リソースのセットアップ

以下のリソースを Google Cloud Platform 上に作成する必要があります：

```bash
# プロジェクトの作成（または既存のプロジェクトを使用）
gcloud projects create [PROJECT_ID]

# 必要な API の有効化
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  pubsub.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com

# Pub/Sub トピックの作成
gcloud pubsub topics create xxxxxx

# Firestore データベースの作成（ネイティブモード）
gcloud firestore databases create --location=asia-northeast1

# Cloud Storage バケットの作成
gcloud storage buckets create gs://xxxxxx --location=asia-northeast1
```

また、以下の設定も必要です：

1. Google Cloud Console で OAuth 2.0 クライアント ID を作成
2. 承認済みのリダイレクト URI に `http://localhost:5173/auth/google/callback` を追加
3. 取得したクライアント ID とシークレットを環境変数に設定

### 環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
GCP_PROJECT_ID=your-project-id
GCP_STORAGE_BUCKET=your-storage-bucket
MAX_INPUT_TOKENS=80000
MAX_OUTPUT_TOKENS=5000
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_AUTH_CLIENT_URL=http://localhost:5173
SESSION_SECRET=your-session-secret
GCP_LOCATION=asia-northeast1
PUBSUB_TOPIC=your-topic-name
GCP_DATABASE_ID=your-database-id
```

### インストール

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev
```

### ビルドとデプロイ

```bash
# プロダクションビルド
pnpm build

# ローカルでプロダクションモードを実行
pnpm start
```

## プロジェクト構造

```
service/
├── app/
│   ├── routes/            # ルート定義
│   ├── services/          # 認証などのサービス
│   ├── function/          # Firestore操作など
│   ├── utils/            # ユーティリティ関数
│   └── entry.worker.ts   # Service Worker定義
├── public/               # 静的ファイル
└── functions/            # Cloud Functions
```

## 主要な機能の説明

### Share Target API

PWA として動作する際、ブラウザの共有機能から ArticlePlay に直接記事を共有できます。
共有された URL は自動的に Pub/Sub を通じて Cloud Functions に送信され、LLM による要約処理が開始されます。

### コンテンツ管理

- タイトルによる検索
- URL による検索
- 日付範囲による絞り込み
- エラー状態の表示
- レスポンシブデザイン（PC/モバイル対応）

## ライセンス

MIT
