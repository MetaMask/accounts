#!/bin/bash

set -euo pipefail

get_release_version_from() {
  version="$1"

  # Extract major version
  major="$(echo "${version}" | cut -d. -f1)"

  # Replace current major by next major (# means ^ using bash notation)
  echo "${version/#${major}/$((major + 1))}"
}

url_encode() {
  echo -n "$@" | jq --slurp --raw-input --raw-output "@uri"
}

# Check if release branch already exists
CURRENT_VERSION="$(jq '.version' package.json | tr -d '"')"
RELEASE_VERSION="$(get_release_version_from "${CURRENT_VERSION}")"
RELEASE_BRANCH="release/${RELEASE_VERSION}"
readonly CURRENT_VERSION
readonly RELEASE_VERSION
readonly RELEASE_BRANCH
if git show-ref "refs/heads/${RELEASE_BRANCH}" --quiet; then
  echo "Release branch already exists: ${RELEASE_BRANCH}"
  echo "Assuming the release is on-going, so nothing to be done here!"
  exit 1
fi

# Create the release branch first:
yarn create-release-branch

# Then, create the PR:
readonly RELEASE_PR_TITLE="release: ${RELEASE_VERSION}"
readonly RELEASE_PR_BODY="## Description

This is the release candidate for version ${RELEASE_VERSION}. See the changelogs for more details."
if command -v gh &> /dev/null; then
  # Check if `gh` exists and create the release branch automatically!
  gh pr create --title "${RELEASE_PR_TITLE}" --body "${RELEASE_PR_BODY}"
else
  # As as fallback, we just output a link to create the PR manually
  echo "https://github.com/MetaMask/accounts/compare/${RELEASE_BRANCH}?expand=1&title=$(url_encode "${RELEASE_PR_TITLE}")&body=$(url_encode "${RELEASE_PR_BODY}")"
fi
