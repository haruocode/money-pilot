# money-pilot

個人向けの資産管理・負債管理・月次キャッシュフロー可視化アプリです。

## ローカル開発環境の起動

### 前提

以下がローカルに入っていることを前提にしています。

- Node.js / npm
- Rust toolchain (`cargo`)
- Cloudflare Wrangler (`npx wrangler` で実行可能)

依存関係がまだ入っていない場合は、リポジトリルートで以下を実行します。

```bash
npm install
```

### 1. ローカルD1データベースにマイグレーションを適用

API は Cloudflare D1 を使います。ローカル起動前に、ローカルDBへマイグレーションを適用します。

```bash
npm run --workspace @money-pilot/api d1:migrate:local
```

### 2. API を起動

別ターミナルで API を起動します。

```bash
npm run dev:api
```

`wrangler dev` が起動し、通常は `http://127.0.0.1:8787` で待ち受けます。

補足:

- API のビルドには Rust を使います
- `wrangler.toml` の設定で `worker-build` を利用します
- 初回は `cargo install -q worker-build` が内部で実行されることがあります

### 3. Web フロントエンドを起動

さらに別ターミナルで Web を起動します。

```bash
npm run dev:web
```

Vite 開発サーバーは `http://localhost:5173` で起動します。

### 4. ブラウザで確認

以下を開きます。

```text
http://localhost:5173
```

Web 側では `/api` へのリクエストを `http://127.0.0.1:8787` にプロキシする設定になっています。そのため、通常はブラウザから `5173` 側だけ見れば動作確認できます。

## 主要コマンド

```bash
# Web 開発サーバー
npm run dev:web

# API 開発サーバー
npm run dev:api

# ローカル D1 マイグレーション
npm run --workspace @money-pilot/api d1:migrate:local

# Web ビルド
npm run build:web

# API ビルド確認
npm run build:api
```

## 本番デプロイ

このリポジトリは以下の構成を前提にしています。

- API: Cloudflare Workers
- DB: Cloudflare D1
- Web: Cloudflare Pages

### 1. D1 の本番データベースを作成

まだ本番用 D1 を作っていない場合は作成します。

```bash
npx wrangler d1 create money_pilot
```

作成後に表示される `database_id` を [apps/api/wrangler.toml](/Users/ito/dev/money-pilot/apps/api/wrangler.toml:1) の `[[d1_databases]]` に設定してください。

### 2. 本番 D1 にマイグレーションを適用

本番データベースへマイグレーションを流します。

```bash
npm run d1:migrate
```

### 3. API を本番デプロイ

`apps/api` の Worker を Cloudflare Workers へデプロイします。

```bash
npm run deploy:api
```

デプロイ後、`https://<worker-name>.<subdomain>.workers.dev` のような URL が払い出されます。

### 4. 環境変数ファイルを作成

`apps/web/.env.production.local` を作成し、デプロイ先の API URL を記載します。
このファイルは `.gitignore` 対象のため、リポジトリには含まれません。

```bash
# apps/web/.env.production.local
VITE_API_BASE_URL=https://<worker-name>.<subdomain>.workers.dev
```

### 5. Web を本番デプロイ

```bash
npm run deploy:web
```

ビルド時に `apps/web/.env.production.local` が自動で読み込まれ、API URL がバンドルに埋め込まれます。

### 6. CORS 設定

Web（Pages）と API（Workers）が別ドメインになるため、`apps/api/wrangler.toml` の `ALLOWED_ORIGINS` に Pages のドメインを追加してください。

```toml
[vars]
ALLOWED_ORIGINS = "https://<your-pages-domain>.pages.dev"
```

## ディレクトリ構成

- `apps/web`: React + Vite フロントエンド
- `apps/api`: Cloudflare Workers + Rust API
- `packages/shared`: 共有パッケージ
- `db/migrations`: D1 マイグレーション
