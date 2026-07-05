# ECC for Codex CLI

This supplements the root `AGENTS.md` with a repo-local ECC baseline.

## Repo Skill

- Repo-generated Codex skill: `.agents/skills/probot/SKILL.md`
- Claude-facing companion skill: `.claude/skills/probot/SKILL.md`
- Keep user-specific credentials and private MCPs in `~/.codex/config.toml`, not in this repo.

## MCP Baseline

Treat `.codex/config.toml` as the default ECC-safe baseline for work in this repository.
The generated baseline enables GitHub, Context7, Exa, Memory, Playwright, and Sequential Thinking.

## Multi-Agent Support

- Explorer: read-only evidence gathering
- Reviewer: correctness, security, and regression review
- Docs researcher: API and release-note verification

## Workflow Files

- `.claude/commands/feature-development-with-docs-and-tests.md`
- `.claude/commands/bot-factory-module-enhancement.md`
- `.claude/commands/ai-model-provider-integration.md`

Use these workflow files as reusable task scaffolds when the detected repository workflows recur.