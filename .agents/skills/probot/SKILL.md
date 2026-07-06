```markdown
# probot Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `probot` repository, a TypeScript project built with the Next.js framework. You'll learn about the repository's coding standards, commit message conventions, file organization, and how to write and organize tests. This guide also suggests useful commands for common development workflows.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `apiRoutes.ts`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```typescript
    import { getUser } from '@/utils/user';
    ```

### Export Style
- Use **named exports**.
  - Example:
    ```typescript
    // In utils/user.ts
    export function getUser(id: string) { ... }
    ```

### Commit Messages
- Follow the **Conventional Commits** specification.
- Use the `fix` prefix for bug fixes.
- Keep commit messages concise (average ~39 characters).
  - Example:
    ```
    fix: correct user ID parsing in auth flow
    ```

## Workflows

_No automated workflows detected in this repository._

## Testing Patterns

- **Test Framework:** Not explicitly detected.
- **Test File Pattern:** All test files follow the `*.test.*` naming convention.
  - Example: `auth.test.ts`, `apiHandler.test.ts`
- Place tests alongside the modules they test or in a dedicated `__tests__` directory.
- Typical test structure:
  ```typescript
  import { getUser } from '@/utils/user';

  describe('getUser', () => {
    it('returns user data for valid ID', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command | Purpose |
|---------|---------|
| /fix     | Start a bug fix workflow (commit with `fix:` prefix) |
| /test    | Run all test files matching `*.test.*`               |
| /lint    | Run code linter to check for style issues            |
| /build   | Build the Next.js project                           |
```
