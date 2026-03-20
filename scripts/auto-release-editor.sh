#!/bin/bash
# Auto-editor script for create-release-branch
# Writes the release spec to the temp file passed as $1

cat > "$1" << 'SPEC'
packages:
  "@metamask/eth-money-keyring": "1.0.0"
  "@metamask/keyring-api": minor
  "@metamask/eth-trezor-keyring": intentionally-skip
SPEC
