---
title: "Set up a TypeScript monorepo for fullstack hobby projects (pnpm, Turborepo, NestJS)"
subtitle: "Template repo included"
slug: "typescript-monorepo-pnpm-turborepo-nestjs"
series: "fullstack-monorepo"
seriesPart: 1
templateTag: "v0.1.0"
tags: ["typescript", "monorepo", "pnpm", "turborepo", "nestjs"]
cover: ""
status: planned
hashnodeUrl: ""
publishedAt: ""
---

Outline only. Write this post from the working template at tag `v0.1.0`.

Template repo: `fullstack-monorepo-template`. Every path below is relative to it.

Target: 1,500 to 2,200 words, about 10 minutes. The reader ends by cloning the template,
running `pnpm install` and `pnpm dev`, and getting a response from `/health`.

## Requirements

Node.js 24.15.0 or newer (`.node-version`), pnpm 12.14.0 (`packageManager` in `package.json`).
Source: the template's README, "Requirements".

## Outline

1. What we are building and why a monorepo
2. Requirements and repo layout (Mermaid diagram, copy it from the template README)
3. pnpm workspaces and catalogs
4. Turborepo task graph
5. Shared config and shared types packages
6. The NestJS API with `/health`
7. Guardrails: git hooks and commit lint
8. Decisions you can read in the repo
9. Options and how to swap: monorepo tooling, API framework
10. Try it: use the template
11. What is next: two frontends sharing one UI package

## Decisions you can read in the repo

The template ships its reasoning, so a reader can see why and change it. This is the
swappable-by-design idea of the whole series: show one example, then point to the files.

| File | Decision |
|---|---|
| `docs/adr/0001-monorepo-tooling.md` | pnpm workspaces, catalogs, denied install scripts, Turborepo |
| `docs/adr/0002-shared-packages.md` | `@template/config` and `@template/types`, ESM, built `dist/` |
| `docs/adr/0003-api-framework.md` | NestJS as a foundation, Vitest with SWC |
| `docs/adr/0004-third-party-libraries-sit-behind-a-seam.md` | the seam rule used by every later post |
| `docs/swapping/monorepo-tooling.md` | what to rewrite to leave pnpm or Turborepo |
| `docs/swapping/api-framework.md` | what to rewrite to leave NestJS |

Note for the text: v0.1.0 adopts no library that needs a seam (NestJS is a foundation and is
not wrapped), so ADR-0004 is the rule, and the first seam arrives with the database post.

## Needs

- Mermaid diagram of the repo layout
- Options tables for monorepo tooling and API framework
- Code excerpts (4 to 6 in the post, pick from this list):

| Excerpt | File |
|---|---|
| Workspace globs, `allowBuilds`, catalog | `pnpm-workspace.yaml` |
| Task graph, `dependsOn: ["^build"]`, `passThroughEnv` | `turbo.json` |
| Shared type | `packages/types/src/health.ts` |
| Health controller | `apps/api/src/health.controller.ts` |
| SWC plugin for decorator metadata | `apps/api/vitest.config.ts` |
| Shared ESLint config | `packages/config/eslint/index.js` |
| tsconfig presets | `packages/config/tsconfig.base.json`, `packages/config/tsconfig.nest.json` |
| Commit hooks | `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.js` |

## Gotchas to include

Each one names the file or setting that fixes it.

- **Install scripts:** pnpm 12 fails the install for any dependency script that is not listed.
  Fix: `allowBuilds` in `pnpm-workspace.yaml`. Example: `'@swc/core': false` (the binary
  ships as an optional dependency, so the script is not needed).
- **Pins and catalogs:** exact-pin packages that must match (all `@nestjs/*`), use `~` for
  `typescript`, share versions with `catalog:`. The policy table is in
  `docs/adr/0001-monorepo-tooling.md` (added in v0.1.1).
- **Decorator metadata in tests:** Nest dependency injection needs it, esbuild (Vitest's default)
  does not emit it. Fix: `unplugin-swc` in `apps/api/vitest.config.ts`.
- **ESM and NodeNext:** Nest 12 is ESM, so relative imports end in `.js`
  (`import { AppModule } from './app.module.js'`). Setting: `module: NodeNext` in
  `packages/config/tsconfig.base.json`.
- **TypeScript 6 and `types`:** `@types/*` are not included by default, so `apps/api/tsconfig.json`
  sets `"types": ["node"]`.
- **TypeScript version:** the template is on 6.0.x because typescript-eslint 8.71.2 supports
  TypeScript below 6.1. Check this again when writing; the latest TypeScript was 7.0.2 at build time.
- **`PORT` in `pnpm dev`:** Turborepo drops env vars a task does not declare. Fix:
  `"passThroughEnv": ["PORT"]` on the `dev` task in `turbo.json`.
- **Scoped builds:** use `--filter` so one app's deploy does not build everything
  (`pnpm turbo run build --filter=@template/api`).
- **Release age exclusion:** at v0.1.0, `pnpm-workspace.yaml` has a `minimumReleaseAgeExclude`
  block that pnpm added on install because `@nestjs/*@12.2.0` was only days old. v0.1.1 removes
  it (commit `chore(workspace): remove the unneeded release age exclusion`): the versions had
  aged and a fresh install without a lockfile passes. ADR-0001 does not mention it.
  TODO: decide whether the post targets v0.1.1, and confirm pnpm's default minimum release age
  from the pnpm docs before stating a number.
- **Pre-commit typecheck trade-off:** `.husky/pre-commit` runs lint-staged and then
  `pnpm typecheck` for the whole repo. Commits take a few seconds longer. Skip it for a
  work-in-progress commit with `git commit --no-verify` (documented in the template README
  from v0.1.1).

## Options and how to swap

Keep both option tables from `SERIES.md`. Link each "How to swap" to the template at the tag:

- Monorepo tooling (pnpm + Turborepo vs npm, yarn, bun, Nx):
  `docs/swapping/monorepo-tooling.md` at tag `v0.1.0`
- API framework (NestJS vs Fastify, Hono, Express, Next.js route handlers):
  `docs/swapping/api-framework.md` at tag `v0.1.0`

Link form: `https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.0/docs/swapping/<file>.md`
