#!/bin/bash

set -euo pipefail

# Get the current package test directory
if [[ $# -eq 0 ]]; then
  echo "Missing package test directory."
  exit 1
fi

package_test_dir="$1"

# For some reason, just running `tsd` with no arguments does not work properly. If you have some
# static errors in your *.test-d.ts, they might not be evaluated. However, specifying each tests
# with `--files` works everytime. So for now, we just use this wrapper for our typing tests.
# NOTE: This directive is expected since we want the output to be splitted:
# shellcheck disable=SC2046
package_test_files="$(find "${package_test_dir}" -name "*.test-d.ts" -exec echo -n "--files {} " \;)"
if [ "${package_test_files}" == "" ]; then
  # If there's no files, we prevent from calling `tsd` with no arguments, otherwise it fallsback
  # to the original behavior which is to test every `*d.ts` files.
  echo "Nothing to test with tsd."
else
  tsd "${package_test_files}"
fi
