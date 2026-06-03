# Project Context

> **Purpose:** Living log of work done on this project. Claude Code reads this at the start of every session to understand prior state before acting. Append a new entry after each meaningful prompt — do not rewrite history.

---

## How to Use This File

**At session start (Claude):**

1. Read this file top-to-bottom.
2. Read the "Current State" section to know where things stand.
3. Read the latest 2-3 entries in "Session History" for recent context.
4. Only then begin the user's task.

**After completing each prompt (Claude):**

1. Append a new entry to **Session History** with: date, prompt summary, what changed, files touched, decisions made, open questions.
2. Update **Current State** if architecture, stack, or status materially changed.
3. Update **Open Questions / TODOs** as items are added or resolved.
4. Never delete past entries — this is an append-only log.

---

## Project Overview

- **Name:** probot
- **Location:** `/Users/vishalpatil/Study/Projects/probot`
- **Status:** Planning phase — no source code yet
- **Planning docs:** [claude/plan.md](claude/plan.md), [claude/srs.md](claude/srs.md), [claude/vai.md](claude/vai.md)

_To be filled in as the project takes shape:_

- **Goal:**
- **Target users:**
- **Core value:**

---

## Current State

### Tech Stack

_Not yet chosen._

- Language:
- Framework:
- Database:
- Deployment:

### Architecture

_Not yet defined._

### Repository Layout

```
probot/
├── CLAUDE.md          # Behavioral guidelines for Claude
├── context.md         # This file — session-by-session context log
└── claude/
    ├── plan.md        # Project plan
    ├── srs.md         # Software requirements spec
    └── vai.md         # (purpose TBD)
```

### Build / Run / Test Commands

_None yet._

---

## Key Decisions

_Architectural and product decisions, in chronological order. Each entry: date, decision, rationale, alternatives rejected._

- _(none yet)_

---

## Open Questions / TODOs

- [ ] Define project goal and scope from `claude/srs.md`
- [ ] Choose tech stack
- [ ] Set up initial repo structure
- [ ] Decide whether `CLAUDE.md` should explicitly instruct Claude to read & update `context.md` each session

---

## Session History

> Append-only. Newest entry at the bottom. Each entry follows the template below.

### Template (copy for each new entry)

```
### YYYY-MM-DD HH:MM — <one-line prompt summary>

**Prompt:** <verbatim or paraphrased user request>

**What I did:**
- <action>

**Files changed:**
- `path/to/file` — <create | update | delete> — <why>

**Decisions made:**
- <decision and rationale>

**Open questions / follow-ups:**
- <item>
```

---

### 2026-06-02 — Bootstrap context.md

**Prompt:** Build a `context.md` file where details of the code are appended after each prompt, so Claude Code can read prior project history before acting.

**What I did:**

- Inspected the project — found planning docs in `claude/` but no source code yet.
- Created `context.md` at repo root with: usage instructions for Claude, project overview, current state, key decisions, open questions, and an append-only session history.

**Files changed:**

- `context.md` — create — establish the persistent context log.

**Decisions made:**

- Placed file at repo root (not under `claude/`) so it sits next to `CLAUDE.md` and is the obvious second file to read.
- Append-only log format — past entries are never edited; only "Current State", "Open Questions", and "Key Decisions" sections are mutated.
- Kept structure lightweight: no rigid schema, just a copy-paste template entry that future sessions follow.

**Open questions / follow-ups:**

- Should `CLAUDE.md` be edited to explicitly tell Claude "read context.md first, append an entry last"? Recommend yes — without it, future sessions may forget the protocol.
