# FP Training Flash

Functional-programming training platform. Learners solve short Gleam exercises (Erlang target), get
execution-based coaching, and are scheduled by per-skill Elo ratings and spaced review. The same training
engine is available on the web, through an MCP server (Claude and other AI hosts), and as a CLI.

- Product requirements: [plan.md](plan.md). Design proposal: [proposal.md](proposal.md).
- Architecture and module rules: [docs/architecture.md](docs/architecture.md), [CLAUDE.md](CLAUDE.md).
- Content format and plan: [content/README.md](content/README.md), [docs/content-plan.md](docs/content-plan.md).

## Requirements

Node 25+, pnpm 12, Docker (for the grading sandbox). Gleam 1.18 and Erlang/OTP are only needed for the local
development runner and for working on exercises.

## Run it locally

```sh
pnpm install
pnpm runner:build                      # builds the fp-gleam-runner:1.18.1 sandbox image
FP_DATA_DIR=memory pnpm api            # API on http://localhost:8787 (in-memory PostgreSQL)
pnpm web                               # web UI on http://localhost:5173
```

API configuration (environment variables):

| variable | default | meaning |
|---|---|---|
| `PORT` | 8787 | HTTP port |
| `DATABASE_URL` | unset | PostgreSQL connection string; when unset, PGlite is used |
| `FP_DATA_DIR` | `.data/pglite` | PGlite data directory, or `memory` |
| `FP_CONTENT_DIR` | `content/` | content source, validated and imported at startup |
| `FP_RUNNER` | `docker` | `docker` (sandboxed) or `local` (development only, unsandboxed) |
| `FP_RUNNER_IMAGE` | `fp-gleam-runner:1.18.1` | sandbox image |
| `ANTHROPIC_API_KEY` | unset | enables LLM coaching; without it coaching is rule-based |
| `FP_COACH_MODEL` | see apps/api | coaching model id |
| `FP_WEB_ORIGIN` | `http://localhost:5173` | CORS origin for the web UI |

The web UI can run without a backend: `VITE_FAKE_API=1 pnpm web`.

## CLI

```sh
alias fp="node $PWD/apps/cli/src/main.ts"
fp login 홍길동
fp start            # starts a 15-minute session and writes the exercise to ./fp-work/<family>-<variant>/
fp run              # public tests (not recorded)
fp submit           # full grading, rating change
fp feedback last    # coach feedback
fp progress
```

The generated exercise directory is a normal Gleam project, so any editor with the Gleam language server works.

## MCP

Issue a token with `fp token issue mcp`, then register the server with your MCP host, for example Claude Code:

```sh
claude mcp add fp-training -e FP_API_URL=http://localhost:8787 -e FP_TOKEN=<token> -- node $PWD/apps/mcp/src/main.ts
```

## Development

```sh
pnpm check                         # boundaries, typecheck, all tests
pnpm check:module @fp/grading      # definition of done for one package
node tools/ctx.mjs @fp/sessions    # exact file set needed to work on one package
pnpm content:ci --family <id>      # validate exercises on the real grader
```
