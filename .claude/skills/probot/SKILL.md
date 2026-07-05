```markdown
# probot Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and collaborative workflows used in the `probot` TypeScript codebase. You'll learn how to contribute new features, enhance modules, integrate AI model providers, update documentation, and maintain code quality using established conventions and step-by-step processes. These patterns ensure consistency, reliability, and maintainability across the project.

## Coding Conventions

- **Language:** TypeScript
- **Framework:** None detected
- **File Naming:** Uses `camelCase` for files (e.g., `botFactoryForm.tsx`, `modelOptions.ts`)
- **Import Style:** Uses import aliases for clarity and modularity

  ```typescript
  import { BotFactoryForm } from '@/components/bot-factory/BotFactoryForm';
  import * as AIProviders from '@/lib/ai/providers';
  ```

- **Export Style:** Mixed (both default and named exports)

  ```typescript
  // Named export
  export const BOT_FACTORY_STEPS = [...];

  // Default export
  export default function BotFactoryForm() { ... }
  ```

- **Commit Patterns:** Conventional commits, primarily using `fix` and `feat` prefixes. Example:

  ```
  feat: add support for new AI provider
  fix: correct bot factory step validation
  ```

- **Documentation:** Markdown (`.md`, `.mdx`) in `docs/` and `README.md`

## Workflows

### Feature Development with Docs and Tests
**Trigger:** When adding a new feature or major improvement with supporting docs and tests  
**Command:** `/new-feature`

1. Implement or update the feature in relevant `src/components` or `src/app` files.
2. Update or add related documentation in `docs/` or `README.md`.
3. Add or update test files alongside the implementation (e.g., `*.test.tsx`).
4. Update or add static assets if needed (e.g., images, videos).

**Example:**
```typescript
// src/components/newFeature.tsx
export function NewFeature() { ... }

// src/components/newFeature.test.tsx
import { describe, it, expect } from 'vitest';
import { NewFeature } from './newFeature';
...
```

### Bot Factory Module Enhancement
**Trigger:** When adding, refactoring, or modularizing steps or parts of the bot factory  
**Command:** `/update-bot-factory`

1. Update or add files in `src/components/bot-factory/steps/` or `parts/`.
2. Modify `src/components/bot-factory/BotFactoryForm.tsx` and related constants/types.
3. Update related dashboard/settings files if needed.
4. Optionally update related API routes or lib files.

**Example:**
```typescript
// src/components/bot-factory/steps/newStep.tsx
export function NewStep() { ... }

// src/components/bot-factory/constants.ts
export const NEW_STEP = 'newStep';
```

### AI Model Provider Integration
**Trigger:** When adding or updating AI model provider integrations  
**Command:** `/add-model-provider`

1. Add or update files in `src/lib/ai/providers/` (including `.ts` and `.test.ts`).
2. Update `src/lib/ai/model-options.ts` and `provider-labels.ts`.
3. Update API pipeline/route files if needed.
4. Update configuration or documentation.

**Example:**
```typescript
// src/lib/ai/providers/myProvider.ts
export function myProvider() { ... }

// src/lib/ai/providers/myProvider.test.ts
import { myProvider } from './myProvider';
...
```

### Documentation and Blog Update
**Trigger:** When updating documentation or publishing new blog/guides  
**Command:** `/update-docs`

1. Edit or add files in `docs/` (including `blogs/`, `guides/`, `concepts/`, `api-reference/`).
2. Update `README.md` or other top-level docs if needed.
3. Optionally update static assets (images, videos) referenced in docs.

**Example:**
```markdown
<!-- docs/guides/new-feature.mdx -->
# How to Use the New Feature
...
```

### Code Cleanup and Refactor
**Trigger:** When cleaning up code, removing comments, or refactoring structure across the codebase  
**Command:** `/cleanup`

1. Edit multiple files across `src/`, `lib/`, and `docs/` to clean up code or comments.
2. Update meta files (`CHANGELOG.md`, `CONTRIBUTING.md`, etc.) if needed.
3. Optionally update scripts or configuration.

**Example:**
```typescript
// src/app/cleanupExample.ts
// Before
function example() {
  // TODO: remove this later
  console.log('test');
}

// After
function example() {
  console.log('test');
}
```

## Testing Patterns

- **Framework:** [vitest](https://vitest.dev/)
- **Test File Pattern:** `*.test.ts` (and `*.test.tsx` for React components)
- **Test Placement:** Tests are placed alongside implementation files

**Example:**
```typescript
// src/lib/ai/providers/exampleProvider.test.ts
import { describe, it, expect } from 'vitest';
import { exampleProvider } from './exampleProvider';

describe('exampleProvider', () => {
  it('should return expected result', () => {
    expect(exampleProvider()).toBe('expected');
  });
});
```

## Commands

| Command           | Purpose                                               |
|-------------------|-------------------------------------------------------|
| /new-feature      | Start a new feature with docs and tests               |
| /update-bot-factory | Enhance or refactor the bot factory module           |
| /add-model-provider | Add or update an AI model provider integration       |
| /update-docs      | Update documentation, guides, or blog posts           |
| /cleanup          | Perform code cleanup or broad refactoring             |
```
