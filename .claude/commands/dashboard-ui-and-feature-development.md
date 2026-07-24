---
name: dashboard-ui-and-feature-development
description: Workflow command scaffold for dashboard-ui-and-feature-development in probot.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /dashboard-ui-and-feature-development

Use this workflow when working on **dashboard-ui-and-feature-development** in `probot`.

## Goal

Implements new dashboard features or UI updates, often including new pages, components, and related API routes.

## Common Files

- `src/app/(dashboard)/dashboard/**/*.tsx`
- `src/components/dashboard/**/*.tsx`
- `src/app/api/**/*.ts`
- `src/app/api/**/*.test.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or add files in src/app/(dashboard)/dashboard/ (pages, settings, notifications, etc.)
- Update or add src/components/dashboard/ and related components
- Update or add related API routes in src/app/api/
- Update or add tests for new/changed components or routes

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.