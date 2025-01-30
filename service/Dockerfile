# https://pnpm.io/docker#example-1-build-a-bundle-in-a-docker-container
# 上記をベースにremixはビルドでbuildとpublicへ出力するため修正
# 基本的には必要最小限のコピーに留めて、バインドマウントやキャッシュを使い、高速化する方針
# RUNコマンドで同じキャッシュを使用し、レイヤーを跨いでキャッシュを効かせることが大事
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# 任意のパッケージマネージャーを有効にしてくれる。しかし、将来的にNode.jsのバンドルから削除されるらしい。
# https://zenn.dev/monicle/articles/1c06f3f75b2cb1
RUN corepack enable && corepack prepare pnpm@latest --activate

# BUG? https://github.com/npm/cli/issues/5183
# package.jsonもバインドマウントしたかったが、無理なのでコピーする。
# バインドマウントは読み取り専用になる仕様。読み取り専用の場合、npmがエラーになる。
WORKDIR /app
COPY ./package.json ./

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=bind,source=pnpm-lock.yaml,target=/app/pnpm-lock.yaml \
    pnpm install --prod --frozen-lockfile

FROM base AS build
# ビルドに必要なため--prodはつけずにインストール
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=bind,source=pnpm-lock.yaml,target=/app/pnpm-lock.yaml \
    pnpm install --frozen-lockfile

# Remixのビルドに必要なファイルをすべてマウント
RUN --mount=type=bind,source=app,target=/app/app \
    --mount=type=bind,source=public,target=/app/public \
    --mount=type=bind,source=vite.config.ts,target=/app/vite.config.ts \
    --mount=type=bind,source=tailwind.config.ts,target=/app/tailwind.config.ts \
    --mount=type=bind,source=postcss.config.js,target=/app/postcss.config.js \
    pnpm run build

FROM base AS app
COPY public /app/public
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
EXPOSE 3000
CMD [ "pnpm", "start" ]