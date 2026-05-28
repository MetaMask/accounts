#!/usr/bin/env node

import { ensureBinary } from './download';

ensureBinary()
  .then((binaryPath: string) => {
    console.log(binaryPath);
    return undefined;
  })
  .catch((error: unknown) => {
    console.error(error);
    // eslint-disable-next-line no-restricted-globals
    process.exit(1);
  });
