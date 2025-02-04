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
docker push asia-northeast1-docker.pkg.dev/XXXX/gcp-llm/gcp-llm:latest

gcloud run deploy gcp-llm --image asia-northeast1-docker.pkg.dev/XXXX/gcp-llm/gcp-llm:latest --platform managed --region asia-northeast1 --allow-unauthenticated --service-account XXXXX --set-env-vars GCP_PROJECT_ID=XXXX,GCP_STORAGE_BUCKET=XXXX,MAX_INPUT_TOKENS=XXXX,MAX_OUTPUT_TOKENS=XXXX
gcloud run services list

# delete
gcloud run services delete gcp-llm --region asia-northeast1

# アプリケーション用の認証
gcloud auth application-default login

gcloud iam service-accounts list --filter="compute"


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

[log](https://zenn.dev/dinii/articles/c8ca221b3eda5b)
[log](https://zenn.dev/knowledgework/articles/cloud-logging-special-payload-fields)

## Vertex AI

[Vertex AI API リファレンス](https://cloud.google.com/vertex-ai/pricing?hl=ja)

[text](https://www.youtube.com/watch?v=Jllce4b70gk)
[text](https://www.youtube.com/watch?v=egqQ9byHzok)

Unable to submit request because the input token count is 48261 but model only supports up to 32768. Reduce the input token count and try again. You can also use the CountTokens API to calculate prompt token count and billable characters.

long output token length is not enabled for this request

なるべく 1 つのモデルで完結することから挑戦する。

タスクが多かったり、細かい条件を指定したり、複雑な指示になると、精度が落ちる。

そのため decomposion を考える。

[text](https://discuss.ai.google.dev/t/output-tokens-limit-for-the-finetuned-gemini-flash-1-5/37715)

[text](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/design-multimodal-prompts?authuser=2&_gl=1*1og5ey*_ga*Mzc5ODgxNDgzLjE3MzgxMTk1OTc.*_ga_WH2QY8WWF5*MTczODM0MTIwOS44LjEuMTczODM0MTc5Mi4wLjAuMA..&hl=ja)

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

## text to speech

[text to speech](https://cloud.google.com/text-to-speech/docs/create-audio-text-console?hl=ja)
[github google-cloud-node](https://github.com/googleapis/google-cloud-node/tree/main/packages/google-cloud-texttospeech)

```

#Request
Please extract the information from the specified article exactly as it is, without any processing or summarization.
Maintain the structure of headings and body text without deletion or modification.

DO NOT INCLUDE summaries, interpretations, or opinions about the event.
you MUST EXTRACT ONLY the raw article content exactly as it appears.

## Extract
Extract the article's body text exactly as they appear.
No summarization, interpretation, comments, or analysis by AI
Do not change the order of sentences or omit any content.
Preserve the original wording of the article as much as possible.

## Translation
Then, translate the extracted text: if it's in English, translate it to Japanese; if it's in Japanese, translate it to English.
Each sentence should be treated as a single unit.
Output Format

## Output
Output the result as a pure JSON array without any additional formatting, like this:
[{"en": "xxxxxx", "ja": "xxxxx"}, {"en": "xxxxxx", "ja": "xxxxx"}]
Ensure that the response contains only the JSON array, without any extra text, code blocks, or formatting characters.

```

curl -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "fileUri=https://www3.nhk.or.jp/shutoken-news/20250202/1000113831.html" http://localhost:5173/share

## cloud storage

[text](https://github.com/googleapis/nodejs-storage)

## firestore

[text](https://github.com/googleapis/nodejs-firestore)

## iam

[text](https://zenn.dev/google_cloud_jp/articles/cloudrun-serviceaccount)

[text](https://zenn.dev/google_cloud_jp/articles/5104d1d1f28560)

## auth

remix auth 使わない方法もある lucia auth
[lucia remix](https://tech.crassone.jp/posts/remix-on-cloudflare-with-lucia-auth)

remix react router v7 に合わせて remix-auth v4 も出たが、remix-auth-google は追従してない
remix-auth v3 で remix-auth-google の peer を満たすように使う
[remix google auth](https://zenn.dev/shiroemons/articles/c12492668ccdc2)

## favicon

404 エラーがたまに出てる。root.tsx でしか links メタデータで icon の指定をしてないからと思われる。
svg はそもそもブラウザによっては対応してなかったりもする。
[text](https://blog.mikingt.net/?p=963)

ということで svg から ico を生成するツール generate-favicon.ts を作成した。
このツールで使う sharp を pnpm でインストールする時に package.json でアーキテクチャの指定が必要
普通にインストールして実行したらエラーになった
Error: Could not load the "sharp" module using the darwin-x64 runtime
[text](https://yarnpkg.com/configuration/yarnrc#supportedArchitectures)
またオプショナルも必要そうなのでインストールした
Ensure optional dependencies can be installed:
pnpm install --include=optional

## todo

eventid ulid
jst
remix wpa
cloudflare waf
doc
node env why where production?
エラーログ構造化されない
favicon 404
locale time
