# https://pnpm.io/docker#example-1-build-a-bundle-in-a-docker-container
# 上記をベースにremixはビルドでbuildとpublicへ出力するため修正
# 2024年はマウントキャッシュを使用してビルドを高速化する
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# 任意のパッケージマネージャーを有効にしてくれる。しかし、将来的にNode.jsのバンドルから削除されるらしい。
# https://zenn.dev/monicle/articles/1c06f3f75b2cb1
RUN corepack enable
# node_modulesやbuild等のbuildステージで不要なものはすべて.dockerignoreに記載
# 本来app内も変更が少ないものだけ最初にコピーするようにした方が良い
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
# ビルドに必要なため--prodはつけずにインストール
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base AS app
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
EXPOSE 3000
CMD [ "pnpm", "start" ]