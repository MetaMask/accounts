# How to release

> [!NOTE]
> The term `x.y.z` will be used here to refer to the current version being released.

To start creating a new release, run:

```shell
yarn create-release-branch
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

Update each package's CHANGELOGs (the one you selected) and update them the usual
way and commit those changes.

Finally, create your PR on [github](https://github.com/MetaMask/accounts/pulls) or use `gh` CLI:

```shell
VERSION=x.y.z; gh pr create \
  --title "release: $VERSION" \
  --body "## Description
This is the release candidate for version $VERSION. See the changelogs for more details."
```

> [!IMPORTANT]
> Your PR **HAS TO BE NAMED**: `release: x.y.z`
>
> The CI will use this commit name when finalizing/publishing the release to NPM.
