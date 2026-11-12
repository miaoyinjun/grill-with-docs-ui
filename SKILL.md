---
name: grill-with-docs-ui
description: >-
  带文档 grilling 的浏览器表单版：frontier ≥2 用本地表单收答案，至 frontier 空。
disable-model-invocation: true
---

# Grill with docs UI

**proxy**：本 skill 就是 `grill-with-docs`。直接 **Read and follow** `grilling` 与 `domain-modeling`；frontier ≥2 用表单收答案。

会话范围：澄清 + 领域文档。结束后停下；实现须用户另开指令。

## Loop

每轮按序（→ 后为完成条件）：

1. 载入并遵循 `grilling` + `domain-modeling` → 两份 skill 已读且本轮按其执行。
2. 写出当前 **frontier**（仅独立且现在能答的题）→ 列表已定（可空）。环境事实（菜单树、ADR、词条）：路径或字面量已知则 `Read` / `graft grep`；勿为已知文件派 explore Task。
3. **提问通道**：
   - frontier **空** → 有表单 Session 则 `complete`；总结共同理解与已写文档；**停**。
   - frontier **= 1** → 对话里问（含推荐）；等答。
   - frontier **≥ 2** → 「Present a round」；等提交 JSON。
4. 答案折回树与文档 → 同 `sessionId` 回步骤 1。

表单不可用时：grilling 文本提问；步骤 1–2、4 不变。

## Present a round

1. 按 [references/schema.md](references/schema.md) 写 QuestionSet 到 `.scratch/grill-with-docs-ui/`（形状见 [references/example-question-set.json](references/example-question-set.json)）。新任务不写 `sessionId`；续轮复用并设 `basedOnRound`。
2. 后台（`block_until_ms: 0`）起 `ask`（脚本路径与 stderr 起法见 [references/present-harness.md](references/present-harness.md)）→ Shell 监控流上出现 `Grill with docs UI ready at <url>`。
3. **交链并打开**（`ask` 与 Fallback `create` 同一完成条件）：
   - 对用户的回复含完整可点击 URL（`http://127.0.0.1:…/session/…?token=…`）→ 用户无需追问链接。
   - 再用当前环境可用的浏览器打开该 URL（Cursor `browser_navigate` 或 ego-browser；步骤见 harness）。打开失败时聊天里的 URL 仍算本步完成。
4. `ask` 退出 → 解析 stdout → 回 Loop 步骤 4。

## Fallback（`create` + resume）

按 [references/present-harness.md](references/present-harness.md) 起 `create`。对用户回复含完整 URL，并含一行 `grill-with-docs-ui-session: <sessionId>`；打开页同 Present 第 3 步。用户回「已提交」后 `resume`，再回 Loop 步骤 4。

## Session

一任务一 Session；一 frontier 批一轮。
