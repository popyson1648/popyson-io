# popyson.com

[popyson.com](https://popyson.com) のソースコードです。
分散システム、開発者ツール、設計についての記事と、制作物、読書リスト、プロフィールを掲載しています。

React で画面遷移を処理しつつ、ビルド時には各 URL の本文とメタデータを静的 HTML へ書き出します。
日本語ページはルート直下、英語ページは `/en` 以下で配信します。

## 機能

- **プロフィール**：経歴、活動、外部リンクを日英で表示します。
- **ブログ**：タグ、タイトル、本文による絞り込みと並べ替えに対応します。
- **全文検索**：Pagefind が生成した言語別の静的索引を検索します。
- **記事表示**：目次、関連記事、Shiki によるコードハイライト、コードのコピー操作を備えます。
- **制作物一覧**：制作物の概要と詳細ページを表示します。
- **読書リスト**：Instapaper から取得した項目を未読と既読に分けて表示します。
- **RSS**：ビルド時に `/feed.xml` を生成し、サイト内に購読案内を表示します。
- **言語切り替え**：同じページの日英 URL を切り替えます。
- **テーマ切り替え**：ライト、ダーク、OS 設定への追従を選べます。
- **検索エンジン向け出力**：各 URL の canonical、hreflang、OGP、Twitter Card、サイトマップ、robots.txt を生成します。

## 開発環境

Node.js 22、npm、Python 3.11 を使用します。

```sh
npm ci
npm run dev
```

本番用の静的ファイルは次のコマンドで `dist/` に生成します。

```sh
npm run build
npm run preview
```

変更後の検証には、リポジトリで定義した検証ランナーを使います。

```sh
python3 scripts/verify.py
```

個別のコマンドは次のとおりです。

| コマンド | 処理 |
| --- | --- |
| `npm run format:check` | Biome で整形差分を検査する |
| `npm run lint` | ESLint で JavaScript と JSX を検査する |
| `npm run typecheck` | TypeScript の型検査を実行する |
| `npm test` | Vitest の単体テストとコンポーネントテストを実行する |
| `npm run test:integration` | 本番ビルド後に統合テストを実行する |
| `npm run lighthouse` | ローカルの静的サイトを Lighthouse で測定する |

## ディレクトリ構成

次のツリーは、開発時に参照するディレクトリと主要ファイルを示します。
コメントは各項目の役割を表します。

```text
popyson-io/                         # サイトのソースと開発設定を収めるリポジトリ
├── .decisions/                     # 採用した設計判断と方針の履歴
│   └── TEMPLATE.md                 # 設計判断を記録するときのひな型
├── .github/                        # GitHub 上の自動化設定
│   └── workflows/                  # 検証、翻訳、生成、配信を行う Actions
├── .plans/                         # タスクごとの作業計画
│   └── TEMPLATE.md                 # 作業計画を作るときのひな型
├── .project/                       # 新しい開発者向けの現行プロジェクト資料
│   ├── README.md                   # プロジェクト資料の索引
│   ├── build.md                    # 構築、実行、配信の手順
│   ├── metadata.md                 # 記事メタデータの仕様
│   ├── structure.md                # モジュール構成と変更箇所の案内
│   ├── testing.md                  # テスト構成と実行方法
│   ├── translation.md              # 日本語記事から英語記事への翻訳規則
│   └── verification.toml           # 検証ランナーが読むフェーズ定義
├── .template/                      # プロジェクト資料と設定の原本
├── public/                         # 加工せず公開する静的ファイル
│   ├── thumbnails/                 # 記事 ID ごとの生成済みサムネイル
│   └── provisional_ogp_image.png   # 既定の OGP 画像
├── scripts/                        # コンテンツ処理、ビルド、検証のスクリプト
│   ├── articleHtml.mjs             # Markdown を安全な記事 HTML へ変換する処理
│   ├── build_pagefind.mjs          # 日英の記事を Pagefind の索引へ登録する処理
│   ├── content_loader.mjs          # 記事と TOML コンテンツを読み込む共通処理
│   ├── fetch_instapaper.mjs        # Instapaper から読書リストを取得する処理
│   ├── generate_metadata.mjs       # 記事メタデータと画像を補完する処理
│   ├── metadataSchema.mjs          # front matter の検証規則
│   ├── new_post.mjs                # 日英の記事ファイルを新規作成する処理
│   ├── prerender.mjs               # ルート別の HTML と SEO 用ファイルを生成する処理
│   └── verify.py                   # 検証フェーズをまとめて実行するランナー
├── src/                            # React アプリケーションとサイトデータ
│   ├── content/                    # 人が編集する構造化コンテンツ
│   │   ├── about/                  # 日英のプロフィール TOML
│   │   ├── posts/                  # 記事 ID ごとの日英 Markdown
│   │   ├── prompts/                # メタデータと画像の生成プロンプト
│   │   ├── metadata.toml           # 自動生成モデルと既定値の設定
│   │   └── theme.toml              # ライトとダークの色トークン
│   ├── app.jsx                     # ルーティング、言語、テーマ、画面構成
│   ├── blog.jsx                    # 記事一覧、検索、目次、記事画面
│   ├── components.jsx              # ナビゲーションなどの共通 UI
│   ├── i18n.js                     # UI 文言の日英辞書
│   ├── meta.js                     # URL ごとのメタデータと事前描画対象
│   ├── pages.jsx                   # プロフィール、制作物、読書、RSS の画面
│   ├── prerenderRoutes.jsx         # React 画面を静的 HTML に変換する入口
│   ├── reading.json                # Instapaper から生成した読書リスト
│   ├── styles.css                  # 全体のレイアウトと基本スタイル
│   └── app.css                     # 各画面とコンポーネントのスタイル
├── tests/                          # 単体、コンポーネント、統合テスト
│   ├── fixtures/                   # テストで共有する Markdown などの入力例
│   └── setup.component.js          # コンポーネントテストの初期設定
├── AGENTS.md                       # このリポジトリで作業するエージェント向け規則
├── index.html                      # Vite と事前描画処理が使う HTML の原型
├── package.json                    # npm スクリプトと依存パッケージ
├── vite.config.js                 # React、仮想モジュール、RSS のビルド設定
└── vitest.config.js               # テスト種別と実行環境の設定
```

## ビルド処理の構成

`npm run build` は、Vite のビルド、ルート別 HTML の事前描画、Pagefind 索引の生成を順に実行します。

```text
Markdown と TOML
    ↓ content_loader.mjs
仮想モジュール virtual:site-content
    ↓ Vite と React
ブラウザー用 JavaScript と CSS
    ↓ prerender.mjs
日英のルート別 HTML、sitemap.xml、robots.txt
    ↓ build_pagefind.mjs
言語別の静的検索索引
```

各 HTML には実際の本文が含まれます。
そのため、JavaScript を実行しないクローラーもページの本文と URL 固有のメタデータを取得できます。
ブラウザーで読み込んだ後は、React が History API を使ってページ遷移を処理します。

## 技術的な工夫

### 静的 HTML とクライアント遷移の併用

事前描画処理は、記事以外の画面を実際の React コンポーネントから静的 HTML へ変換します。
記事はビルド時に生成した HTML を直接埋め込み、初期表示とクローラー向けの本文を確保します。
同じ画面を静的配信しながら、読み込み後の遷移は SPA として処理できます。

### メタデータの共有

canonical、hreflang、OGP、Twitter Card の値は `src/meta.js` で組み立てます。
ブラウザーでの画面遷移とビルド時の事前描画が同じ関数を使うため、初期 HTML と遷移後の `<head>` が別々の規則を持ちません。

### ビルド時に完結する記事処理

記事の Markdown は Unified の処理系で HTML と検索用テキストへ変換します。
Shiki はライト用とダーク用の色を一度に埋め込み、実行時に構文解析を行いません。
外部リンクには `rel="noreferrer"` を付け、画像は遅延読み込みにし、許可していない URL スキームと raw HTML は有効な要素として出力しません。

### サーバーを必要としない全文検索

Pagefind の索引は日英の記事ごとにビルド時に生成します。
検索時には現在の言語だけを対象にし、タイトル、概要、タグ、本文から一致箇所を探します。
検索 API やデータベースを運用せずに全文検索を提供できます。

### TOML を一次情報にしたテーマ

ライトとダークの色は `src/content/theme.toml` で管理します。
Vite のプラグインが TOML を CSS カスタムプロパティへ変換し、仮想 CSS モジュールとしてアプリケーションへ渡します。
開発中に TOML を変更すると、Vite が変更を検出して画面へ反映します。

### 記事メタデータの自動補完

記事は日付、タグ、概要、サムネイルを front matter で管理します。
自動モードを指定した項目は生成スクリプトが補完し、結果を Markdown と `public/thumbnails/` へ書き戻します。
CI の検査は外部の生成 API を呼ばず、未解決の自動項目が残っていないかを静的に確認します。

## 記事の追加

次のコマンドは、`YYYYMMDD-xxxxxxxx` 形式の重複しない記事 ID を作り、日英の Markdown と素材用ディレクトリを生成します。

```sh
npm run new:post
```

生成先は次の形です。

```text
src/content/posts/20260717-a1b2c3d4/  # URL と日英記事を結び付ける記事ディレクトリ
├── assets/                          # その記事に関連する素材の配置先
├── index.en.md                      # 英語版の記事と front matter
└── index.ja.md                      # 日本語版の記事と front matter
```

日本語版と英語版では見出し構造を揃えます。
英語版を更新するときは [.project/translation.md](.project/translation.md) の規則にも従います。

## 記事の front matter

記事ファイルは `+++` で囲んだ TOML front matter から始めます。

```toml
+++
title = "型で導く CLI 設計"
date = "2026-05-21"
reading = 8
tags = ["CLI", "型", "DX"]
kana = "かたでみちびくしーえるあい"

[sumup]
mode = "text"
text = "記事一覧とメタデータに使う概要を書く。"

[thumbnail]
mode = "file"
path = "/thumbnails/20260521-a1b2c3d4.png"
+++
```

各項目の役割は次のとおりです。

- **`title`**：記事タイトルを指定する必須項目です。
- **`date`**：`YYYY-MM-DD` または `"auto"` を指定する必須項目です。
- **`reading`**：表示する読了時間を正の数で指定します。
- **`tags`**：絞り込みと検索に使うタグを文字列の配列で指定します。
- **`kana`**：日本語の並べ替えと検索で使う読みを指定します。
- **`auto_tags`**：生成スクリプトに追加させるタグ数を `count` で指定します。
- **`sumup`**：概要の処理を `text`、`none`、`auto` から選びます。
- **`thumbnail`**：画像の処理を `file`、`none`、`auto` から選びます。

`date = "auto"`、`auto_tags`、`sumup.mode = "auto"`、`thumbnail.mode = "auto"` は、コミット前に次のコマンドで解決します。

```sh
npm run metadata:generate:op
```

生成処理の設定と必要な環境変数は [.project/metadata.md](.project/metadata.md) に記載しています。

## 記事本文の Markdown

本文は CommonMark と GitHub Flavored Markdown を基礎にしています。
次の記法を使用できます。

### 見出しと目次

```markdown
# 記事内の第1見出し

## 目次に表示する見出し

### 小見出し
```

記事画面の目次は `##` の見出しから生成します。
同じ `##` 見出しが複数ある場合も、重複しないリンク ID を割り当てます。

### 文章、リンク、画像

```markdown
*斜体*と**太字**と`インラインコード`を使える。

[外部サイト](https://example.com)

![代替テキスト](/thumbnails/20260521-a1b2c3d4.png)

> 引用文を書く。
```

リンクと画像には、`http`、`https`、`mailto`、ページ内リンク、サイト内の絶対パス、相対パスを使用できます。
`javascript:` や `data:` などの URL は出力から除かれます。
Markdown に書いた raw HTML は HTML 要素として解釈されません。

### 箇条書き、タスクリスト、表

```markdown
- 箇条書き
- [x] 完了した項目
- [ ] 未完了の項目

1. 最初の手順
2. 次の手順

| 項目 | 値 |
| --- | --- |
| 言語 | 日本語 |

~~取り消した記述~~
```

### コードブロック

開始側のバッククォートに言語名を付けると、Shiki が構文を色分けします。
記事画面には言語名とコピーボタンも表示されます。

````markdown
```typescript
type Theme = "light" | "dark" | "system";
```
````

言語名を省略したコードブロックは `text` として扱います。

### コールアウト

補足や警告にはコンテナーディレクティブを使います。
種類は `note`、`tip`、`info`、`warning`、`danger` の5つです。

```markdown
:::info[補足のタイトル]
本文には**通常の Markdown**を記述できる。
:::

:::warning{title="運用上の注意"}
変更前にバックアップを確認する。
:::
```

タイトルは角括弧または `title` 属性で指定できます。
タイトルを省略したコールアウトも使用できます。

## 関連資料

- [プロジェクト資料の索引](.project/README.md)
- [ビルドと配信](.project/build.md)
- [テストと検証](.project/testing.md)
- [記事メタデータ](.project/metadata.md)
- [ディレクトリと主要モジュール](.project/structure.md)
