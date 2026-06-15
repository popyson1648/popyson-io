/* ============================================================
   Content data — bilingual (ja / en). Software-engineer persona.
   Plain JS: assigns window.BlogData.

   READING is generated from Instapaper (see scripts/fetch_instapaper.mjs)
   and imported from reading.json. unread -> done:false, archive -> done:true.
   ============================================================ */
import readingData from "./reading.json";
import { POSTS } from "./posts.js";

(function () {
  const PERSON = {
    name:    { ja: "佐藤 玲", en: "Rei Sato" },
    role:    { ja: "ソフトウェアエンジニア", en: "Software Engineer" },
    initials: "RS",
    location:{ ja: "東京", en: "Tokyo" },
    tagline: {
      ja: "分散システムと開発者ツールをつくっています。線で考えるのが好き。",
      en: "Building distributed systems and developer tools. I like thinking in lines."
    },
    bio: {
      ja: [
        "バックエンドと開発基盤を中心に、約8年間ソフトウェアをつくっています。信頼性の高いシステムと、触っていて気持ちのいい開発者体験の両立に関心があります。",
        "最近は型システム、ストリーム処理、そして「速くて静かな」CLI ツールにのめり込んでいます。"
      ],
      en: [
        "I've spent about 8 years building software, focused on backend and developer infrastructure. I care about the overlap between reliable systems and developer experience that feels good to touch.",
        "Lately I'm deep into type systems, stream processing, and CLI tools that are fast and quiet."
      ]
    },
    career: [
      { period: "2022 — now",  role: { ja: "シニアエンジニア / 基盤チーム", en: "Senior Engineer / Platform" }, org: { ja: "Tate Systems", en: "Tate Systems" } },
      { period: "2019 — 2022", role: { ja: "バックエンドエンジニア", en: "Backend Engineer" }, org: { ja: "Kumo Inc.", en: "Kumo Inc." } },
      { period: "2017 — 2019", role: { ja: "ソフトウェアエンジニア", en: "Software Engineer" }, org: { ja: "Hashi Labs", en: "Hashi Labs" } }
    ],
    activities: [
      { ja: "技術カンファレンスでの登壇（分散トレーシング、型駆動設計）", en: "Conference talks on distributed tracing and type-driven design" },
      { ja: "OSS メンテナ — ストリーム処理ライブラリ", en: "OSS maintainer of a stream-processing library" },
      { ja: "社内の輪読会・勉強会の運営", en: "Running internal reading groups and study sessions" },
      { ja: "技術書の翻訳レビュー", en: "Technical book translation reviews" }
    ],
    links: [
      { label: "GitHub",   href: "https://github.com/popyson1648" },
      { label: "X",        href: "https://x.com/popyson1648" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/shunsuke-setoguchi" },
      { label: "Wantedly", href: "https://www.wantedly.com/id/shunsuke_setoguchi_s" },
      { label: "RSS",      href: "#/rss" },
      { label: "xxx at gmail.com",   href: "mailto:xxx@gmail.com" }
    ]
  };

  const TAGS = ["Rust", "TypeScript", "分散システム", "DX", "型", "CLI", "観測性", "設計"];

  const APPS = [
    {
      id: "linewatch",
      title: "LineWatch",
      tagline: { ja: "ログを線で見る観測ツール", en: "Observe logs as lines" },
      desc: {
        ja: "ログとメトリクスを最小限の線画で可視化する、軽量な観測ダッシュボード。色ではなく形で異常を伝える。",
        en: "A lightweight observability dashboard that draws logs and metrics as minimal line art — anomalies shown by shape, not color."
      },
      detail: {
        ja: ["LineWatch は『静かな観測性』の考えを形にしたツールです。ノイズの多いアラートをやめ、ベースラインからの逸脱だけを細い線の歪みとして描きます。",
             "Rust 製のコレクタと、Canvas ベースの軽量フロントエンドで構成。秒間数万イベントを 1 ペインで描画できます。"],
        en: ["LineWatch turns the idea of quiet observability into a tool. Instead of noisy alerts it draws deviation from baseline as subtle distortions in thin lines.",
             "A Rust collector with a lightweight Canvas frontend renders tens of thousands of events per second in a single pane."]
      },
      stack: ["Rust", "WebAssembly", "Canvas"],
      year: 2025
    },
    {
      id: "kataparse",
      title: "kataparse",
      tagline: { ja: "型から CLI を生成", en: "Generate CLIs from types" },
      desc: {
        ja: "型定義からヘルプ・補完・検証を自動生成する CLI フレームワーク。手書きの引数処理をゼロにする。",
        en: "A CLI framework that generates help, completion and validation from type definitions — zero hand-written argument parsing."
      },
      detail: {
        ja: ["kataparse は『型で導く CLI 設計』の実装です。サブコマンドを代数的データ型として宣言すると、残りはすべて導出されます。",
             "シェル補完スクリプトの生成にも対応し、bash / zsh / fish をサポートします。"],
        en: ["kataparse implements type-driven CLI design. Declare subcommands as algebraic data types and everything else is derived.",
             "It also generates shell completion scripts for bash, zsh and fish."]
      },
      stack: ["TypeScript", "型"],
      year: 2024
    },
    {
      id: "tsumiki",
      title: "Tsumiki",
      tagline: { ja: "合成できる小さな道具箱", en: "A box of composable small tools" },
      desc: {
        ja: "一つの大きなアプリではなく、パイプでつなげる小さなコマンド群。日々の作業を積み木のように組む。",
        en: "Not one big app but a set of small piped commands — building daily work like stacking blocks."
      },
      detail: {
        ja: ["Tsumiki は『小さな道具をたくさん持つ』を実践するための CLI 集です。各コマンドは一つのことだけを行い、標準入出力で接続します。",
             "現在 14 個のコマンドが含まれ、すべて単体で 1MB 未満です。"],
        en: ["Tsumiki is a collection of CLIs for keeping many small tools. Each does one thing and connects over stdio.",
             "It ships 14 commands today, each under 1MB on its own."]
      },
      stack: ["Rust", "CLI"],
      year: 2024
    },
    {
      id: "norikae",
      title: "Norikae",
      tagline: { ja: "正直なジョブキュー", en: "An honest job queue" },
      desc: {
        ja: "詰まりや遅延を隠さず、線として見せるジョブキュー。バックプレッシャーを一級市民として扱う。",
        en: "A job queue that never hides congestion or delay — it shows them as lines. Backpressure as a first-class citizen."
      },
      detail: {
        ja: ["Norikae は『バックプレッシャーと正直なキュー』の実装です。キューの深さと待ち時間を常にクライアントへ返し、流量を自律的に調整します。",
             "至ってシンプルな API で、既存のワーカーに数行で組み込めます。"],
        en: ["Norikae implements backpressure and honest queues. It always reports depth and wait time to clients and self-regulates throughput.",
             "A deliberately small API drops into existing workers in a few lines."]
      },
      stack: ["Rust", "分散システム"],
      year: 2023
    }
  ];

  /* Generated from Instapaper; see scripts/fetch_instapaper.mjs.
     Each item: { id, title, url, source, date, done }. */
  const READING = Array.isArray(readingData.items) ? readingData.items : [];

  window.BlogData = { PERSON, TAGS, POSTS, APPS, READING };
})();
