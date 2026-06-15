/* ============================================================
   Content data — bilingual (ja / en). Software-engineer persona.
   Plain JS: assigns window.BlogData.

   READING is generated from Instapaper (see scripts/fetch_instapaper.mjs)
   and imported from reading.json. unread -> done:false, archive -> done:true.
   ============================================================ */
import readingData from "./reading.json";
import { POSTS } from "./posts.js";
import { APPS } from "./apps.js";

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
      { label: "RSS",      href: "/rss" },
      { label: "xxx at gmail.com",   href: "mailto:xxx@gmail.com" }
    ]
  };

  const TAGS = ["Rust", "TypeScript", "分散システム", "DX", "型", "CLI", "観測性", "設計"];

  /* Generated from Instapaper; see scripts/fetch_instapaper.mjs.
     Each item: { id, title, url, source, date, done }. */
  const READING = Array.isArray(readingData.items) ? readingData.items : [];

  window.BlogData = { PERSON, TAGS, POSTS, APPS, READING };
})();
