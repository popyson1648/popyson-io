/* ============================================================
   Blog post metadata — bilingual (ja / en).

   Single source of truth for POSTS, shared by:
   - the browser app via src/data.js (window.BlogData), and
   - the build-time RSS generator in vite.config.js.

   Plain ESM (no window / no JSON imports) so it is importable from
   Node during the build.
   ============================================================ */
export const POSTS = [
  {
    id: "type-driven-cli",
    title: { ja: "型で導く CLI 設計", en: "Type-Driven CLI Design" },
    date: "2026-05-21",
    reading: 8,
    tags: ["CLI", "型", "DX"],
    kana: "かたでみちびくしーえるあい",
    summary: {
      ja: "サブコマンドと引数を型で表現すると、ヘルプ・補完・検証が一箇所から生える。手書きの分岐を消すまでの記録。",
      en: "When subcommands and arguments are expressed as types, help, completion and validation all grow from one place. Notes on deleting hand-written branches."
    }
  },
  {
    id: "quiet-observability",
    title: { ja: "静かな観測性", en: "Quiet Observability" },
    date: "2026-04-09",
    reading: 11,
    tags: ["観測性", "分散システム", "設計"],
    kana: "しずかなかんそくせい",
    summary: {
      ja: "アラートを増やすほど現場は鈍くなる。本当に必要な信号だけを残すための、引き算のダッシュボード論。",
      en: "More alerts make teams number. A subtractive take on dashboards that keeps only the signals that matter."
    }
  },
  {
    id: "stream-backpressure",
    title: { ja: "バックプレッシャーと正直なキュー", en: "Backpressure and Honest Queues" },
    date: "2026-02-28",
    reading: 14,
    tags: ["分散システム", "Rust", "設計"],
    kana: "ばっくぷれっしゃーとしょうじきなきゅー",
    summary: {
      ja: "キューは問題を隠す道具にも、見せる道具にもなる。詰まりを正直に伝えるストリーム設計について。",
      en: "A queue can hide a problem or reveal it. On stream design that tells you the truth about congestion."
    }
  },
  {
    id: "ts-narrowing",
    title: { ja: "TypeScript の絞り込みを信じる", en: "Trusting TypeScript Narrowing" },
    date: "2026-01-15",
    reading: 7,
    tags: ["TypeScript", "型", "DX"],
    kana: "たいぷすくりぷとのしぼりこみをしんじる",
    summary: {
      ja: "判別可能なユニオンと網羅性チェックで、実行時の if を減らす。コンパイラに任せる範囲を広げる練習。",
      en: "Discriminated unions and exhaustiveness checks to shrink runtime ifs. Practice in handing more to the compiler."
    }
  },
  {
    id: "small-tools",
    title: { ja: "小さな道具をたくさん持つ", en: "Keeping Many Small Tools" },
    date: "2025-12-02",
    reading: 6,
    tags: ["CLI", "DX"],
    kana: "ちいさなどうぐをたくさんもつ",
    summary: {
      ja: "一つの巨大なツールより、合成できる小さな道具。Unix 哲学を自分の日々のワークフローで試した記録。",
      en: "Composable small tools over one giant app. Testing the Unix philosophy in my own daily workflow."
    }
  },
  {
    id: "review-as-design",
    title: { ja: "レビューは設計の続き", en: "Review Is Design, Continued" },
    date: "2025-10-18",
    reading: 9,
    tags: ["設計", "DX"],
    kana: "れびゅーはせっけいのつづき",
    summary: {
      ja: "コードレビューを「指摘」ではなく「一緒に線を引き直す」場として扱うと、チームの設計力が上がっていく。",
      en: "Treating code review as redrawing lines together — not pointing out faults — quietly grows a team's design sense."
    }
  }
];
