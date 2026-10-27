@AGENTS.md

# Development Workflow

1. The user provides the requirements; we agree on a rough plan together before coding.
2. Implement on a new branch, write tests and verify visually in the browser. Afterwards close the browser and stop the dev servers by port (`lsof -tiTCP:5173,3000,6006 -sTCP:LISTEN | xargs kill`).
3. Self-review the whole branch (see below) and fix every finding right away.
4. When the result is complete and all checks pass, push and open a pull request — no separate go needed.
5. The user reviews, approves and merges.

## Self-Review

Review the full branch diff (`git diff master...HEAD`) as if it were someone else's PR:

- **Scope:** Does every change serve the feature? Remove unrelated edits, debug output and leftovers.
- **Unused code:** No dead code, unused exports, imports, dependencies, files or CSS.
- **Consistency:** Is the implementation coherent in itself and with the existing codebase (naming, structure, patterns)? No duplicated logic.
- **Correctness:** Edge cases, error and empty states, loading states.
- **Tests:** Do the tests cover the new behavior, including edge cases? Do they fail without the change?
- **UI:** Does it match the Figma design on desktop and mobile? No console errors.
- **Code style:** Readable without comments; remaining comments explain only a non-obvious "why".
- **Docs:** Are `CLAUDE.md`, READMEs and the PR description still accurate?

Summarize the self-review findings and what was fixed in the PR description.

# Tools

- **Dev server:** `vp run dev` starts the web app at http://localhost:5173 (strict port; if it is taken, a dev server is already running) and the API at http://localhost:3000.
- **Storybook:** `vp run storybook` serves the UI components at http://localhost:6006.
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
- CI (`.github/workflows/`) checks, tests and builds every PR and validates the PR title. After opening a PR, wait for `gh-bot pr checks <number> --watch` and fix failures.
- The bot cannot push changes under `.github/workflows/` (by design). Commit them and ask the user to push the branch; then open the PR.
- Never merge; the user reviews and merges.

## Pull Requests

- The PR title follows the commit message convention (it becomes the squash commit message).
- Assign the user and request their review: `--assignee chrisalxlng --reviewer chrisalxlng` (`.github/CODEOWNERS` requests it as well).
- Add a fitting label: `enhancement`, `bug`, `documentation`, `refactor`, `test`, `chore`, `ci`, `dependencies`.
- Add the milestone of the targeted version, if one exists (`gh-bot api repos/chrisalxlng/appligator/milestones`).
- The description contains a summary, a test plan and a "Self-review" section.

## Hooks

`.vite-hooks/commit-msg` enforces the commit convention, `.vite-hooks/pre-push` the branch naming. Never bypass hooks with `--no-verify`; fix the cause instead.
