## yarn 4+ nohoist

We need to prevent `jest-environment-jsdom` hoisting, otherwise this will make `tsc` read
`lib.dom.d.ts` and this might conflict with `@types/web` package.

However, yarn 4 did remove the `nohoist` option, so here's an alternative to this:

- https://github.com/yarnpkg/berry/issues/3273#issuecomment-897387396

Actually, there is another way of achieving nohoisting per workspace by using `installConfig` in
a `package.json`, see:

- https://yarnpkg.com/configuration/manifest#installConfig.hoistingLimits

You can also set this option in the global `.yarnrc.yml` but this might apply to every packages...

## tsc

We now use `tsc --build` rather than `tsc --project` as this seems to solve building issues
when referencing another local dependency (when using `references`) from the `packages/` folder.

### Build order

It seems there's no easy way to order build if one package depends on another (or I didn't find
how...).

Here, `keyring-snap` requires some dist files from the `keyring-api`, so the `yarn build` command
of the `keyring-snap` actually calls `yarn workspace @metamask/keyring-api` explicitly to make sure
those artifacts are being built before.
