# popyson.com

静的にビルドしてホスティングする個人サイト兼ブログのソースコード。

Live: https://popyson.com

## Overview

サーバーサイドの実行環境を持たず、ビルドした成果物をそのまま配信する。

日本語を既定とし、英語でも配信する。
About、Blog、Works、Reading、RSS を持つ。
検索、多言語、OGP、サイトマップまで、すべてビルド成果物の中で完結させている。

## Stack

- フレームワーク: React 19（ブラウザ側のコードは最小限に抑える）
- ビルド: Vite 8
- 検索: Pagefind（静的インデックス）
- シンタックスハイライト: Shiki（ライト/ダークのデュアルテーマ）
- テスト: Vitest（unit / component / integration）と Lighthouse CI
- 整形とリント: Biome（整形）と ESLint（リント）
- ホスティング: Cloudflare Pages（Direct Upload）
- 自動化: GitHub Actions

## How It Works

### Build-time rendering

全ルートをビルド時に静的 HTML へプリレンダーする。
記事本文の HTML も、Shiki によるハイライトを含めてビルド時に生成する。
表示の初期内容をクライアントのハイドレーションに依存させないため、JavaScript を読み込む前の段階で本文が読める。

決定記録: `.decisions/build-time-article-rendering.md`, `.decisions/prerender-root-all-routes.md`

### Path-based i18n

日本語を既定のロケールとし、英語は `/en` プレフィックスで配信する。
ルーティングは History API によるパスベースで、言語は URL が保持する。

title、canonical、hreflang、OGP といったメタデータは `src/meta.js` を単一の情報源とする。
実行時の `src/app.jsx` とビルド時の `scripts/prerender.mjs` が、同じ定義を読んで `<head>` を組み立てる。

決定記録: `.decisions/ogp-path-routing.md`

### Static full-text search

検索は Pagefind の静的インデックスで動く。
ビルドの最後にロケール別のインデックスを生成し、記事のタイトル、要約、タグ、本文を引けるようにする。

決定記録: `.decisions/pagefind-site-search.md`

### Theming

ライトとダークの色トークンは `src/content/theme.toml` を単一の情報源とする。
ビルド時に CSS カスタムプロパティへ変換し、`virtual:theme.css` として読み込む。
色の定義は CSS 側には置かない。

決定記録: `.decisions/structured-theme-and-about-content.md`

### Content pipeline

記事は `src/content/posts/<post-id>/index.{ja,en}.md` に置く。
ローダーが Markdown を安全な HTML とプレーンテキストへ変換し、本文の描画と検索インデックスの両方がこの出力を使う。

決定記録: `.decisions/markdown-rendering-pipeline.md`

## Repository Layout

```
src/                  React アプリ、アプリ CSS、コンテンツ、検索 UI
  content/            記事 Markdown、テーマ、About、AI プロンプト
  meta.js             ルート/ロケール別メタデータの単一情報源
scripts/              メタデータ生成、ビルド手順、検証ランナー、Lighthouse 補助
tests/                Vitest（unit / integration / component）と a11y チェック
.project/             コントリビューター向けのプロジェクト文書
.decisions/           受理した設計と方針の意思決定記録
.plans/               タスクの計画
.github/workflows/    CI、デプロイ、翻訳、メタデータ生成、セキュリティ自動化
```

## Content Automation

### Article metadata

新規記事は、公開日、タグ、要約、サムネイルを `auto` のまま書き始められる。
タグと要約とサムネイルの概念は Gemini が生成し、サムネイル画像は OpenAI gpt-image-2 が生成する。
生成は冪等で、すでに解決済みの値や既存の画像は作り直さない。

CI が呼ぶのは静的チェックだけで、未解決の値が残っていないかを確認する。
ここでは AI プロバイダを呼ばない。

決定記録: `.decisions/metadata-auto-processing.md`, `.decisions/thumbnail-image-generation.md`

### Reading list

Reading は Instapaper のスナップショットから生成する。
取得に失敗したときはコミット済みのスナップショットへフォールバックするので、コンテンツのデプロイが Instapaper の可用性に依存しない。

決定記録: `.decisions/instapaper-reading-list.md`, `.decisions/split-reading-and-site-deploy.md`

## Quality Gates

### Verification

検証コマンドは `.project/verification.toml` を単一の情報源とする。
`scripts/verify.py` がこの定義を実行し、pre-commit と CI（`.github/workflows/ci.yml`）が同じ定義を共有する。
ローカルと CI で同じ検証が走る。

### Tests

Vitest を unit、component、integration の 3 プロジェクトに分ける。
integration はビルド後に走り、生成済みの Pagefind インデックスと、各ルートのプリレンダー結果を検証する。
アクセシビリティは Python の静的チェックが、性能は Lighthouse CI が受け持つ。

決定記録: `.decisions/testing-framework-vitest.md`, `.decisions/tests-directory-separation.md`

### Security automation

検出は Gitleaks、CodeQL、Dependabot で行う。
Dependabot とコードスキャンのアラートには、Claude による修正 PR の自動運用を当てている。

この自動化は PR をマージしない。
アラートの dismiss もしない。
検出と最終判断は GitHub と人の側に残す。

決定記録: `.decisions/security-alert-automation.md`

## Development

Node 22 と Python 3.11 を使う。

```sh
npm ci
npm run dev
```

よく使うチェック:

```sh
npm run format             # Biome で整形
npm run lint               # ESLint
npm test                   # Vitest（unit + component、ビルド不要）
npm run build              # Vite build → prerender → Pagefind
python3 scripts/verify.py  # 検証フロー全体
```

## Deployment

Cloudflare Pages へ Direct Upload で配信する。
Cloudflare の Git 連携は使わず、GitHub Actions からデプロイする。

デプロイは 2 つの独立したワークフローに分ける。
サイト本体は `main` への push で更新し、Reading は毎時のスケジュールで更新する。
Reading の取得に失敗しても、最後に成功したデプロイがそのまま配信され続ける。

決定記録: `.decisions/split-reading-and-site-deploy.md`

## Documentation

- `.project/`：現在のプロジェクト状態（構成、ビルド、テスト、メタデータ、セキュリティ）。
- `.decisions/`：受理した設計と方針の記録。
- `.plans/`：タスクの計画。
