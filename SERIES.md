# Series plan: a fullstack monorepo, step by step

Template repo: `fullstack-monorepo-template` (public, GitHub template repository).
One git tag per post, so readers can check out the exact state a post describes.

Every post that adopts a third-party library follows the same pattern:
an options table, a seam the app owns, a lint rule that keeps the library inside its adapter
folder, and a short "how to swap" note in the template's `docs/swapping/`.

## Posts

| # | Post | Template tag | Status |
|---|---|---|---|
| 01 | Monorepo foundation + API: pnpm workspaces and catalogs, Turborepo, shared config and types packages, git hooks, NestJS API with `/health` | v0.1.0 | draft-ready |
| 02 | Two frontends, one UI package: Expo and Next.js sharing a Tamagui-based UI package and the shared types | v0.2.0 | planned |
| 03 | Database: Neon and Prisma behind a repository port, migrations, a dev branch | v0.3.0 | planned |
| 04 | Secrets: Doppler layout, running locally with `doppler run` | v0.4.0 | planned |
| 05 | Terraform I: bootstrap layer, remote state in Cloudflare R2, reusable environment module | v0.5.0 | planned |
| 06 | Terraform II and Render: provision Neon, Render and Doppler per environment | v0.6.0 | planned |
| 07 | CI/CD and releases: GitHub Actions, pre-deploy migrations, manual prod release with rollback | v0.7.0 | planned |
| 08 | Optional: mobile builds and OTA, file storage on R2, auth | v0.8.0 | idea |

Status values: `idea`, `planned`, `draft-ready`, `draft`, `review`, `published`.
`draft-ready` means the template tag exists and the post outline matches it, so writing can start.

The template repo is built in Claude Code, and each tag is verified with `pnpm check` before its post is written.

## Options to cover per layer

Defaults are what the template uses. Check current pricing and free tiers when writing each post.

| Layer | Default | Alternatives to list |
|---|---|---|
| Package manager and monorepo | pnpm + Turborepo | npm, yarn or bun workspaces; Nx |
| UI toolkit (Expo + Next.js) | Tamagui | NativeWind, Gluestack, React Native Paper (shadcn/ui on web only) |
| API framework | NestJS | Fastify, Hono, Express, Next.js route handlers |
| ORM | Prisma behind a repository port | Drizzle, TypeORM, Kysely |
| Database host | Neon | Supabase, Railway, AWS RDS, local Docker Postgres |
| Secrets | Doppler | Infisical, 1Password CLI, plain `.env` plus GitHub secrets |
| Infrastructure as code | Terraform | OpenTofu, Pulumi |
| Terraform state | Cloudflare R2 (S3 backend) | AWS S3, GCS, HCP Terraform |
| API hosting | Render | Fly.io, Railway, Cloud Run |
| Web hosting | Render or Vercel | Vercel, Netlify, Cloudflare |
| Mobile builds and OTA | EAS | Local builds, Fastlane |

## After the series

System design posts: separate series, to be planned once this one is published.
