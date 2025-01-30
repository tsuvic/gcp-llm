# log

npx create-remix@latest gcp-llm
docker rmi $(docker images -q) -f
docker build -t gcp . --no-cache
docker run -it -p 3000:3000 gcp

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
