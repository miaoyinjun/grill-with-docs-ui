# Grill with docs UI

[grill-with-docs](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs) 的浏览器版本。用法与它完全一致；多题时多一页本地表单，一次勾选并提交。

## 安装

需要 Node.js，以及同环境里 Agent 能读到的 `grilling`、`domain-modeling`。

```bash
npx --yes skills@latest add <本仓库地址或本地路径> --skill grill-with-docs-ui --agent cursor --yes
```

全局安装加 `--global`，其它 Agent 改 `--agent`（如 `codex`、`claude`）。

## 使用

像调用 grill-with-docs 一样调用本 skill，例如：

```text
/grill-with-docs-ui 澄清销售团队线索跟进流程
```

一题仍在对话里答。两题及以上打开页面：推荐项已预选，可改选后点「提交本轮答案」。提交之后的澄清与落文档，与 grill-with-docs 相同。

![Grill with docs UI 澄清表单](assets/qa/cursor-form.png)
![Grill with docs UI 澄清表单（续）](assets/qa/clarification-form.png)
