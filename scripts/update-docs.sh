#!/bin/bash
# Script to update PROJECT.md documentation
# This can be run manually or triggered by git hooks/MCP

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC_FILE="$PROJECT_DIR/PROJECT.md"

# Update timestamp in PROJECT.md
if [ -f "$DOC_FILE" ]; then
  # Update the "Last updated" line
  sed -i '' "s/> Last updated:.*/> Last updated: $(date '+%Y-%m-%d')/" "$DOC_FILE" 2>/dev/null || \
  sed -i "s/> Last updated:.*/> Last updated: $(date '+%Y-%m-%d')/" "$DOC_FILE"

  echo "Documentation updated: $DOC_FILE"
fi

# Get recent commits and update
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "No git history")

echo "Recent commits:"
echo "$RECENT_COMMITS"
