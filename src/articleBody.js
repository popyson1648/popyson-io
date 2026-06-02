/* Article bodies — structured blocks, bilingual. window.ArticleBody
   Block kinds: h2 | p | msg | code | ul | ol | fig
   h2 blocks become TOC entries (need an `id`).                       */
(function () {
  const featured = [
    { kind: "p", ja: "手書きの引数パースは、最初の数行は気持ちがいい。問題はその後だ。フラグが増えるたびに分岐が増え、ヘルプ文と実装がずれていく。ここでは型を一次情報として扱い、それ以外を導出する設計を辿る。",
      en: "Hand-written argument parsing feels good for the first few lines. The trouble comes after. Every new flag adds a branch, and help text drifts from implementation. Here I trace a design that treats types as the source of truth and derives the rest." },

    { kind: "h2", id: "problem", ja: "何が問題だったか", en: "What was wrong" },
    { kind: "p", ja: "従来の CLI では、同じ情報を三回書いていた。引数の定義、ヘルプの説明、そして検証ロジックだ。三つはすぐにずれる。",
      en: "In the old CLI we wrote the same information three times: the argument definition, the help description, and the validation logic. The three drift apart fast." },
    { kind: "ul", ja: ["ヘルプに無いフラグが動く", "動くはずのフラグがヘルプにだけ存在する", "検証が一部のパスでしか効かない"],
      en: ["Flags that work but aren't in help", "Flags in help that no longer work", "Validation that only fires on some paths"] },

    { kind: "msg", variant: "warn",
      titleJa: "注意", titleEn: "Caution",
      ja: "「とりあえず if を足す」は短期的には速い。しかしこの分岐は誰もテストしなくなり、半年後に必ず壊れる。",
      en: "“Just add an if” is fast in the short term. But nobody tests that branch, and it always breaks six months later." },

    { kind: "h2", id: "shape", ja: "型で形を与える", en: "Giving it a shape with types" },
    { kind: "p", ja: "サブコマンドを代数的データ型として宣言する。すると網羅性チェックが効き、新しいサブコマンドを足したときにコンパイラが処理漏れを教えてくれる。",
      en: "We declare subcommands as an algebraic data type. Exhaustiveness checking kicks in, and when we add a subcommand the compiler points at every place we forgot to handle it." },
    { kind: "code", lang: "typescript",
      code: "type Command =\n  | { kind: \"build\"; target: string; release: boolean }\n  | { kind: \"watch\"; paths: string[] }\n  | { kind: \"clean\" };\n\nfunction run(cmd: Command) {\n  switch (cmd.kind) {\n    case \"build\": return build(cmd.target, cmd.release);\n    case \"watch\": return watch(cmd.paths);\n    case \"clean\": return clean();\n    // no default — the compiler enforces exhaustiveness\n  }\n}" },

    { kind: "msg", variant: "tip",
      titleJa: "ヒント", titleEn: "Tip",
      ja: "default 節をあえて書かないこと。新しい variant を足した瞬間、未処理の箇所が型エラーとして浮かび上がる。",
      en: "Deliberately omit the default case. The moment you add a new variant, every unhandled site surfaces as a type error." },

    { kind: "h2", id: "derive", ja: "ヘルプ・補完・検証を導出する", en: "Deriving help, completion, validation" },
    { kind: "p", ja: "型が一つあれば、残りは関数として導ける。順番はこうだ。",
      en: "With one type in hand, the rest follows as functions. The order looks like this." },
    { kind: "ol", ja: ["型からスキーマを生成する", "スキーマからヘルプ文を組み立てる", "スキーマからシェル補完を出力する", "入力をスキーマで検証してから型へ写す"],
      en: ["Generate a schema from the type", "Assemble help text from the schema", "Emit shell completion from the schema", "Validate input against the schema, then map into the type"] },

    { kind: "msg", variant: "info",
      titleJa: "補足", titleEn: "Note",
      ja: "この方式の利点は、ヘルプと実装が構造的にずれられないことだ。両方が同じ型から生えている。",
      en: "The payoff is that help and implementation can't structurally drift — both grow from the same type." },

    { kind: "h2", id: "result", ja: "結果", en: "The result" },
    { kind: "p", ja: "手書きの分岐は消え、コードは半分以下になった。何より、フラグを足すのが怖くなくなった。コンパイラが付き添ってくれるからだ。",
      en: "The hand-written branches are gone and the code is less than half its size. More importantly, adding a flag stopped being scary — the compiler walks with you." },
    { kind: "msg", variant: "note",
      titleJa: "メモ", titleEn: "Aside",
      ja: "この考え方は CLI に限らない。HTTP ハンドラや設定ファイルなど、入力の形が決まっている場所ならどこでも効く。",
      en: "This isn't limited to CLIs. It works anywhere the shape of input is known — HTTP handlers, config files, and more." }
  ];

  // A generic fallback body that still demonstrates every component.
  const fallback = [
    { kind: "p", ja: "この記事では、日々の実装で気づいたことを線で整理していく。結論から言えば、複雑さは消せないが、見える場所に移すことはできる。",
      en: "In this post I line up what I've noticed in everyday implementation. The short version: you can't delete complexity, but you can move it somewhere visible." },
    { kind: "h2", id: "context", ja: "背景", en: "Context" },
    { kind: "p", ja: "まず前提を揃えておきたい。ここでの目標は速さではなく、後から読んだ人が迷わないことだ。",
      en: "Let's set the premise first. The goal here is not speed but that a later reader never gets lost." },
    { kind: "ul", ja: ["小さく、単一の責務", "境界を型で示す", "失敗を隠さない"],
      en: ["Small, single responsibility", "State boundaries with types", "Never hide failure"] },
    { kind: "msg", variant: "info", titleJa: "補足", titleEn: "Note",
      ja: "この記事のコードは説明のために簡略化している。実際にはエラー処理がもう少し丁寧だ。",
      en: "Code here is simplified for explanation. In practice the error handling is a bit more careful." },
    { kind: "h2", id: "approach", ja: "やり方", en: "Approach" },
    { kind: "ol", ja: ["問題を一文で書く", "一番小さい例をつくる", "境界に名前をつける", "あとから消せるように残す"],
      en: ["Write the problem in one sentence", "Build the smallest example", "Name the boundaries", "Leave it so it can be deleted later"] },
    { kind: "code", lang: "rust",
      code: "fn handle(req: Request) -> Result<Response, Error> {\n    let input = validate(req)?;   // fail early, fail loud\n    let out = process(input)?;\n    Ok(Response::ok(out))\n}" },
    { kind: "msg", variant: "tip", titleJa: "ヒント", titleEn: "Tip",
      ja: "迷ったら、消しやすいほうを選ぶ。残すコストより、消すコストの方が後で効いてくる。",
      en: "When in doubt, choose what's easy to delete. The cost of removal matters more later than the cost of keeping." },
    { kind: "h2", id: "closing", ja: "おわりに", en: "Closing" },
    { kind: "p", ja: "結局のところ、設計とは線の引き直しだ。今日引いた線も、明日には引き直していい。",
      en: "In the end, design is redrawing lines. The line you drew today is fine to redraw tomorrow." },
    { kind: "msg", variant: "warn", titleJa: "注意", titleEn: "Caution",
      ja: "ここで紹介した方法は万能ではない。チームの規模や締め切りによって、引くべき線は変わる。",
      en: "None of this is a silver bullet. The right lines change with team size and deadlines." }
  ];

  window.ArticleBody = {
    byId: { "type-driven-cli": featured },
    fallback,
    get(id) { return this.byId[id] || fallback; }
  };
})();
