@AGENTS.md

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
- Push and open pull requests only after the user gives the go. Never merge; the user reviews and merges.
