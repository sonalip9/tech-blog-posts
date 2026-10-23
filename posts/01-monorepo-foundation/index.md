---
title: "Set up a monorepo you can still maintain in a year"
subtitle: "A pnpm and Turborepo foundation with a working API, shared packages and commit checks."
seoTitle: "Set up a TypeScript monorepo (pnpm, Turborepo, NestJS)"
slug: "typescript-monorepo-pnpm-turborepo-nestjs"
series: "fullstack-monorepo"
seriesPart: 1
templateTag: "v0.1.1"
tags: ["typescript", "monorepo", "pnpm", "turborepo", "nestjs"]
cover: "assets/cover.png"
status: published
hashnodeUrl: "https://sonaliparekh.hashnode.dev/typescript-monorepo-pnpm-turborepo-nestjs"
publishedAt: "2026-10-23"
---

## In short

- We build a TypeScript monorepo around one endpoint, `GET /health`, and add what that endpoint needs to stay healthy as the repo grows.
- You finish with a NestJS API, two shared packages, a task runner, commit checks, CI, and a GitHub template to start your own project from.
- Every tool choice lists alternatives and what it would cost to change.
- The code for this post is tagged [`v0.1.1`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1).

## How this series works

This post is part 1 of a series on building a fullstack TypeScript monorepo in your own repo, layer by layer. A public template repo holds the finished result of each part, so you can compare your work against it or start from it. This part covers the monorepo and the API. Later parts add two frontends, a database, secrets, Terraform and deployment. Each part ends at a git tag, so you can check out the exact state a post describes.

Two habits run through every part. First, we give the reason before the step, and we link the official documentation for anything that deserves more depth than a post can give it. Second, every library that carries behavior, such as a database client or a cache, sits behind a seam. App code imports a module we own, only one adapter folder imports the library, and a lint rule enforces it. Replacing the library then means rewriting one folder instead of the app.

<!-- Hashnode: upload assets/seam.png in the editor; it gives you a CDN URL to use instead of the relative path below. -->
![The seam pattern: your code imports a port you own. The port is implemented by an adapter folder that uses one library. A dashed box shows that another library could replace it by changing only the adapter.](assets/seam.png)

*The plum dashed box is the swap point. Nothing on its left side imports the library.*

The foundations, here pnpm, Turborepo and NestJS, are not wrapped. They shape the whole repo, so changing one is a real piece of work. We say what that work is in the "Swap it" section near the end. The first seam arrives with the database in part 3, and the rule behind it is written down in [ADR-0004](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/adr/0004-third-party-libraries-sit-behind-a-seam.md).

## What you need

Before you start, install:

