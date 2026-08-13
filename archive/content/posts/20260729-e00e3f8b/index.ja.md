+++
title = "Wezterm起動時にwslを自動的に起動させる"
date = "2026-07-29"
tags = [ "WSL", "Wezterm", "設定" ]
kana = "Weztermきどうじにwslをじどうてきにきどうさせる"

[sumup]
mode = "none"
text = ""

[thumbnail]
mode = "file"
path = "/thumbnails/20260729-e00e3f8b.png"
generated = true
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

