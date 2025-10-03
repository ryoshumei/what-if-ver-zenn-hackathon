## 📝 Zenn記事

このプロジェクトの詳細記事はこちら: [https://zenn.dev/daydreamer/articles/2798ac84e28df5](https://zenn.dev/daydreamer/articles/2798ac84e28df5)

---

これは[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)でブートストラップされた[Next.js](https://nextjs.org)プロジェクトです。

## はじめに

まず、環境変数をセットアップします（コピーして編集）:

```bash
cp .env.example .env.local
# .env.localをGCPプロジェクト、Vertexモデル、Firebase設定で編集
```

次に、開発サーバーを起動します:

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで[http://localhost:3000](http://localhost:3000)を開くと、結果が表示されます。

`app/page.tsx`を編集してページの編集を開始できます。ファイルを編集すると、ページが自動的に更新されます。

このプロジェクトでは[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)を使用して、Vercelの新しいフォントファミリーである[Geist](https://vercel.com/font)を自動的に最適化して読み込みます。

## もっと学ぶ

Next.jsについてもっと学ぶには、以下のリソースをご覧ください:

- [Next.jsドキュメント](https://nextjs.org/docs) - Next.jsの機能とAPIについて学ぶ
- [Next.jsを学ぶ](https://nextjs.org/learn) - インタラクティブなNext.jsチュートリアル

[Next.js GitHubリポジトリ](https://github.com/vercel/next.js)もチェックしてください - フィードバックと貢献を歓迎します！

## Vercelにデプロイ

Next.jsアプリをデプロイする最も簡単な方法は、Next.jsの作成者による[Vercelプラットフォーム](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)を使用することです。

詳細は[Next.jsデプロイメントドキュメント](https://nextjs.org/docs/app/building-your-application/deploying)をご覧ください。

## ハッカソンコンプライアンス

このプロジェクトはZennハッカソンに参加し、`/.specify/memory/constitution.md`に組み込まれたルールに従います。

- Google Cloud Runtime: Cloud Run（プライマリ）にデプロイします。軽量タスクにはCloud Functionsを使用する場合があります。
- Google Cloud AI: デフォルトのAIプロバイダーとしてVertex AI（Vertex AI経由のGemini）を使用します。

### 提出物

- 公開GitHubリポジトリ: このリポジトリ
- デプロイURL: 審査期間（9/25–10/8）前に追加予定
- Zenn記事（カテゴリ「Idea」）: ドラフトは`docs/zenn-draft.md`にあり、提出前に公開されます

### アーキテクチャ図

- `docs/architecture/`にダイアグラムを保存し、Zenn記事に埋め込みます
- 現在のプレースホルダー: `docs/architecture/diagram.png`（ダイアグラムに置き換えてください）と`docs/architecture/README.md`

### CIコンプライアンスチェック

- Vertex AIヘルスチェック: ADCを使用してAPI接続を検証
- Cloud Runターゲット検証: デプロイターゲット設定を検証

`scripts/ci/vertex_ai_healthcheck.sh`と`scripts/ci/cloud_run_target_check.sh`を参照してください。GitHub Actionsワークフロー: `.github/workflows/ci.yml`

## Cloud Runデプロイメント（最小構成）

Dockerベースのデプロイスクリプトが提供されています。スクリプトは以下を実行します:

- linux/amd64イメージをビルド
- Next.jsのビルド時に`.env.local`を`.env.production`として注入
- Artifact Registry `${AR_REPO}`にプッシュ（必要に応じて作成）
- 同じ環境変数でCloud Runにデプロイ

```bash
# ビルド & プッシュ & デプロイ（gcloudとdockerログインが必要）
export GCP_PROJECT_ID=your-project
export GCP_RUN_REGION=us-central1
export CLOUD_RUN_SERVICE=what-if-agent
export AR_REPO=web
export IMAGE_TAG=$(git rev-parse --short HEAD)
bash scripts/deploy/cloud_run_deploy.sh
```

デプロイ後、サービスURLが表示されます。

### IaC（Cloud Run service.yaml）

Cloud Runの最小サービス構成は`infra/cloud-run/service.yaml`にあります。
`gcloud run services replace`で適用する前に、`REGION`、`PROJECT`、`REPO`、`TAG`のプレースホルダーを置き換えてください。

## Vertex AI + Veo LRO（概要）

- 画像生成にはVertex Prediction `imagegeneration@006`を使用
- 動画生成にはLong-Running Operations（LRO）を使用したVeoを使用:
  1) REST `predictLongRunning`で開始
  2) REST `fetchPredictOperation`でポーリング
  3) 完了時、`response.videos[].gcsUri`を優先
  4) アプリは`PUBLIC_GCS_BUCKET`（設定されている場合）にコピーし、`makePublic`を実行して長期有効なHTTPSを返します
  5) フォールバック: URLがまだ`gs://`の場合、`GET /api/generations/[id]`は60分間有効な署名付きHTTPS URLを返し、フロントエンドで再生できるようにします

主要な環境変数（`.env.example`を参照）:

- `GCS_OUTPUT_BUCKET`: Vertexが出力を書き込むgs://ロケーション
- `PUBLIC_GCS_BUCKET`: 長期有効なURLを公開するために使用される公開バケット名（gs://なし）
- `VERTEX_VIDEO_LRO_MODE=rest`: 安定したREST LROモードを使用

`docs/vertex-ai-quickstart.md`を参照し、最小限の例を実行してください:

```bash
export ACCESS_TOKEN="$(gcloud auth application-default print-access-token)"
export GCP_PROJECT_ID=your-project
node docs/examples/vertex_gemini_min.js
```

### ストリーミング例

- cURLストリーミング（サーバー出力）: `docs/examples/vertex_stream_curl.sh`
- Next.js Edge APIプロキシ（POST JSON: `{ "prompt": "..." }`）: `POST /api/vertex/stream`

## トラブルシューティング

- コンテナの起動に失敗 / exec形式エラー: イメージは`linux/amd64`である必要があります。スクリプトはクロスアーキテクチャビルド用にBuildxを有効にします。
- Cloud Runがポートでリッスンしない: Dockerfileはシェル形式の`CMD`を使用します。`${PORT}`がシェルによって展開されることを確認してください。
- Vertex UNAUTHENTICATED: ADC（サービスアカウント）を使用し、`roles/aiplatform.user`を付与してください。
- GCSパーミッション: `GCS_OUTPUT_BUCKET` / `PUBLIC_GCS_BUCKET`のサービスアカウントには`roles/storage.objectAdmin`が必要です。
- 返された`gs://`が再生できない: APIは署名付きHTTPS URLを返すフォールバックを提供します。または、アセットが公開されるように`PUBLIC_GCS_BUCKET`を設定してください。
