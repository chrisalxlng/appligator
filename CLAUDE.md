@AGENTS.md

# Development Workflow

1. The user provides the requirements; we agree on a rough plan together before coding.
2. Implement on a new branch, write tests and verify visually in the browser.
3. When the result is complete and all checks pass, push and open a pull request — no separate go needed.
4. The user reviews, approves and merges.

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
- Assign the user: `--assignee chrisalxlng`. Review is requested automatically via `.github/CODEOWNERS`.
- Add a fitting label: `enhancement`, `bug`, `documentation`, `refactor`, `test`, `chore`, `ci`, `dependencies`.
- Add the milestone of the targeted version, if one exists (`gh-bot api repos/chrisalxlng/appligator/milestones`).

## Hooks

`.vite-hooks/commit-msg` enforces the commit convention, `.vite-hooks/pre-push` the branch naming. Never bypass hooks with `--no-verify`; fix the cause instead.