- [Node.js](https://nodejs.org) 24.15.0 or newer. The repo pins this in `.node-version`.
- [pnpm](https://pnpm.io/installation) 12.14.0. [Corepack](https://github.com/nodejs/corepack) can install the pinned version for you: run `corepack enable`, and the version named in `packageManager` is used.
- git, and a GitHub account if you want to start from the template.

## What you will have at the end

We build one thing: a `GET /health` endpoint. It is small on purpose, because each step adds something that endpoint needs once the repo grows. It needs a place to live (a workspace), a build order (a task graph), a contract it shares with its clients (shared types), a handler (the API), proof that it works (tests) and guards against breaking it (commit checks and CI).

Here is the finished state. Clone the tag and run it:

```bash
git clone --branch v0.1.1 https://github.com/sonalip9/fullstack-monorepo-template.git
cd fullstack-monorepo-template
pnpm install
pnpm dev
```

In a second terminal:

```bash
curl localhost:3000/health
# {"status":"ok","timestamp":"2026-10-19T16:48:03.366Z"}
```

To run what CI runs before you push, use `pnpm check`. The rest of this post builds that result from an empty folder.

## Why a monorepo

A monorepo keeps several apps and packages in one repository. That choice earns its keep in five ways:

- **One contract, one change.** An API and its clients share types. When a type changes, every consumer fails its build in the same pull request.
- **One toolchain.** Lint rules and TypeScript settings live in one place, so every package follows the same rules.
- **One install.** A single lockfile and shared version ranges keep packages from drifting apart.
- **Ordered, cached builds.** A task runner builds packages in dependency order and skips work it has already done.
- **One review.** A change that touches the API and its clients is a single pull request, tested together.

The cost is that you now own the tooling that holds the packages together. We keep that tooling small, and we write down why each piece is there. When a monorepo is the wrong choice is a question for a later post.

Apps go in `apps/`. Code that apps share goes in `packages/`:

```text
fullstack-monorepo-template/
├── apps/
│   └── api/             # NestJS, GET /health
├── packages/
│   ├── config/          # @template/config: ESLint and tsconfig presets
│   └── types/           # @template/types: API contracts
├── docs/
│   ├── adr/             # architecture decisions
│   └── swapping/        # how to replace a library or tool
├── .github/workflows/ci.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

<!-- Hashnode: upload assets/repo-layout.png in the editor; it gives you a CDN URL to use instead of the relative path below. -->
![Package dependencies: apps/api imports HealthResponse from packages/types and extends the lint and TypeScript config from packages/config. packages/types also extends the TypeScript config from packages/config. A dashed box marks the frontends that Post 2 adds.](assets/repo-layout.png)

*Solid boxes exist at v0.1.1. The dashed box is added in Post 2.*

## Step 1: Initialise the repo

A monorepo starts as an ordinary repo, so we begin there. We need a folder under git and a root `package.json` that pins the tools everyone uses. Pinning matters more in a monorepo than in a single app, because one developer on a different Node or pnpm version can produce a bug nobody else can reproduce.

```bash
mkdir fullstack-monorepo-template
cd fullstack-monorepo-template
git init
```

The root [`package.json`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/package.json) starts small. Later steps add scripts and dev dependencies:

```json
{
  "name": "fullstack-monorepo-template",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.14.0",
  "engines": { "node": ">=24.15.0" }
}
```

`private` stops the root from being published by accident. `type: module` makes every package ESM by default. `packageManager` tells Corepack which pnpm to use, and `engines` warns anyone on an older Node.

Two more files finish the job. [`.node-version`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.node-version) holds one line, `24.15.0`, which version managers read. [`.gitignore`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.gitignore) keeps build output and secrets out of git:

```text
node_modules
dist
.turbo
coverage
*.tsbuildinfo
.env
.env.*
!.env.example
.DS_Store
```

The repo now knows which tools to use. It does not yet know that `apps/` and `packages/` will hold packages of their own. That is the next step.

## Step 2: Create the workspace

Without a workspace, every folder is an unrelated project, and none can depend on a sibling. [`pnpm-workspace.yaml`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/pnpm-workspace.yaml) fixes that, and it does three jobs:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

# Dependency install scripts. pnpm fails the install for any script not
# listed here. Everything is denied until a package proves it needs one.
allowBuilds:
  # Ships prebuilt binaries as optional dependencies; the script is not needed.
  '@swc/core': false

# Shared dependency versions. Reference with "catalog:" instead of repeating
# a version range in every package.
catalog:
  '@nestjs/common': 12.2.0
  '@nestjs/core': 12.2.0
  # ...
  typescript: ~6.0.3
  vitest: 5.0.5
```

The first job is the [workspace](https://pnpm.io/workspaces) itself. The two globs make every folder under `apps/` and `packages/` a package. Packages depend on each other with the `workspace:` protocol, for example `"@template/types": "workspace:*"` in the API, which tells pnpm to link the local folder instead of downloading a copy.

The second job is the [catalog](https://pnpm.io/catalogs). A version used by more than one package is written once, and a package refers to it with `"@nestjs/common": "catalog:"`. Upgrading NestJS then means changing one line.

The third job is a safety setting. Some npm packages run a script when they are installed, which is a way for a compromised package to run code on your machine. With [`allowBuilds`](https://pnpm.io/settings/build), pnpm treats any package that is not listed as unreviewed, and the install exits with an error when one has a build script. We then decide per package. Our example is `@swc/core`: it ships its binary as an optional dependency, so the script is not needed and we set it to `false`.

**Gotcha.** The first `pnpm install` after you add a package with a build script fails with an error that names the package. That is the setting working. Add the package to `allowBuilds` as `true` or `false`, then install again.

One more decision lives in the catalog: how tightly to pin. The lockfile fixes what is installed, but the ranges in `package.json` decide what an upgrade may pick up. The template pins exactly by default. All `@nestjs/*` packages must match each other, and tooling is exact so a CI failure is never caused by a silent upgrade. It uses `~` for `typescript` and `^` for type definitions and linters. The reasons are in [ADR-0001](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/adr/0001-monorepo-tooling.md).

**Gotcha.** Since pnpm 11, [`minimumReleaseAge`](https://pnpm.io/settings/dependency-resolution) defaults to 1440 minutes, so pnpm will not install a version published less than a day ago. That protects you from a compromised release that is pulled soon after it appears. If you need a brand-new version right away, list it in `minimumReleaseAgeExclude` and remove the entry once the version has aged. While we built this template, we needed that list for the newest NestJS release. The versions have aged past the window, so the list is gone at `v0.1.1`.

The workspace can now find its packages. It still does not know in what order to build them, and that is the job of the next step.

## Step 3: Add the task graph

When one package imports another, the imported package must be built first. We could script that order by hand and keep it up to date forever, or we can let a task runner read it from the dependency graph. [Turborepo](https://turborepo.dev/docs) runs the same script in every package that has it, in dependency order, and caches the result. The graph lives in [`turbo.json`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/turbo.json):

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "globalDependencies": [".node-version"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "!**/*.md", "!**/*.spec.ts", "!test/**"],
      "outputs": ["dist/**"]
    },
    "lint": { "dependsOn": ["^build"], "inputs": ["$TURBO_DEFAULT$", "!**/*.md"] },
    "typecheck": { "dependsOn": ["^build"], "inputs": ["$TURBO_DEFAULT$", "!**/*.md"] },
    "test": { "dependsOn": ["^build"], "inputs": ["$TURBO_DEFAULT$", "!**/*.md"], "outputs": [] },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "passThroughEnv": ["PORT"],
      "persistent": true
    }
  }
}
```

(The real file formats each task over several lines.)

The key is [`^build`](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks), which means "build the packages I depend on first". Lint, typecheck and test need it too, because the API imports `@template/types` from its built `dist/` folder.

**Gotcha.** Turborepo only passes a task the environment variables it declares, through [`passThroughEnv`](https://turborepo.dev/docs/reference/configuration#passthroughenv). We checked what happens without it: with the setting removed, `PORT=4000 pnpm dev` is ignored and the API still listens on 3000. With `"passThroughEnv": ["PORT"]`, the variable reaches the API.

When only one app is deployed, you rarely want to build everything. The [`--filter`](https://turborepo.dev/docs/reference/run#--filter-string) flag builds one package and what it depends on: `pnpm turbo run build --filter=@template/api`.

The graph is ready, but there are no packages to run it on. We add the first two now.

## Step 4: Add shared types and config

The API and its future clients must agree on what `/health` returns. If the type lived inside the API app, a client would have to import from the API and pull the whole framework in with it. So the contract gets a package of its own, [`packages/types`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/packages/types). At this stage it holds one interface, in [`src/health.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/packages/types/src/health.ts):

```ts
/** Response body of `GET /health`. */
export interface HealthResponse {
  status: 'ok';
  /** ISO 8601 timestamp of the response. */
  timestamp: string;
}
```

The package is built with `tsc` to `dist/`. Later, the Expo and Next.js apps import the same type, so a change to it fails their builds too.

Interfaces and type aliases disappear when TypeScript compiles, so today this package ships no runtime code. Enums and constant values are different: they are real JavaScript. If a contract needs shared constants, such as a list of allowed statuses, export an `as const` object and derive the type from it. The package already points its `exports` at `dist/index.js`, so it can carry that small amount of runtime code when the time comes.

The second shared package is [`packages/config`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/packages/config). It holds the ESLint flat config and two TypeScript presets, `tsconfig.base.json` and `tsconfig.nest.json`. We could keep these files at the repo root and point each package at them with a relative path. We make them a package for three reasons. A package is imported by name, so it keeps working if you move a folder. It appears in the dependency graph, so Turborepo reruns the affected tasks when a preset changes. And each package lists it as a dev dependency, so the link is visible in `package.json` instead of hidden in a path.

A package then extends a preset and adds only what is specific to it. This is the `tsconfig.json` of `apps/api`:

```json
{
  "extends": "@template/config/tsconfig.nest.json",
  "compilerOptions": { "rootDir": ".", "noEmit": true, "types": ["node"] },
  "include": ["src", "test", "vitest.config.ts"]
}
```

The base preset uses `module: NodeNext`, so everything is [ESM](https://nodejs.org/api/esm.html). It also turns on `verbatimModuleSyntax`, which is why you will see `import type` for anything that is only a type.

**Gotcha.** Under NodeNext, relative imports must end in `.js`, even in TypeScript files: `import { AppModule } from './app.module.js';`. It looks wrong the first time. TypeScript is describing the file that exists after compilation, so we write `.js` and the build works. The [TypeScript module reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#relative-file-path-resolution) explains the rule.

With a contract and shared settings in place, the handler itself is short.

## Step 5: Add the API

[NestJS](https://docs.nestjs.com) is a Node framework that organizes an API into modules and controllers. A [controller](https://docs.nestjs.com/controllers) maps a route to a method. Ours maps `GET /health` to `check()`, in [`health.controller.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/apps/api/src/health.controller.ts):

```ts
import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@template/types';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

The return type comes from the shared package, so if the contract changes, this file fails to compile. [`main.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/apps/api/src/main.ts) creates the app and reads `PORT`, defaulting to 3000. The `AppModule` in [`app.module.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/apps/api/src/app.module.ts) registers the controller.

Run `pnpm dev` and call the endpoint with the `curl` command from the start of this post. The typed response comes back.

It works when we try it by hand. Next we teach the repo to check it for us.

## Step 6: Test it with Vitest

A `curl` proves the endpoint works once. A test proves it keeps working. [Vitest](https://vitest.dev/guide/) runs two kinds here, following the [NestJS testing guide](https://docs.nestjs.com/fundamentals/testing): a unit test for the controller, in [`health.controller.spec.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/apps/api/src/health.controller.spec.ts), and an end-to-end test in [`health.e2e-spec.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/apps/api/test/health.e2e-spec.ts) that boots the app and calls `GET /health` with `supertest`.

Getting Vitest to run Nest needs one non-obvious line. Nest's dependency injection reads decorator metadata at runtime. Vitest transforms TypeScript with esbuild, and esbuild does not emit that metadata. [SWC](https://swc.rs) does, so [`vitest.config.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/apps/api/vitest.config.ts) swaps the transform with [`unplugin-swc`](https://github.com/unplugin/unplugin-swc):

```ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Nest relies on decorator metadata, which esbuild does not emit. SWC does.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
```

**Gotcha.** Without the SWC plugin, the tests fail in confusing ways: injected dependencies are `undefined`, and the error does not mention metadata. If a Nest test fails on injection, check the transform first.

This is also why `@swc/core` is in the API's dev dependencies, and why it was our example in `allowBuilds` in Step 2. The tests pass, but only if someone runs them. The last step makes the repo run them for us.

## Step 7: Add the checks

Three checks run so that nobody has to remember them. Each one catches a different kind of mistake at a different moment.

**Before a commit.** [husky](https://typicode.github.io/husky/) runs git hooks that live in the repo. [`.husky/pre-commit`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.husky/pre-commit) runs [lint-staged](https://github.com/lint-staged/lint-staged), which applies ESLint and Prettier to the staged files, then a typecheck of the whole repo:

```sh
pnpm exec lint-staged
pnpm typecheck
```

**At the commit message.** [commitlint](https://commitlint.js.org), run from [`.husky/commit-msg`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.husky/commit-msg), enforces [Conventional Commits](https://www.conventionalcommits.org) with a few extra rules in [`commitlint.config.js`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/commitlint.config.js):

```js
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
  },
};
```

The history of the template follows these rules: one small, scoped commit per concern, such as `build(turbo): add task graph for build, lint, typecheck, test, dev`. Read `git log --oneline` to see how the repo was put together, step by step.

**On every pull request and push to main.** A [GitHub Actions](https://docs.github.com/en/actions) workflow, [`.github/workflows/ci.yml`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.github/workflows/ci.yml), installs with a frozen lockfile and runs lint, typecheck, test and build. `pnpm check` runs the same four tasks locally, so a green `pnpm check` means a green CI run.

The repo now builds, tests and guards itself. What is left is to make the choices behind it easy to find, and easy to change.

## Swap it

Every tool in this post is a choice, and the choices come in two kinds. Some you can change by editing configuration. Others are foundations that shape the code around them, so changing one is real work. The table shows the difference, with a rough effort for each.

| Layer | Used here | Alternatives | Effort to change |
| --- | --- | --- | --- |
| Task runner | Turborepo | Nx: replace `turbo.json` with `nx.json` target defaults. No runner: `pnpm -r --workspace-concurrency=1 run <task>` gives dependency order without caching. | Under two hours |
| Package manager | pnpm workspaces | npm workspaces: `workspaces` globs, `*` instead of `workspace:*`, no catalogs, `ignore-scripts=true` in `.npmrc`. Yarn 4: same globs, catalogs and `enableScripts`. Bun: globs and catalogs in `package.json`, scripts denied unless listed in `trustedDependencies`. | Half a day (config, lockfile, CI) |
| API framework (a foundation) | NestJS | Fastify: closest model (routes, hooks, plugins), but you write the structure Nest gives you. Hono: small and portable across runtimes, with fewer built-in Node features. Express: familiar and minimal, with no dependency injection. Next.js route handlers: removes the separate API deployable, but couples the API to the web app. | A rewrite of `apps/api`. Under an hour for one endpoint, more as endpoints and dependency injection grow |

A framework swap rewrites `apps/api`. It does not touch `packages/types`, the config package, Turborepo or CI, and that is the value of keeping the contract in its own package. Step-by-step notes are in [`docs/swapping/monorepo-tooling.md`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/swapping/monorepo-tooling.md) and [`docs/swapping/api-framework.md`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/swapping/api-framework.md).

The reasoning behind each choice is also written down in the repo, as short architecture decision records:

| File | Decision |
| --- | --- |
| [`docs/adr/0001-monorepo-tooling.md`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/adr/0001-monorepo-tooling.md) | pnpm workspaces, catalogs, denied install scripts, Turborepo, pin policy |
| [`docs/adr/0002-shared-packages.md`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/adr/0002-shared-packages.md) | `@template/config` and `@template/types`, ESM, built `dist/` |
| [`docs/adr/0003-api-framework.md`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/adr/0003-api-framework.md) | NestJS as a foundation, Vitest with SWC |
| [`docs/adr/0004-third-party-libraries-sit-behind-a-seam.md`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/docs/adr/0004-third-party-libraries-sit-behind-a-seam.md) | the seam rule used by every later post |

## What I would do differently

The pre-commit hook typechecks the whole repo, not only the staged files. It catches a broken contract before it reaches CI, and it costs a few seconds on every commit. With one API that is fine. With five packages we would move the full typecheck to CI and keep only lint-staged in the hook.

Until then, for a work-in-progress commit, skip the hooks with `git commit --no-verify`. Run `pnpm check` before you push.

## Try it

Check out the exact state of this post:

```bash
git clone --branch v0.1.1 https://github.com/sonalip9/fullstack-monorepo-template.git
```

To start your own project, click **Use this template** on [fullstack-monorepo-template](https://github.com/sonalip9/fullstack-monorepo-template) (GitHub explains [creating a repository from a template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)), then rename the package scope. This replaces `@template/` everywhere and refreshes the lockfile:

```bash
pnpm rename-scope @acme
pnpm check
```

In part 2, the template gets two frontends, an Expo app and a Next.js app, that share one UI package and the types you saw here, and both call `/health`.

## References

**Official documentation**

- pnpm: [workspaces](https://pnpm.io/workspaces), [catalogs](https://pnpm.io/catalogs), [`allowBuilds`](https://pnpm.io/settings/build), [`minimumReleaseAge`](https://pnpm.io/settings/dependency-resolution), [installation](https://pnpm.io/installation)
- Turborepo: [documentation](https://turborepo.dev/docs), [configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks), [`passThroughEnv`](https://turborepo.dev/docs/reference/configuration#passthroughenv), [`--filter`](https://turborepo.dev/docs/reference/run#--filter-string)
- TypeScript: [module reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- NestJS: [documentation](https://docs.nestjs.com), [controllers](https://docs.nestjs.com/controllers), [testing](https://docs.nestjs.com/fundamentals/testing)
- Testing: [Vitest](https://vitest.dev/guide/), [SWC](https://swc.rs), [`unplugin-swc`](https://github.com/unplugin/unplugin-swc)
- Commit checks: [husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged), [commitlint](https://commitlint.js.org), [Conventional Commits](https://www.conventionalcommits.org)
- Platform: [Node.js](https://nodejs.org), [Corepack](https://github.com/nodejs/corepack), [GitHub Actions](https://docs.github.com/en/actions)

**Template files at `v0.1.1`**

- Root: [`package.json`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/package.json), [`.node-version`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.node-version), [`.gitignore`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.gitignore), [`pnpm-workspace.yaml`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/pnpm-workspace.yaml), [`turbo.json`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/turbo.json)
- Packages: [`packages/types`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/packages/types), [`packages/config`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/packages/config)
- API: [`apps/api/src`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/apps/api/src), [`apps/api/test`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/apps/api/test), [`vitest.config.ts`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/apps/api/vitest.config.ts)
- Checks: [`.husky`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/.husky), [`commitlint.config.js`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/commitlint.config.js), [`ci.yml`](https://github.com/sonalip9/fullstack-monorepo-template/blob/v0.1.1/.github/workflows/ci.yml)
- Decisions: [`docs/adr`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/docs/adr), [`docs/swapping`](https://github.com/sonalip9/fullstack-monorepo-template/tree/v0.1.1/docs/swapping)
