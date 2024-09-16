#!/bin/bash

set -euo pipefail

for tag in $(git tag --list); do
  if [[ "$tag" == v* ]]; then
    echo :: removing tag: $tag
    git tag $tag --delete
    #git push origin :$tag
  fi
done
