---
name: bot-factory-module-enhancement
description: Workflow command scaffold for bot-factory-module-enhancement in probot.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /bot-factory-module-enhancement

Use this workflow when working on **bot-factory-module-enhancement** in `probot`.

## Goal

Enhances or refactors the bot factory module, often including multiple steps/components and related types/constants.

## Common Files

- `src/components/bot-factory/BotFactoryForm.tsx`
- `src/components/bot-factory/steps/*.tsx`
- `src/components/bot-factory/parts/*.tsx`
- `src/components/bot-factory/constants.ts`
- `src/components/bot-factory/types.ts`
- `src/components/dashboard/settings/*.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Update or add files in src/components/bot-factory/steps/ or parts/.
- Modify src/components/bot-factory/BotFactoryForm.tsx and related constants/types.
- Update related dashboard/settings files if needed.
- Optionally update related API routes or lib files.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.