# Software Requirements Specification (SRS)

## ProBot - A SaaS for Building Personalized AI Chatbots that Represent Job Seekers and Help Recruiters Screen Candidates Instantly

> ...where job seekers build a personalized AI chatbot from their own career data, and recruiters get instant answers to screen a candidate up front - without the delay of scheduling calls or meetings.

**Version**: 1.0
**Date**: June 3, 2026
**Based on**: VAi (Vishal's AI Assistant) implementation pattern

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Specific Requirements](#3-specific-requirements)
4. [System Features](#4-system-features)
5. [External Interface Requirements](#5-external-interface-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Database Design](#7-database-design)
8. [API Specification](#8-api-specification)
9. [Security Requirements](#9-security-requirements)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Future Enhancements (V2)](#11-future-enhancements-v2)
12. [Assumptions & Constraints](#12-assumptions--constraints)
13. [Appendix](#13-appendix)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for **ProBot**, a SaaS platform that enables job seekers to create personalized AI chatbots that act as their 24/7 digital recruiters. This document serves as the primary reference for development, testing, and stakeholder alignment.

### 1.2 Scope

ProBot transforms the existing single-user VAi chatbot (built for Vishal Patil's portfolio) into a multi-tenant SaaS platform. The system allows any job seeker to:

- Upload career data (resumes, LinkedIn profiles, portfolios)
- Generate a personalized AI chatbot that answers recruiter questions
- Deploy the chatbot via a unique URL or embeddable widget
- Track engagement and capture recruiter leads

**In Scope:**

- Multi-tenant user registration and authentication
- PDF/URL/text data ingestion and vectorization
- RAG (Retrieval-Augmented Generation) pipeline for contextual AI responses
- Unique URL routing per user (`ProBot.com/u/{username}`)
- Embeddable widget (script tag)
- User dashboard with analytics and lead tracking
- Open-source distribution (MIT licensed); free to use and to self-host
- Bring-your-own-key LLM configuration (Anthropic, Google, OpenAI, Azure) with local-only key storage - keys are never tracked by ProBot

**Out of Scope (V1):**

- Voice mode
- Interview simulation
- Company IP tracking/enrichment
- Mobile native applications

### 1.3 Definitions, Acronyms, and Abbreviations

| Term                | Definition                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **RAG**             | Retrieval-Augmented Generation - technique that fetches relevant context before generating AI responses |
| **Vector Database** | Database optimized for storing and querying high-dimensional vector embeddings                          |
| **Embeddings**      | Numerical vector representations of text used for semantic similarity search                            |
| **Tenant**          | An individual user (job seeker) of the platform                                                         |
| **Bot**             | A personalized AI chatbot instance created by a tenant                                                  |
| **Recruiter**       | An end-user (hiring manager, recruiter) who interacts with a tenant's bot                               |
| **Knowledge Base**  | The collection of career data (resume, bio, etc.) that powers a bot's responses                         |
| **Widget**          | An embeddable JavaScript component for third-party websites                                             |
| **Slug**            | A URL-friendly identifier derived from a username (e.g., `jane-doe`)                                    |

### 1.4 References

- **VAi Implementation**: Existing single-user chatbot (see `vai.md` for complete technical documentation)
- **OpenAI API Documentation**: https://platform.openai.com/docs
- **Pinecone Vector Database**: https://docs.pinecone.io
- **Next.js Documentation**: https://nextjs.org/docs
- **LangChain Documentation**: https://js.langchain.com/docs

### 1.5 Overview

This document is organized into sections covering overall system description, specific functional requirements, system features, interface requirements, non-functional requirements, database design, API specifications, security requirements, and deployment strategy.

---

## 2. Overall Description

### 2.1 Product Perspective

ProBot evolves from the VAi chatbot, which is a single-tenant implementation embedded in a personal portfolio. The key architectural shifts are:

| Aspect               | VAi (Current)                  | ProBot (Target)                                                                                           |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Tenancy**          | Single user (Vishal)           | Multi-tenant (any job seeker)                                                                             |
| **Data Source**      | Hardcoded `vaiContext.js` file | Dynamic per-user knowledge base with vector storage                                                       |
| **AI Provider**      | Azure OpenAI (gpt-4o-mini)     | User-supplied (BYO key): Anthropic Claude, Google Gemini, OpenAI GPT, etc. - key stored locally |
| **Context Delivery** | Full JSON in system prompt     | RAG pipeline with top-K chunk retrieval                                                                   |
| **Deployment**       | Embedded in portfolio site     | Standalone platform + embeddable widget                                                                   |
| **Authentication**   | None                           | User registration/login with email/OAuth                                                                  |
| **Rate Limiting**    | Per-IP in-memory               | Per-Bot-ID with Redis-backed persistence                                                                  |
| **Analytics**        | None                           | Dashboard with conversation logs and lead tracking                                                        |

### 2.2 Product Functions (High-Level)

1. **User Onboarding**: Registration, profile setup, data ingestion
2. **Bot Creation ("Bot Factory")**: Configure identity, upload knowledge base, set personality
3. **Data Processing**: PDF parsing, text extraction, vectorization, embedding storage
4. **Chat Interface**: Public-facing AI chat with RAG-powered responses
5. **Deployment Options**: Unique URL, embeddable widget, email signature badge
6. **Dashboard**: Analytics, lead management, knowledge base updates
7. **Lead Capture**: Automatic email collection from recruiters after N messages

### 2.3 User Classes and Characteristics

| User Class               | Description                                                   | Technical Level |
| ------------------------ | ------------------------------------------------------------- | --------------- |
| **Job Seeker (Tenant)**  | Creates and manages their bot. Primary paying customer.       | Low to Medium   |
| **Recruiter (End User)** | Interacts with bots to evaluate candidates.                   | Low             |
| **Platform Admin**       | Manages platform operations, monitors usage, handles support. | High            |

### 2.4 Operating Environment

- **Client**: Modern web browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- **Server**: Node.js 20+ runtime, deployed on Vercel or similar edge platform
- **Database**: PostgreSQL (relational) + Pinecone/Supabase Vector (embeddings)
- **Cache**: Redis (rate limiting, session management)
- **AI**: User-configured LLM provider via BYO API key (Anthropic Claude, Google Gemini, OpenAI GPT, etc.); key stored locally, never tracked by ProBot

### 2.5 Design and Implementation Constraints

1. **LLM Provider Dependency (BYO Key)**: Core functionality depends on the user's chosen LLM provider's availability and on the validity of the user-supplied API key. ProBot ships no LLM credentials of its own; the key is stored locally and never sent to ProBot servers
2. **Vector Database Limits**: Free-tier Pinecone has index size and query limits
3. **Token Limits**: OpenAI models have context window limits affecting knowledge base size
4. **Vercel Serverless Limits**: 10s default timeout for API routes (extendable to 60s on Pro)
5. **GDPR/Privacy**: Must handle user career data responsibly with clear data retention policies

### 2.6 User Journey

```
Phase 1: Onboarding & Data Ingestion
    Landing Page -> Sign Up -> "Bot Factory" Form
    |-- Identity: Name, Headline, Profile Photo
    |-- Knowledge Base: PDF Upload / URL Input / Text Area
    |-- Personality: Professional / Creative / Enthusiastic
    |-- AI Model: Select provider + model, enter API key (stored locally, never tracked)
    |-- Processing: Parse -> Chunk -> Vectorize -> Store

Phase 2: Deployment & Unique Routing
    Bot Created -> Unique URL Generated (ProBot.com/u/jane-doe/chat)
    |-- Share URL directly
    |-- Embed widget on portfolio site
    |-- Add to LinkedIn / email signature

Phase 3: Recruiter Interaction
    Recruiter visits URL or widget -> Chat Interface
    |-- Asks questions about candidate
    |-- RAG retrieves relevant context chunks
    |-- AI generates personalized responses
    |-- After 3-4 messages: lead capture prompt

Phase 4: Analytics & Management
    Job Seeker Dashboard
    |-- View conversation logs
    |-- See "Lead Insights" (who chatted)
    |-- Update knowledge base
    |-- Customize bot personality
```

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### FR-001: User Registration and Authentication

| ID       | Requirement                                                                                     | Priority | Rationale                            |
| -------- | ----------------------------------------------------------------------------------------------- | -------- | ------------------------------------ |
| FR-001.1 | System SHALL support email/password registration                                                | High     | Core access control                  |
| FR-001.2 | System SHALL support OAuth login (Google, GitHub, LinkedIn)                                     | Medium   | Reduce friction for tech-savvy users |
| FR-001.3 | System SHALL enforce unique usernames that serve as URL slugs                                   | High     | Required for unique bot URLs         |
| FR-001.4 | System SHALL validate username format: lowercase alphanumeric and hyphens only, 3-30 characters | High     | URL compatibility                    |
| FR-001.5 | System SHALL send email verification on registration                                            | High     | Prevent spam/abuse                   |
| FR-001.6 | System SHALL support password reset via email                                                   | High     | Standard auth requirement            |
| FR-001.7 | System SHALL hash passwords using bcrypt with minimum 10 salt rounds                            | High     | Security best practice               |

**Dependency**: Authentication provider (NextAuth.js, as used in VAi's existing `next-auth` dependency)

#### FR-002: Bot Creation ("Bot Factory")

| ID        | Requirement                                                                                                                                          | Priority | Rationale                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------- |
| FR-002.1  | System SHALL provide a multi-step form for bot creation                                                                                              | High     | Core feature                |
| FR-002.2  | System SHALL accept bot identity fields: Name, Headline (max 120 chars), Profile Photo (max 2MB, jpg/png/webp)                                       | High     | Bot personalization         |
| FR-002.3  | System SHALL accept knowledge base input via PDF upload (max 10MB, max 5 files)                                                                      | High     | Resume ingestion            |
| FR-002.4  | System SHALL accept knowledge base input via URL (LinkedIn profile, portfolio site)                                                                  | Medium   | Additional data sources     |
| FR-002.5  | System SHALL accept knowledge base input via free-text area (max 50,000 characters)                                                                  | High     | Custom bio/details          |
| FR-002.6  | System SHALL offer personality presets: Professional, Creative, Enthusiastic                                                                         | Medium   | Tone customization          |
| FR-002.7  | System SHALL allow custom system prompt instructions (max 2,000 characters)                                                                          | Low      | Advanced customization      |
| FR-002.8  | System SHALL allow theme color selection for the chat interface                                                                                      | Low      | Brand customization         |
| FR-002.9  | System SHALL generate a unique URL slug upon bot creation                                                                                            | High     | Deployment requirement      |
| FR-002.10 | System SHALL allow users to preview their bot before publishing                                                                                      | Medium   | Quality assurance           |
| FR-002.11 | System SHALL provide an "AI Model" step to select an LLM provider (Anthropic, Google, OpenAI, Azure) and a specific model (v1.1)            | High     | BYO-key core requirement    |
| FR-002.12 | System SHALL accept the user's LLM API key and store it locally (browser / self-hosted config) only - never transmitting it to ProBot servers (v1.1) | High     | Privacy / BYO-key guarantee |

#### FR-003: Data Ingestion and Processing Pipeline

| ID        | Requirement                                                                                                                                                                                                                        | Priority | Rationale                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------- |
| FR-003.1  | System SHALL extract text from uploaded PDF files using `pdf-parse` or equivalent                                                                                                                                                  | High     | Resume processing             |
| FR-003.2  | System SHALL scrape and extract text from provided LinkedIn/portfolio URLs                                                                                                                                                         | Medium   | Additional data sources       |
| FR-003.3  | System SHALL chunk extracted text into segments of 500-1000 tokens with 100-token overlap                                                                                                                                          | High     | Optimal retrieval granularity |
| FR-003.4  | System SHALL generate vector embeddings for each text chunk using the configured provider's embedding model (e.g., OpenAI `text-embedding-3-small`, or a provider equivalent), authenticated with the user-supplied API key (v1.1) | High     | Semantic search capability    |
| FR-003.5  | System SHALL store embeddings in a vector database (Pinecone or Supabase Vector) namespaced by Bot ID                                                                                                                              | High     | Multi-tenant isolation        |
| FR-003.6  | System SHALL store original text chunks in the relational database linked to Bot ID                                                                                                                                                | High     | Reference and debugging       |
| FR-003.7  | System SHALL complete ingestion processing within 60 seconds for a standard resume (1-3 pages)                                                                                                                                     | Medium   | User experience               |
| FR-003.8  | System SHALL display processing progress to the user                                                                                                                                                                               | Medium   | Transparency                  |
| FR-003.9  | System SHALL support re-ingestion when knowledge base is updated                                                                                                                                                                   | High     | Data freshness                |
| FR-003.10 | System SHALL validate uploaded files for malware/malicious content                                                                                                                                                                 | High     | Security                      |

**Dependency**: OpenAI Embeddings API, Vector Database service

#### FR-004: RAG (Retrieval-Augmented Generation) Pipeline

| ID       | Requirement                                                                                                                                                      | Priority | Rationale                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- |
| FR-004.1 | System SHALL convert recruiter questions into vector embeddings at query time                                                                                    | High     | Semantic matching         |
| FR-004.2 | System SHALL retrieve top 3 most relevant text chunks from the bot's knowledge base                                                                              | High     | Context provision         |
| FR-004.3 | System SHALL construct a dynamic system prompt incorporating retrieved chunks                                                                                    | High     | Contextual responses      |
| FR-004.4 | System SHALL include bot identity and personality settings in the system prompt                                                                                  | High     | Personalization           |
| FR-004.5 | System SHALL send the constructed prompt + user message to the user's configured LLM provider for completion, authenticated with the user's local API key (v1.1) | High     | Response generation       |
| FR-004.6 | System SHALL enforce a maximum response length of 500 tokens                                                                                                     | Medium   | Cost control, conciseness |
| FR-004.7 | System SHALL use temperature 0.3 for factual accuracy (matching VAi's configuration)                                                                             | Medium   | Response quality          |
| FR-004.8 | System SHALL gracefully handle cases where no relevant context is found                                                                                          | High     | User experience           |

**Rationale for top-3 retrieval**: VAi uses full-context injection (entire `vaiContext.js` as JSON in system prompt). For multi-tenant scale, this is replaced with RAG to stay within token limits and reduce costs. Top-3 chunks provide sufficient context while keeping prompt size manageable.

#### FR-005: Chat Interface

| ID        | Requirement                                                                                          | Priority | Rationale                   |
| --------- | ---------------------------------------------------------------------------------------------------- | -------- | --------------------------- |
| FR-005.1  | System SHALL provide a full-page chat interface at `ProBot.com/u/{username}/chat`                    | High     | Primary interaction surface |
| FR-005.2  | System SHALL display the bot owner's name, headline, and profile photo                               | High     | Trust and context           |
| FR-005.3  | System SHALL render assistant responses as Markdown (matching VAi's `react-markdown` implementation) | High     | Rich text support           |
| FR-005.4  | System SHALL auto-linkify email addresses with `mailto:` protocol                                    | Medium   | Contact facilitation        |
| FR-005.5  | System SHALL display suggested questions on first visit (configurable by bot owner)                  | Medium   | Engagement                  |
| FR-005.6  | System SHALL support auto-expanding textarea input (max height 120px, matching VAi)                  | Medium   | UX consistency              |
| FR-005.7  | System SHALL enforce 8,000 character max input length (matching VAi)                                 | High     | Input validation            |
| FR-005.8  | System SHALL display loading animation while awaiting AI response                                    | Medium   | UX feedback                 |
| FR-005.9  | System SHALL be fully responsive (desktop dialog + mobile full-screen, matching VAi pattern)         | High     | Cross-device support        |
| FR-005.10 | System SHALL support Enter to send, Shift+Enter for newline (matching VAi)                           | Medium   | UX convention               |
| FR-005.11 | System SHALL display rate limit messages with alternative contact options                            | High     | Graceful degradation        |
| FR-005.12 | System SHALL auto-scroll to latest message                                                           | Medium   | UX                          |
| FR-005.13 | System SHALL auto-focus input field on chat open and after response received                         | Medium   | UX                          |

#### FR-006: Embeddable Widget

| ID       | Requirement                                                                                              | Priority | Rationale               |
| -------- | -------------------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| FR-006.1 | System SHALL provide a JavaScript widget embeddable via `<script>` tag                                   | High     | Distribution channel    |
| FR-006.2 | Widget SHALL be loaded via: `<script src="https://ProBot.com/widget.js" data-bot-id="USER_ID"></script>` | High     | Standard embed pattern  |
| FR-006.3 | Widget SHALL render as a floating chat bubble (bottom-right corner)                                      | High     | Non-intrusive placement |
| FR-006.4 | Widget SHALL be self-contained (single-file component pattern, as recommended by VAi architecture)       | High     | Easy embedding          |
| FR-006.5 | Widget SHALL not conflict with host page CSS or JavaScript                                               | High     | Embed safety            |
| FR-006.6 | Widget SHALL support customizable theme color (matching bot settings)                                    | Medium   | Brand consistency       |
| FR-006.7 | Widget SHALL be under 50KB gzipped                                                                       | Medium   | Performance             |
| FR-006.8 | Widget SHALL communicate with ProBot API via CORS-enabled endpoints                                      | High     | Cross-origin operation  |

#### FR-007: User Dashboard

| ID        | Requirement                                                                                                           | Priority | Rationale                        |
| --------- | --------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| FR-007.1  | System SHALL provide a dashboard for authenticated users                                                              | High     | Bot management                   |
| FR-007.2  | Dashboard SHALL display total conversations count                                                                     | High     | Engagement tracking              |
| FR-007.3  | Dashboard SHALL display total messages count                                                                          | Medium   | Usage tracking                   |
| FR-007.4  | Dashboard SHALL display captured leads (emails)                                                                       | High     | Core value proposition           |
| FR-007.5  | Dashboard SHALL allow viewing individual conversation logs                                                            | Medium   | Insight into recruiter interests |
| FR-007.6  | Dashboard SHALL allow updating knowledge base (re-upload/re-ingest)                                                   | High     | Data freshness                   |
| FR-007.7  | Dashboard SHALL allow modifying bot personality and prompt settings                                                   | Medium   | Customization                    |
| FR-007.8  | Dashboard SHALL display the bot's unique URL and embed code snippet                                                   | High     | Deployment facilitation          |
| FR-007.9  | Dashboard SHALL display usage statistics and configured rate-limit status (no subscription tiers) (v1.1)              | Medium   | Transparency                     |
| FR-007.10 | Dashboard SHALL display the active LLM provider/model and API-key status (e.g., "key active · stored locally") (v1.1) | High     | BYO-key visibility               |

#### FR-008: Lead Capture

| ID       | Requirement                                                                                             | Priority | Rationale               |
| -------- | ------------------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| FR-008.1 | Bot SHALL prompt for recruiter email after 3-4 messages in a conversation                               | High     | Lead generation         |
| FR-008.2 | Lead capture message SHALL be: "Would you like to leave your email so [User Name] can get back to you?" | High     | Friendly, non-intrusive |
| FR-008.3 | System SHALL validate email format before storing                                                       | High     | Data quality            |
| FR-008.4 | System SHALL notify bot owner (via email) when a new lead is captured                                   | Medium   | Timely follow-up        |
| FR-008.5 | System SHALL store leads with conversation context and timestamp                                        | High     | Follow-up context       |
| FR-008.6 | Lead capture SHALL be optional and skippable by the recruiter                                           | High     | Non-blocking UX         |

#### FR-009: Dynamic System Prompt Construction

| ID       | Requirement                                                                                                                                         | Priority | Rationale             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------- |
| FR-009.1 | System SHALL construct per-bot system prompts following VAi's layered architecture                                                                  | High     | Proven pattern        |
| FR-009.2 | System prompt SHALL include identity: "You are the AI assistant for [User Name]"                                                                    | High     | Personalization       |
| FR-009.3 | System prompt SHALL include immutable rules (identity lock, context-only constraint, prompt protection) adapted from VAi's 7-rule system            | High     | Security              |
| FR-009.4 | System prompt SHALL include personality tone instructions based on selected preset                                                                  | Medium   | Customization         |
| FR-009.5 | System prompt SHALL include retrieved RAG context chunks                                                                                            | High     | Factual grounding     |
| FR-009.6 | System prompt SHALL include fallback instruction: "If the answer isn't in the context, politely suggest the recruiter contact [User Name] directly" | High     | Graceful handling     |
| FR-009.7 | System prompt SHALL include recruiter mode detection (matching VAi pattern)                                                                         | Medium   | Enhanced recruiter UX |
| FR-009.8 | System prompt SHALL include response style guidelines (short, conversational, no filler) matching VAi                                               | Medium   | Quality               |

#### FR-010: Open-Source Distribution & BYO-Key LLM Configuration

> **Changed in v1.1.** This requirement replaces the former "Subscription and Tier Management." ProBot is free, open-source software with no paid tiers, no billing, and no Stripe integration. Users bring their own LLM API key, which is stored locally and never tracked by ProBot.

| ID       | Requirement                                                                                                                                                                                                                  | Priority | Rationale                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------- |
| FR-010.1 | System SHALL be distributed as free, open-source software under a permissive license (MIT)                                                                                                                                   | High     | Open-source product model  |
| FR-010.2 | System SHALL make all features (unlimited bots, messages, analytics, lead capture, custom branding) available at no charge                                                                                                   | High     | No paywalls                |
| FR-010.3 | System SHALL support self-hosting via the public repository, configured through a local config file / environment                                                                                                            | High     | User control & portability |
| FR-010.4 | System SHALL let users select an LLM provider and model from supported options: Anthropic (Claude Opus / Sonnet / Haiku), Google (Gemini), OpenAI (GPT), Azure OpenAI                                                            | High     | BYO-key core requirement   |
| FR-010.5 | System SHALL accept a user-supplied API key for the selected provider and store it locally only (browser local storage / self-hosted config); the key SHALL NEVER be transmitted to, logged by, or tracked by ProBot servers | High     | Privacy guarantee          |
| FR-010.6 | System SHALL allow users to switch providers/models and update or remove their API key at any time                                                                                                                           | Medium   | Flexibility                |
| FR-010.7 | System SHALL surface API-key status (active / invalid) without persisting the key server-side                                                                                                                                | Medium   | UX & trust                 |
| FR-010.8 | System SHALL keep all API-key telemetry permanently disabled; any optional anonymous usage telemetry SHALL be opt-in and off by default                                                                                      | High     | Privacy-by-default         |
| FR-010.9 | System SHALL provide configurable rate limits (per-recruiter, per-bot, max message length) to protect users' own LLM credits, with sensible defaults                                                                         | Medium   | Abuse / cost protection    |

---

## 4. System Features

### 4.1 Feature: Bot Factory (Bot Creation Wizard)

**Description**: A guided multi-step form that walks job seekers through creating their personalized AI chatbot.

**Steps**:

1. **Identity Setup**: Name, headline, profile photo upload
2. **Knowledge Base Upload**: PDF upload, URL input, or text area entry
3. **Personality Configuration**: Select tone preset, optional custom instructions
4. **AI Model** _(v1.1)_: Select LLM provider and model, enter the API key (stored locally, never tracked by ProBot)
5. **Preview & Deploy**: Test the bot, get the unique URL and embed code

**Stimulus/Response**:

- User completes form and clicks "Create Bot"
- System processes uploads, generates embeddings, creates bot record
- System returns unique URL and embed code snippet
- Bot is immediately accessible at the generated URL

**Priority**: High

### 4.2 Feature: RAG-Powered Chat

**Description**: The core AI chat experience that uses Retrieval-Augmented Generation to answer recruiter questions based on the candidate's specific career data.

**Architecture** (adapted from VAi):

```
Recruiter Question
    |
    v
Embed question (configured provider embedding model, e.g., text-embedding-3-small)
    |
    v
Query vector DB (namespace: bot_id, top_k: 3)
    |
    v
Build system prompt (identity + rules + personality + retrieved chunks)
    |
    v
LLM completion via user's provider/model (Claude / Gemini / GPT / Azure-OpenAI; temp: 0.3, max_tokens: 500), authenticated with the user's local API key
    |
    v
Sanitize output (adapted from VAi's sanitizeOutput)
    |
    v
Return response
```

**Key Difference from VAi**: VAi injects the entire context (440+ lines of JSON) into the system prompt. ProBot uses RAG to retrieve only the top 3 relevant chunks, enabling support for much larger knowledge bases while staying within token limits.

**Priority**: High

### 4.3 Feature: Embeddable Chat Widget

**Description**: A lightweight, self-contained JavaScript widget that users can embed on their personal portfolio sites.

**Implementation Pattern** (from VAi architecture recommendation):

- Single-file component approach for easy embedding
- Shadow DOM isolation to prevent CSS conflicts
- Communication via ProBot API with CORS headers
- Floating bubble UI (bottom-right, matching VAi's positioning pattern)

**Embed Code**:

```html
<script src="https://ProBot.com/widget.js" data-bot-id="USER_ID"></script>
```

**Priority**: High

### 4.4 Feature: Lead Insights Dashboard

**Description**: Analytics dashboard showing who interacted with the bot and what they asked about.

**Metrics**:

- Total conversations and messages
- Captured leads (emails) with conversation context
- Most frequently asked topics
- Conversation timeline
- Usage vs. configured rate limits

**Priority**: Medium

### 4.5 Feature: Multi-Tenant Routing

**Description**: URL-based tenant resolution that serves the correct bot for each user.

**Routing Pattern**:

```
ProBot.com/u/{username}/chat  ->  Resolve username -> Load bot config -> Render chat
ProBot.com/u/{username}       ->  Redirect to /chat
```

**Implementation**: Next.js dynamic routes with middleware for tenant resolution (matching the recommended multi-tenancy middleware pattern).

**Priority**: High

---

## 5. External Interface Requirements

### 5.1 User Interfaces

#### 5.1.1 Landing Page

- Hero section with value proposition: "Don't just send a resume; send a representative"
- Live demo widget showing a sample bot interaction
- Open-source section: free to use, self-hostable, and bring-your-own-key (keys stored locally, never tracked)
- Call-to-action: "Create Your Bot in 2 Minutes"
- Social proof / testimonials section

#### 5.1.2 Bot Factory Form

- Multi-step wizard with progress indicator
- Drag-and-drop PDF upload zone
- URL input with validation and preview
- Rich text area for custom bio
- Personality preset selector with preview of tone
- AI Model step _(v1.1)_: provider selector (Anthropic / Google / OpenAI / Azure), model dropdown, and API-key field with a "stored locally, never tracked" assurance
- Live bot preview panel

#### 5.1.3 Public Chat Interface

- Clean, minimalist design branded to the bot owner
- Bot owner's name, headline, and photo in header
- Message bubbles: user (right-aligned), bot (left-aligned) - matching VAi's pattern
- Suggested questions on first visit
- Auto-expanding input with character count
- Loading animation (adapted from VAi's rotating messages)
- Markdown rendering for responses
- Rate limit message with alternative contact options

#### 5.1.4 Dashboard

- Overview cards: Total conversations, messages, leads
- Conversation list with search and filter
- Lead management table with export
- Knowledge base management (upload/edit/delete)
- Bot settings panel
- Embed code copy section
- AI model & API-key management (provider / model selection, local key status)

#### 5.1.5 Embeddable Widget

- Floating circular button (bottom-right, matching VAi's `.chatbot-btn-ring` pattern)
- Expandable chat dialog
- Minimal branding (small "Powered by ProBot" footer)
- Responsive: adapts to host page viewport

### 5.2 Hardware Interfaces

No specific hardware interfaces required. The system is web-based and accessed via standard browsers.

### 5.3 Software Interfaces

| Interface | System                                                                           | Protocol          | Purpose                                                                      |
| --------- | -------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| SI-001    | LLM Provider APIs (user-supplied key): Anthropic, Google, OpenAI, Azure | HTTPS REST        | Chat completions and embeddings, authenticated with the user's local API key |
| SI-002    | Pinecone / Supabase Vector                                                       | HTTPS REST        | Vector storage and similarity search                                         |
| SI-003    | PostgreSQL                                                                       | TCP (pg protocol) | Relational data storage                                                      |
| SI-004    | Redis                                                                            | TCP               | Rate limiting, caching, sessions                                             |
| SI-005    | _(removed in v1.1)_ -                                                            | -                 | Payment processing removed; ProBot is open source with no billing            |
| SI-006    | SendGrid / Resend                                                                | HTTPS REST        | Transactional emails                                                         |
| SI-007    | Vercel Platform                                                                  | Deployment API    | Hosting and serverless functions                                             |
| SI-008    | AWS S3 / Cloudflare R2                                                           | HTTPS REST        | File storage (profile photos, PDFs)                                          |

### 5.4 Communication Interfaces

| Protocol  | Usage                                            |
| --------- | ------------------------------------------------ |
| HTTPS     | All client-server communication                  |
| WebSocket | Optional: Real-time typing indicators (V2)       |
| SMTP      | Email notifications (lead capture, verification) |

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements

| ID      | Requirement                     | Metric            | Rationale                     |
| ------- | ------------------------------- | ----------------- | ----------------------------- |
| NFR-P01 | Chat response latency           | < 3 seconds (P95) | Conversational UX expectation |
| NFR-P02 | Page load time (chat interface) | < 2 seconds (LCP) | User retention                |
| NFR-P03 | Widget load time                | < 1 second        | Non-intrusive embed           |
| NFR-P04 | Data ingestion (1-3 page PDF)   | < 60 seconds      | Onboarding flow               |
| NFR-P05 | Vector similarity search        | < 200ms (P99)     | Part of response pipeline     |
| NFR-P06 | Concurrent users per bot        | 50+ simultaneous  | Viral sharing scenario        |
| NFR-P07 | Dashboard page load             | < 3 seconds       | Standard web app              |

### 6.2 Safety Requirements

| ID      | Requirement                                                                                                                                                                             | Rationale                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| NFR-S01 | System SHALL store the user's LLM API key locally only and SHALL NOT transmit it to, or persist it on, ProBot servers; platform-level secrets SHALL never be exposed client-side (v1.1) | Credential protection / BYO-key privacy |
| NFR-S02 | System SHALL sanitize all user-uploaded files for malware                                                                                                                               | System protection                       |
| NFR-S03 | System SHALL implement circuit breakers for external API calls                                                                                                                          | Graceful degradation                    |
| NFR-S04 | System SHALL provide fallback responses when AI is unavailable                                                                                                                          | Service continuity                      |

### 6.3 Security Requirements

(Detailed in Section 9)

### 6.4 Software Quality Attributes

#### 6.4.1 Availability

- Target: 99.9% uptime (excluding planned maintenance)
- Vercel's infrastructure provides automatic failover

#### 6.4.2 Scalability

- Horizontal scaling via serverless functions (auto-scaling)
- Vector database supports namespace-based multi-tenancy
- Redis cluster for distributed rate limiting

#### 6.4.3 Maintainability

- Modular architecture with clear separation of concerns
- TypeScript for type safety across the codebase
- Comprehensive API documentation

#### 6.4.4 Portability

- Containerizable via Docker for alternative deployment targets
- Database abstraction layer for vector DB provider switching
- AI provider abstraction supporting multiple BYO-key providers (Anthropic, Google, OpenAI, Azure OpenAI) with a user-selectable model

#### 6.4.5 Usability

- Bot creation in under 5 minutes
- Zero technical knowledge required for basic usage
- Embed code copy-paste simplicity

### 6.5 Compliance Requirements

| ID      | Requirement                                                                       | Rationale             |
| ------- | --------------------------------------------------------------------------------- | --------------------- |
| NFR-C01 | System SHALL comply with GDPR data subject rights (access, deletion, portability) | EU users              |
| NFR-C02 | System SHALL display cookie consent for analytics tracking                        | Legal compliance      |
| NFR-C03 | System SHALL provide Terms of Service and Privacy Policy                          | Legal requirement     |
| NFR-C04 | System SHALL support data export for users                                        | Data portability      |
| NFR-C05 | System SHALL delete all user data within 30 days of account deletion              | GDPR right to erasure |

---

## 7. Database Design

### 7.1 Entity-Relationship Overview

```
Users (1) ---< (N) Bots (1) ---< (N) KnowledgeBase
                      |
                      |---< (N) Conversations (1) ---< (N) Messages
                      |
                      |---< (N) Leads
```

### 7.2 Schema Definitions

#### 7.2.1 Users Table

| Column            | Type         | Constraints         | Description                                                                                           |
| ----------------- | ------------ | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`              | UUID         | PK, auto-generated  | Unique user identifier                                                                                |
| `username`        | VARCHAR(30)  | UNIQUE, NOT NULL    | URL slug (lowercase, alphanumeric, hyphens)                                                           |
| `email`           | VARCHAR(255) | UNIQUE, NOT NULL    | Login email                                                                                           |
| `hashed_password` | VARCHAR(255) | NULL (OAuth users)  | bcrypt hashed password                                                                                |
| `oauth_provider`  | VARCHAR(20)  | NULL                | google, github, linkedin                                                                              |
| `oauth_id`        | VARCHAR(255) | NULL                | Provider-specific user ID                                                                             |
| `llm_provider`    | VARCHAR(20)  | DEFAULT 'anthropic' | Selected LLM provider (anthropic, google, openai, azure) - non-sensitive preference only (v1.1) |
| `llm_model`       | VARCHAR(60)  | NULL                | Selected model identifier (e.g., claude-opus-4) - non-sensitive preference only (v1.1)                |
| `email_verified`  | BOOLEAN      | DEFAULT false       | Email verification status                                                                             |
| `created_at`      | TIMESTAMP    | DEFAULT NOW()       | Registration date                                                                                     |
| `updated_at`      | TIMESTAMP    | AUTO-UPDATE         | Last modification                                                                                     |

> **BYO-key note (v1.1):** The user's LLM **API key is intentionally NOT stored in the database.** It is held only in local browser storage / self-hosted config and sent directly to the chosen provider at request time. The `tier` and `stripe_customer_id` columns from v1.0 have been removed; `llm_provider` and `llm_model` store only non-sensitive preferences.

#### 7.2.2 Bots Table

| Column                | Type                                             | Constraints              | Description                                     |
| --------------------- | ------------------------------------------------ | ------------------------ | ----------------------------------------------- |
| `id`                  | UUID                                             | PK, auto-generated       | Unique bot identifier                           |
| `user_id`             | UUID                                             | FK -> Users.id, NOT NULL | Owner reference                                 |
| `name`                | VARCHAR(100)                                     | NOT NULL                 | Bot display name                                |
| `headline`            | VARCHAR(120)                                     | NULL                     | Short description                               |
| `profile_photo_url`   | VARCHAR(500)                                     | NULL                     | S3/R2 URL for photo                             |
| `personality`         | ENUM('professional', 'creative', 'enthusiastic') | DEFAULT 'professional'   | Tone preset                                     |
| `custom_instructions` | TEXT                                             | NULL                     | Custom system prompt additions (max 2000 chars) |
| `theme_color`         | VARCHAR(7)                                       | DEFAULT '#3B82F6'        | Hex color for UI                                |
| `suggested_questions` | JSONB                                            | NULL                     | Array of suggested question strings             |
| `is_active`           | BOOLEAN                                          | DEFAULT true             | Bot enabled/disabled                            |
| `created_at`          | TIMESTAMP                                        | DEFAULT NOW()            | Creation date                                   |
| `updated_at`          | TIMESTAMP                                        | AUTO-UPDATE              | Last modification                               |

#### 7.2.3 KnowledgeBase Table

| Column         | Type                       | Constraints             | Description                  |
| -------------- | -------------------------- | ----------------------- | ---------------------------- |
| `id`           | UUID                       | PK, auto-generated      | Unique chunk identifier      |
| `bot_id`       | UUID                       | FK -> Bots.id, NOT NULL | Associated bot               |
| `source_type`  | ENUM('pdf', 'url', 'text') | NOT NULL                | Data source type             |
| `source_name`  | VARCHAR(255)               | NULL                    | Original filename or URL     |
| `content_text` | TEXT                       | NOT NULL                | Raw text chunk               |
| `vector_id`    | VARCHAR(255)               | NOT NULL                | Reference to vector DB entry |
| `chunk_index`  | INTEGER                    | NOT NULL                | Order within source document |
| `token_count`  | INTEGER                    | NULL                    | Token count for the chunk    |
| `created_at`   | TIMESTAMP                  | DEFAULT NOW()           | Ingestion date               |

#### 7.2.4 Conversations Table

| Column            | Type         | Constraints             | Description                    |
| ----------------- | ------------ | ----------------------- | ------------------------------ |
| `id`              | UUID         | PK, auto-generated      | Unique conversation identifier |
| `bot_id`          | UUID         | FK -> Bots.id, NOT NULL | Associated bot                 |
| `session_id`      | VARCHAR(255) | NOT NULL                | Browser session identifier     |
| `recruiter_ip`    | VARCHAR(45)  | NULL                    | Recruiter IP (anonymized)      |
| `recruiter_email` | VARCHAR(255) | NULL                    | If lead captured               |
| `message_count`   | INTEGER      | DEFAULT 0               | Total messages in conversation |
| `started_at`      | TIMESTAMP    | DEFAULT NOW()           | Conversation start             |
| `last_message_at` | TIMESTAMP    | AUTO-UPDATE             | Last activity                  |

#### 7.2.5 Messages Table

| Column            | Type                      | Constraints                      | Description               |
| ----------------- | ------------------------- | -------------------------------- | ------------------------- |
| `id`              | UUID                      | PK, auto-generated               | Unique message identifier |
| `conversation_id` | UUID                      | FK -> Conversations.id, NOT NULL | Parent conversation       |
| `role`            | ENUM('user', 'assistant') | NOT NULL                         | Message sender            |
| `content`         | TEXT                      | NOT NULL                         | Message text              |
| `tokens_used`     | INTEGER                   | NULL                             | OpenAI tokens consumed    |
| `created_at`      | TIMESTAMP                 | DEFAULT NOW()                    | Message timestamp         |

#### 7.2.6 Leads Table

| Column            | Type         | Constraints                  | Description                |
| ----------------- | ------------ | ---------------------------- | -------------------------- |
| `id`              | UUID         | PK, auto-generated           | Unique lead identifier     |
| `bot_id`          | UUID         | FK -> Bots.id, NOT NULL      | Associated bot             |
| `conversation_id` | UUID         | FK -> Conversations.id, NULL | Source conversation        |
| `email`           | VARCHAR(255) | NOT NULL                     | Recruiter email            |
| `context_summary` | TEXT         | NULL                         | Brief conversation context |
| `captured_at`     | TIMESTAMP    | DEFAULT NOW()                | Capture timestamp          |

### 7.3 Indexes

| Table         | Index                         | Type   | Purpose              |
| ------------- | ----------------------------- | ------ | -------------------- |
| Users         | `username`                    | UNIQUE | URL slug lookup      |
| Users         | `email`                       | UNIQUE | Login lookup         |
| Bots          | `user_id`                     | B-TREE | User's bots lookup   |
| KnowledgeBase | `bot_id`                      | B-TREE | Bot's chunks lookup  |
| Conversations | `bot_id, started_at`          | B-TREE | Dashboard queries    |
| Messages      | `conversation_id, created_at` | B-TREE | Conversation display |
| Leads         | `bot_id, captured_at`         | B-TREE | Lead dashboard       |

---

## 8. API Specification

### 8.1 Authentication APIs

| Method | Endpoint                    | Description                               |
| ------ | --------------------------- | ----------------------------------------- |
| POST   | `/api/auth/register`        | Create new user account                   |
| POST   | `/api/auth/login`           | Email/password login                      |
| POST   | `/api/auth/logout`          | End session                               |
| POST   | `/api/auth/verify-email`    | Verify email token                        |
| POST   | `/api/auth/forgot-password` | Request password reset                    |
| POST   | `/api/auth/reset-password`  | Reset password with token                 |
| GET    | `/api/auth/[provider]`      | OAuth initiation (google/github/linkedin) |

### 8.2 Bot Management APIs

| Method | Endpoint           | Description             | Auth     |
| ------ | ------------------ | ----------------------- | -------- |
| POST   | `/api/bots`        | Create new bot          | Required |
| GET    | `/api/bots`        | List user's bots        | Required |
| GET    | `/api/bots/:botId` | Get bot details         | Required |
| PUT    | `/api/bots/:botId` | Update bot settings     | Required |
| DELETE | `/api/bots/:botId` | Delete bot and all data | Required |

### 8.3 Knowledge Base APIs

| Method | Endpoint                               | Description                 | Auth     |
| ------ | -------------------------------------- | --------------------------- | -------- |
| POST   | `/api/bots/:botId/knowledge`           | Upload and ingest new data  | Required |
| GET    | `/api/bots/:botId/knowledge`           | List knowledge base entries | Required |
| DELETE | `/api/bots/:botId/knowledge/:chunkId`  | Delete knowledge entry      | Required |
| POST   | `/api/bots/:botId/knowledge/reprocess` | Re-ingest all data          | Required |

### 8.4 Chat API (Public)

| Method | Endpoint           | Description         | Auth          |
| ------ | ------------------ | ------------------- | ------------- |
| POST   | `/api/chat/:botId` | Send message to bot | None (public) |

**Request** (adapted from VAi's `/api/ask_vai`):

```json
{
  "message": "Does Jane have experience with React?",
  "session_id": "uuid-v4"
}
```

**Response**:

```json
{
  "reply": "Yes! Jane has 3 years of experience with React...",
  "conversation_id": "uuid"
}
```

**Error Responses** (matching VAi patterns):
| Status | Body | Condition |
|--------|------|-----------|
| 429 | `{ "error": "rate_limit" }` | Window rate limit exceeded |
| 429 | `{ "error": "daily_limit" }` | Daily rate limit exceeded |
| 400 | `{ "error": "Message is required" }` | Missing message field |
| 400 | `{ "error": "Blocked pattern" }` | Prompt injection detected |
| 413 | `{ "error": "Request too large" }` | Content-Length > 16KB |
| 404 | `{ "error": "Bot not found" }` | Invalid bot ID |

### 8.5 Dashboard APIs

| Method | Endpoint                                 | Description                    | Auth     |
| ------ | ---------------------------------------- | ------------------------------ | -------- |
| GET    | `/api/bots/:botId/analytics`             | Get bot analytics summary      | Required |
| GET    | `/api/bots/:botId/conversations`         | List conversations (paginated) | Required |
| GET    | `/api/bots/:botId/conversations/:convId` | Get conversation messages      | Required |
| GET    | `/api/bots/:botId/leads`                 | List captured leads            | Required |
| GET    | `/api/bots/:botId/leads/export`          | Export leads as CSV            | Required |

### 8.6 Widget API

| Method | Endpoint                  | Description                                             | Auth |
| ------ | ------------------------- | ------------------------------------------------------- | ---- |
| GET    | `/widget.js`              | Serve embeddable widget script                          | None |
| GET    | `/api/bots/:botId/config` | Get bot public config (name, theme, photo, suggestions) | None |

### 8.7 Rate Limiting Strategy

Adapted from VAi's rate-limiting system, extended for multi-tenancy. With no subscription tiers, limits exist only to protect users' own LLM credits from abuse and are fully configurable when self-hosting (v1.1):

| Limit Type         | Scope                    | Default     | Config Key  |
| ------------------ | ------------------------ | ----------- | ----------- |
| Window rate limit  | Per recruiter IP per bot | 10 req/min  | `perMinute` |
| Daily rate limit   | Per bot total            | 200 msg/day | `perDay`    |
| Max message length | Per request              | 8,000 chars | `maxChars`  |

**Implementation**: Redis-backed (replacing VAi's in-memory Maps) for persistence across serverless invocations.

### 8.8 API Gateway

- Rate limiting per Bot ID (as recommended in VAi architecture notes)
- Request validation pipeline (matching VAi: method -> content-type -> content-length -> origin -> body)
- CORS configuration per bot (widget origins)
- API key authentication for dashboard endpoints
- Public access for chat and widget endpoints

---

## 9. Security Requirements

### 9.1 Input Security (Adapted from VAi)

| ID      | Requirement                                                                                                                                | VAi Reference                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| SEC-I01 | System SHALL sanitize all chat inputs using VAi's `sanitizeMessage` pattern: normalize unicode, strip zero-width chars, convert homoglyphs | `ask_vai.ts: sanitizeMessage()`    |
| SEC-I02 | System SHALL block prompt injection attempts using 40+ regex patterns (adapted from VAi's blocked patterns list)                           | `ask_vai.ts: blockedPatterns[]`    |
| SEC-I03 | System SHALL block image/media generation requests                                                                                         | `ask_vai.ts: imagePatterns[]`      |
| SEC-I04 | System SHALL enforce 8,000 character input limit                                                                                           | `ask_vai.ts` + `VAi.tsx`           |
| SEC-I05 | System SHALL enforce 16KB request body limit                                                                                               | `ask_vai.ts: Content-Length check` |
| SEC-I06 | System SHALL validate Content-Type as application/json                                                                                     | `ask_vai.ts`                       |

### 9.2 Prompt Security (Adapted from VAi)

| ID      | Requirement                                                                     | VAi Reference |
| ------- | ------------------------------------------------------------------------------- | ------------- |
| SEC-P01 | System prompt SHALL include immutable identity lock rule                        | VAi Rule 1    |
| SEC-P02 | System prompt SHALL include context-only constraint                             | VAi Rule 2    |
| SEC-P03 | System prompt SHALL include prompt protection rule (never reveal system prompt) | VAi Rule 3    |
| SEC-P04 | System prompt SHALL include override resistance rule                            | VAi Rule 6    |
| SEC-P05 | System prompt SHALL include graceful degradation for malicious inputs           | VAi Rule 7    |

### 9.3 Output Security (Adapted from VAi)

| ID      | Requirement                                                                      | VAi Reference                  |
| ------- | -------------------------------------------------------------------------------- | ------------------------------ |
| SEC-O01 | System SHALL detect system prompt markers in AI output and replace with fallback | `ask_vai.ts: sanitizeOutput()` |
| SEC-O02 | System SHALL detect excessive context key matching in output                     | `ask_vai.ts: sanitizeOutput()` |
| SEC-O03 | System SHALL detect JSON structures in output                                    | `ask_vai.ts: sanitizeOutput()` |
| SEC-O04 | System SHALL detect credential/secret exposure in output                         | `ask_vai.ts: sanitizeOutput()` |
| SEC-O05 | System SHALL enforce 1,500 character max output length                           | `ask_vai.ts: sanitizeOutput()` |

### 9.4 HTTP Security Headers (Adapted from VAi)

| Header                    | Value                                      | VAi Reference    |
| ------------------------- | ------------------------------------------ | ---------------- |
| `X-Content-Type-Options`  | `nosniff`                                  | `next.config.js` |
| `X-Frame-Options`         | `DENY` (API) / `SAMEORIGIN` (pages)        | `next.config.js` |
| `X-DNS-Prefetch-Control`  | `off`                                      | `next.config.js` |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`          | `next.config.js` |
| `Permissions-Policy`      | `camera=(), microphone=(), geolocation=()` | `next.config.js` |
| `Cache-Control`           | `no-store` (API routes)                    | `next.config.js` |
| `Content-Security-Policy` | Configured for widget embedding            | New requirement  |

### 9.5 Authentication & Authorization Security

| ID      | Requirement                                                            |
| ------- | ---------------------------------------------------------------------- |
| SEC-A01 | Passwords SHALL be hashed with bcrypt (min 10 rounds)                  |
| SEC-A02 | Sessions SHALL use HTTP-only, Secure, SameSite cookies                 |
| SEC-A03 | API endpoints SHALL validate session tokens on every request           |
| SEC-A04 | Users SHALL only access their own bots and data (tenant isolation)     |
| SEC-A05 | OAuth tokens SHALL be stored encrypted at rest                         |
| SEC-A06 | CSRF protection SHALL be implemented for all state-changing operations |

### 9.6 Data Security

| ID      | Requirement                                                                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-D01 | All data in transit SHALL use TLS 1.2+                                                                                                                                                             |
| SEC-D02 | Database connections SHALL use encrypted connections                                                                                                                                               |
| SEC-D03 | Uploaded files SHALL be scanned for malware before processing                                                                                                                                      |
| SEC-D04 | User data SHALL be logically isolated by tenant ID in all queries                                                                                                                                  |
| SEC-D05 | Vector database namespaces SHALL be isolated per bot ID                                                                                                                                            |
| SEC-D06 | The user's LLM API key SHALL be stored locally (client / self-host config) and never persisted on ProBot servers; platform-level secrets SHALL be stored as encrypted environment variables (v1.1) |

---

## 10. Deployment & Infrastructure

### 10.1 Architecture Diagram

```
                    ┌──────────────────────────────────────────────────┐
                    │                  Vercel Edge                      │
                    │  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
                    │  │  Next.js   │  │  API       │  │  Widget   │    │
                    │  │  Frontend  │  │  Routes    │  │  CDN      │    │
                    │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │
                    └────────┼──────────────┼──────────────┼───────────┘
                             │              │              │
                    ┌────────┴──────────────┴──────────────┘
                    │
         ┌──────────┼──────────┬──────────────┬──────────────┐
         │          │          │              │              │
    ┌────┴────┐ ┌───┴───┐ ┌───┴────┐  ┌─────┴─────┐ ┌─────┴─────┐
    │ OpenAI  │ │ Redis │ │Postgres│  │  Pinecone  │ │  S3/R2    │
    │   API   │ │       │ │   DB   │  │  Vectors   │ │  Storage  │
    └─────────┘ └───────┘ └────────┘  └───────────┘ └───────────┘
```

### 10.2 Deployment Strategy

| Component      | Platform                   | Rationale                                               |
| -------------- | -------------------------- | ------------------------------------------------------- |
| Frontend + API | Vercel                     | Next.js native, automatic scaling, edge functions       |
| Database       | Supabase / Neon            | Managed PostgreSQL, free tier available                 |
| Vector DB      | Pinecone / Supabase Vector | Purpose-built for embeddings                            |
| Cache          | Upstash Redis              | Serverless Redis, pay-per-request                       |
| File Storage   | Cloudflare R2 / AWS S3     | Cost-effective object storage                           |
| Email          | Resend / SendGrid          | Transactional email delivery                            |
| Payments       | _(none)_                   | Removed in v1.1 - ProBot is open source with no billing |
| Monitoring     | Vercel Analytics + Sentry  | Error tracking and performance                          |

### 10.3 Distribution Channels

| Channel             | Implementation                                                               |
| ------------------- | ---------------------------------------------------------------------------- |
| **Direct URL**      | `https://ProBot.com/u/{username}`                                            |
| **Email Signature** | "Chat with my AI" badge linked to URL                                        |
| **LinkedIn**        | Add to "Featured" section or "Contact Info"                                  |
| **Portfolio Embed** | `<script src="https://ProBot.com/widget.js" data-bot-id="USER_ID"></script>` |

### 10.4 Environment Configuration

**Required Variables**:

```
# LLM provider key - BYO, user-supplied. Stored LOCALLY (browser / self-host config),
# never sent to ProBot servers. The platform ships NO default LLM credentials.
# Example local self-host config (kept out of version control):
#   PROBOT_LLM_PROVIDER=anthropic        # anthropic | google | openai | azure
#   PROBOT_LLM_MODEL=claude-opus-4
#   PROBOT_LLM_API_KEY=...               # read from local env / secure store only

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Vector DB
PINECONE_API_KEY=...
PINECONE_INDEX=ProBot

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://ProBot.com

# (Stripe variables removed in v1.1 - ProBot is open source, no billing)

# Storage
S3_BUCKET=ProBot-uploads
S3_REGION=us-east-1

# Email
RESEND_API_KEY=re_...

# App
ALLOWED_ORIGINS=https://ProBot.com
```

---

## 11. Future Enhancements (V2)

| Feature                         | Description                                                              | Priority |
| ------------------------------- | ------------------------------------------------------------------------ | -------- |
| **Voice Mode**                  | Recruiters can "talk" to the candidate via speech-to-text/text-to-speech | Medium   |
| **Interview Simulation**        | Bot conducts preliminary screening and sends report to candidate         | Medium   |
| **Company Analytics**           | IP tracking/enrichment to identify which companies interact with bots    | Low      |
| **Custom Domains**              | Users can point their own domain to their bot                            | Low      |
| **Team Bots**                   | Multiple team members share one bot (for small companies)                | Low      |
| **Multilingual Support**        | Bots that respond in multiple languages                                  | Medium   |
| **Real-time Typing Indicators** | WebSocket-based typing status                                            | Low      |
| **A/B Testing**                 | Test different personality settings and measure engagement               | Low      |
| **API Access**                  | Programmatic access for advanced integrations                            | Low      |

---

## 12. Assumptions & Constraints

### 12.1 Assumptions

| ID  | Assumption                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | The user's chosen LLM provider API will remain available, and the user maintains a valid API key with sufficient credits (v1.1)         |
| A02 | Users will provide truthful career data (system does not verify claims)                                                                 |
| A03 | Recruiters will interact via text (voice is V2)                                                                                         |
| A04 | Users have basic web literacy to copy/paste embed code                                                                                  |
| A05 | The VAi security patterns (40+ blocked patterns, output sanitization) are sufficient for multi-tenant deployment with minor adaptations |
| A06 | _(removed in v1.1 - no paid tiers; ProBot is free and open source)_                                                                     |
| A07 | Average knowledge base size will be 5-20 text chunks per user                                                                           |

### 12.2 Constraints

| ID  | Constraint                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------- |
| C01 | The configured LLM / embedding provider's token limits constrain knowledge base size per query (top-3 chunks) (v1.1) |
| C02 | Vercel serverless function timeout (10s free, 60s Pro) limits processing time                                        |
| C03 | Vector database free tiers have index size limits (Pinecone: 100K vectors)                                           |
| C04 | GDPR compliance required for EU users, affecting data storage and deletion                                           |
| C05 | Widget must work across diverse host sites without CSS/JS conflicts                                                  |
| C06 | Rate limiting must persist across serverless invocations (requires Redis, not in-memory like VAi)                    |

### 12.3 Ambiguities

| ID    | Ambiguity                                                                                       | Recommendation                                                               |
| ----- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| AMB01 | _(resolved in v1.1)_ No pricing - ProBot is free and open source; users bring their own LLM key | N/A                                                                          |
| AMB02 | LinkedIn scraping legality varies by jurisdiction                                               | Recommend URL input with manual paste fallback                               |
| AMB03 | IP-based recruiter tracking privacy implications                                                | Recommend anonymized IP storage, opt-in enrichment                           |
| AMB04 | Conversation data retention period not specified                                                | Recommend a single default of 90 days, configurable when self-hosting (v1.1) |
| AMB05 | Widget CSP compatibility with diverse host sites                                                | Requires extensive testing across common site builders                       |

---

## 13. Appendix

### 13.1 VAi-to-ProBot Migration Matrix

| VAi Component                | ProBot Equivalent                 | Changes Required                                                                                         |
| ---------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `vaiContext.js` (static)     | Vector DB per bot (dynamic)       | RAG pipeline replaces full-context injection                                                             |
| `ask_vai.ts` (single tenant) | `/api/chat/:botId` (multi-tenant) | Add bot resolution middleware, Redis rate limiting                                                       |
| `VAi.tsx` (embedded)         | Public chat + widget (standalone) | Extract to reusable component, add Shadow DOM for widget                                                 |
| `sanitizeMessage()`          | Shared security module            | No changes needed - pattern is tenant-agnostic                                                           |
| `sanitizeOutput()`           | Shared security module            | Adapt context key detection to be per-bot                                                                |
| `buildSystemPrompt()`        | Dynamic per-bot prompt builder    | Replace hardcoded identity with bot config, add RAG chunks                                               |
| In-memory rate limit Maps    | Redis-backed rate limiting        | Required for serverless persistence                                                                      |
| Azure OpenAI client          | Multi-provider BYO-key client     | Provider abstraction for Anthropic / Google / OpenAI / Azure; user-supplied key stored locally (v1.1) |
| `next.config.js` headers     | Same + CSP for widget             | Add widget-specific CORS and CSP headers                                                                 |

### 13.2 Technology Stack Summary

| Layer          | Technology                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**   | Next.js 14+, React 18, TypeScript, Tailwind CSS                                                                                       |
| **Backend**    | Next.js API Routes (Node.js), serverless functions                                                                                    |
| **AI**         | User-configured BYO-key LLM (Anthropic Claude, Google Gemini, OpenAI GPT, …) + provider embedding model; key stored locally |
| **Database**   | PostgreSQL (Supabase/Neon), Pinecone (vectors), Upstash Redis (cache)                                                                 |
| **Auth**       | NextAuth.js (email + OAuth)                                                                                                           |
| **License**    | Open source (MIT) - no payments / billing                                                                                             |
| **Storage**    | Cloudflare R2 / AWS S3                                                                                                                |
| **Email**      | Resend                                                                                                                                |
| **Hosting**    | Vercel                                                                                                                                |
| **Monitoring** | Sentry + Vercel Analytics                                                                                                             |

### 13.3 Glossary

| Term          | Definition                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| **Chunk**     | A segment of text (500-1000 tokens) from a user's knowledge base, used for vector storage and retrieval |
| **Embedding** | A numerical vector representation of text, enabling semantic similarity search                          |
| **Namespace** | A logical partition in the vector database isolating one bot's data from another                        |
| **RAG**       | Retrieval-Augmented Generation - fetching relevant context before AI generation                         |
| **Slug**      | A URL-safe string derived from a username (e.g., "jane-doe")                                            |
| **Tenant**    | A single user of the multi-tenant platform                                                              |
| **Top-K**     | The number of most similar chunks retrieved from the vector database (K=3 for ProBot)                   |
| **Widget**    | A self-contained JavaScript component embeddable on third-party websites                                |

---

_Document prepared based on VAi implementation analysis (see vai.md) and ProBot product requirements._
_SRS follows IEEE 830-1998 structure adapted for modern SaaS._
