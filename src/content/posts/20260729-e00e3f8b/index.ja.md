+++
# title      記事タイトル。必須、空文字不可
# date       "auto" | "YYYY-MM-DD"。auto は初回コミット日に置換される
# tags       手書きのタグ
# auto_tags  AI にタグを追加させる。{} で既定 3 個。追加しないなら行ごと削除
# kana       五十音順ソートに使う読み仮名
# sumup      mode = "text" | "auto" | "none"。text は text が必須
# thumbnail  mode = "auto" | "file" | "none"。file は path が必須

title = "Wezterm起動時にwslを自動的に起動させる"
date = "auto"
tags = []
auto_tags = {}
kana = "Weztermきどうじにwslをじどうてきにきどうさせる"

[sumup]
mode = "none"
text = ""

[thumbnail]
mode = "auto"
+++


### `.config` のシンボリックリンクをホームディレクトリに貼る

管理権限でpowershellを開き、

```bash
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config" -Target (Get-Location).Path + "\.config"
```

### wezterm.lua を編集する

```lua
return {
  default_prog = { "wsl.exe", "--cd", "~" },
}
```

