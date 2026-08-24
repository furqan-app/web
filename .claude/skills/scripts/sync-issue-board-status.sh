#!/usr/bin/env bash
# Move an issue's card on the "Furqan Kanban" board (project #3) to match a status:* label.
# Fallback for when the issue-status-to-project.yml workflow hasn't fired or misfired.
#
# Usage: sync-issue-board-status.sh <issue-number> <status-label>
# Example: sync-issue-board-status.sh 142 status:in-progress
#
# Requires gh with `project` scope: gh auth refresh -s read:project -s project
set -euo pipefail

ISSUE_NUM="${1:?Usage: sync-issue-board-status.sh <issue-number> <status-label>}"
LABEL="${2:?Usage: sync-issue-board-status.sh <issue-number> <status-label>}"
ORG="furqan-app"
REPO="web"
PROJECT_NUMBER=3
FIELD_ID="PVTSSF_lADOCyJLuM4BgSPAzhafCVA"

case "$LABEL" in
  status:backlog)        option="f75ad846" ;; # Backlog
  status:todo)           option="61e4505c" ;; # Ready
  status:in-progress)    option="47fc9ee4" ;; # In progress
  status:in-review)      option="df73e18b" ;; # In review
  status:to-be-released) option="fda173c6" ;; # To be released
  status:done)           option="98236657" ;; # Done
  *) echo "No board mapping for '$LABEL' — skipping."; exit 0 ;;
esac

project_id=$(gh api graphql \
  -f query='query($org:String!,$num:Int!){ organization(login:$org){ projectV2(number:$num){ id } } }' \
  -f org="$ORG" -F num="$PROJECT_NUMBER" --jq '.data.organization.projectV2.id')

item_id=$(gh api graphql \
  -f query='query($owner:String!,$name:String!,$num:Int!){ repository(owner:$owner,name:$name){ issue(number:$num){ projectItems(first:20){ nodes{ id project{ number } } } } } }' \
  -f owner="$ORG" -f name="$REPO" -F num="$ISSUE_NUM" \
  --jq ".data.repository.issue.projectItems.nodes[] | select(.project.number == $PROJECT_NUMBER) | .id")

if [[ -z "$item_id" ]]; then
  content_id=$(gh api "repos/$ORG/$REPO/issues/$ISSUE_NUM" --jq '.node_id')
  item_id=$(gh api graphql \
    -f query='mutation($projectId:ID!,$contentId:ID!){ addProjectV2ItemById(input:{projectId:$projectId,contentId:$contentId}){ item{ id } } }' \
    -f projectId="$project_id" -f contentId="$content_id" --jq '.data.addProjectV2ItemById.item.id')
fi

gh api graphql \
  -f query='mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){ updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,value:{singleSelectOptionId:$optionId}}){ projectV2Item{ id } } }' \
  -f projectId="$project_id" -f itemId="$item_id" -f fieldId="$FIELD_ID" -f optionId="$option" >/dev/null

echo "Moved #$ISSUE_NUM to board column for '$LABEL'."
