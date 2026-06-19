/* eslint-disable @typescript-eslint/naming-convention */
import type { GatsbyConfig } from 'gatsby';

const config: GatsbyConfig = {
  // This is required to make use of the React 17+ JSX transform.
  jsxRuntime: 'automatic',

  pathPrefix: process.env.GATSBY_PATH_PREFIX ?? '/',

  plugins: [
    'gatsby-plugin-svgr',
    'gatsby-plugin-styled-components',
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'Template Snap',
        theme_color: '#6F4CFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        // Pre-built icons avoid sharp (native binary) which can't run its
        // install script in the monorepo's isolated node_modules. Regenerate
        // from src/assets/logo.svg if the icon changes.
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    },
    {
      // See: <https://www.gatsbyjs.com/plugins/gatsby-plugin-webfonts/>
      resolve: `gatsby-plugin-webfonts`,
      options: {
        fonts: {
          google: [
            {
              family: 'Roboto Mono',
              variants: ['400'],
            },
          ],
          selfHosted: [
            // Common weight name mapping
            //
            // 100 - Thin (Hairline)
            // 200 - Extra Light (Ultra Light)
            // 300 - Light
            // 400 - Normal (Regular)
            // 500 - Medium
            // 600 - Semi Bold (Demi Bold)
            // 700 - Bold
            // 800 - Extra Bold (Ultra Bold)
            // 900 - Black (Heavy)
            // 950 - Extra Black (Ultra Black)
            //
            // See: <https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#common_weight_name_mapping>

            // ----------------------------------------------------------------
            // Regular
            {
              family: 'Geist',
              urls: {
                woff2: `fonts/Geist-Regular.woff2`,
              },
              fontStyle: 'normal',
              fontWeight: 400,
            },

            // ----------------------------------------------------------------
            // Regular Italic
            {
              family: 'Geist',
              urls: {
                woff2: `fonts/Geist-RegularItalic.woff2`,
              },
              fontStyle: 'italic',
              fontWeight: 400,
            },

            // ----------------------------------------------------------------
            // Medium
            {
              family: 'Geist',
              urls: {
                woff2: `fonts/Geist-Medium.woff2`,
              },
              fontStyle: 'normal',
              fontWeight: 500,
            },

            // ----------------------------------------------------------------
            // Medium Italic
            {
              family: 'Geist',
              urls: {
                woff2: `fonts/Geist-MediumItalic.woff2`,
              },
              fontStyle: 'italic',
              fontWeight: 500,
            },

            // ----------------------------------------------------------------
            // Bold
            {
              family: 'Geist',
              urls: {
                woff2: `fonts/Geist-Bold.woff2`,
              },
              fontStyle: 'normal',
              fontWeight: 700,
            },

            // ----------------------------------------------------------------
            // Bold Italic
            {
              family: 'Geist',
              urls: {
                woff2: `fonts/Geist-BoldItalic.woff2`,
              },
              fontStyle: 'italic',
              fontWeight: 700,
            },
          ],
        },
      },
    },
  ],
};

export default config;
