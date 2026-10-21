# Grill with docs UI JSON protocol

UTF-8 JSON. Fields not listed here are ignored unless otherwise stated.
QuestionSet shape: [example-question-set.json](example-question-set.json).

## QuestionSet

| Field | Required | Notes |
|---|---|---|
| `schemaVersion` | no | `"1.0"` when set |
| `sessionId` | no | Omit on new task; CLI generates. Reuse for follow-up rounds |
| `sessionTitle` | yes | Session label |
| `sessionSummary` | yes | Session purpose |
| `roundNumber` | no | CLI generates when omitted |
| `title` | yes | Round title |
| `purpose` | yes | Round purpose |
| `basedOnRound` | no | Prior round number for follow-ups; `null` on first |
| `wake` | no | `{ mode, provider, sessionRef, cwd }`; default manual |
| `questions` | yes | Non-empty array of question objects |

### Question (all types)

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Stable id within the round |
| `type` | yes | `single` \| `multiple` \| `text` |
| `title` | yes | |
| `description` | no | |
| `required` | no | Default true |

### `single` / `multiple`

| Field | Required | Notes |
|---|---|---|
| `options` | yes | `{ id, label, description? }[]` |
| `recommendedOptionIds` | no | Pre-selected option ids |
| `recommendationReason` | no | Why those ids |
| `allowOther` | no | Enables reserved `__other__` answer id |
| `minSelections` / `maxSelections` | no | `multiple` only |

### `text`

| Field | Required | Notes |
|---|---|---|
| `recommendedDraft` | no | Pre-filled draft |
| `recommendationReason` | no | |
| `multiline` | no | Default true |
| `maxLength` | no | Character cap |

## AnswerSet

Stdout / `answers.json` after submit. Immutable after submission; corrections need a later Round.

| Field | Notes |
|---|---|
| `schemaVersion` | `"1.0"` |
| `submissionId` | CLI-generated |
| `sessionId` / `roundNumber` / `submittedAt` | Session binding |
| `answers` | `{ questionId, selectedOptionIds, customText }[]` |

### Other option

When `allowOther: true`, the “其他” choice uses reserved id `__other__`; supplementary text stays in `customText`:

```json
{
  "questionId": "channel",
  "selectedOptionIds": ["__other__"],
  "customText": "桌面通知"
}
```

`__other__` is invalid when `allowOther` is false. Older answers with non-empty `customText` and no `__other__` id still count as “其他”.

## Statuses

Session: `active`, `completed`, `cancelled`.

Round: `waiting_for_user`, `submitted`, `processed`.
