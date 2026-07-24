---
name: add-or-update-self-hosted-bot-package
description: Workflow command scaffold for add-or-update-self-hosted-bot-package in probot.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-self-hosted-bot-package

Use this workflow when working on **add-or-update-self-hosted-bot-package** in `probot`.

## Goal

Adds or updates the self-hosted bot npm package, including implementation, configuration, and documentation.

## Common Files

- `packages/probot-self-hosted/src/*.ts`
- `packages/probot-self-hosted/package.json`
- `packages/probot-self-hosted/build.mjs`
- `packages/probot-self-hosted/README.md`
- `docs/self-hosted-bot/*.mdx`
- `tsconfig.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or add files in packages/probot-self-hosted/src/ (e.g., ProbotBot.tsx, adapters, hooks, types, prompt, vanilla)
- Update packages/probot-self-hosted/package.json and/or build.mjs
- Update or create packages/probot-self-hosted/README.md and LICENSE
- Update related docs in docs/self-hosted-bot/
- Update tsconfig.json if needed

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.