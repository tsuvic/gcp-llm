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

[text](https://www.youtube.com/watch?v=Jllce4b70gk)
[text](https://www.youtube.com/watch?v=egqQ9byHzok)

Unable to submit request because the input token count is 48261 but model only supports up to 32768. Reduce the input token count and try again. You can also use the CountTokens API to calculate prompt token count and billable characters.

long output token length is not enabled for this request

```

{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "Hi there!\n"
          }
        ]
      },
      "finishReason": "STOP",
      "safetyRatings": [
        {
          "category": "HARM_CATEGORY_HATE_SPEECH",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 0.09674762,
          "severity": "HARM_SEVERITY_NEGLIGIBLE",
          "severityScore": 0.08671734
        },
        {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 0.037115306,
          "severity": "HARM_SEVERITY_NEGLIGIBLE",
          "severityScore": 0.11226705
        },
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 0.14342335,
          "severity": "HARM_SEVERITY_NEGLIGIBLE",
          "severityScore": 0.13670991
        },
        {
          "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 0.088406384,
          "severity": "HARM_SEVERITY_LOW",
          "severityScore": 0.20894316
        }
      ],
      "avgLogprobs": -0.033653438091278076,
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 8,
    "candidatesTokenCount": 4,
    "totalTokenCount": 12,
    "promptTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 8
      }
    ],
    "candidatesTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 4
      }
    ]
  },
  "modelVersion": "gemini-1.5-flash-002",
  "createTime": "2025-01-31T09:43:07.214616Z",
  "responseId": "K5ucZ9iMDbaMz8cPsumi2Qw"
}

```
