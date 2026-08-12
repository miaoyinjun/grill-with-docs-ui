# Grill with docs UI JSON protocol

## QuestionSet

Use UTF-8 JSON. Fields not listed here are ignored unless otherwise stated.

```json
{
  "schemaVersion": "1.0",
  "sessionId": "optional-existing-session-id",
  "sessionTitle": "个人工作台需求确认收集",
  "sessionSummary": "收集个人工作台的目标、模块和交互需求",
  "roundNumber": 1,
  "title": "基础需求确认",
  "purpose": "确认工作台的核心目标",
  "basedOnRound": null,
  "wake": {
    "mode": "manual",
    "provider": null,
    "sessionRef": null,
    "cwd": null
  },
  "questions": []
}
```

The CLI generates `sessionId` and `roundNumber` when omitted. Reuse `sessionId` for follow-up rounds.

### Single choice

```json
{
  "id": "q1",
  "type": "single",
  "title": "首页结构",
  "description": "选择一种主要组织方式。",
  "required": true,
  "options": [
    {
      "id": "dashboard",
      "label": "仪表盘",
      "description": "集中展示核心状态"
    }
  ],
  "recommendedOptionIds": ["dashboard"],
  "recommendationReason": "更适合快速查看整体状态",
  "allowOther": true
}
```

### Multiple choice

```json
{
  "id": "q2",
  "type": "multiple",
  "title": "首期模块",
  "description": "选择首期必须具备的模块。",
  "required": true,
  "minSelections": 1,
  "maxSelections": 3,
  "options": [
    { "id": "tasks", "label": "任务", "description": "待办与进度" },
    { "id": "notes", "label": "笔记", "description": "知识沉淀" }
  ],
  "recommendedOptionIds": ["tasks"],
  "recommendationReason": "任务是工作台的主入口",
  "allowOther": true
}
```

### Free text

```json
{
  "id": "q3",
  "type": "text",
  "title": "成功标准",
  "description": "描述上线后的成功标准。",
  "required": true,
  "recommendedDraft": "每天可以在一个页面完成工作安排和回顾。",
  "recommendationReason": "可直接观察和验证",
  "multiline": true,
  "maxLength": 2000
}
```

## AnswerSet

```json
{
  "schemaVersion": "1.0",
  "submissionId": "submit-generated-id",
  "sessionId": "personal-workbench-a7k2",
  "roundNumber": 1,
  "submittedAt": "2026-08-10T15:30:00.000Z",
  "answers": [
    {
      "questionId": "q1",
      "selectedOptionIds": ["dashboard"],
      "customText": ""
    },
    {
      "questionId": "q3",
      "selectedOptionIds": [],
      "customText": "每天使用至少两次。"
    }
  ]
}
```

`answers.json` becomes immutable after submission. Create a later Round for corrections.

### Other option

When a choice question has `allowOther: true`, store the selected “其他” option
with the reserved id `__other__`. Supplementary text remains in `customText`:

```json
{
  "questionId": "channel",
  "selectedOptionIds": ["__other__"],
  "customText": "桌面通知"
}
```

`__other__` is invalid when `allowOther` is false. For backward compatibility,
an older answer with non-empty `customText` and no `__other__` id is still
treated as an “其他” selection.

## Statuses

Session: `active`, `completed`, `cancelled`.

Round: `waiting_for_user`, `submitted`, `processed`.
