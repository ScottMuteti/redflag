# Contributing

## Rules

- Never commit directly to `main`. `main` must always work and be deployable.
- Run `git pull origin main` before starting new work.
- Every change starts as an issue and lands through a reviewed PR.

## Branch names

`category/issue-number-short-description`

- Lowercase, kebab-case
- Description under 4 words

| Category    | Use for                          |
| ----------- | -------------------------------- |
| `feat/`     | New feature                      |
| `fix/`      | Non-urgent fix                   |
| `bugfix/`   | Bug found in testing             |
| `hotfix/`   | Urgent fix for `main`            |
| `design/`   | UI/UX changes                    |
| `refactor/` | Code change, same behaviour      |
| `test/`     | Tests only                       |
| `doc/`      | Docs only                        |
| `style/`    | Formatting, lint, no logic change |

Examples:

- ✅ `feat/12-sms-campaign-scheduler`
- ✅ `fix/27-login-token-expiry`
- ❌ `Feature/SMS_Scheduler` (caps, no issue number)
- ❌ `fix/27-fix-the-bug-where-login-fails` (too long)

## Commit messages

`type(scope): short description`

- Imperative mood ("add", not "added")
- Header under 50 chars
- `type` matches the branch categories (`feat`, `fix`, `refactor`, `test`, `doc`, `style`, …)
- `scope` is the app module: `auth`, `employees`, `campaigns`, `scoring`, `training`, `analytics`, `portal`, `risk-model`, `ci`

| ✅ Good                                  | ❌ Bad                   |
| ---------------------------------------- | ------------------------ |
| `fix(index-nav): realign team links list` | `fixed the broken link`  |
| `feat(campaigns): add sms schedule field` | `added stuff`            |
| `test(scoring): cover empty history case` | `tests`                  |

For complex changes, add a body and footer:

```
feat(training): assign quiz after failed sim

Employees who click a simulated link now get a
follow-up quiz matched to the attack type.

Closes #42
```

Header / blank line / body / blank line / footer.

## Lifecycle

1. **Issue** — open one with the Feature or Bug template. Note the suggested branch name.
2. **Branch** — `git pull origin main`, then `git checkout -b feat/42-quiz-after-fail`.
3. **Commit** — small commits in the format above.
4. **Sync** — before opening the PR, `git pull --rebase origin main` and fix conflicts.
5. **PR** — push and open a PR into `main`. Fill in the template; link the issue (`Closes #42`).
6. **Review** — CI must pass and one reviewer must approve. Address comments with new commits.
7. **Merge** — reviewer or author merges once approved. Delete the branch.

## Kanban

| Column          | Meaning                                         |
| --------------- | ----------------------------------------------- |
| **To Do**       | Issue open, not started                         |
| **In Progress** | Branch created, work ongoing                    |
| **In Review**   | PR open, waiting on CI/review                   |
| **Done**        | PR merged into `main`, issue closed             |
