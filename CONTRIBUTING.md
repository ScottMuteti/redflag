# Contributing

## Rules

- Never commit directly to `main`. `main` must always work and be deployable.
- **Pull early, pull often:** run `git pull origin main` before starting work and before opening a PR.
- Every change starts as an issue and lands through a PR that passes CI.

## Workflow

1. **Plan** — issues live under a milestone (e.g. `MVP version`) and on the project board.
2. **Branch** — one branch per issue, named as below.
3. **Integrate** — small commits, sync with `main`, open a PR.
4. **Deploy** — CI runs on every push and PR; only green PRs merge into `main`.

## Branch names

`category/issue-number-short-description`

- Lowercase, kebab-case — no spaces or special characters
- Description 2–4 words, clear without opening the issue

| Category    | Use for                           |
| ----------- | --------------------------------- |
| `feat/`     | New feature                       |
| `fix/`      | Non-urgent fix                    |
| `bugfix/`   | Bug found in testing              |
| `hotfix/`   | Urgent fix for `main`             |
| `design/`   | UI/UX changes                     |
| `refactor/` | Code change, same behaviour       |
| `test/`     | Tests only                        |
| `doc/`      | Docs only                         |
| `style/`    | Formatting, lint, no logic change |

| ✅ Good                  | ❌ Bad                                                              | Why bad              |
| ----------------------- | ------------------------------------------------------------------ | -------------------- |
| `feat/12-jane-profile`   | `feat/jane profile page`                                            | Spaces               |
| `fix/104-mpesa-timeout`  | `john-branch`                                                       | No category/issue #  |
| `style/44-emerald-theme` | `feat/adding-the-new-strathmore-business-school-courses-to-the-list` | Too long             |

GitHub's **Create a branch** button on an issue names it `12-issue-title`. Rename it to the format above (use the name suggested in the issue).

## Commit messages

`type(scope): short description`

- Imperative mood, header under 50 chars
- Test: it must complete *"If applied, this commit will ___"*
- `type` = branch category (`feat`, `fix`, `refactor`, `test`, `doc`, `style`, …)
- `scope` = module: `auth`, `employees`, `campaigns`, `scoring`, `training`, `analytics`, `portal`, `risk-model`, `ci`

| ✅ Good                                     | ❌ Bad                   |
| ------------------------------------------ | ----------------------- |
| `fix(nav): repair broken team link`         | `fixed the broken link`  |
| `feat(profile): add grid layout for images` | `fixing the image bug`   |
| `test(scoring): cover empty history case`   | `tests`                  |

Non-trivial changes use three parts — header (required) / blank line / body (why, optional) / blank line / footer (optional):

```
feat(training): assign quiz after failed sim

Employees who click a simulated link now get a
follow-up quiz matched to the attack type, so
training targets what they actually fell for.

Closes #42
```

## Lifecycle

1. **Issue** — open one with the Feature or Bug template. Note the suggested branch.
2. **Branch** — `git pull origin main`, then `git checkout -b feat/42-quiz-after-fail`.
3. **Commit** — small commits in the format above.
4. **Sync** — `git pull origin main` and fix conflicts before pushing.
5. **PR** — push, open a PR into `main`, fill in the template, link the issue (`Closes #42`).
6. **Review** — CI must pass. With 2+ contributors, one approval is also required.
7. **Merge** — merge once green, delete the branch. The issue closes itself.

## Merge conflicts

Pull early, pull often. Common causes:

- **Same-line edits** — two branches change the same line
- **Delete vs modify** — one branch deletes a file the other edits
- **Appended lists** — both add to the end of the same list/file (routes, imports, CSS)
- **Renames** — one branch moves a file the other edits
- **Line endings** — CRLF vs LF makes every line look changed (`.gitattributes` forces LF)

## Kanban

| Column          | Meaning                               |
| --------------- | ------------------------------------- |
| **To Do**       | Issue open, not started               |
| **In Progress** | Branch created, work ongoing          |
| **In Review**   | PR open, waiting on CI/review         |
| **Done**        | PR merged into `main`, issue closed   |

## Git cheat sheet

```
git fetch origin
git checkout main && git pull origin main
git checkout -b category/issue-number-description
# ... work ...
git add <files>
git commit -m "type(scope): description"
git pull origin main            # catch conflicts before pushing
git push -u origin category/issue-number-description
# open the PR on GitHub
```
