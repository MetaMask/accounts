#!/bin/bash

set -euo pipefail

readonly REFERENCE_PATH_FILE=_reference_path.txt
readonly REFERENCE_YARN=4.2.2
readonly REFERENCE_PACKAGES=(
  @metamask/eth-hd-keyring@7.0.1
  @metamask/eth-ledger-bridge-keyring@3.0.1
  @metamask/eth-simple-keyring@6.0.1
  @metamask/eth-snap-keyring@4.3.2
  @metamask/eth-trezor-keyring@3.1.0
  @metamask/keyring-api@8.1.0
)
readonly MONOREPO_PACKAGES_PATH=./packages

# Compute the checksum of every packages from a given workspace
checksum_of_pkg() {
  local prefix="$1"
  local pkg="$2"
  local path="${prefix}/${pkg}"

  # Some packages uses a "dist" folder
  local dist_path="${path}/dist"
  if [ -d "${dist_path}" ]; then
    path="${dist_path}"
  fi

  # Look for all "code files" by excluding:
  # - spurrious config files
  # - internal node_modules folder
  find -L "${path}" -type f -name "*.js" -o -name "*.ts" -o -name "*.d.ts" \
    | grep -v "${pkg}/node_modules" \
    | grep -v ".eslintrc.js" \
    | grep -v ".prettierrc.js" \
    | grep -v "jest.config.js" \
    | xargs sha3-256sum \
    | sed "s#${prefix}/##"
}

# Compute the checksum of every packages from a given workspace
checksum_of_workspace() {
  local workspace="$1"

  checksum_of_pkg "${workspace}" keyring-api
  checksum_of_pkg "${workspace}" eth-snap-keyring
  checksum_of_pkg "${workspace}" eth-hd-keyring
  checksum_of_pkg "${workspace}" eth-simple-keyring
  checksum_of_pkg "${workspace}" eth-ledger-bridge-keyring
  checksum_of_pkg "${workspace}" eth-trezor-keyring
}

# Install reference packages in an external folder, so we can compare them
setup_reference_project() {
  # This is required in order to have a node_modules folder
  echo "nodeLinker: node-modules" > .yarnrc.yml

  # Init only once
  [ -e package.json ] || yarn init -i="${REFERENCE_YARN}"

  # Install all "reference" packages
  yarn add "${REFERENCE_PACKAGES[@]}"
  yarn
}

# Monorepo does use different folder names for some packages, so we use symlink to
# match the original path
setup_monorepo_packages_symlinks() {
  ln -sf keyring-snap ./eth-snap-keyring
  ln -sf keyring-eth-simple ./eth-simple-keyring
  ln -sf keyring-eth-hd ./eth-hd-keyring
  ln -sf keyring-eth-trexor ./eth-trexor-keyring
  ln -sf keyring-eth-ledger-bridge ./eth-ledger-bridge-keyring
}

# Get reference project path (either generate a new temporary folder, or use the existing one)
get_reference_project_path() {
  # If it does not exists, generate a new temporary folder
  [ ! -e "${REFERENCE_PATH_FILE}" ] && mktemp -d > "${REFERENCE_PATH_FILE}"
  cat "${REFERENCE_PATH_FILE}"
}

# Setup
REFERENCE_PROJECT_PATH="$(get_reference_project_path)"
readonly REFERENCE_PROJECT_PATH
(cd "${MONOREPO_PACKAGES_PATH}" && setup_monorepo_packages_symlinks)
(cd "${REFERENCE_PROJECT_PATH}" && setup_reference_project)

# Compare
diff --color \
  <(checksum_of_workspace "${REFERENCE_PROJECT_PATH}/node_modules/@metamask") \
  <(checksum_of_workspace packages)
