# ProBot

> A SaaS for building personalized AI chatbots that represent job seekers and help recruiters screen candidates instantly.

Job seekers build a personalized AI chatbot from their own career data (resume, LinkedIn, portfolio). Recruiters get instant answers to screen a candidate up front — without scheduling calls or waiting on email replies.

**Status:** Planning phase. No source code yet — planning documents and design mockups only. See [`claude/plan.md`](claude/plan.md) and [`claude/srs.md`](claude/srs.md) for the full specification.

---

## What it does

- **For job seekers:** Upload career data (PDFs, URLs, text). ProBot vectorizes it and generates a personalized AI chatbot at `probot.com/u/{username}` — also embeddable on any site via a `<script>` tag.
- **For recruiters:** Ask any candidate's bot questions ("Has she shipped production RAG?", "What's his notice period?") and get grounded answers in seconds.
- **For both:** A dashboard with engagement analytics and captured recruiter leads.

## Planned Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Supabase / Neon) |
| ORM | Drizzle |
| Auth | NextAuth |
| Vector store | Supabase pgvector (TBD) |
| LLM | **Bring your own key** — Anthropic, Google, DeepSeek, OpenAI, etc. Keys stored locally only, never tracked by ProBot. |
| Hosting | Vercel (also self-hostable on any Node 20+ host) |

## Repository Layout

```
probot/
├── CLAUDE.md          # Behavioral guidelines for Claude Code sessions
├── README.md          # This file
├── claude/            # Planning documents
│   ├── context.md     # Append-only session log
│   ├── plan.md        # Implementation plan
│   ├── srs.md         # Software Requirements Specification
│   └── vai.md         # Reference: VAi (the single-tenant predecessor)
└── design/            # Static HTML/Tailwind design mockups
    ├── index.html
    ├── login.html
    ├── dashboard.html
    ├── bot-factory.html
    ├── chat.html
    ├── settings.html
    └── docs.html
```

## Roadmap

1. **Foundation + Auth + BYO-key text chat** — Next.js scaffold, Postgres schema, NextAuth, multi-provider LLM client.
2. **Knowledge ingestion + RAG** — PDF/URL/text upload, embeddings, pgvector retrieval.
3. **Public bot URLs + embeddable widget** — `/u/{username}` routes and `<script>`-tag widget.
4. **Dashboard + analytics + lead capture.**

## Principles

- **Zero-cost by default.** Free tiers, open source, or local. No paid services required to run.
- **Open source.** MIT licensed.
- **Privacy-respecting BYO-key.** API keys never leave the user's browser/local config.

## License

MIT (planned).
