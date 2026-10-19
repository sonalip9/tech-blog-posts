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

Target: 1,500 to 2,200 words, about 10 minutes. The reader ends by cloning the template,
running `pnpm install` and `pnpm dev`, and getting a response from `/health`.

## Outline

1. What we are building and why a monorepo
2. Repo layout (Mermaid diagram)
3. pnpm workspaces and catalogs
4. Turborepo task graph
5. Shared config and shared types packages
6. The NestJS API with `/health`
7. Guardrails: git hooks and commit lint
8. Options and how to swap: monorepo tooling, API framework
9. Try it: use the template
10. What is next: two frontends sharing one UI package

## Needs

- Mermaid diagram of the repo layout
- 4 to 6 code excerpts: workspace file, catalog, `turbo.json`, health controller, a shared type
- Options tables for monorepo tooling and API framework

## Gotchas to include

- pnpm: deny dependency install scripts by default; exact-pin packages that must match; use catalogs for shared versions
- Turborepo: scope builds with `--filter` so one app's deploy does not build everything
