# ArticlePlay

ArticlePlay は、ブラウジング中に Web ページの共有を行うことで、ユーザーが英語を学習するためのコンテンツを生成するアプリケーションです。Web ページを短いフレーズに分割し、対訳とオーディオを付加したテキストを生成します。

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
  - Cloud Storage
  - Artifact Registry
  - Vertex AI

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
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  cloudresourcemanager.googleapis.com

# Pub/Sub トピックの作成
gcloud pubsub topics create xxxxxx

# Firestore データベースの作成（ネイティブモード）
gcloud firestore databases create --location=asia-northeast1

# Cloud Storage バケットの作成
gcloud storage buckets create gs://xxxxxx --location=asia-northeast1

# Artifact Registry リポジトリの作成
gcloud artifacts repositories create article-play \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="ArticlePlay のコンテナイメージ用リポジトリ"
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
MAX_INPUT_TOKENS=100
MAX_OUTPUT_TOKENS=100
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_AUTH_CLIENT_URL=http://localhost:5173
SESSION_SECRET=your-session-secret
GCP_LOCATION=asia-northeast1
PUBSUB_TOPIC=your-topic-name
VERTEX_AI_MODEL=gemini-1.5-flash
```

### インストール

```bash
# 依存関係のインストール
pnpm i

# 開発サーバーの起動
npm run dev
```

### ビルドとデプロイ

```bash
# プロダクションビルド
pnpm build

# ローカルでプロダクションモードを実行
pnpm start
```

### デプロイ手順

#### Cloud Functions のデプロイ

```bash
gcloud functions deploy xxxx \
  --gen2 \
  --runtime=nodejs20 \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --service-account xxxx@xxxx.iam.gserviceaccount.com \
  --trigger-topic=xxxx \
  --set-env-vars \
    GCP_PROJECT_ID=xxxx,\
    GCP_STORAGE_BUCKET=xxxx,\
    MAX_INPUT_TOKENS=xxxx,\
    MAX_OUTPUT_TOKENS=xxxx,\
    GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com,\
    GOOGLE_CLIENT_SECRET=xxxx,\
    GOOGLE_AUTH_CLIENT_URL=https://xxxx.asia-northeast1.run.app,\
    SESSION_SECRET=xxxx,\
    GCP_LOCATION=asia-northeast1,\
    PUBSUB_TOPIC=xxxx,\
    GCP_DATABASE_ID=xxxx,\
    VERTEX_AI_MODEL=xxxx
```

#### Cloud Run のデプロイ

```bash
# コンテナのビルドとプッシュ
docker build --platform linux/amd64 \
  -t asia-northeast1-docker.pkg.dev/xxxx/xxxx/xxxx:latest . && \
docker push asia-northeast1-docker.pkg.dev/xxxx/xxxx/xxxx:latest

# Cloud Run へのデプロイ
gcloud run deploy xxxx \
  --image asia-northeast1-docker.pkg.dev/xxxx/xxxx/xxxx:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --service-account xxxx@xxxx.iam.gserviceaccount.com \
  --set-env-vars \
    GCP_PROJECT_ID=xxxx,\
    GCP_STORAGE_BUCKET=xxxx,\
    MAX_INPUT_TOKENS=xxxx,\
    MAX_OUTPUT_TOKENS=xxxx,\
    GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com,\
    GOOGLE_CLIENT_SECRET=xxxx,\
    GOOGLE_AUTH_CLIENT_URL=https://xxxx.asia-northeast1.run.app,\
    SESSION_SECRET=xxxx,\
    GCP_LOCATION=asia-northeast1,\
    PUBSUB_TOPIC=xxxx
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
