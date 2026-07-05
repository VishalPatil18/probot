---
name: ai-model-provider-integration
description: Workflow command scaffold for ai-model-provider-integration in probot.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /ai-model-provider-integration

Use this workflow when working on **ai-model-provider-integration** in `probot`.

## Goal

Adds or updates support for new AI model providers, including backend logic, provider files, and related configuration.

## Common Files

- `src/lib/ai/providers/*.ts`
- `src/lib/ai/providers/*.test.ts`
- `src/lib/ai/model-options.ts`
- `src/lib/ai/provider-labels.ts`
- `src/app/api/chat/[botId]/pipeline.ts`
- `src/app/api/chat/[botId]/route.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add or update files in src/lib/ai/providers/ (including .ts and .test.ts).
- Update src/lib/ai/model-options.ts and provider-labels.ts.
- Update API pipeline/route files if needed.
- Update configuration or documentation.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.