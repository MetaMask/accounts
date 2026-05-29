#!/usr/bin/env node

import { downloadAndInstall } from '.';
import { say } from './utils';

downloadAndInstall().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  say(`Error: ${message}`);
  // eslint-disable-next-line no-restricted-globals
  process.exit(1);
});
