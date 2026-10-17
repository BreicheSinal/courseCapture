# Project board

The board at https://github.com/users/BreicheSinal/projects/1 is kept in step by
`.github/workflows/project-board.yml`:

| Issue or PR | Status |
|---|---|
| Open issue | Todo (or Backlog, then Ready, on a Kanban board) |
| Open issue with the label `in progress` | In progress |
| Open pull request | In review (or In progress if there's no review column) |
| Closed, or pull request merged | Done |

New issues and PRs are added to the board automatically.

## One-time setup
1. Create a token: GitHub → Settings → Developer settings → **Personal access tokens → Tokens (classic)** → Generate new token.
   Scopes: **`project`** and **`repo`**. Expiry: your choice (renew it when it runs out).
2. Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   name `PROJECT_TOKEN`, value: the token.
3. Repo → Actions → **Project board** → **Run workflow** once. It puts every existing issue and PR in the right column.

Works with the default board (Todo / In Progress / Done) and the Kanban template (Backlog / Ready / In progress / In review / Done). If something can't sync, the run shows an error annotation saying why.

## How Claude uses it
Starting work on an issue: add the label `in progress`. Finishing: close it (or merge the PR that closes it). The board follows.
