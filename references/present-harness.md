# Present harness（ask / create）

仅在跑「Present a round」或 Fallback `create` 时读本文。

## 起 `ask` / `create`：stderr 保持可监控

CLI 把 `Grill with docs UI ready at <url>` 写到 **stderr**。启动时让该流仍出现在 Shell 工具能匹配的输出上（`notify_on_output` / `AwaitShell` 的 `pattern`），完成条件才是「看得见 ready」，而不是「猜日志路径」。

PowerShell（仓库根；本仓未 vendoring 时用安装副本路径）：

```powershell
node "$env:USERPROFILE\.cursor\skills\grill-with-docs-ui\scripts\grill-with-docs-ui.mjs" ask --input .scratch/grill-with-docs-ui/questions.json
```

需要落盘日志时用合并 tee，使 ready 仍进同一监控流：

```powershell
node "$env:USERPROFILE\.cursor\skills\grill-with-docs-ui\scripts\grill-with-docs-ui.mjs" ask --input .scratch/grill-with-docs-ui/questions.json 2>&1 | Tee-Object -FilePath .scratch/grill-with-docs-ui/ask-r1.log
```

仓库已 vendoring `.agents/skills/grill-with-docs-ui/` 时，把上式里的脚本换成该相对路径。

## 打开表单页

在**已把完整 URL 写进对用户回复**之后再打开（打开失败不撤销「已贴 URL」）。

- **Cursor browser**：`browser_navigate` 到该 URL（若工具支持 `position: "active"` 则用之）。
- **ego-browser**：`page.goto(url)`；用户要填表时 `handOff()`，结束本轮打开步骤。用户控制中勿自行 `takeOver`；其回复「继续」后再接管。

## Fallback 会话标记

`create` 时除 URL 外，对用户回复含一行：`grill-with-docs-ui-session: <sessionId>`。用户说「已提交」后 `resume`。
