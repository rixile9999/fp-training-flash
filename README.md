# FP Training Flash

Functional-programming training platform. Learners solve short Gleam exercises (Erlang target), get
execution-based coaching, and are scheduled by per-skill Elo ratings and spaced review. The same training
engine is available on the web, through an MCP server (Claude and other AI hosts), and as a CLI.

- Product requirements: [plan.md](plan.md). Design proposal: [proposal.md](proposal.md).
- Architecture and module rules: [docs/architecture.md](docs/architecture.md), [CLAUDE.md](CLAUDE.md).
- Content format and plan: [content/README.md](content/README.md), [docs/content-plan.md](docs/content-plan.md).
- Open issues and next steps: [docs/backlog.md](docs/backlog.md).

## Requirements

Node 25+, pnpm 12, Docker (for the grading sandbox). Gleam 1.18 and Erlang/OTP are only needed for the local
development runner and for working on exercises.

## Run it locally

Requirements: Node 25+, pnpm, Docker Desktop. One script does everything (installs dependencies, starts Docker,
builds the grader image on first run, starts API + web in the background, opens the browser):

```sh
./fpctl up              # start the last commit (learning data kept in .data/pglite)
./fpctl up --dev        # start the working tree instead (uncommitted changes, e.g. while agents are editing)
./fpctl up --memory     # start with a throwaway in-memory DB
./fpctl up --agent      # start with the tool-using chat coach
./fpctl status          # processes and API health
./fpctl logs [api|web]  # follow logs
./fpctl restart         # stop + start
./fpctl down            # stop
./fpctl reset           # stop and delete local learning data (asks first; --yes to skip)
```

By default fpctl runs the last commit from a separate git worktree (.data/stable), so edits in progress cannot break
or skew the running app; `./fpctl status` shows the mode and commit. Web: http://localhost:5173, API:
http://localhost:8787. Coaching uses `DASHSCOPE_API_KEY` (or
`ANTHROPIC_API_KEY`) from the environment; without a key it is rule-based.

API configuration (environment variables):

| variable | default | meaning |
|---|---|---|
| `PORT` | 8787 | HTTP port |
| `DATABASE_URL` | unset | PostgreSQL connection string; when unset, PGlite is used |
| `FP_DATA_DIR` | `.data/pglite` | PGlite data directory, or `memory` |
| `FP_CONTENT_DIR` | `content/` | content source, validated and imported at startup |
| `FP_RUNNER` | `docker` | `docker` (sandboxed) or `local` (development only, unsandboxed) |
| `FP_RUNNER_IMAGE` | `fp-gleam-runner:1.18.1` | sandbox image |
| `FP_LLM_PROVIDER` | auto | `anthropic`, `dashscope` or `none`; auto picks the first key that is set |
| `DASHSCOPE_API_KEY` / `ANTHROPIC_API_KEY` | unset | coaching LLM keys |
| `FP_COACH_MODEL` | `qwen3.8-flash` / `claude-opus-5` | coaching model id |
| `FP_COACH_CHAT_AGENT` | off | `on` enables the tool-using chat agent (DashScope) |
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
