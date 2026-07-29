+++
title = "Auto-starting WSL When WezTerm Launches"
date = "2026-07-29"
tags = [ "WSL", "Wezterm", "config" ]
kana = ""

[sumup]
mode = "none"
text = ""

[thumbnail]
mode = "file"
path = "/thumbnails/20260729-e00e3f8b.png"
generated = true
+++


### Create a symbolic link to `.config` in the home directory

Open PowerShell with administrator privileges and run:

```bash
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config" -Target (Get-Location).Path + "\.config"
```

### Edit wezterm.lua

```lua
return {
  default_prog = { "wsl.exe", "--cd", "~" },
}
```
