---
name: grill-with-docs-ui
description: >-
  grill-with-docs：本 skill 即带文档 grilling（执行 grilling + domain-modeling）；
  frontier ≥2 走本地表单，提交后续轮至 frontier 空。
  「已提交」「答完了」→ resume（备用）。
---

# Grill with docs UI

**proxy**：本 skill 就是 `grill-with-docs`。直接 **Read and follow** `grilling` 与 `domain-modeling`；frontier ≥2 用表单收答案。

会话范围：澄清 + 领域文档。结束后停下；实现须用户另开指令。

## Loop

每轮按序（→ 后为完成条件）：

1. 载入并遵循 `grilling` + `domain-modeling` → 两份 skill 已读且本轮按其执行。
2. 写出当前 **frontier**（仅独立且现在能答的题）→ 列表已定（可空）。
3. **提问通道**：
   - frontier **空** → 有表单 Session 则 `complete`；总结共同理解与已写文档；**停**。
   - frontier **= 1** → 对话里问（含推荐）；等答。
   - frontier **≥ 2** → 「Present a round」；等提交 JSON。
4. 答案折回树与文档（仍 follow 两份 skill）→ 同 `sessionId` 回步骤 1。

表单不可用时：grilling 文本提问；步骤 1–2、4 不变。

## Present a round

1. 读 [references/schema.md](references/schema.md)，把 QuestionSet 写入 `.scratch/grill-with-docs-ui/`。新任务不写 `sessionId`；续轮复用并设 `basedOnRound`。
2. 后台（`block_until_ms: 0`）：

   ```text
   node .agents/skills/grill-with-docs-ui/scripts/grill-with-docs-ui.mjs ask --input <.scratch/grill-with-docs-ui/questions.json>
   ```

3. stderr 出现 `Grill with docs UI ready at <url>` 后，一次 `browser_navigate`（`position: "active"`）打开该 URL。
4. `ask` 退出 → 解析 stdout → 回 Loop 步骤 4。

## Fallback（`create` + resume）

```text
node .agents/skills/grill-with-docs-ui/scripts/grill-with-docs-ui.mjs create --input <.scratch/grill-with-docs-ui/questions.json>
```

给出 URL 与 `grill-with-docs-ui-session: <sessionId>`，`browser_navigate`（`position: "active"`）打开；用户回「已提交」后 `resume`，再回 Loop 步骤 4。

## Session

一任务一 Session；一 frontier 批一轮。已提交轮不改写；纠错开新轮。
