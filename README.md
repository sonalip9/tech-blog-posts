# Tech blog posts

Markdown source for the posts on **Build, Measure, Learn: Tech & Data** (Hashnode).
This repo is the source of truth for drafts; Hashnode is where posts are published.

The current series walks through a fullstack TypeScript monorepo: backend, two frontends,
Terraform, Render, Neon and more. It pairs with the public template repo
`fullstack-monorepo-template`, which gets one git tag per post.

## Layout

```
posts/
  01-monorepo-foundation/
    index.md        # the post
    assets/         # images, diagrams, GIFs used by the post
templates/
  post.md           # copy this to start a new post
SERIES.md           # series plan and status of every post
.githooks/
  commit-msg        # enforces Conventional Commits, no dependencies
```

## Workflow

1. Copy `templates/post.md` to `posts/NN-short-slug/index.md`.
2. Set `status: draft` in the frontmatter and write.
3. Check the post against the template's checklist (section at the bottom of the template).
4. Verify every command and snippet against the matching tag of the template repo.
5. Publish on Hashnode, then set `status: published` and fill in `hashnodeUrl`.
6. Update the row in `SERIES.md`.

## Commits

Conventional Commits, one module per commit. Scope is the thing you touched.

```
<type>(<scope>): <subject>
```

| Type | Use for |
|---|---|
| `docs` | Writing and editing post content, README, series plan |
| `feat` | A new post file, template, or tooling capability |
| `fix` | Correcting a technical error or broken snippet in a post |
| `chore` | Repo housekeeping, config, hooks |
| `style` | Formatting only, no wording change |
| `refactor` | Restructuring a post without changing its meaning |

Scopes: `post-01`, `post-02`, ... for one post; `series`, `templates`, `hooks`, `repo`, `readme`.

Examples:

```
docs(post-01): draft the repo layout section
fix(post-01): correct the turbo.json dependsOn example
feat(templates): add options table section
```

Keep commits small and separate: one section or one concern each. Never mix two posts in one commit.

### Enable the commit hook

Git does not turn hooks on automatically after a clone. Run once:

```bash
git config core.hooksPath .githooks
```

The hook only needs `sh` and `grep`. Merge, revert, fixup and squash messages are allowed through.
