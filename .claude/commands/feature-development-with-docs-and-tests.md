---
name: feature-development-with-docs-and-tests
description: Workflow command scaffold for feature-development-with-docs-and-tests in probot.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-docs-and-tests

Use this workflow when working on **feature-development-with-docs-and-tests** in `probot`.

## Goal

Implements a new feature or major enhancement, updating implementation, documentation, and tests together.

## Common Files

- `src/components/**/*.tsx`
- `src/app/**/*.ts`
- `docs/**/*.mdx`
- `README.md`
- `src/components/**/*.test.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Implement or update feature in relevant src/components or src/app files.
- Update or add related documentation in docs/ or README.md.
- Add or update test files alongside implementation (e.g., *.test.tsx).
- Update or add static assets if needed (e.g., images, videos).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.