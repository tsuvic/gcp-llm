# log

```

npx create-remix@latest gcp-llm
docker rmi $(docker images -q) -f
docker build -t gcp . --no-cache
docker run -it -p 3000:3000 gcp
gcloud config list
gcloud project list
gcloud config set project XXXXX

gcloud services enable storage-component.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud artifacts repositories create gcp-llm --repository-format=docker --location=asia-nor
theast1 --description="docker repository for gcp-llm"
gcloud artifacts repositories list
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
# HOST-NAME/PROJECT-ID/REPOSITORY/IMAGE
docker build --platform linux/amd64 -t asia-northeast1-docker.pkg.dev/XXXX/gcp-llm/gcp-llm:latest .
docker image latest
docker push asia-northeast1-docker.pkg.dev/XXXX/gcp-llm/gcp-llm:latest

gcloud run deploy gcp-llm --image asia-northeast1-docker.pkg.dev/XXXX/gcp-llm/gcp-llm:latest -
-platform managed --region asia-northeast1 --allow-unauthenticated
gcloud run services list


# delete
gcloud run services delete gcp-llm --region asia-northeast1

# アプリケーション用の認証
gcloud auth application-default login

```

# 設計

## Remix

- バックエンドもフロントエンドも纏めて時間をかけずに構築したい

## Cloud Run

- 従量課金のサーバレスであり、Functions よりも制約が小さく柔軟な処理ができる
- とりあえず Cloud Run 使っておけみたいな雰囲気があり、情報量が多い
- 安心して Remix を動かせそう

## FireStore

- Cloud SQL が定番なので触りたいが、機能を作り込まず決まったアクセスパターンしかないので NoSQL にする

## Firebase Auth

- Google Auth の方が多要素認証等できることは多いが、今回は ID トークンで認証できればなんでも良い
- モバイルを今後お手軽に実装できるように Firebase 使っておきたい

## Docker

[Dockerfile のベストプラクティス](https://future-architect.github.io/articles/20240726a/)
docker 関連のビルドエラーの解決は、これまで辛みがあったが、AI に投げれば自動で解消してくれてしまう。。。

## Artifact Registry

[Artifact Registry の料金](https://cloud.google.com/artifact-registry/pricing?hl=ja)
83mb しか使ってなくて、500mb までは無料だから削除しない

## Cloud Run

## Cloud Run

[Remix アプリを Clourd Run にデプロイする](https://zenn.dev/cureapp/articles/056622534b4056)
[Remix App Server のポートを環境変数で指定する](https://remix.run/docs/en/main/other-api/serve#port-environment-variable)
Cloud Run はデフォルトで 8080 で動く。PORT 環境変数も設定してくれるので、Remix とのポートマッピングを気にする必要はない。

Private な場合の接続方法が知りたい

## Vertex AI

[Vertex AI API リファレンス](https://cloud.google.com/vertex-ai/pricing?hl=ja)
