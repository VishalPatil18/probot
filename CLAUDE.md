# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding

> Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- Do not introduce any assumptions that cannot realistically be implemented. Keep all plans and technical choices strictly realistic.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

---

## 2. Simplicity First

> Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: _"Would a senior engineer say this is overcomplicated?"_ If yes, simplify.

---

## 3. Surgical Changes

> Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test:** Every changed line should trace directly to the user's request.

---

## 4. Goal-Driven Execution

> Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- `"Add validation"` → "Write tests for invalid inputs, then make them pass"
- `"Fix the bug"` → "Write a test that reproduces it, then make it pass"
- `"Refactor X"` → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. Teach & Explain (Hands-on Learning)

> Act as an interactive mentor. Explain the mechanics.

For every prompt and task, don't just output code — help the user understand the codebase and architectural changes in detail.

- Break down and teach what the implementation is doing under the hood, with specific emphasis on anything related to Retrieval-Augmented Generation (RAG) or Generative AI (GenAI).
- Provide concrete, detailed examples to illustrate complex concepts like vector embeddings, semantic search, prompt engineering, or LLM integrations.

---

## 6. Permanent Bug Fixes & Pre-Approval

> No temporary patches. Build robust, approved solutions.

- Do not write quick, temporary "band-aid" patches to bypass a bug.
- Investigate the issue to target the root cause and provide a robust, permanent fix.

**Approval Workflow:** For any bug, draft a clear explanation of what is broken, why it broke, and how you plan to fix it. Present this plan to the user and get explicit approval before making changes to the codebase.

---

## 7. Strict Zero-Cost Policy

> Ensure zero financial overhead.

Do not introduce, use, or recommend any technologies, services, libraries, or deployment strategies that incur monetary costs.

This includes avoiding paid APIs, paid database tiers, premium cloud storage, or hosting platforms with fees. Everything must be 100% free-tier, open-source, or run locally.

---

## 8. Frontend & Design System Guidelines

> Consistently match the design tokens and system aesthetics.

- Strictly follow the design system guidelines and specifications defined in the `./design` directory.
- Avoid using inline CSS styling.
- Maximize the use of Tailwind CSS utility classes for layouts, responsiveness, and frontend UI components.

---

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, clarifying questions come before implementation rather than after mistakes, and the user understands the codebase and RAG/GenAI concepts hands-on without unexpected costs.
