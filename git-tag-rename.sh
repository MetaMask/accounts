#!/bin/bash

# Args:
readonly PKG_PREFIX="$1"

# We force the prefix to start with @metamask
readonly MM_PREFIX="@metamask"

set -euo pipefail

usage() {
  echo "usage: $0 $MM_PREFIX/<pkg-prefix>"
}

rename_tag() {
  local tag="$1"

  # We do remove the 'v' prefix for versionned tags
  local sanitized_tag=$(echo $tag | sed 's#^v\([0-9]\)#\1#')

  # Re-create a new tag from the old one and then remove the old one
  git tag $PKG_PREFIX@$sanitized_tag $tag
  git tag $tag --delete
}

# Check that prefix in defined and has a non-zero length
if [[ "$PKG_PREFIX" == "" ]] || [[ "$PKG_PREFIX" != $MM_PREFIX/* ]]; then
  usage
  exit 1
fi

for tag in $(git tag --list); do
  if [[ "$tag" == $MM_PREFIX/* ]]; then
    echo :: skipping tag: $tag
  else
    echo :: renaming tag: $tag
    rename_tag $tag
  fi
done
