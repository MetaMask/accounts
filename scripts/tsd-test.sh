#!/bin/bash

set -euo pipefail

# Get the current package test directory
if [[ $# -eq 0 ]]; then
  echo "Missing package test directory."
  exit 1
fi

package_test_dir="$1"
package_test_files=($(find "${package_test_dir}" -name "*.test-d.ts"))

# To avoid logging a tsd error message, we check if it exists any file for that
# pattern:
if [ "${#package_test_files[@]}" -gt 0 ]; then
  tsd_bin="$(dirname "$0")/../node_modules/.bin/tsd"

  # Read optional typings path from tsd.typings in package.json (needed when
  # the top-level "types" field was removed for ESM-only packages).
  typings_arg=""
  if [ -f "package.json" ]; then
    typings_path="$(node -e "try{const p=require('./package.json');const t=p.tsd&&p.tsd.typings;if(t)process.stdout.write(t)}catch(e){}")"
    if [ -n "$typings_path" ]; then
      typings_arg="--typings ${typings_path}"
    fi
  fi

  # shellcheck disable=SC2086
  "$tsd_bin" $typings_arg --files "${package_test_dir}/**/*.test-d.ts"
else
  echo "Nothing to test with tsd."
fi
