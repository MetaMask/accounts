# How to release

> [!NOTE]
> The term `x.y.z` will be used here to refer to the current version being released.

To start creating a new release, run:

```shell
yarn release
```

You will then be prompted with your `$EDITOR` to select which packages you want to release:

<!-- prettier-ignore -->
```yml
# This file (called the "release spec") allows you to specify which packages you
# want to include in this release along with the new versions they should
# receive.
#
# By default, all packages which have changed since their latest release are
# listed here. You can choose not to publish a package by removing it from this
# list.
#
# For each package you *do* want to release, you will need to specify how that
# version should be changed depending on the impact of the changes that will go
# into the release. To help you make this decision, all of the changes have been
# automatically added to the changelog for the package. This has been done
# in a new commit, so you can keep this file open, run `git show` in the
# terminal, review the set of changes, then return to this file to specify the
# version.
#
# A version specifier (the value that goes after each package in the list below)
# can be one of the following:
#
# - "major" (if you want to bump the major part of the package's version)
# - "minor" (if you want to bump the minor part of the package's version)
# - "patch" (if you want to bump the patch part of the package's version)
# - an exact version with major, minor, and patch parts (e.g. "1.2.3")
#
# When you're finished, save this file and close it. The tool will update the
# versions of the packages you've listed and will move the changelog entries to
# a new section.

packages:
  "@metamask/keyring-api": null
  "@metamask/eth-hd-keyring": null
  "@metamask/eth-ledger-bridge-keyring": null
  "@metamask/eth-simple-keyring": null
  "@metamask/eth-trezor-keyring": null
```

Select your packages alongside their version specifier, then save and close your `$EDITOR`.

> [!TIP]
> If a package is not going to be released, mark it as `intentionally-skip` instead of removing it from the list.

Update each package's CHANGELOGs (the one you selected) and update them the usual
way and commit those changes.

> [!IMPORTANT]
> Your PR **HAS TO BE NAMED**: `release: x.y.z`
>
> The [CI workflow](https://github.com/MetaMask/accounts/blob/f194ce6fd8a1c7383ef5d74ca30d6d33fe6bfcec/.github/workflows/main.yml#L64) uses this commit name to detect release commits and trigger publishing to NPM.

## Handling Release Errors

If the release process errors out because of CHANGELOG validation issues, follow these steps:

1. Correct the CHANGELOG entries that caused the error.
2. Run `yarn create-release-branch` to continue the release process.
