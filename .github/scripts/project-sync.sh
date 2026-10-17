#!/usr/bin/env bash
# Puts issues and pull requests on the GitHub Project board and sets their Status:
#   closed or merged             → Done
#   open pull request            → In review (or In progress if the board has no review column)
#   open issue labelled "in progress" → In progress
#   anything else open           → Todo (or Backlog / Ready on a Kanban board)
# Usage: project-sync.sh <node_id> <state> <is_pr> <labels-comma-separated>
#        project-sync.sh --all   (every issue and PR in the repo)
# Needs: GH_TOKEN (PAT with project access), PROJECT_OWNER, PROJECT_NUMBER, GITHUB_REPOSITORY.
set -uo pipefail

# Errors become annotations on the run (visible without opening the log).
fail() { echo "::error::$*"; }

owner="${PROJECT_OWNER}"
number="${PROJECT_NUMBER}"

meta=$(gh api graphql 2>&1 -f query='
  query($owner: String!, $number: Int!) {
    user(login: $owner) {
      projectV2(number: $number) {
        id
        field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
      }
    }
  }' -f owner="$owner" -F number="$number") || { fail "Couldn't read project ${owner}/${number}: ${meta}"; exit 1; }

project_id=$(jq -r '.data.user.projectV2.id' <<<"$meta")
field_id=$(jq -r '.data.user.projectV2.field.id' <<<"$meta")
# First matching option name wins, so both the default board (Todo / In Progress / Done)
# and the Kanban template (Backlog / Ready / In progress / In review / Done) work.
option() {
  local name id
  for name in "$@"; do
    id=$(jq -r --arg n "$name" '.data.user.projectV2.field.options[] | select((.name|ascii_downcase) == ($n|ascii_downcase)) | .id' <<<"$meta" | head -n1)
    [[ -n "$id" ]] && { echo "$id"; return; }
  done
}
todo=$(option "Todo" "To do" "Backlog" "Ready")
doing=$(option "In Progress" "Doing")
review=$(option "In Review" "Review")
[[ -n "$review" ]] || review="$doing"
done_=$(option "Done")

if [[ -z "$project_id" || "$project_id" == "null" || -z "$field_id" || "$field_id" == "null" ]]; then
  fail "Project ${owner}/${number} or its Status field wasn't found. Check PROJECT_TOKEN has project access."
  exit 1
fi
names=$(jq -r '[.data.user.projectV2.field.options[].name] | join(", ")' <<<"$meta")
if [[ -z "$todo" || -z "$doing" || -z "$done_" ]]; then
  fail "The Status field needs a to-do option (Todo, Backlog or Ready), In Progress and Done; it has: ${names}"
  exit 1
fi

sync_one() {
  local node_id="$1" state="$2" is_pr="$3" labels="$4" status out item_id
  if [[ "$state" == "closed" || "$state" == "merged" ]]; then status="$done_"
  elif [[ "$is_pr" == "true" ]]; then status="$review"
  elif [[ ",${labels}," == *",in progress,"* ]]; then status="$doing"
  else status="$todo"; fi

  out=$(gh api graphql 2>&1 -f query='
    mutation($project: ID!, $content: ID!) {
      addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
    }' -f project="$project_id" -f content="$node_id") || { fail "Couldn't add ${node_id}: ${out}"; return 1; }
  item_id=$(jq -r '.data.addProjectV2ItemById.item.id' <<<"$out")

  out=$(gh api graphql 2>&1 -f query='
    mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option }
      }) { projectV2Item { id } }
    }' -f project="$project_id" -f item="$item_id" -f field="$field_id" -f option="$status") ||
    { fail "Couldn't set Status on ${node_id}: ${out}"; return 1; }
  echo "synced ${node_id} → ${status}"
}

if [[ "${1:-}" == "--all" ]]; then
  list=$(gh api 2>&1 --paginate "repos/${GITHUB_REPOSITORY}/issues?state=all&per_page=100" \
    --jq '.[] | [.node_id, .state, (if .pull_request then "true" else "false" end), ([.labels[].name] | join(",") | if . == "" then "-" else . end)] | @tsv') ||
    { fail "Couldn't list issues: ${list}"; exit 1; }
  failed=0; total=0
  while IFS=$'\t' read -r node state is_pr labels; do
    total=$((total + 1))
    sync_one "$node" "$state" "$is_pr" "$labels" || failed=$((failed + 1))
  done <<<"$list"
  echo "Synced $((total - failed)) of ${total}."
  [[ "$failed" -eq 0 ]] || { fail "${failed} of ${total} items didn't sync (see the errors above)."; exit 1; }
else
  sync_one "$1" "$2" "$3" "${4:-}" || exit 1
fi
