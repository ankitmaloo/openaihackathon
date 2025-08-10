# Repository Guidelines

## Project Structure & Modules
- `src/`: App source (TypeScript + React).
  - `components/`: UI and feature components (e.g., `Header.tsx`, `ChatInterface.tsx`, `components/ui/button.tsx`).
  - `hooks/`: Reusable hooks (e.g., `use-toast.ts`).
  - `contexts/`: React contexts (e.g., `ThemeContext.tsx`).
  - `lib/`: Utilities (e.g., `lib/utils.ts`).
- `index.html`: Vite entry.
- `tailwind.config.js`, `postcss.config.js`: Styling setup.
- `vite.config.ts`: Builds and `@` alias to `src`.

## Build, Test, and Development
- `npm run dev`: Start Vite dev server.
- `npm run build`: Type-check (`tsc -b`) then production build.
- `npm run preview`: Preview the production build.
- `npm run lint`: Lint the codebase with ESLint.

Tests are not configured yet. If adding tests, prefer Vitest + React Testing Library.

## Coding Style & Naming
- Language: TypeScript, React functional components, strict types (see `tsconfig.*`). Avoid `any`.
- Indentation: Follow existing files (2 spaces). Use ESLint to catch issues.
- Naming:
  - Components: `PascalCase` (`ChatInterface.tsx`).
  - Hooks: `camelCase` starting with `use` (`use-toast.ts`).
  - Contexts/Providers: `PascalCase` (`ThemeContext.tsx`).
  - Utilities: `camelCase` (`utils.ts`).
- Imports: Use `@/` alias for `src` (e.g., `@/components/ui/button`).
- Styling: Tailwind CSS utility classes; keep styles in components where practical.

## Testing Guidelines
- Location: Co-locate tests next to files as `*.test.ts(x)` (e.g., `ChatInterface.test.tsx`).
- Scope: Test component behavior and interactions; keep DOM details minimal.
- Coverage: Aim for critical paths and UI logic; prefer fast, unit-level tests.
- Run: After adding tests, document `npm test` in `package.json`.

## Commit & Pull Requests
- Commits: Use clear, imperative messages. Conventional Commits are encouraged (e.g., `feat: add theme switcher`).
- PRs must include:
  - Summary of changes and rationale.
  - Linked issue (if applicable).
  - Screenshots or GIFs for UI changes.
  - Checklist: `npm run lint` passes; build succeeds; no unused code.

## Security & Configuration
- Secrets: Do not commit `.env*` files or API keys.
- Dependencies: Prefer pinned versions; run `npm audit` before releases.
- Accessibility: Use semantic HTML and aria attributes for new UI.

