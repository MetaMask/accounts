import type { GatsbySSR } from 'gatsby';
import React, { StrictMode } from 'react';

import { App } from './src/App';
import { Root } from './src/Root';

// Inject the favicon manually instead of relying on gatsby-plugin-manifest's
// `icon` option, which uses sharp to resize images. sharp requires a native
// binary that cannot be installed in the monorepo (lavamoat's allow-scripts
// plugin only scans root node_modules, so packages isolated by
// hoistingLimits: "workspaces" are invisible to it). The pre-built PNGs in
// static/icons/ are committed directly and referenced here.
export const onRenderBody: GatsbySSR['onRenderBody'] = ({
  setHeadComponents,
}) => {
  setHeadComponents([
    <link
      key="favicon"
      rel="icon"
      type="image/png"
      href="/icons/icon-192.png"
    />,
  ]);
};

export const wrapRootElement: GatsbySSR['wrapRootElement'] = ({ element }) => (
  <StrictMode>
    <Root>{element}</Root>
  </StrictMode>
);

export const wrapPageElement: GatsbySSR['wrapPageElement'] = ({ element }) => (
  <App>{element}</App>
);
