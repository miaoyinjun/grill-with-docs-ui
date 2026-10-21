# Agent notes

- **真源**：本仓库。默认忽略 `~/.cursor/skills/grill-with-docs-ui`；未经用户要求勿同步到安装副本。
- **落盘**：工作区文件只用 Write / StrReplace / Delete（见 Cursor `file-tools` 规则）；勿用 Shell `Copy`/`Move` 或 `node -e` + `fs.*` 写本树。
- **检查**：`node scripts/self-test.mjs`
