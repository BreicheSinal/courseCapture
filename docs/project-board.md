# Project board

The board at https://github.com/users/BreicheSinal/projects/1 is kept in step by
`.github/workflows/project-board.yml`:

| Issue or PR | Status |
|---|---|
| Open, no label | Todo |
| Open with the label `in progress`, or an open pull request | In Progress |
| Closed, or pull request merged | Done |

New issues and PRs are added to the board automatically.

## One-time setup
1. Create a token: GitHub → Settings → Developer settings → **Personal access tokens → Tokens (classic)** → Generate new token.
   Scopes: **`project`** and **`repo`**. Expiry: your choice (renew it when it runs out).
2. Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   name `PROJECT_TOKEN`, value: the token.
3. Repo → Actions → **Project board** → **Run workflow** once. It puts every existing issue and PR in the right column.

The board's Status field needs the options **Todo**, **In Progress** and **Done** (GitHub's defaults).

## How Claude uses it
Starting work on an issue: add the label `in progress`. Finishing: close it (or merge the PR that closes it). The board follows.
