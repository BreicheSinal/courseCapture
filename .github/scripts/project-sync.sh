#!/usr/bin/env bash
# Puts issues and pull requests on the GitHub Project board and sets their Status:
#   closed or merged            → Done
#   open PR, or label "in progress" → In Progress
#   anything else open          → Todo
# Usage: project-sync.sh <node_id> <state> <is_pr> <labels-comma-separated>
#        project-sync.sh --all   (every issue and PR in the repo)
# Needs: GH_TOKEN (PAT with project access), PROJECT_OWNER, PROJECT_NUMBER, GITHUB_REPOSITORY.
set -euo pipefail

owner="${PROJECT_OWNER}"
number="${PROJECT_NUMBER}"

meta=$(gh api graphql -f query='
  query($owner: String!, $number: Int!) {
    user(login: $owner) {
      projectV2(number: $number) {
        id
        field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
      }
    }
  }' -f owner="$owner" -F number="$number")

project_id=$(jq -r '.data.user.projectV2.id' <<<"$meta")
field_id=$(jq -r '.data.user.projectV2.field.id' <<<"$meta")
option() { jq -r --arg n "$1" '.data.user.projectV2.field.options[] | select((.name|ascii_downcase) == ($n|ascii_downcase)) | .id' <<<"$meta" | head -n1; }
todo=$(option "Todo")
doing=$(option "In Progress")
done_=$(option "Done")

if [[ -z "$project_id" || "$project_id" == "null" || -z "$field_id" || "$field_id" == "null" ]]; then
  echo "Project ${owner}/${number} or its Status field wasn't found. Check PROJECT_TOKEN has project access." >&2
  exit 1
fi

sync_one() {
  local node_id="$1" state="$2" is_pr="$3" labels="$4" status
  if [[ "$state" == "closed" || "$state" == "merged" ]]; then status="$done_"
  elif [[ "$is_pr" == "true" || ",${labels}," == *",in progress,"* ]]; then status="$doing"
  else status="$todo"; fi

  item_id=$(gh api graphql -f query='
    mutation($project: ID!, $content: ID!) {
      addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
    }' -f project="$project_id" -f content="$node_id" --jq '.data.addProjectV2ItemById.item.id')

  gh api graphql -f query='
    mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option }
      }) { projectV2Item { id } }
    }' -f project="$project_id" -f item="$item_id" -f field="$field_id" -f option="$status" >/dev/null
  echo "synced ${node_id} → ${status}"
}

if [[ "${1:-}" == "--all" ]]; then
  gh api --paginate "repos/${GITHUB_REPOSITORY}/issues?state=all&per_page=100" \
    --jq '.[] | [.node_id, .state, (if .pull_request then "true" else "false" end), ([.labels[].name] | join(","))] | @tsv' |
  while IFS=$'\t' read -r node state is_pr labels; do
    sync_one "$node" "$state" "$is_pr" "$labels"
  done
else
  sync_one "$1" "$2" "$3" "${4:-}"
fi
