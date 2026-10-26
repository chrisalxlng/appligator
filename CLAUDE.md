@AGENTS.md

# Development Workflow

1. The user provides the requirements; we agree on a rough plan together before coding.
2. Implement on a new branch, write tests and verify visually in the browser.
3. When the result is complete and all checks pass, push and open a pull request — no separate go needed.
4. The user reviews, approves and merges.

# Tools

- **Dev server:** `vp run dev` serves the website at http://localhost:5173 (strict port; if it is taken, a dev server is already running).
- **Playwright MCP:** drive the app in a browser to verify features and take screenshots (saved to `.playwright-mcp/`, gitignored).
- **Chrome DevTools MCP:** inspect console errors, network requests and performance.
- **Figma MCP:** designs live in the Figma file "Appligator" (file key `p87iDADBZ2aALpClaG2UPd`, https://www.figma.com/design/p87iDADBZ2aALpClaG2UPd/Appligator). Check the relevant frames before implementing UI.

# Code Style

- Code must be readable and understandable on its own: clear names, small focused functions, obvious control flow.
- Comments are the last resort. Only add one when the code cannot be made self-explanatory, e.g. to explain a non-obvious "why" (external constraints, workarounds). Never comment what the code already says.
- Indentation is 2 spaces everywhere (see `.editorconfig`).

# Git Workflow

## Branches

- Never commit to `master` directly; every change goes through a pull request.
- Branch names are short kebab-case descriptions of the content, e.g. `add-login-form`.
- Before creating a branch, check the name is free: `git ls-remote --heads origin <name>`. If it is taken, choose a more specific name.

## Commits

- Commit messages are in English.
- The subject starts with a capitalized verb in imperative mood (no trailing "s"): `Add setup`, `Fix date parsing` — not `Adds setup` or `Added setup`.
- Keep the subject short (≤ 72 characters), no trailing period. Add a body when the "why" is not obvious.

## GitHub

- Use `.claude/scripts/gh-bot` instead of `gh`; it authenticates as the `appligator-claude-bot` GitHub App.
- `git push` authenticates as the bot automatically via the credential helper in `.claude/settings.local.json`.
- Never merge; the user reviews and merges.

## Pull Requests

- The PR title follows the commit message convention (it becomes the squash commit message).
- Assign the user and request their review: `--assignee chrisalxlng --reviewer chrisalxlng` (`.github/CODEOWNERS` requests it as well).
- Add a fitting label: `enhancement`, `bug`, `documentation`, `refactor`, `test`, `chore`, `ci`, `dependencies`.
- Add the milestone of the targeted version, if one exists (`gh-bot api repos/chrisalxlng/appligator/milestones`).

## Hooks

`.vite-hooks/commit-msg` enforces the commit convention, `.vite-hooks/pre-push` the branch naming. Never bypass hooks with `--no-verify`; fix the cause instead.
