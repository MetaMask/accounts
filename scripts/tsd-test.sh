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

  # The typings path only needs to be passed explicitly when tsd cannot
  # discover it natively from the top-level "types" field of package.json
  # (that field is absent in ESM-only packages). It can be provided as the
  # optional second argument, and is otherwise auto-detected from the
  # ESM-only build output.
  typings_args=()
  if [[ $# -ge 2 ]]; then
    typings_args=(--typings "$2")
  elif [[ -f "dist/index.d.ts" ]]; then
    typings_args=(--typings "dist/index.d.ts")
  fi

  # NOTE: the conditional expansion keeps this working under `set -u` with
  # bash 3.2 (macOS), where expanding an empty array is an unbound variable.
  "$tsd_bin" ${typings_args[@]+"${typings_args[@]}"} --files "${package_test_dir}/**/*.test-d.ts"
else
  echo "Nothing to test with tsd."
fi
