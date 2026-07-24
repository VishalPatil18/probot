```markdown
# probot Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill introduces the core development patterns, coding conventions, and workflows used in the `probot` TypeScript codebase. It covers how to contribute features, update documentation, manage API routes, and maintain testing scenarios. The repository is organized for modularity, clarity, and testability, with a focus on self-hosted bot packages and a dashboard UI.

## Coding Conventions

- **Language:** TypeScript
- **Framework:** None detected
- **File Naming:** camelCase for files and folders  
  _Example:_ `probotBot.tsx`, `dashboardSettings.tsx`
- **Import Style:** Relative imports  
  _Example:_  
  ```ts
  import { getUser } from '../lib/user';
  ```
- **Export Style:** Named exports  
  _Example:_  
  ```ts
  export function getUser() { ... }
  export const BOT_NAME = 'Probot';
  ```
- **Commits:** Conventional commit messages with `feat:` and `fix:` prefixes  
  _Example:_  
  ```
  feat: add dashboard notifications panel
  fix: correct bot adapter initialization
  ```

## Workflows

### add-or-update-self-hosted-bot-package
**Trigger:** When adding new features or fixing issues in the self-hosted bot npm package  
**Command:** `/update-self-hosted-bot`

1. Edit or add files in `packages/probot-self-hosted/src/` (e.g., `ProbotBot.tsx`, adapters, hooks, types, prompt, vanilla).
2. Update `packages/probot-self-hosted/package.json` and/or `build.mjs` as needed.
3. Update or create `packages/probot-self-hosted/README.md` and `LICENSE`.
4. Update related documentation in `docs/self-hosted-bot/`.
5. Update `tsconfig.json` if necessary.

_Code Example:_
```ts
// packages/probot-self-hosted/src/adapters/githubAdapter.ts
export function githubAdapter(config: AdapterConfig) {
  // implementation
}
```

---

### dashboard-ui-and-feature-development
**Trigger:** When adding or improving dashboard features or fixing UI bugs  
**Command:** `/dashboard-feature`

1. Edit or add files in `src/app/(dashboard)/dashboard/` (pages, settings, notifications, etc.).
2. Update or add components in `src/components/dashboard/`.
3. Update or add related API routes in `src/app/api/`.
4. Update or add tests for new/changed components or routes.

_Code Example:_
```tsx
// src/components/dashboard/Notifications.tsx
export function Notifications() {
  return <div>Notifications Panel</div>;
}
```

---

### documentation-update-for-self-hosted-or-features
**Trigger:** When new features or changes require documentation updates  
**Command:** `/update-docs`

1. Edit or add files in `docs/self-hosted-bot/` (API reference, guides, troubleshooting, etc.).
2. Update `docs/docs.json` if needed.
3. Update or add related files in `docs/guides/`, `docs/concepts/`, `docs/blogs/`, etc.
4. Update `README.md` or `BYO-KEY.md` as appropriate.

---

### manual-testing-scenarios-addition-or-update
**Trigger:** When adding or updating manual testing setups for the self-hosted bot  
**Command:** `/update-manual-testing`

1. Edit or add files in `manual-testing/self-hosted-react/`, `manual-testing/self-hosted-vanilla/`, `manual-testing/chatbot-script-tag/`.
2. Update `MANUAL_TESTING.md` and `manual-testing/README.md`.
3. Update or add related `index.html`, `package.json`, and config files.

---

### api-route-addition-or-update-with-tests
**Trigger:** When adding or modifying API endpoints, ensuring test coverage  
**Command:** `/api-endpoint`

1. Edit or add files in `src/app/api/` (e.g., `route.ts`, `route.test.ts`).
2. Update or add related schema files in `src/lib/db/schema.ts` or `src/lib/bots/schemas.ts`.
3. Update or add tests for new/changed endpoints.

_Code Example:_
```ts
// src/app/api/bots/route.ts
export async function GET(req: Request) {
  // endpoint logic
}

// src/app/api/bots/route.test.ts
import { GET } from './route';
import { describe, it, expect } from 'vitest';

describe('GET /api/bots', () => {
  it('returns bots list', async () => {
    const res = await GET(new Request('/api/bots'));
    expect(res.status).toBe(200);
  });
});
```

## Testing Patterns

- **Framework:** [vitest](https://vitest.dev/)
- **Test File Pattern:** `*.test.ts`
- **Test Placement:** Next to the code or in parallel structure
- **Example:**
  ```ts
  // src/app/api/bots/route.test.ts
  import { GET } from './route';
  import { describe, it, expect } from 'vitest';

  describe('GET /api/bots', () => {
    it('returns bots list', async () => {
      const res = await GET(new Request('/api/bots'));
      expect(res.status).toBe(200);
    });
  });
  ```

## Commands

| Command                   | Purpose                                                        |
|---------------------------|----------------------------------------------------------------|
| /update-self-hosted-bot   | Add or update the self-hosted bot npm package                  |
| /dashboard-feature        | Add or improve dashboard features or UI                        |
| /update-docs              | Update documentation for self-hosted bot or new features       |
| /update-manual-testing    | Add or update manual testing scenarios                         |
| /api-endpoint             | Add or update API endpoints with tests                         |
```