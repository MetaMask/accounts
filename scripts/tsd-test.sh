#!/bin/bash

set -euo pipefail

# Get the current package test directory
if [[ $# -eq 0 ]]; then
  echo "Missing package test directory."
  exit 1
fi

package_test_dir="$1"
package_test_files=("${package_test_dir}"/**/*.test-d.ts)

# To avoid logging a tsd error message, we check if it exists any file for that
# pattern:
if [ -e "${package_test_files[0]}" ]; then
  tsd --files "${package_test_dir}/**/*.test-d.ts"
else
  echo "Nothing to test with tsd."
fi
